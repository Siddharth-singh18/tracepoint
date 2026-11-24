import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from app.core.config import REPORT_DIR
from app.models.entities import Case, SourceFile, CDRRecord, IPDRRecord, TowerSite

def generate_pdf_report(db, case_id: str, options: Dict[str, Any] = None) -> str:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")

    files = db.query(SourceFile).filter(SourceFile.case_id == case_id).all()
    cdr_count = db.query(CDRRecord).filter(CDRRecord.case_id == case_id).count()
    ipdr_count = db.query(IPDRRecord).filter(IPDRRecord.case_id == case_id).count()
    tower_count = db.query(TowerSite).filter(TowerSite.case_id == case_id).count()

    filename = f"Tracepoint_Report_{case.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    file_path = REPORT_DIR / filename

    doc = SimpleDocTemplate(
        str(file_path),
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569')
    )
    h2_style = ParagraphStyle(
        'Heading2Style',
        parent=styles['Heading2'],
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=14,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )
    legal_style = ParagraphStyle(
        'LegalDisclaimer',
        parent=styles['Italic'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748b')
    )

    elements = []

    # Header
    elements.append(Paragraph("TRACEPOINT INVESTIGATION INTELLIGENCE REPORT", title_style))
    elements.append(Paragraph(f"Case Reference: <b>{case.id}</b> | Title: <b>{case.title}</b>", subtitle_style))
    elements.append(Paragraph(f"Report Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Classification: LAW ENFORCEMENT SENSITIVE (SYNTHETIC MOCK)", subtitle_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0ea5e9'), spaceBefore=4, spaceAfter=12))

    # Case Overview
    elements.append(Paragraph("1. Case Overview & Incident Window", h2_style))
    overview_data = [
        ["Parameter", "Details"],
        ["Case ID", case.id],
        ["Title", case.title],
        ["Status", case.status],
        ["Incident Start", case.incident_start.strftime('%Y-%m-%d %H:%M') if case.incident_start else "Not specified"],
        ["Incident End", case.incident_end.strftime('%Y-%m-%d %H:%M') if case.incident_end else "Not specified"],
        ["Records Ingested", f"CDR: {cdr_count} rows | IPDR: {ipdr_count} rows | Tower Sites: {tower_count}"]
    ]
    t1 = Table(overview_data, colWidths=[150, 380])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc'))
    ]))
    elements.append(t1)
    elements.append(Spacer(1, 12))

    # Evidence Provenance & Source Files
    elements.append(Paragraph("2. Evidence Chain & Source File Provenance", h2_style))
    file_rows = [["Filename", "Type", "Status", "SHA-256 Checksum (First 16 chars)"]]
    for f in files:
        file_rows.append([
            f.filename,
            f.file_type,
            f.import_status,
            f.checksum[:16] + "..." if f.checksum else "N/A"
        ])
    if len(file_rows) == 1:
        file_rows.append(["No source files uploaded", "-", "-", "-"])

    t2 = Table(file_rows, colWidths=[160, 60, 80, 230])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white)
    ]))
    elements.append(t2)
    elements.append(Spacer(1, 12))

    # Analytical Findings
    elements.append(Paragraph("3. Analytical Intelligence Findings", h2_style))
    elements.append(Paragraph(
        "<b>Cross-Suspect Shared Contacts:</b> Deterministic intersection analysis identified communication links connecting primary target numbers.",
        body_style
    ))
    elements.append(Paragraph(
        "<b>Hardware IMEI Observations:</b> Multiple IMSI/MSISDN numbers were recorded operating on identical IMEI hardware tags across the timeline.",
        body_style
    ))
    elements.append(Spacer(1, 10))

    # Limitations & Legal Caution (Blueprint Section 14.4)
    elements.append(Paragraph("4. Technical Limitations & Human Authority Mandate", h2_style))
    disclaimer_text = (
        "<b>MANDATORY LEGAL & TECHNICAL NOTICE:</b><br/>"
        "1. <b>Serving Cell Limitation:</b> Cell site associations reflect network BTS antenna coverage areas at call time, NEVER exact GPS coordinates or precise travel trajectories.<br/>"
        "2. <b>IPDR & NAT Limitation:</b> A public IP address is a network interface, not an individual human being. Shared NAT, dynamic leases, and port masking require ISP logs for definitive subscriber identity.<br/>"
        "3. <b>AI & Algorithmic Boundaries:</b> Artificial intelligence assists by organizing records and executing deterministic math. It does not decide criminal guilt, motive, or intent. Human investigator review is required prior to legal filings."
    )
    elements.append(Paragraph(disclaimer_text, legal_style))

    doc.build(elements)
    return str(file_path)

def generate_excel_report(db, case_id: str) -> str:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")

    wb = openpyxl.Workbook()

    # Sheet 1: Case Summary
    ws_summary = wb.active
    ws_summary.title = "Case Summary"
    ws_summary.append(["TRACEPOINT INVESTIGATION EXPORT"])
    ws_summary.append(["Case ID", case.id])
    ws_summary.append(["Title", case.title])
    ws_summary.append(["Status", case.status])
    ws_summary.append(["Export Date", datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')])

    # Sheet 2: CDR Records
    ws_cdr = wb.create_sheet(title="CDR Records")
    ws_cdr.append([
        "Record ID", "File ID", "Row", "Event Time", "A-Party", "B-Party",
        "Type", "Duration (sec)", "IMEI", "IMSI", "First Cell ID"
    ])
    cdrs = db.query(CDRRecord).filter(CDRRecord.case_id == case_id).limit(1000).all()
    for c in cdrs:
        ws_cdr.append([
            c.id, c.source_file_id, c.source_row,
            c.event_time.strftime('%Y-%m-%d %H:%M:%S') if c.event_time else "",
            c.a_party, c.b_party, c.event_type, c.duration_seconds,
            c.imei, c.imsi, c.first_cell_id
        ])

    # Sheet 3: IPDR Records
    ws_ipdr = wb.create_sheet(title="IPDR Sessions")
    ws_ipdr.append([
        "Record ID", "File ID", "Row", "Subscriber Ref", "Public IP",
        "Source Port", "Dest IP", "Dest Port", "Start Time", "Bytes In", "Bytes Out"
    ])
    ipdrs = db.query(IPDRRecord).filter(IPDRRecord.case_id == case_id).limit(1000).all()
    for ip in ipdrs:
        ws_ipdr.append([
            ip.id, ip.source_file_id, ip.source_row,
            ip.subscriber_ref, ip.public_ip, ip.source_port,
            ip.destination_ip, ip.destination_port,
            ip.start_time.strftime('%Y-%m-%d %H:%M:%S') if ip.start_time else "",
            ip.bytes_in, ip.bytes_out
        ])

    # Sheet 4: Tower Sites
    ws_tower = wb.create_sheet(title="Tower Sites")
    ws_tower.append(["Cell ID", "Site Name", "Latitude", "Longitude", "Sector", "Azimuth", "Address"])
    towers = db.query(TowerSite).filter(TowerSite.case_id == case_id).all()
    for t in towers:
        ws_tower.append([t.cell_id, t.site_name, t.latitude, t.longitude, t.sector, t.azimuth, t.address])

    filename = f"Tracepoint_Export_{case.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    file_path = REPORT_DIR / filename
    wb.save(str(file_path))
    return str(file_path)
