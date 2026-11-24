import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import UPLOAD_DIR, REPORT_DIR, SYNTHETIC_DIR
from app.models.entities import (
    Case, SourceFile, ImportRun, CDRRecord, IPDRRecord, TowerSite,
    AISession, AIMessage, AuditLog
)
from app.schemas.contracts import (
    CaseCreateRequest, MappingSaveRequest, IngestRequest,
    CommonContactsRequest, CopilotQueryRequest, ReportGenerateRequest
)
from app.ingestion.engine import compute_checksum, preview_file, ingest_file, load_template_library
from app.analytics.engine import (
    get_top_contacts, find_common_contacts, get_tower_timeline,
    detect_device_sim_links, correlate_ipdr
)
from app.graph.engine import build_contact_graph
from app.ai.orchestrator import AICopilotOrchestrator
from app.reports.engine import generate_pdf_report, generate_excel_report

api_router = APIRouter()

# ----------------- CASE ENDPOINTS -----------------
@api_router.get("/cases")
def list_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).order_by(Case.created_at.desc()).all()
    results = []
    for c in cases:
        file_count = db.query(SourceFile).filter(SourceFile.case_id == c.id).count()
        cdr_count = db.query(CDRRecord).filter(CDRRecord.case_id == c.id).count()
        ipdr_count = db.query(IPDRRecord).filter(IPDRRecord.case_id == c.id).count()
        results.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "incident_start": c.incident_start.isoformat() if c.incident_start else None,
            "incident_end": c.incident_end.isoformat() if c.incident_end else None,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "file_count": file_count,
            "cdr_count": cdr_count,
            "ipdr_count": ipdr_count
        })
    return {"status": "success", "data": results}

