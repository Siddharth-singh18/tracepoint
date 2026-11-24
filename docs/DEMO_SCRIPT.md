# TRACEPOINT — 3-Minute Hackathon Demo Script

Follow this script to demonstrate TRACEPOINT to judges and evaluators cleanly within 180 seconds.

---

### Step 1: The Problem & Opening Pitch (0:00 - 0:25)
- **Speaker**: "In modern telecom investigations, officers receive thousands of unstandardized rows across disparate operator exports—Operator A, Operator B, IPDR data sessions, and cell tower lists. Analyzing them manually in Excel leads to missed links, lost evidence provenance, and non-defensible conclusions."
- **Action**: Open TRACEPOINT Cases Console at `http://localhost:3000`.

---

### Step 2: Ingestion & Integrity Validation (0:25 - 0:50)
- **Action**: Click **"Load PS03 Demo Case"** (or upload files in **Import Studio**).
- **Show Judges**:
  - Auto-detection of Operator A and Operator B templates.
  - Cryptographic **SHA-256 fingerprinting** of every raw file.
  - Transparent validation report: accepted rows vs rejected rows with exact forensic reason codes (`MISSING_A_PARTY`, `NEGATIVE_DURATION`, `INVALID_TIMESTAMP`).
  - Emphasize: *"Notice how TRACEPOINT never silently discards malformed data."*

---

### Step 3: Cross-Suspect Network Intelligence (0:50 - 1:20)
- **Action**: Navigate to **Network Graph Explorer**. Select primary suspects `9000000001` and `9000000002`.
- **Show Judges**:
  - The deterministic intersection calculation immediately isolates shared contacts `9000000003` and `9000000004`.
  - Point to the NetworkX graph metrics (degree, betweenness centrality, community clusters).
  - Point to the legal caution banner: *"Structural graph centrality is an algorithmic measure, not evidence of guilt."*

---

### Step 4: Tower Timeline & IPDR Session Correlation (1:20 - 1:45)
- **Action**: Switch to **Timeline & Map** tab.
- **Show Judges**:
  - Interactive Leaflet map displaying cell site locations across Delhi (`CELL-NORTH-01`, `CELL-CENTRAL-02`, `CELL-SOUTH-03`).
  - Point out that TRACEPOINT explicitly labels these as antenna sector associations at event timestamps, NEVER claiming continuous or exact GPS routes.
  - Switch to **IPDR & Devices** tab to show the handset IMEI sharing detection (`35987654321001` observed across both suspects).

---

### Step 5: Evidence-Grounded AI Copilot & Hindi Queries (1:45 - 2:25)
- **Action**: Open **AI Copilot** tab.
- **Query 1 (English)**: Click *"Find common contacts between 9000000001 and 9000000002"*.
  - Show the executed tool badge (`find_common_contacts`).
  - Click on evidence pill **`[EV-001]`** to show the popup linking to the exact source file and row number.
- **Query 2 (Hindi / Hinglish)**: Click *"9000000001 aur 9000000002 ke beech common numbers kaun se hain?"*.
  - Show that natural Hindi queries resolve to the exact same deterministic backend facts!

---

### Step 6: One-Click Dossier Export & Closing (2:25 - 3:00)
- **Action**: Go to **Evidence Reports** tab.
- **Action**: Click **"Download Intelligence PDF"**.
- **Show Judges**: The generated ReportLab PDF containing case summary, file checksums, analytical findings, and formal officer review disclaimer.
- **Closing Pitch**: *"TRACEPOINT transforms fragmented telecom records into an evidence-linked, provenance-first investigation workspace. AI assists the officer; evidence and human review remain the authority. Thank you!"*
