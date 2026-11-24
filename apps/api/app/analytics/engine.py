from datetime import datetime
from typing import Dict, Any, List, Optional
from collections import defaultdict
from app.models.entities import CDRRecord, IPDRRecord, TowerSite

def get_top_contacts(
    db,
    case_id: str,
    number: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 15
) -> Dict[str, Any]:
    query = db.query(CDRRecord).filter(CDRRecord.case_id == case_id)
    if start_time:
        query = query.filter(CDRRecord.event_time >= start_time)
    if end_time:
        query = query.filter(CDRRecord.event_time <= end_time)

    records = query.all()

    # If number not specified, aggregate top numbers across the entire case
    stats = defaultdict(lambda: {
        "call_count": 0,
        "total_duration": 0,
        "incoming_count": 0,
        "outgoing_count": 0,
        "first_seen": None,
        "last_seen": None,
        "evidence_refs": []
    })

    for r in records:
        ev_ref = {
            "record_id": r.id,
            "source_file_id": r.source_file_id,
            "source_row": r.source_row,
            "timestamp": r.event_time.isoformat() if r.event_time else None
        }

        if number:
            if r.a_party == number:
                c = stats[r.b_party]
                c["call_count"] += 1
                c["outgoing_count"] += 1
                c["total_duration"] += r.duration_seconds
                if not c["first_seen"] or r.event_time < c["first_seen"]:
                    c["first_seen"] = r.event_time
                if not c["last_seen"] or r.event_time > c["last_seen"]:
                    c["last_seen"] = r.event_time
                if len(c["evidence_refs"]) < 5:
                    c["evidence_refs"].append(ev_ref)
            elif r.b_party == number:
                c = stats[r.a_party]
                c["call_count"] += 1
                c["incoming_count"] += 1
                c["total_duration"] += r.duration_seconds
                if not c["first_seen"] or r.event_time < c["first_seen"]:
                    c["first_seen"] = r.event_time
                if not c["last_seen"] or r.event_time > c["last_seen"]:
                    c["last_seen"] = r.event_time
                if len(c["evidence_refs"]) < 5:
                    c["evidence_refs"].append(ev_ref)
        else:
            # Case wide activity by pair
            pair_key = tuple(sorted([r.a_party, r.b_party]))
            c = stats[f"{pair_key[0]} <-> {pair_key[1]}"]
            c["call_count"] += 1
            c["total_duration"] += r.duration_seconds
            if not c["first_seen"] or r.event_time < c["first_seen"]:
                c["first_seen"] = r.event_time
            if not c["last_seen"] or r.event_time > c["last_seen"]:
                c["last_seen"] = r.event_time
            if len(c["evidence_refs"]) < 5:
                c["evidence_refs"].append(ev_ref)

    sorted_contacts = sorted(stats.items(), key=lambda x: x[1]["call_count"], reverse=True)[:limit]

    results = []
    for num, data in sorted_contacts:
        results.append({
            "number": num,
            "call_count": data["call_count"],
            "total_duration": data["total_duration"],
            "incoming_count": data["incoming_count"],
            "outgoing_count": data["outgoing_count"],
            "first_seen": data["first_seen"].isoformat() if data["first_seen"] else None,
            "last_seen": data["last_seen"].isoformat() if data["last_seen"] else None,
            "evidence_refs": data["evidence_refs"]
        })

    return {
        "case_id": case_id,
        "target_number": number,
        "contacts": results,
        "total_unique_contacts": len(stats)
    }

