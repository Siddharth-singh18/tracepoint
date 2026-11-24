import re
import json
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.analytics.engine import (
    get_top_contacts,
    find_common_contacts,
    get_tower_timeline,
    detect_device_sim_links,
    correlate_ipdr
)
from app.models.entities import CDRRecord, Case, AuditLog

class AICopilotOrchestrator:
    def __init__(self, db):
        self.db = db

    def process_query(self, case_id: str, query: str) -> Dict[str, Any]:
        q = query.lower().strip()
        case = self.db.query(Case).filter(Case.id == case_id).first()
        if not case:
            return {
                "answer": "Case not found.",
                "findings": [],
                "data_sufficiency": "INSUFFICIENT_DATA",
                "limitations": ["Invalid case identifier."]
            }

        # Check for numbers in query (e.g. 10 digits or synthetic like 9000000001)
        phone_matches = re.findall(r"\b\d{10}\b", query)
        ip_matches = re.findall(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", query)

        tool_invoked = None
        tool_args = {}
        tool_result = {}

        # 1. Check for common contacts / shared numbers / "common", "dono ke beech", "shared"
        is_common_query = any(k in q for k in [
            "common", "shared", "mutual", "dono", "aapas", "intersection", "beech"
        ])

        is_tower_query = any(k in q for k in [
            "tower", "location", "movement", "cell", "kahan tha", "jagah", "timeline", "site"
        ])

        is_imei_query = any(k in q for k in [
            "imei", "imsi", "sim", "handset", "device", "phone badla", "device change"
        ])

        is_ipdr_query = any(k in q for k in [
            "ip", "ipdr", "internet", "public ip", "port", "data session"
        ]) or len(ip_matches) > 0

        is_top_query = any(k in q for k in [
            "top", "frequent", "sabse zyada", "most called", "call count", "frequency", "calls"
        ])

        # Routing decisions
        if is_common_query or (len(phone_matches) >= 2 and not is_tower_query):
            tool_invoked = "find_common_contacts"
            suspects = phone_matches if len(phone_matches) >= 2 else ["9000000001", "9000000002"]
            tool_args = {"case_id": case_id, "suspects": suspects}
            tool_result = find_common_contacts(self.db, case_id, suspects)
            
            common_list = tool_result.get("common_contacts", [])
            findings = []
            ev_counter = 1

            if common_list:
                answer = f"Found {len(common_list)} common contact(s) between suspects {', '.join(suspects)}: {', '.join(c['number'] for c in common_list)}."
                for c in common_list:
                    ev_items = []
                    for ref in c.get("evidence_refs", []):
                        ev_items.append({
                            "id": f"EV-{ev_counter:03d}",
                            "source_file_id": ref.get("source_file_id", "FILE-CDR"),
                            "source_row": ref.get("source_row", 0),
                            "record_type": "CDR",
                            "record_id": ref.get("record_id", "CDR-REC"),
                            "timestamp": ref.get("timestamp"),
                            "excerpt": {"suspect": ref.get("suspect"), "contact": c["number"]}
                        })
                        ev_counter += 1

                    findings.append({
                        "type": "COMMON_CONTACT",
                        "entity": c["number"],
                        "metrics": {
                            "total_shared_events": c["total_shared_events"],
                            "counts_by_suspect": c["counts_by_suspect"],
                            "duration_by_suspect": c["duration_by_suspect"]
                        },
                        "evidence": ev_items,
                        "limitations": [
                            "A shared contact demonstrates communication overlap in records; it does not establish conspiracy or illegal intent."
                        ]
                    })
                sufficiency = "SUPPORTED"
            else:
                answer = f"No shared or common contacts found between {', '.join(suspects)} in the uploaded case records."
                sufficiency = "SUPPORTED"

            return {
                "answer": answer,
                "findings": findings,
                "data_sufficiency": sufficiency,
                "limitations": [
                    "Analysis limited to records imported into this case.",
                    "Human verification required before drawing investigative conclusions."
                ],
                "tool_invocations": [{
                    "tool": tool_invoked,
                    "arguments": tool_args,
                    "result_summary": f"{len(common_list)} common contacts identified"
                }]
            }

        elif is_imei_query:
            tool_invoked = "detect_imei_sim_links"
            tool_args = {"case_id": case_id}
            tool_result = detect_device_sim_links(self.db, case_id)

            shared = tool_result.get("shared_devices", [])
            changers = tool_result.get("handset_changes", [])
            findings = []
            ev_counter = 1

            if shared or changers:
                answer = (
                    f"Identified {len(shared)} device(s) observed across multiple numbers/SIMs "
                    f"and {len(changers)} number(s) observed switching handsets."
                )
                for d in shared:
                    ev_items = [
                        {
                            "id": f"EV-{ev_counter:03d}",
                            "source_file_id": r["source_file_id"],
                            "source_row": r["source_row"],
                            "record_type": "CDR",
                            "record_id": r["record_id"],
                            "timestamp": r["timestamp"],
                            "excerpt": {"imei": d["imei"], "msisdn": r["msisdn"]}
                        }
                        for r in d.get("evidence_refs", [])
                    ]
                    ev_counter += len(ev_items)
                    findings.append({
                        "type": "SHARED_DEVICE",
                        "entity": d["imei"],
                        "metrics": {
                            "associated_numbers": d["associated_numbers"],
                            "associated_imsis": d["associated_imsis"]
                        },
                        "evidence": ev_items,
                        "limitations": [
                            "Observed hardware association. Does not identify the physical individual operating the device."
                        ]
                    })
                sufficiency = "SUPPORTED"
            else:
                answer = "No multi-device or SIM-switching anomalies were observed in the current records."
                sufficiency = "SUPPORTED"

            return {
                "answer": answer,
                "findings": findings,
                "data_sufficiency": sufficiency,
                "limitations": [
                    "Data reflects only recorded IMEI/IMSI tags in CDR exports.",
                    "Hardware sharing may occur legitimately among family, repair shops, or colleagues."
                ],
                "tool_invocations": [{
                    "tool": tool_invoked,
                    "arguments": tool_args,
                    "result_summary": f"{len(shared)} shared device anomalies found"
                }]
            }

        elif is_tower_query:
            target_num = phone_matches[0] if phone_matches else None
            tool_invoked = "get_tower_timeline"
            tool_args = {"case_id": case_id, "number": target_num}
            tool_result = get_tower_timeline(self.db, case_id, number=target_num)

            tl = tool_result.get("timeline", [])
            findings = []
            if tl:
                distinct_towers = list(set(t["site_name"] for t in tl))
                answer = (
                    f"Tower timeline records {len(tl)} event(s) across {len(distinct_towers)} cell site(s): "
                    f"{', '.join(distinct_towers[:5])}. Cell associations reflect serving site coverage, not pinpoint GPS."
                )
                sample_ev = []
                for i, t in enumerate(tl[:5], 1):
                    sample_ev.append({
                        "id": f"EV-{i:03d}",
                        "source_file_id": t["source_file_id"],
                        "source_row": t["source_row"],
                        "record_type": "CDR",
                        "record_id": t["record_id"],
                        "timestamp": t["timestamp"],
                        "excerpt": {"cell_id": t["cell_id"], "site_name": t["site_name"]}
                    })

                findings.append({
                    "type": "TOWER_TIMELINE",
                    "entity": target_num or "Case All Numbers",
                    "metrics": {
                        "total_events": len(tl),
                        "unique_sites": len(distinct_towers)
                    },
                    "evidence": sample_ev,
                    "limitations": [
                        "Record was associated with this serving cell/site at this time. Cell ID does not provide exact GPS location or exact travel trajectory."
                    ]
                })
                sufficiency = "SUPPORTED"
            else:
                answer = "No cell tower activity found for the specified criteria."
                sufficiency = "SUPPORTED"

            return {
                "answer": answer,
                "findings": findings,
                "data_sufficiency": sufficiency,
                "limitations": [
                    "Cell-site coverage depends on terrain, weather, and antenna tilt."
                ],
                "tool_invocations": [{
                    "tool": tool_invoked,
                    "arguments": tool_args,
                    "result_summary": f"{len(tl)} tower associations retrieved"
                }]
            }

        elif is_ipdr_query:
            target = ip_matches[0] if ip_matches else (phone_matches[0] if phone_matches else None)
            tool_invoked = "correlate_ipdr"
            tool_args = {"case_id": case_id, "ip_or_subscriber": target}
            tool_result = correlate_ipdr(self.db, case_id, ip_or_subscriber=target)

            sessions = tool_result.get("sessions", [])
            findings = []
            if sessions:
                answer = f"Retrieved {len(sessions)} matching IPDR internet session(s) for target '{target or 'all'}'. Note: A public IP does not identify an individual without NAT port translation and ISP binding."
                ev_items = []
                for idx, s in enumerate(sessions[:5], 1):
                    ev_items.append({
                        "id": f"EV-{idx:03d}",
                        "source_file_id": s["source_file_id"],
                        "source_row": s["source_row"],
                        "record_type": "IPDR",
                        "record_id": s["record_id"],
                        "timestamp": s["start_time"],
                        "excerpt": {
                            "public_ip": s["public_ip"],
                            "subscriber": s["subscriber_ref"],
                            "bytes_in": s["bytes_in"]
                        }
                    })

                findings.append({
                    "type": "IPDR_SESSION_MATCH",
                    "entity": target or "IPDR Dataset",
                    "metrics": {"total_matched_sessions": len(sessions)},
                    "evidence": ev_items,
                    "limitations": [
                        "Public IP address indicates network endpoint only; dynamic IP addressing and NAT require port verification for safe attribution."
                    ]
                })
                sufficiency = "SUPPORTED"
            else:
                answer = f"The supplied IPDR records contain no matching session for '{target}'. The dataset does not support this query."
                sufficiency = "INSUFFICIENT_DATA"

            return {
                "answer": answer,
                "findings": findings,
                "data_sufficiency": sufficiency,
                "limitations": [
                    "A public IP is not a person. Never infer criminal identity directly from an IP record."
                ],
                "tool_invocations": [{
                    "tool": tool_invoked,
                    "arguments": tool_args,
                    "result_summary": f"{len(sessions)} IPDR sessions analyzed"
                }]
            }

        else:
            # Default to top contacts analysis
            target_num = phone_matches[0] if phone_matches else None
            tool_invoked = "get_top_contacts"
            tool_args = {"case_id": case_id, "number": target_num}
            tool_result = get_top_contacts(self.db, case_id, number=target_num)

            contacts = tool_result.get("contacts", [])
            findings = []
            if contacts:
                top_names = [f"{c['number']} ({c['call_count']} calls)" for c in contacts[:5]]
                target_label = f"number {target_num}" if target_num else "all parties in case"
                answer = f"Top active contacts for {target_label}: {', '.join(top_names)}."

                ev_items = []
                for idx, c in enumerate(contacts[:3], 1):
                    for ref in c.get("evidence_refs", [])[:2]:
                        ev_items.append({
                            "id": f"EV-{idx:03d}",
                            "source_file_id": ref.get("source_file_id", "FILE-CDR"),
                            "source_row": ref.get("source_row", 0),
                            "record_type": "CDR",
                            "record_id": ref.get("record_id", "CDR-REC"),
                            "timestamp": ref.get("timestamp"),
                            "excerpt": {"contact": c["number"], "total_duration": c["total_duration"]}
                        })

                findings.append({
                    "type": "TOP_CONTACTS",
                    "entity": target_num or "Case Aggregation",
                    "metrics": {
                        "unique_contacts": len(contacts),
                        "top_number": contacts[0]["number"] if contacts else None
                    },
                    "evidence": ev_items,
                    "limitations": [
                        "Frequency of communication reflects volume only. High call volume does not imply complicity."
                    ]
                })
                sufficiency = "SUPPORTED"
            else:
                answer = "No communication events found in this case. Please ensure CDR records are imported."
                sufficiency = "INSUFFICIENT_DATA"

            return {
                "answer": answer,
                "findings": findings,
                "data_sufficiency": sufficiency,
                "limitations": [
                    "Evidence-backed analysis derived deterministically from uploaded files."
                ],
                "tool_invocations": [{
                    "tool": tool_invoked,
                    "arguments": tool_args,
                    "result_summary": f"Calculated top contacts for {target_num or 'case'}"
                }]
            }
