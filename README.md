# TRACEPOINT — Telecom Investigation Intelligence Platform
> **PS03: CDR / IPDR Analysis Tool with Evidence-Grounded AI Investigation Assistant**

[![Acceptance Tests](https://img.shields.io/badge/Tests-T01--T13%20Passed-emerald)](docs/TEST_RESULTS.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue)](https://www.python.org/)
[![Node](https://img.shields.io/badge/React-18%20%7C%20TypeScript%20%7C%20Vite-cyan)](https://vitejs.dev/)

---

## 1. Executive Summary
**TRACEPOINT** is an intelligence-grade investigation workspace designed to turn fragmented, multi-operator telecom records (CDR) and internet session logs (IPDR) into an evidence-linked, court-admissible investigation workflow.

Rather than acting as a generic chatbot over CSV files, TRACEPOINT implements a **provenance-first architecture**:
- **Deterministic Analytics Engine**: Mathematical intersection, NetworkX graph centrality, tower chronology, and device-SIM link detection are computed with zero hallucinations.
- **AI Investigation Copilot**: Natural language queries (supporting English, Hindi, and Hinglish) route to deterministic backend tools. Answers contain clickable evidence citations (`[EV-001]`) mapping directly to the raw file and source row.
- **Forensic Boundaries & Ethics**: Enforces clear technical disclaimers—cell towers are identified as serving antenna sectors (never continuous GPS routes), and public IPs are qualified with NAT/port ambiguity notices.

---

## 2. Key Capabilities & Architecture

```
tracepoint/
├── apps/
│   ├── api/                 # FastAPI modular monolith backend
│   │   ├── app/
│   │   │   ├── analytics/   # Top contacts, intersection, tower timeline, IPDR match
│   │   │   ├── graph/       # NetworkX DiGraph, betweenness centrality, communities
│   │   │   ├── ingestion/   # Template detection, row validation, error code audit
│   │   │   ├── ai/          # Copilot tool-orchestrator with Hindi/Hinglish NLP
│   │   │   ├── reports/     # ReportLab PDF & openpyxl Excel dossier generators
│   │   │   └── models/      # Canonical database entities & Pydantic contracts
│   │   └── tests/           # Acceptance test suite (T01 - T13)
│   └── web/                 # React + TypeScript + Vite Workbench UI
│       └── src/
│           └── features/    # Dashboard, Ingestion, Network, Map, Copilot, Replay
├── data/
│   ├── synthetic/           # Operator A CDR, Operator B CDR, IPDR, Tower Sites
│   └── dictionaries/        # Dynamic operator mapping templates
├── docs/                    # Architecture, Data Dictionary, API Contract, Demo Script
└── storage/                 # Uploaded source files & generated PDF/Excel reports
```

### Modules:
1. **Case Dashboard**: Active investigations console with quick *"Load PS03 Demo Case"* action.
2. **Data Import Studio**: Header preview, operator auto-detection, SHA-256 fingerprinting, and downloadable rejected row audit logs (`MISSING_A_PARTY`, `NEGATIVE_DURATION`, etc.).
3. **Network Graph Explorer**: Interactive node/edge canvas, degree, centrality metrics, and cross-suspect common contact isolation.
4. **Tower Timeline & Map**: Leaflet cell-site mapping with sector coverage and chronological event sequence.
5. **IPDR & Device Links**: Internet session analysis and IMEI-SIM hardware sharing detection.
6. **Evidence-Grounded AI Copilot**: Tool-calling assistant with interactive citation popups and Hindi support.
7. **Evidence Reports**: One-click court-ready PDF and Excel dossier generation.
8. **Investigation Replay**: Chronological event scrubber and playback simulator.

---

## 3. Quick Start (Run Locally)

### Prerequisites:
- Python 3.10+
- Node.js 18+ & npm

### Option A: One-Command Fast Setup
In the project root, activate your environment:

```bash
# 1. Start the FastAPI Backend
PYTHONPATH=apps/api ./venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

In a second terminal window:
```bash
# 2. Start the React Frontend
cd apps/web
npm run dev
```

Open your browser at **`http://localhost:3000`** (or `http://localhost:5173`).

---

## 4. Acceptance Tests Verification (T01 - T13)
To verify all 13 core requirements specified in the blueprint:

```bash
PYTHONPATH=apps/api ./venv/bin/python3 apps/api/tests/test_backend.py
```

Expected output:
```
==========================================
RUNNING TRACEPOINT PS03 ACCEPTANCE TEST SUITE
==========================================
✓ Tower Ingest: 5 sites accepted
✓ Operator A: accepted=12, rejected=2, warnings=0
✓ Operator B: accepted=10, rejected=2
✓ IPDR Ingest: accepted=6
✓ Common contacts calculation verified (9000000003, 9000000004)
✓ Graph aggregation and metrics verified (12 nodes, 14 edges)
✓ Tower timeline events: 13, sample site: North Hub Tower
✓ IMEI hardware association verified
✓ AI Copilot answer citations verified
✓ AI Copilot Hindi query handled
✓ AI Copilot responsible boundaries verified
✓ PDF report generated
✓ Excel report generated
==========================================
ALL ACCEPTANCE CRITERIA (T01 - T13) PASSED SUCCESSFULLY!
==========================================
```

---

## 5. 3-Minute Demo Guide for Judges
See [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) for the exact step-by-step presentation flow:
1. **Load Demo Case**: Click "Load PS03 Demo Case" on the dashboard.
2. **Review Ingestion**: Inspect the accepted vs rejected rows with forensic reason codes.
3. **Explore Network**: Select suspects `9000000001` and `9000000002` to see shared contacts `9000000003` and `9000000004`.
4. **Map & Replay**: Visualize Delhi tower locations and scrub through the incident sequence.
5. **Ask Copilot**: Query in English or Hindi, and click on `[EV-001]` to inspect raw line citations.
6. **Export Dossier**: Download the generated ReportLab PDF evidence report.