def find_common_contacts(
    db,
    case_id: str,
    suspects: List[str],
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None
) -> Dict[str, Any]:
    if not suspects or len(suspects) < 2:
        return {"common_contacts": [], "message": "At least two suspects required."}

    query = db.query(CDRRecord).filter(CDRRecord.case_id == case_id)
    if start_time:
        query = query.filter(CDRRecord.event_time >= start_time)
    if end_time:
        query = query.filter(CDRRecord.event_time <= end_time)

    records = query.all()

    # Per-suspect contact mappings: suspect -> { counterpart: [events] }
    suspect_contacts = {s: defaultdict(list) for s in suspects}

    for r in records:
        for s in suspects:
            counterpart = None
            if r.a_party == s and r.b_party != s:
                counterpart = r.b_party
            elif r.b_party == s and r.a_party != s:
                counterpart = r.a_party

            if counterpart and counterpart not in suspects:
                suspect_contacts[s][counterpart].append(r)

    # Compute intersection of counterparts
    sets = [set(suspect_contacts[s].keys()) for s in suspects]
    common_numbers = set.intersection(*sets) if sets else set()

    results = []
    for num in common_numbers:
        counts_by_suspect = {}
        duration_by_suspect = {}
        all_refs = []

        for s in suspects:
            events = suspect_contacts[s][num]
            counts_by_suspect[s] = len(events)
            duration_by_suspect[s] = sum(e.duration_seconds for e in events)
            for e in events[:3]:
                all_refs.append({
                    "record_id": e.id,
                    "suspect": s,
                    "source_file_id": e.source_file_id,
                    "source_row": e.source_row,
                    "timestamp": e.event_time.isoformat() if e.event_time else None
                })

        results.append({
            "number": num,
            "total_shared_events": sum(counts_by_suspect.values()),
            "counts_by_suspect": counts_by_suspect,
            "duration_by_suspect": duration_by_suspect,
            "evidence_refs": all_refs
        })

    results.sort(key=lambda x: x["total_shared_events"], reverse=True)

    return {
        "case_id": case_id,
        "suspects": suspects,
        "common_contacts_count": len(results),
        "common_contacts": results
    }

def get_tower_timeline(
    db,
    case_id: str,
    number: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None
) -> Dict[str, Any]:
    query = db.query(CDRRecord).filter(CDRRecord.case_id == case_id)
    if number:
        query = query.filter((CDRRecord.a_party == number) | (CDRRecord.b_party == number))
    if start_time:
        query = query.filter(CDRRecord.event_time >= start_time)
    if end_time:
        query = query.filter(CDRRecord.event_time <= end_time)

    records = query.order_by(CDRRecord.event_time.asc()).all()

    # Load tower metadata
    towers = db.query(TowerSite).filter(TowerSite.case_id == case_id).all()
    tower_map = {t.cell_id: t for t in towers}

    timeline = []
    unmatched_cells = set()

    for r in records:
        cell_id = r.first_cell_id or r.last_cell_id
        if not cell_id:
            continue

        site = tower_map.get(cell_id)
        if not site:
            unmatched_cells.add(cell_id)

        timeline.append({
            "record_id": r.id,
            "source_file_id": r.source_file_id,
            "source_row": r.source_row,
            "timestamp": r.event_time.isoformat() if r.event_time else None,
            "a_party": r.a_party,
            "b_party": r.b_party,
            "cell_id": cell_id,
            "site_name": site.site_name if site else "Unmatched Cell Site",
            "latitude": site.latitude if site else None,
            "longitude": site.longitude if site else None,
            "matched": site is not None,
            "disclaimer": "Serving cell association only; not exact GPS point."
        })

    return {
        "case_id": case_id,
        "target_number": number,
        "total_events": len(timeline),
        "unmatched_cell_ids": list(unmatched_cells),
        "timeline": timeline
    }

