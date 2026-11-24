# TRACEPOINT — API Contract Specification

All routes are mounted under `/api/v1` and return standard response envelopes:
```json
{
  "status": "success",
  "data": { ... },
  "message": "Optional descriptive status"
}
```

## 1. Case Management
- `GET /api/v1/cases`
  - Returns list of cases with aggregate file, CDR, and IPDR counts.
- `POST /api/v1/cases`
  - Body: `{"title": "string", "description": "string", "incident_start": "ISO", "incident_end": "ISO"}`
- `GET /api/v1/cases/{case_id}`
  - Returns case metadata, summary statistics, primary numbers, and source files.
- `POST /api/v1/cases/seed-demo`
  - Initializes `CASE-DEMO-001` with synthetic CDR, IPDR, and tower datasets.

## 2. Ingestion & Validation
- `POST /api/v1/cases/{case_id}/files`
  - Multipart form upload (`file`, `file_type`, `timezone`).
  - Computes SHA-256 checksum and returns header preview + detected template.
- `POST /api/v1/files/{file_id}/ingest`
  - Runs normalization and row validation. Returns `accepted_count`, `rejected_count`, `warning_count`, and audit list.
- `GET /api/v1/files/{file_id}/import-report`
  - Returns quality report and rejected row error codes (`MISSING_A_PARTY`, `INVALID_TIMESTAMP`, etc.).

## 3. Deterministic Analytics & Graph
- `GET /api/v1/cases/{case_id}/analytics/top-contacts?number={num}`
  - Calculates top counterpart numbers, duration, in/out breakdown, and evidence references.
- `POST /api/v1/cases/{case_id}/analytics/common-contacts`
  - Body: `{"suspects": ["9000000001", "9000000002"]}`
  - Calculates set intersection, counts per suspect, and row citations.
- `GET /api/v1/cases/{case_id}/graph?selected_numbers=9000000001,9000000002`
  - Returns NetworkX computed nodes (degree, betweenness, community) and directed weighted edges.
- `GET /api/v1/cases/{case_id}/timeline/tower?number={num}`
  - Chronological cell-site joins, coordinates, and unmatched cell ID list.
- `GET /api/v1/cases/{case_id}/analytics/device-links`
  - Groupings of IMEI hardware identifiers observed across multiple MSISDNs/IMSIs.
- `POST /api/v1/cases/{case_id}/analytics/ipdr-correlate?ip_or_subscriber={target}`
  - IPDR session matching with NAT ambiguity disclaimers.

## 4. AI Copilot
- `POST /api/v1/cases/{case_id}/copilot/messages`
  - Body: `{"query": "Find common contacts between 9000000001 and 9000000002"}`
  - Routes intent to deterministic backend tool. Returns structured explanation with evidence citations `[EV-001]` and legal limitations. Supports Hindi/Hinglish.

## 5. Reports
- `POST /api/v1/cases/{case_id}/reports`
  - Body: `{"format": "pdf"}` or `{"format": "excel"}`
- `GET /api/v1/reports/{report_id}`
  - Direct download stream of ReportLab PDF or openpyxl XLSX.
