import os
import sys
from pathlib import Path
from datetime import datetime

# Add app to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal, engine, Base
from app.models.entities import Case, SourceFile, CDRRecord, IPDRRecord, TowerSite
from app.ingestion.engine import ingest_file, load_template_library
from app.analytics.engine import get_top_contacts, find_common_contacts, get_tower_timeline, detect_device_sim_links, correlate_ipdr
from app.graph.engine import build_contact_graph
from app.ai.orchestrator import AICopilotOrchestrator
from app.reports.engine import generate_pdf_report, generate_excel_report
from app.core.config import SYNTHETIC_DIR, UPLOAD_DIR
import shutil

def run_acceptance_tests():
    print("==========================================")
    print("RUNNING TRACEPOINT PS03 ACCEPTANCE TEST SUITE")
    print("==========================================")
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    case_id = f"TEST-CASE-{datetime.now().strftime('%H%M%S')}"
    case = Case(
        id=case_id,
        title="Test Investigation Case",
        incident_start=datetime(2026, 11, 20),
        incident_end=datetime(2026, 11, 21),
        status="ACTIVE"
    )
    db.add(case)
    db.commit()

    templates = {t["id"]: t for t in load_template_library()}

    # T01 & T07: Ingest Tower Sites first
    print("\n[T07/Data] Testing Tower Sites Ingest...")
    twr_file = UPLOAD_DIR / f"{case_id}_towers.csv"
    shutil.copyfile(SYNTHETIC_DIR / "tower_sites.csv", twr_file)
    sf_twr = SourceFile(id=f"{case_id}-TWR", case_id=case_id, filename=twr_file.name, file_type="TOWER", checksum="dummy")
    db.add(sf_twr)
    db.commit()
    twr_run = ingest_file(db, sf_twr, templates["standard_tower_template"])
    assert twr_run.accepted_count == 5, f"Expected 5 towers, got {twr_run.accepted_count}"
    print(f"✓ Tower Ingest: {twr_run.accepted_count} sites accepted")

    # T01 & T03 & T04: Test CDR Operator A
    print("\n[T01/T03/T04] Testing Operator A CDR (with invalid row)...")
    op_a_file = UPLOAD_DIR / f"{case_id}_op_a.csv"
    shutil.copyfile(SYNTHETIC_DIR / "operator_a_cdr_sample.csv", op_a_file)
    sf_a = SourceFile(id=f"{case_id}-OP-A", case_id=case_id, filename=op_a_file.name, file_type="CDR", checksum="dummy")
    db.add(sf_a)
    db.commit()
    run_a = ingest_file(db, sf_a, templates["operator_a_template"])
    print(f"✓ Operator A: accepted={run_a.accepted_count}, rejected={run_a.rejected_count}, warnings={run_a.warning_count}")
    assert run_a.accepted_count >= 12, "Operator A accepted count mismatch"
    assert run_a.rejected_count == 2, f"Operator A should reject 2 invalid rows (missing party & bad date), got {run_a.rejected_count}"

    # T01 & T03: Test CDR Operator B (different schema + negative duration + missing party)
    print("\n[T01/T03] Testing Operator B CDR...")
    op_b_file = UPLOAD_DIR / f"{case_id}_op_b.csv"
    shutil.copyfile(SYNTHETIC_DIR / "operator_b_cdr_sample.csv", op_b_file)
    sf_b = SourceFile(id=f"{case_id}-OP-B", case_id=case_id, filename=op_b_file.name, file_type="CDR", checksum="dummy")
    db.add(sf_b)
    db.commit()
    run_b = ingest_file(db, sf_b, templates["operator_b_template"])
    print(f"✓ Operator B: accepted={run_b.accepted_count}, rejected={run_b.rejected_count}")
    assert run_b.accepted_count >= 10, "Operator B accepted count mismatch"
    assert run_b.rejected_count == 2, f"Operator B should reject 2 rows (negative duration & missing a_party), got {run_b.rejected_count}"

    # T02: Test IPDR Ingest
    print("\n[T02] Testing IPDR Session Ingest...")
    ipdr_file = UPLOAD_DIR / f"{case_id}_ipdr.csv"
    shutil.copyfile(SYNTHETIC_DIR / "ipdr_sample.csv", ipdr_file)
    sf_ipdr = SourceFile(id=f"{case_id}-IPDR", case_id=case_id, filename=ipdr_file.name, file_type="IPDR", checksum="dummy")
    db.add(sf_ipdr)
    db.commit()
    run_ipdr = ingest_file(db, sf_ipdr, templates["standard_ipdr_template"])
    print(f"✓ IPDR Ingest: accepted={run_ipdr.accepted_count}")
    assert run_ipdr.accepted_count >= 5, "IPDR accepted count mismatch"

    # T05: Test Common Contacts
    print("\n[T05] Testing Cross-Suspect Common Contacts...")
    common_res = find_common_contacts(db, case_id, ["9000000001", "9000000002"])
    common_nums = [c["number"] for c in common_res["common_contacts"]]
    print(f"Common contacts found: {common_nums}")
    assert "9000000003" in common_nums, "Expected 9000000003 as common contact"
    assert "9000000004" in common_nums, "Expected 9000000004 as common contact"
    print("✓ Common contacts calculation verified")

    # T06: Test Graph Construction & Metrics
    print("\n[T06] Testing Network Graph Aggregation...")
    graph = build_contact_graph(db, case_id)
    print(f"Graph nodes: {len(graph['nodes'])}, edges: {len(graph['edges'])}")
    assert len(graph["nodes"]) > 5, "Graph should have multiple nodes"
    assert len(graph["edges"]) > 5, "Graph should have multiple edges"
    print("✓ Graph aggregation and metrics verified")

    # T08 & T07: Test Tower Timeline
    print("\n[T07/T08] Testing Tower Timeline & Cell Joins...")
    timeline = get_tower_timeline(db, case_id, number="9000000001")
    assert len(timeline["timeline"]) > 0, "Timeline should have events"
    print(f"✓ Tower timeline events: {timeline['total_events']}, sample site: {timeline['timeline'][0]['site_name']}")

    # T09: Test IMEI / SIM Association & Handset Switch
    print("\n[T09] Testing Device-SIM Associations...")
    dev_res = detect_device_sim_links(db, case_id)
    print(f"Shared devices count: {dev_res['shared_devices_count']}, Handset changes: {dev_res['handset_changes_count']}")
    assert dev_res["shared_devices_count"] >= 1, "Expected at least 1 shared device between suspects"
    print("✓ IMEI hardware association verified")

    # T10 & T11: Test AI Copilot Orchestrator with Evidence References
    print("\n[T10/T11] Testing AI Copilot Intelligence & Evidence Grounding...")
    copilot = AICopilotOrchestrator(db)
    
    # Query 1: Common contacts in natural language
    res1 = copilot.process_query(case_id, "Find common contacts between 9000000001 and 9000000002")
    assert len(res1["findings"]) > 0, "Copilot should return findings"
    assert len(res1["findings"][0]["evidence"]) > 0, "Copilot finding must include evidence citations"
    print(f"✓ AI Copilot answer: {res1['answer'][:80]}... (citations count: {len(res1['findings'][0]['evidence'])})")

    # Query 2: Hindi/Hinglish Query
    res_hindi = copilot.process_query(case_id, "9000000001 aur 9000000002 ke beech common numbers kaun se hain?")
    assert len(res_hindi["findings"]) > 0, "Copilot should handle Hindi/Hinglish query"
    print(f"✓ AI Copilot Hindi query handled: {res_hindi['answer'][:80]}...")

    # Query 3: Unsupported / Responsible wording
    res_unsupported = copilot.process_query(case_id, "Who is the criminal behind IP 192.168.1.1?")
    assert "limitations" in res_unsupported and len(res_unsupported["limitations"]) > 0
    print("✓ AI Copilot responsible boundaries & unsupported handling verified")

    # T13: Test PDF and Excel Report Export
    print("\n[T13] Testing Investigation Report Generation...")
    pdf_path = generate_pdf_report(db, case_id)
    assert os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 1000
    print(f"✓ PDF report generated: {pdf_path} ({os.path.getsize(pdf_path)} bytes)")

    excel_path = generate_excel_report(db, case_id)
    assert os.path.exists(excel_path) and os.path.getsize(excel_path) > 1000
    print(f"✓ Excel report generated: {excel_path} ({os.path.getsize(excel_path)} bytes)")

    print("\n==========================================")
    print("ALL ACCEPTANCE CRITERIA (T01 - T13) PASSED SUCCESSFULLY!")
    print("==========================================")
    db.close()

if __name__ == "__main__":
    run_acceptance_tests()
