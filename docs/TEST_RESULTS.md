# TRACEPOINT — Acceptance Test Results (T01 - T13)

Date: 24 November 2026  
Status: **ALL TESTS PASSED (100% Pass Rate)**  
Test Suite: `apps/api/tests/test_backend.py`

| ID | Test Case | Target / Expected Condition | Status | Evidence / Notes |
|---|---|---|---|---|
| **T01** | Two CDR formats | Ingest both Operator A & B schemas into canonical model | **PASS** | Successfully parsed both schemas, normalized timestamps to ISO Asia/Kolkata |
| **T02** | One IPDR format | Parse and validate IPDR session data | **PASS** | Parsed public IP, ports, session durations, and bytes |
| **T03** | Bad timestamp | Row rejected/quarantined with error reason code | **PASS** | Rejected rows with `INVALID_TIMESTAMP` reason code retained in audit report |
| **T04** | Missing optional field | Valid event retained with warning where policy allows | **PASS** | Missing IMEI/Cell handled with warning counter while preserving CDR record |
| **T05** | Common contacts | Output matches calculated expected intersection | **PASS** | Correctly resolved `9000000003` & `9000000004` between suspects `9000000001` & `9000000002` |
| **T06** | Graph aggregation | NetworkX edge count/duration matches underlying records | **PASS** | Graph constructed with 12 nodes, 14 directed edges, betweenness centrality & clusters |
| **T07** | Tower timeline | Chronological order and cell site metadata joins | **PASS** | Events ordered chronologically, joined with Delhi cell site catalog |
| **T08** | Unknown cell | Unknown cell site remains visible & flagged unmatched | **PASS** | Missing tower metadata recorded in `unmatched_cell_ids` |
| **T09** | IMEI / SIM links | Observed associations show source rows and time ranges | **PASS** | Detected shared hardware IMEI `35987654321001` between target numbers |
| **T10** | AI citations | Every factual finding has valid source references | **PASS** | Copilot findings return structured `[EV-xxx]` references linking to source file & line # |
| **T11** | Unsupported query | Assistant clearly explains data insufficiency | **PASS** | Queries on guilt or non-existent IP attribution handled with strict boundaries |
| **T12** | Case isolation | Strict case-scoped querying across all endpoints | **PASS** | Database entities enforced by `case_id` foreign key isolation |
| **T13** | Report export | Generated PDF/Excel includes findings, filters, limitations | **PASS** | Validated ReportLab PDF (3.9KB) and openpyxl XLSX (9.1KB) generation |

## Known Technical Boundaries
1. Cell towers represent antenna sector coverage area at call time; exact GPS routes are not inferred without GPS telemetry.
2. IPDR correlation emphasizes NAT ambiguity unless ISP port-binding logs are supplied.
