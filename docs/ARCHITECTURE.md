# TRACEPOINT — System Architecture (PS03)

## 1. Overview
TRACEPOINT is a provenance-first telecom investigation intelligence platform tailored for CDR (Call Detail Records) and IPDR (Internet Protocol Detail Records) analytics.

Unlike generic chatbot wrappers, TRACEPOINT decouples calculation from explanation:
1. **Deterministic Analytics Engine**: All contact intersections, tower timelines, graph centralities, and device associations are computed by deterministic backend modules (SQL, Pandas, NetworkX).
2. **AI Copilot Orchestration**: The AI Copilot operates strictly as an interface and summarizer. It invokes pre-registered backend tools and formats validated findings with row-level evidence citations (`[EV-001]`).
3. **Forensic Integrity Chain**: Source files are cryptographically fingerprinted using SHA-256. Every finding stores references to the `source_file_id`, `source_row`, and canonical record ID.

```
+----------------------------------------------------------------+
|                     React + TypeScript UI                      |
| (Dashboard | Import Studio | Network Graph | Timeline | Copilot)|
+-------------------------------+--------------------------------+
                                | HTTP REST / JSON
                                v
+----------------------------------------------------------------+
|                       FastAPI Backend                          |
|  - Auth & Case RBAC           - File Normalization Pipeline    |
|  - Graph Engine (NetworkX)    - Deterministic Analytics Engine |
|  - AI Tool Orchestrator       - Report Generator (ReportLab)   |
+-------------------+--------------------+-----------------------+
                    |                    |
                    v                    v
         +--------------------+  +----------------------+
         | SQLite / Postgres  |  | Storage & Uploads    |
         | Canonical Entities |  | Raw bytes & Reports  |
         +--------------------+  +----------------------+
```

## 2. Ingestion & Normalization Engine
- **Pre-flight Checks**: Size validation, mime check, and SHA-256 generation.
- **Template Detection**: Matches incoming column headers against signature profiles in `operator_mappings.json`.
- **Validation Rules**:
  - Missing required parties (`MISSING_A_PARTY` / `MISSING_B_PARTY`) -> Row rejected into audit queue.
  - Invalid timestamps (`INVALID_TIMESTAMP`) -> Rejected.
  - Negative call duration (`NEGATIVE_DURATION`) -> Rejected.
  - Missing IMEI / IMSI -> Accepted with warning if core event is valid.
  - Unknown Cell ID -> Kept and flagged as unmatched.

## 3. Network Graph Construction
- Directed graph built using **NetworkX**:
  - **Nodes**: MSISDN dialable phone numbers.
  - **Edges**: Directed communication events from A-party to B-party, weighted by call count and duration.
  - **Metrics**: In-degree, Out-degree, Degree, Betweenness Centrality, and Community Detection (greedy modularity clustering).

## 4. Responsible AI & Forensic Boundaries
- **No Guilt Claims**: Network centrality or call volume is never presented as criminal guilt.
- **No Continuous GPS**: Cell tower associations represent serving sector coverage at event timestamp, never pinpoint GPS routes.
- **Public IP Caution**: Public IP addresses are interfaces, not people; dynamic NAT and carrier port translations are explicitly noted.
