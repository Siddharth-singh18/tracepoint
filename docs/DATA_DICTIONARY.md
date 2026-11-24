# TRACEPOINT — Data Dictionary & Canonical Schema

## 1. Canonical CDR Schema (`cdr_records`)
| Field Name | Type | Nullable | Description |
|------------|------|----------|-------------|
| `id` | String(64) | No | Canonical record primary key (e.g., `CDR-00142`) |
| `case_id` | String(64) | No | Foreign key linking to investigation case |
| `source_file_id` | String(64) | No | Cryptographic file origin pointer |
| `source_row` | Integer | No | Original line/row number in uploaded CSV/XLSX |
| `event_time` | DateTime | No | Normalized timestamp (ISO 8601, Asia/Kolkata) |
| `a_party` | String(64) | No | Calling party phone number / MSISDN |
| `b_party` | String(64) | No | Called party phone number / MSISDN |
| `direction` | String(32) | No | Event direction (`INCOMING`, `OUTGOING`) |
| `event_type` | String(32) | No | Communication type (`VOICE`, `SMS`, `DATA`) |
| `duration_seconds` | Integer | No | Call duration in seconds (>= 0) |
| `imei` | String(64) | Yes | Device equipment identifier |
| `imsi` | String(64) | Yes | Subscriber SIM card identity |
| `first_cell_id` | String(64) | Yes | Serving cell identifier at call start |
| `last_cell_id` | String(64) | Yes | Serving cell identifier at call end |
| `raw_values_json` | JSON | Yes | Preserved original operator row dictionary |

## 2. Canonical IPDR Schema (`ipdr_records`)
| Field Name | Type | Nullable | Description |
|------------|------|----------|-------------|
| `id` | String(64) | No | Canonical IPDR record key (e.g., `IPDR-00412`) |
| `case_id` | String(64) | No | Foreign key linking to investigation case |
| `source_file_id` | String(64) | No | Cryptographic file origin pointer |
| `source_row` | Integer | No | Original line/row number in uploaded CSV/XLSX |
| `subscriber_ref`| String(128)| Yes | Target subscriber reference if provided |
| `public_ip` | String(64) | No | Public IP observed during session |
| `source_port` | Integer | Yes | Transport source port (TCP/UDP) |
| `destination_ip`| String(64)| Yes | Destination IP address |
| `destination_port`| Integer | Yes | Destination service port (e.g. 443, 80) |
| `start_time` | DateTime | No | Session initiation timestamp |
| `end_time` | DateTime | Yes | Session termination timestamp |
| `bytes_in` | Integer | No | Inbound bytes received |
| `bytes_out` | Integer | No | Outbound bytes transmitted |

## 3. Cell Tower Metadata (`tower_sites`)
| Field Name | Type | Nullable | Description |
|------------|------|----------|-------------|
| `id` | String(64) | No | Site record primary key |
| `case_id` | String(64) | No | Foreign key linking to case |
| `cell_id` | String(64) | No | Identifier matching CDR first/last cell ID |
| `site_name` | String(128)| No | Human-readable BTS site name |
| `latitude` | Float | No | Geographic latitude (WGS84) |
| `longitude` | Float | No | Geographic longitude (WGS84) |
| `sector` | Integer | Yes | Antenna sector number (1, 2, 3) |
| `azimuth` | Integer | Yes | Antenna azimuth angle (0-360 degrees) |
| `address` | String(256)| Yes | Postal / locality address of tower structure |