@api_router.post("/cases")
def create_case(req: CaseCreateRequest, db: Session = Depends(get_db)):
    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    new_case = Case(
        id=case_id,
        title=req.title,
        description=req.description,
        incident_start=req.incident_start,
        incident_end=req.incident_end,
        created_by="lead_investigator",
        status="ACTIVE"
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return {"status": "success", "data": {"id": new_case.id, "title": new_case.title}}

@api_router.get("/cases/{case_id}")
def get_case_details(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    files = db.query(SourceFile).filter(SourceFile.case_id == case_id).all()
    cdr_count = db.query(CDRRecord).filter(CDRRecord.case_id == case_id).count()
    ipdr_count = db.query(IPDRRecord).filter(IPDRRecord.case_id == case_id).count()
    tower_count = db.query(TowerSite).filter(TowerSite.case_id == case_id).count()

    # Get distinct primary numbers (suspects / targets)
    a_parties = db.query(CDRRecord.a_party).filter(CDRRecord.case_id == case_id).distinct().limit(20).all()
    suggested_suspects = [row[0] for row in a_parties]

    return {
        "status": "success",
        "data": {
            "id": case.id,
            "title": case.title,
            "description": case.description,
            "incident_start": case.incident_start.isoformat() if case.incident_start else None,
            "incident_end": case.incident_end.isoformat() if case.incident_end else None,
            "status": case.status,
            "created_at": case.created_at.isoformat() if case.created_at else None,
            "summary": {
                "files_count": len(files),
                "cdr_count": cdr_count,
                "ipdr_count": ipdr_count,
                "tower_count": tower_count,
                "suggested_suspects": suggested_suspects
            },
            "files": [
                {
                    "id": f.id,
                    "filename": f.filename,
                    "file_type": f.file_type,
                    "checksum": f.checksum,
                    "import_status": f.import_status,
                    "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None
                }
                for f in files
            ]
        }
    }

# ----------------- FILE & INGESTION ENDPOINTS -----------------
@api_router.post("/cases/{case_id}/files")
async def upload_case_file(
    case_id: str,
    file: UploadFile = File(...),
    file_type: str = Form("CDR"), # CDR, IPDR, TOWER
    timezone: str = Form("Asia/Kolkata"),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    file_id = f"FILE-{uuid.uuid4().hex[:8].upper()}"
    saved_filename = f"{file_id}_{file.filename}"
    target_path = UPLOAD_DIR / saved_filename

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    checksum = compute_checksum(target_path)

    source_file = SourceFile(
        id=file_id,
        case_id=case_id,
        filename=saved_filename,
        file_type=file_type.upper(),
        checksum=checksum,
        timezone=timezone,
        import_status="PENDING"
    )
    db.add(source_file)
    db.commit()
    db.refresh(source_file)

    # Preview and auto-template detection
    preview = preview_file(target_path)

    return {
        "status": "success",
        "data": {
            "file_id": source_file.id,
            "filename": source_file.filename,
            "checksum": checksum,
            "preview": preview
        }
    }

@api_router.post("/files/{file_id}/mapping")
def save_mapping(file_id: str, mapping: MappingSaveRequest, db: Session = Depends(get_db)):
    source_file = db.query(SourceFile).filter(SourceFile.id == file_id).first()
    if not source_file:
        raise HTTPException(status_code=404, detail="File not found")

    source_file.import_status = "MAPPED"
    db.commit()
    return {"status": "success", "message": "Mapping stored successfully", "mapping": mapping.model_dump()}

@api_router.post("/files/{file_id}/ingest")
def trigger_ingest(file_id: str, req: IngestRequest = None, db: Session = Depends(get_db)):
    source_file = db.query(SourceFile).filter(SourceFile.id == file_id).first()
    if not source_file:
        raise HTTPException(status_code=404, detail="File not found")

    target_path = UPLOAD_DIR / source_file.filename
    mapping_dict = req.mapping.model_dump() if req and req.mapping else None

    if not mapping_dict:
        # Check auto-detection
        preview = preview_file(target_path)
        if preview.get("detected_template"):
            mapping_dict = preview["detected_template"]
        else:
            raise HTTPException(status_code=400, detail="No mapping provided and auto-detection failed.")

    import_run = ingest_file(db, source_file, mapping_dict)

    return {
        "status": "success",
        "data": {
            "run_id": import_run.id,
            "accepted_count": import_run.accepted_count,
            "rejected_count": import_run.rejected_count,
            "warning_count": import_run.warning_count,
            "report": import_run.report_json
        }
    }

@api_router.get("/files/{file_id}/import-report")
def get_import_report(file_id: str, db: Session = Depends(get_db)):
    run = db.query(ImportRun).filter(ImportRun.source_file_id == file_id).order_by(ImportRun.started_at.desc()).first()
    if not run:
        raise HTTPException(status_code=404, detail="No import report found for this file")

    return {
        "status": "success",
        "data": {
            "run_id": run.id,
            "accepted": run.accepted_count,
            "rejected": run.rejected_count,
            "warnings": run.warning_count,
            "report": run.report_json
        }
    }

# ----------------- ANALYTICS & GRAPH ENDPOINTS -----------------
@api_router.get("/cases/{case_id}/analytics/top-contacts")
def top_contacts(
    case_id: str,
    number: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    res = get_top_contacts(db, case_id, number, start_time, end_time, limit)
    return {"status": "success", "data": res}

@api_router.post("/cases/{case_id}/analytics/common-contacts")
def common_contacts(
    case_id: str,
    req: CommonContactsRequest,
    db: Session = Depends(get_db)
):
    res = find_common_contacts(db, case_id, req.suspects, req.start_time, req.end_time)
    return {"status": "success", "data": res}

@api_router.get("/cases/{case_id}/graph")
def network_graph(
    case_id: str,
    selected_numbers: Optional[str] = Query(None, description="Comma-separated numbers"),
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    min_calls: int = 1,
    db: Session = Depends(get_db)
):
    nums = [s.strip() for s in selected_numbers.split(",")] if selected_numbers else None
    res = build_contact_graph(db, case_id, nums, start_time, end_time, min_calls)
    return {"status": "success", "data": res}

@api_router.get("/cases/{case_id}/timeline/tower")
def tower_timeline(
    case_id: str,
    number: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    res = get_tower_timeline(db, case_id, number, start_time, end_time)
    return {"status": "success", "data": res}

@api_router.get("/cases/{case_id}/analytics/device-links")
def device_links(
    case_id: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    res = detect_device_sim_links(db, case_id, start_time, end_time)
    return {"status": "success", "data": res}

@api_router.post("/cases/{case_id}/analytics/ipdr-correlate")
def ipdr_correlate(
    case_id: str,
    ip_or_subscriber: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    res = correlate_ipdr(db, case_id, ip_or_subscriber, start_time, end_time)
    return {"status": "success", "data": res}

# ----------------- AI COPILOT ENDPOINT -----------------
@api_router.post("/cases/{case_id}/copilot/messages")
def copilot_query(
    case_id: str,
    req: CopilotQueryRequest,
    db: Session = Depends(get_db)
):
    orchestrator = AICopilotOrchestrator(db)
    result = orchestrator.process_query(case_id, req.query)

    # Store in AI message log
    session = db.query(AISession).filter(AISession.case_id == case_id).first()
    if not session:
        session = AISession(id=f"SES-{uuid.uuid4().hex[:8].upper()}", case_id=case_id)
        db.add(session)
        db.commit()

    user_msg = AIMessage(
        id=f"MSG-{uuid.uuid4().hex[:8].upper()}",
        session_id=session.id,
        role="user",
        content=req.query
    )
    asst_msg = AIMessage(
        id=f"MSG-{uuid.uuid4().hex[:8].upper()}",
        session_id=session.id,
        role="assistant",
        content=result.get("answer", ""),
        tool_name=result.get("tool_invocations", [{}])[0].get("tool") if result.get("tool_invocations") else None,
        evidence_refs_json=result.get("findings", [])
    )
    db.add(user_msg)
    db.add(asst_msg)
    db.commit()

    return {"status": "success", "data": result}

# ----------------- REPORTING ENDPOINTS -----------------
@api_router.post("/cases/{case_id}/reports")
def create_report(
    case_id: str,
    req: ReportGenerateRequest,
    db: Session = Depends(get_db)
):
    if req.format.lower() == "excel":
        file_path = generate_excel_report(db, case_id)
    else:
        file_path = generate_pdf_report(db, case_id)

    report_id = Path(file_path).name
    return {
        "status": "success",
        "data": {
            "report_id": report_id,
            "filename": report_id,
            "download_url": f"/api/v1/reports/{report_id}"
        }
    }

@api_router.get("/reports/{report_id}")
def download_report(report_id: str):
    file_path = REPORT_DIR / report_id
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found")
    media_type = "application/pdf" if report_id.endswith(".pdf") else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return FileResponse(file_path, media_type=media_type, filename=report_id)

# ----------------- SEED DEMO ENDPOINT -----------------
@api_router.post("/cases/seed-demo")
def seed_demo_data(db: Session = Depends(get_db)):
    case_id = "CASE-DEMO-001"
    existing = db.query(Case).filter(Case.id == case_id).first()
    if existing:
        return {"status": "success", "message": "Demo case already seeded", "data": {"case_id": case_id}}

    demo_case = Case(
        id=case_id,
        title="Operation CyberTrace - Delhi Cross-Border Syndication",
        description="Investigation into coordinated financial fraud communication involving suspects 9000000001 & 9000000002.",
        incident_start=datetime(2026, 11, 20, 0, 0, 0),
        incident_end=datetime(2026, 11, 21, 23, 59, 59),
        created_by="lead_investigator",
        status="ACTIVE"
    )
    db.add(demo_case)
    db.commit()

    # Seed files: Tower, Op A CDR, Op B CDR, IPDR
    files_to_seed = [
        ("tower_sites.csv", "TOWER", "standard_tower_template"),
        ("operator_a_cdr_sample.csv", "CDR", "operator_a_template"),
        ("operator_b_cdr_sample.csv", "CDR", "operator_b_template"),
        ("ipdr_sample.csv", "IPDR", "standard_ipdr_template")
    ]

    templates = {t["id"]: t for t in load_template_library()}

    for fname, ftype, tmpl_id in files_to_seed:
        src = SYNTHETIC_DIR / fname
        dest_fname = f"DEMO_{fname}"
        dest = UPLOAD_DIR / dest_fname
        if src.exists():
            shutil.copyfile(src, dest)
            s_file = SourceFile(
                id=f"FILE-{fname.replace('.csv', '').upper()}",
                case_id=case_id,
                filename=dest_fname,
                file_type=ftype,
                checksum=compute_checksum(dest),
                timezone="Asia/Kolkata",
                import_status="PENDING"
            )
            db.add(s_file)
            db.commit()
            db.refresh(s_file)

            tmpl = templates.get(tmpl_id)
            if tmpl:
                ingest_file(db, s_file, tmpl)

    return {"status": "success", "message": "Synthetic demo case created and fully ingested", "data": {"case_id": case_id}}
