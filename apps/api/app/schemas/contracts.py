from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class CaseCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    incident_start: Optional[datetime] = None
    incident_end: Optional[datetime] = None

class CaseResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    incident_start: Optional[datetime] = None
    incident_end: Optional[datetime] = None
    status: str
    created_at: datetime
    files_count: Optional[int] = 0
    cdr_count: Optional[int] = 0
    ipdr_count: Optional[int] = 0

class MappingSaveRequest(BaseModel):
    template_name: Optional[str] = None
    record_type: str # CDR, IPDR, TOWER
    columns: Dict[str, str]
    timestamp_format: Optional[str] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    timezone: Optional[str] = "Asia/Kolkata"

class IngestRequest(BaseModel):
    mapping: Optional[MappingSaveRequest] = None

class CommonContactsRequest(BaseModel):
    suspects: List[str]
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class EvidenceRefSchema(BaseModel):
    id: Optional[str] = None
    source_file_id: str
    source_row: int
    record_type: str
    record_id: str
    timestamp: Optional[str] = None
    excerpt: Optional[Dict[str, Any]] = None

class FindingSchema(BaseModel):
    type: str
    entity: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    evidence: List[EvidenceRefSchema] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)

class CopilotQueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class CopilotAnswerResponse(BaseModel):
    answer: str
    findings: List[FindingSchema] = Field(default_factory=list)
    data_sufficiency: str = "SUPPORTED" # SUPPORTED, INSUFFICIENT_DATA, AMBIGUOUS
    limitations: List[str] = Field(default_factory=list)
    tool_invocations: List[Dict[str, Any]] = Field(default_factory=list)

class ReportGenerateRequest(BaseModel):
    title: Optional[str] = None
    format: str = "pdf" # pdf or excel
    include_graph: bool = True
    include_timeline: bool = True
