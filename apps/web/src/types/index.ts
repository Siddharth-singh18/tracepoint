export interface CaseItem {
  id: string;
  title: string;
  description?: string;
  incident_start?: string;
  incident_end?: string;
  status: string;
  created_at?: string;
  file_count?: number;
  cdr_count?: number;
  ipdr_count?: number;
}

export interface CaseDetail {
  id: string;
  title: string;
  description?: string;
  incident_start?: string;
  incident_end?: string;
  status: string;
  summary: {
    files_count: number;
    cdr_count: number;
    ipdr_count: number;
    tower_count: number;
    suggested_suspects: string[];
  };
  files: Array<{
    id: string;
    filename: string;
    file_type: string;
    checksum: string;
    import_status: string;
    uploaded_at?: string;
  }>;
}

export interface CommonContact {
  number: string;
  total_shared_events: number;
  counts_by_suspect: Record<string, number>;
  duration_by_suspect: Record<string, number>;
  evidence_refs: Array<{
    record_id: string;
    suspect: string;
    source_file_id: string;
    source_row: number;
    timestamp?: string;
  }>;
}

export interface GraphNode {
  id: string;
  label: string;
  degree: number;
  in_degree: number;
  out_degree: number;
  betweenness_centrality: number;
  community_id: number;
  is_selected: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  call_count: number;
  total_duration: number;
  first_seen?: string;
  last_seen?: string;
  record_ids: string[];
}

export interface TowerTimelineEvent {
  record_id: string;
  source_file_id: string;
  source_row: number;
  timestamp: string;
  a_party: string;
  b_party: string;
  cell_id: string;
  site_name: string;
  latitude?: number;
  longitude?: number;
  matched: boolean;
  disclaimer: string;
}

export interface DeviceLink {
  imei: string;
  associated_numbers: string[];
  associated_imsis: string[];
  observation_count: number;
  first_seen?: string;
  last_seen?: string;
  evidence_refs: any[];
  note: string;
}

export interface IPDRSession {
  record_id: string;
  source_file_id: string;
  source_row: number;
  subscriber_ref?: string;
  public_ip: string;
  source_port?: number;
  destination_ip?: string;
  destination_port?: number;
  start_time: string;
  end_time?: string;
  bytes_in: number;
  bytes_out: number;
  match_status: string;
  ambiguity_note: string;
}

export interface EvidenceRef {
  id: string;
  source_file_id: string;
  source_row: number;
  record_type: string;
  record_id: string;
  timestamp?: string;
  excerpt?: any;
}

export interface Finding {
  type: string;
  entity?: string;
  metrics: Record<string, any>;
  evidence: EvidenceRef[];
  limitations: string[];
}

export interface CopilotResponse {
  answer: string;
  findings: Finding[];
  data_sufficiency: string;
  limitations: string[];
  tool_invocations: Array<{
    tool: string;
    arguments: any;
    result_summary: string;
  }>;
}
