import hashlib
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import pandas as pd
from app.core.config import DICTIONARIES_DIR, UPLOAD_DIR
from app.models.entities import SourceFile, ImportRun, CDRRecord, IPDRRecord, TowerSite, AuditLog

def compute_checksum(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def load_template_library() -> List[Dict[str, Any]]:
    path = DICTIONARIES_DIR / "operator_mappings.json"
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("templates", [])
    return []

def preview_file(file_path: Path, max_rows: int = 10) -> Dict[str, Any]:
    suffix = file_path.suffix.lower()
    if suffix in [".csv", ".txt"]:
        df = pd.read_csv(file_path, nrows=max_rows, keep_default_na=False)
    elif suffix in [".xlsx", ".xls"]:
        df = pd.read_excel(file_path, nrows=max_rows, keep_default_na=False)
    else:
        raise ValueError(f"Unsupported file format: {suffix}")
    
    headers = [str(c).strip() for c in df.columns]
    rows = df.to_dict(orient="records")
    
    # Auto-detect template
    detected_template = None
    templates = load_template_library()
    headers_upper = set(h.upper() for h in headers)
    
    for tmpl in templates:
        sig = tmpl.get("signature_columns", [])
        if sig and all(s.upper() in headers_upper for s in sig):
            detected_template = tmpl
            break
            
    return {
        "headers": headers,
        "sample_rows": rows,
        "total_preview_rows": len(rows),
        "detected_template": detected_template
    }

def parse_datetime(val: Any, date_val: Any = None, time_val: Any = None, fmt: str = None) -> Optional[datetime]:
    if date_val and time_val:
        combined = f"{str(date_val).strip()} {str(time_val).strip()}"
        formats = [
            "%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S",
            "%Y/%m/%d %H:%M:%S", "%d/%m/%Y %H:%M:%S",
            "%Y-%m-%d %H:%M", "%d-%m-%Y %H:%M"
        ]
        if fmt:
            formats.insert(0, fmt)
        for f in formats:
            try:
                return datetime.strptime(combined, f)
            except Exception:
                continue
        return None

    if not val or pd.isna(val) or str(val).strip() == "" or str(val).strip().upper() == "NULL":
        return None
    
    s = str(val).strip()
    formats = [
        "%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S%z",
        "%Y/%m/%d %H:%M:%S", "%d/%m/%Y %H:%M:%S",
        "%Y-%m-%d %H:%M", "%d-%m-%Y %H:%M"
    ]
    if fmt:
        formats.insert(0, fmt)
    for f in formats:
        try:
            return datetime.strptime(s, f)
        except Exception:
            continue
    # Try ISO format
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None

def ingest_file(db, source_file: SourceFile, mapping_config: Dict[str, Any]) -> ImportRun:
    file_path = UPLOAD_DIR / source_file.filename
    if not file_path.exists():
        raise FileNotFoundError(f"File {source_file.filename} not found")

    suffix = file_path.suffix.lower()
    if suffix in [".csv", ".txt"]:
        df = pd.read_csv(file_path, keep_default_na=False)
    else:
        df = pd.read_excel(file_path, keep_default_na=False)

    record_type = mapping_config.get("record_type", source_file.file_type).upper()
    col_map = mapping_config.get("columns", {})
    ts_fmt = mapping_config.get("timestamp_format")
    
    import_run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
    import_run = ImportRun(
        id=import_run_id,
        source_file_id=source_file.id,
        mapping_id=mapping_config.get("template_name", "custom"),
        started_at=datetime.utcnow()
    )

    accepted_records = []
    rejected_rows = []
    warning_count = 0

    if record_type == "CDR":
        col_a = col_map.get("a_party")
        col_b = col_map.get("b_party")
        col_ev = col_map.get("event_time")
        col_date = col_map.get("call_date")
        col_time = col_map.get("call_time")
        col_dur = col_map.get("duration_seconds")
        col_imei = col_map.get("imei")
        col_imsi = col_map.get("imsi")
        col_cell = col_map.get("first_cell_id") or col_map.get("cell_id")
        col_type = col_map.get("event_type")

        for idx, row in df.iterrows():
            source_row_num = idx + 1
            raw_dict = row.to_dict()
            
            a_party = str(row.get(col_a, "")).strip() if col_a else ""
            b_party = str(row.get(col_b, "")).strip() if col_b else ""

            if not a_party:
                rejected_rows.append({
                    "row": source_row_num,
                    "reason_code": "MISSING_A_PARTY",
                    "details": "A-party phone number is missing or empty",
                    "raw_data": raw_dict
                })
                continue
            if not b_party:
                rejected_rows.append({
                    "row": source_row_num,
                    "reason_code": "MISSING_B_PARTY",
                    "details": "B-party phone number is missing or empty",
                    "raw_data": raw_dict
                })
                continue

            # Parse event time
            event_dt = None
            if col_ev:
                event_dt = parse_datetime(row.get(col_ev), fmt=ts_fmt)
            elif col_date and col_time:
                event_dt = parse_datetime(None, row.get(col_date), row.get(col_time), fmt=ts_fmt)

            if not event_dt:
                rejected_rows.append({
                    "row": source_row_num,
                    "reason_code": "INVALID_TIMESTAMP",
                    "details": "Event timestamp could not be parsed",
                    "raw_data": raw_dict
                })
                continue

            # Parse duration
            duration = 0
            if col_dur and str(row.get(col_dur, "")).strip() != "":
                try:
                    duration = int(float(row.get(col_dur)))
                    if duration < 0:
                        rejected_rows.append({
                            "row": source_row_num,
                            "reason_code": "NEGATIVE_DURATION",
                            "details": f"Call duration {duration} is negative",
                            "raw_data": raw_dict
                        })
                        continue
                except Exception:
                    duration = 0

            imei = str(row.get(col_imei, "")).strip() if col_imei else None
            imsi = str(row.get(col_imsi, "")).strip() if col_imsi else None
            cell_id = str(row.get(col_cell, "")).strip() if col_cell else None
            ev_type = str(row.get(col_type, "VOICE")).strip().upper() if col_type else "VOICE"

            if not imei or not cell_id:
                warning_count += 1

            record = CDRRecord(
                id=f"CDR-{uuid.uuid4().hex[:10].upper()}",
                case_id=source_file.case_id,
                source_file_id=source_file.id,
                source_row=source_row_num,
                event_time=event_dt,
                a_party=a_party,
                b_party=b_party,
                direction="OUTGOING",
                event_type=ev_type,
                duration_seconds=duration,
                imei=imei if imei else None,
                imsi=imsi if imsi else None,
                first_cell_id=cell_id if cell_id else None,
                last_cell_id=cell_id if cell_id else None,
                raw_values_json=raw_dict
            )
            accepted_records.append(record)

    elif record_type == "IPDR":
        col_sub = col_map.get("subscriber_ref")
        col_ip = col_map.get("public_ip")
        col_sport = col_map.get("source_port")
        col_dip = col_map.get("destination_ip")
        col_dport = col_map.get("destination_port")
        col_start = col_map.get("start_time")
        col_end = col_map.get("end_time")
        col_bin = col_map.get("bytes_in")
        col_bout = col_map.get("bytes_out")

        for idx, row in df.iterrows():
            source_row_num = idx + 1
            raw_dict = row.to_dict()

            public_ip = str(row.get(col_ip, "")).strip() if col_ip else ""
            if not public_ip:
                rejected_rows.append({
                    "row": source_row_num,
                    "reason_code": "MISSING_PUBLIC_IP",
                    "details": "Public IP is required in IPDR record",
                    "raw_data": raw_dict
                })
                continue

            start_dt = parse_datetime(row.get(col_start), fmt=ts_fmt) if col_start else None
            if not start_dt:
                rejected_rows.append({
                    "row": source_row_num,
                    "reason_code": "INVALID_TIMESTAMP",
                    "details": "IPDR start_time could not be parsed",
                    "raw_data": raw_dict
                })
                continue

            end_dt = parse_datetime(row.get(col_end), fmt=ts_fmt) if col_end else None

            sport = None
            if col_sport and str(row.get(col_sport, "")).strip():
                try:
                    sport = int(row.get(col_sport))
                except Exception:
                    pass

            dport = None
            if col_dport and str(row.get(col_dport, "")).strip():
                try:
                    dport = int(row.get(col_dport))
                except Exception:
                    pass

            bin_val = int(row.get(col_bin, 0)) if col_bin and str(row.get(col_bin, "")).strip().isdigit() else 0
            bout_val = int(row.get(col_bout, 0)) if col_bout and str(row.get(col_bout, "")).strip().isdigit() else 0

            record = IPDRRecord(
                id=f"IPDR-{uuid.uuid4().hex[:10].upper()}",
                case_id=source_file.case_id,
                source_file_id=source_file.id,
                source_row=source_row_num,
                subscriber_ref=str(row.get(col_sub, "")).strip() if col_sub else None,
                public_ip=public_ip,
                source_port=sport,
                destination_ip=str(row.get(col_dip, "")).strip() if col_dip else None,
                destination_port=dport,
                start_time=start_dt,
                end_time=end_dt,
                bytes_in=bin_val,
                bytes_out=bout_val,
                raw_values_json=raw_dict
            )
            accepted_records.append(record)

    elif record_type == "TOWER":
        col_cell = col_map.get("cell_id")
        col_site = col_map.get("site_name")
        col_lat = col_map.get("latitude")
        col_lon = col_map.get("longitude")
        col_sec = col_map.get("sector")
        col_az = col_map.get("azimuth")
        col_addr = col_map.get("address")

        for idx, row in df.iterrows():
            source_row_num = idx + 1
            raw_dict = row.to_dict()

            cell_id = str(row.get(col_cell, "")).strip() if col_cell else ""
            if not cell_id:
                rejected_rows.append({
                    "row": source_row_num,
                    "reason_code": "MISSING_CELL_ID",
                    "details": "Cell ID is missing",
                    "raw_data": raw_dict
                })
                continue

            try:
                lat = float(row.get(col_lat))
                lon = float(row.get(col_lon))
            except Exception:
                rejected_rows.append({
                    "row": source_row_num,
                    "reason_code": "INVALID_COORDINATES",
                    "details": "Latitude or Longitude is invalid",
                    "raw_data": raw_dict
                })
                continue

            sec = None
            if col_sec and str(row.get(col_sec, "")).strip().isdigit():
                sec = int(row.get(col_sec))

            az = None
            if col_az and str(row.get(col_az, "")).strip().isdigit():
                az = int(row.get(col_az))

            record = TowerSite(
                id=f"TWR-{uuid.uuid4().hex[:10].upper()}",
                case_id=source_file.case_id,
                source_file_id=source_file.id,
                cell_id=cell_id,
                site_name=str(row.get(col_site, cell_id)).strip() if col_site else cell_id,
                latitude=lat,
                longitude=lon,
                sector=sec,
                azimuth=az,
                address=str(row.get(col_addr, "")).strip() if col_addr else None,
                metadata_json=raw_dict
            )
            accepted_records.append(record)

    # Persist accepted records
    for rec in accepted_records:
        db.add(rec)

    import_run.accepted_count = len(accepted_records)
    import_run.rejected_count = len(rejected_rows)
    import_run.warning_count = warning_count
    import_run.completed_at = datetime.utcnow()
    import_run.report_json = {
        "status": "COMPLETED",
        "total_rows": len(df),
        "accepted": len(accepted_records),
        "rejected": len(rejected_rows),
        "warnings": warning_count,
        "rejected_details": rejected_rows[:50], # first 50
        "mapping_used": mapping_config
    }

    source_file.import_status = "INGESTED" if len(accepted_records) > 0 else "FAILED"
    db.add(import_run)

    # Audit log
    audit = AuditLog(
        id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
        case_id=source_file.case_id,
        action="FILE_INGESTED",
        resource_type="SOURCE_FILE",
        resource_id=source_file.id,
        metadata_json={
            "filename": source_file.filename,
            "accepted": len(accepted_records),
            "rejected": len(rejected_rows)
        }
    )
    db.add(audit)
    db.commit()

    return import_run