def detect_device_sim_links(
    db,
    case_id: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None
) -> Dict[str, Any]:
    query = db.query(CDRRecord).filter(CDRRecord.case_id == case_id)
    if start_time:
        query = query.filter(CDRRecord.event_time >= start_time)
    if end_time:
        query = query.filter(CDRRecord.event_time <= end_time)

    records = query.all()

    # Group by IMEI -> list of (IMSI, MSISDN, time, record)
    imei_groups = defaultdict(lambda: {
        "msisdns": set(),
        "imsis": set(),
        "first_seen": None,
        "last_seen": None,
        "evidence_refs": []
    })

    # Group by MSISDN -> list of observed IMEIs
    msisdn_groups = defaultdict(lambda: {
        "imeis": set(),
        "first_seen": None,
        "last_seen": None,
        "evidence_refs": []
    })

    for r in records:
        if r.imei:
            g = imei_groups[r.imei]
            g["msisdns"].add(r.a_party)
            if r.imsi:
                g["imsis"].add(r.imsi)
            if not g["first_seen"] or r.event_time < g["first_seen"]:
                g["first_seen"] = r.event_time
            if not g["last_seen"] or r.event_time > g["last_seen"]:
                g["last_seen"] = r.event_time
            if len(g["evidence_refs"]) < 5:
                g["evidence_refs"].append({
                    "record_id": r.id,
                    "source_file_id": r.source_file_id,
                    "source_row": r.source_row,
                    "timestamp": r.event_time.isoformat() if r.event_time else None,
                    "msisdn": r.a_party,
                    "imsi": r.imsi
                })

        if r.a_party and r.imei:
            mg = msisdn_groups[r.a_party]
            mg["imeis"].add(r.imei)
            if not mg["first_seen"] or r.event_time < mg["first_seen"]:
                mg["first_seen"] = r.event_time
            if not mg["last_seen"] or r.event_time > mg["last_seen"]:
                mg["last_seen"] = r.event_time
            if len(mg["evidence_refs"]) < 5:
                mg["evidence_refs"].append({
                    "record_id": r.id,
                    "source_file_id": r.source_file_id,
                    "source_row": r.source_row,
                    "timestamp": r.event_time.isoformat() if r.event_time else None,
                    "imei": r.imei
                })

    # Find devices observed with multiple MSISDNs / IMSIs (potential handset sharing or SIM change)
    shared_devices = []
    for imei, data in imei_groups.items():
        if len(data["msisdns"]) > 1 or len(data["imsis"]) > 1:
            shared_devices.append({
                "imei": imei,
                "associated_numbers": list(data["msisdns"]),
                "associated_imsis": list(data["imsis"]),
                "observation_count": len(data["evidence_refs"]),
                "first_seen": data["first_seen"].isoformat() if data["first_seen"] else None,
                "last_seen": data["last_seen"].isoformat() if data["last_seen"] else None,
                "evidence_refs": data["evidence_refs"],
                "note": "Handset observed with multiple subscriptions. Does not prove physical user identity."
            })

    # Numbers observed with multiple handsets
    handset_changers = []
    for num, data in msisdn_groups.items():
        if len(data["imeis"]) > 1:
            handset_changers.append({
                "number": num,
                "associated_imeis": list(data["imeis"]),
                "first_seen": data["first_seen"].isoformat() if data["first_seen"] else None,
                "last_seen": data["last_seen"].isoformat() if data["last_seen"] else None,
                "evidence_refs": data["evidence_refs"],
                "note": "Subscriber observed across multiple IMEI hardware identifiers."
            })

    return {
        "case_id": case_id,
        "shared_devices_count": len(shared_devices),
        "shared_devices": shared_devices,
        "handset_changes_count": len(handset_changers),
        "handset_changes": handset_changers
    }

def correlate_ipdr(
    db,
    case_id: str,
    ip_or_subscriber: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None
) -> Dict[str, Any]:
    query = db.query(IPDRRecord).filter(IPDRRecord.case_id == case_id)
    if ip_or_subscriber:
        query = query.filter(
            (IPDRRecord.public_ip == ip_or_subscriber) | 
            (IPDRRecord.subscriber_ref.contains(ip_or_subscriber))
        )
    if start_time:
        query = query.filter(IPDRRecord.start_time >= start_time)
    if end_time:
        query = query.filter(IPDRRecord.start_time <= end_time)

    records = query.all()

    # Find matching CDR events for same subscriber or time window
    results = []
    for r in records:
        match_type = "EXACT_SUBSCRIBER" if r.subscriber_ref else "IP_ONLY_AMBIGUOUS"
        disclaimer = (
            "Session matched by subscriber reference."
            if r.subscriber_ref
            else "A public IP is not a person. Shared NAT and dynamic allocation make attribution ambiguous without port linkage."
        )

        results.append({
            "record_id": r.id,
            "source_file_id": r.source_file_id,
            "source_row": r.source_row,
            "subscriber_ref": r.subscriber_ref,
            "public_ip": r.public_ip,
            "source_port": r.source_port,
            "destination_ip": r.destination_ip,
            "destination_port": r.destination_port,
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "end_time": r.end_time.isoformat() if r.end_time else None,
            "bytes_in": r.bytes_in,
            "bytes_out": r.bytes_out,
            "match_status": match_type,
            "ambiguity_note": disclaimer
        })

    return {
        "case_id": case_id,
        "query_target": ip_or_subscriber,
        "total_sessions": len(results),
        "sessions": results
    }
