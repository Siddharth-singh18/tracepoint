import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String(64), primary_key=True)
    email = Column(String(128), unique=True, nullable=False)
    role = Column(String(32), default="investigator")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Case(Base):
    __tablename__ = "cases"
    id = Column(String(64), primary_key=True)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    incident_start = Column(DateTime, nullable=True)
    incident_end = Column(DateTime, nullable=True)
    created_by = Column(String(64), nullable=True)
    status = Column(String(32), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    files = relationship("SourceFile", back_populates="case", cascade="all, delete-orphan")
    cdr_records = relationship("CDRRecord", back_populates="case", cascade="all, delete-orphan")
    ipdr_records = relationship("IPDRRecord", back_populates="case", cascade="all, delete-orphan")
    tower_sites = relationship("TowerSite", back_populates="case", cascade="all, delete-orphan")

class SourceFile(Base):
    __tablename__ = "source_files"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False)
    filename = Column(String(256), nullable=False)
    file_type = Column(String(32), nullable=False) # CDR, IPDR, TOWER
    checksum = Column(String(128), nullable=False)
    uploaded_by = Column(String(64), default="analyst_1")
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    timezone = Column(String(64), default="Asia/Kolkata")
    import_status = Column(String(32), default="PENDING") # PENDING, MAPPED, INGESTED, FAILED

    case = relationship("Case", back_populates="files")
    import_runs = relationship("ImportRun", back_populates="source_file", cascade="all, delete-orphan")

class ImportRun(Base):
    __tablename__ = "import_runs"
    id = Column(String(64), primary_key=True)
    source_file_id = Column(String(64), ForeignKey("source_files.id"), nullable=False)
    mapping_id = Column(String(64), nullable=True)
    accepted_count = Column(Integer, default=0)
    rejected_count = Column(Integer, default=0)
    warning_count = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    report_json = Column(JSON, nullable=True)

    source_file = relationship("SourceFile", back_populates="import_runs")

class CDRRecord(Base):
    __tablename__ = "cdr_records"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False)
    source_file_id = Column(String(64), ForeignKey("source_files.id"), nullable=False)
    source_row = Column(Integer, nullable=False)
    event_time = Column(DateTime, nullable=False, index=True)
    a_party = Column(String(64), nullable=False, index=True)
    b_party = Column(String(64), nullable=False, index=True)
    direction = Column(String(32), default="OUTGOING") # INCOMING, OUTGOING
    event_type = Column(String(32), default="VOICE") # VOICE, SMS, DATA, OTHER
    duration_seconds = Column(Integer, default=0)
    imei = Column(String(64), nullable=True, index=True)
    imsi = Column(String(64), nullable=True, index=True)
    first_cell_id = Column(String(64), nullable=True, index=True)
    last_cell_id = Column(String(64), nullable=True)
    raw_values_json = Column(JSON, nullable=True)

    case = relationship("Case", back_populates="cdr_records")

class IPDRRecord(Base):
    __tablename__ = "ipdr_records"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False)
    source_file_id = Column(String(64), ForeignKey("source_files.id"), nullable=False)
    source_row = Column(Integer, nullable=False)
    subscriber_ref = Column(String(128), nullable=True, index=True)
    public_ip = Column(String(64), nullable=False, index=True)
    source_port = Column(Integer, nullable=True)
    destination_ip = Column(String(64), nullable=True)
    destination_port = Column(Integer, nullable=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=True)
    bytes_in = Column(Integer, default=0)
    bytes_out = Column(Integer, default=0)
    raw_values_json = Column(JSON, nullable=True)

    case = relationship("Case", back_populates="ipdr_records")

class TowerSite(Base):
    __tablename__ = "tower_sites"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False)
    source_file_id = Column(String(64), ForeignKey("source_files.id"), nullable=True)
    cell_id = Column(String(64), nullable=False, index=True)
    site_name = Column(String(128), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    sector = Column(Integer, nullable=True)
    azimuth = Column(Integer, nullable=True)
    address = Column(String(256), nullable=True)
    metadata_json = Column(JSON, nullable=True)

    case = relationship("Case", back_populates="tower_sites")

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False)
    analysis_type = Column(String(64), nullable=False)
    filters_json = Column(JSON, nullable=True)
    created_by = Column(String(64), default="analyst_1")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(32), default="COMPLETED")

class Finding(Base):
    __tablename__ = "findings"
    id = Column(String(64), primary_key=True)
    analysis_run_id = Column(String(64), ForeignKey("analysis_runs.id"), nullable=False)
    finding_type = Column(String(64), nullable=False)
    summary = Column(Text, nullable=False)
    metrics_json = Column(JSON, nullable=True)
    confidence_limitations = Column(Text, nullable=True)
    review_status = Column(String(32), default="PENDING_REVIEW")

class EvidenceRef(Base):
    __tablename__ = "evidence_refs"
    id = Column(String(64), primary_key=True)
    finding_id = Column(String(64), nullable=True, index=True)
    source_file_id = Column(String(64), nullable=False)
    source_row = Column(Integer, nullable=False)
    record_type = Column(String(32), nullable=False) # CDR, IPDR, TOWER
    record_id = Column(String(64), nullable=False)
    timestamp = Column(DateTime, nullable=True)
    excerpt_json = Column(JSON, nullable=True)

class AISession(Base):
    __tablename__ = "ai_sessions"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False)
    user_id = Column(String(64), default="analyst_1")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AIMessage(Base):
    __tablename__ = "ai_messages"
    id = Column(String(64), primary_key=True)
    session_id = Column(String(64), ForeignKey("ai_sessions.id"), nullable=False)
    role = Column(String(32), nullable=False) # user, assistant, system, tool
    content = Column(Text, nullable=False)
    tool_name = Column(String(64), nullable=True)
    tool_args_json = Column(JSON, nullable=True)
    tool_result_json = Column(JSON, nullable=True)
    evidence_refs_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String(64), primary_key=True)
    case_id = Column(String(64), nullable=True, index=True)
    user_id = Column(String(64), default="analyst_1")
    action = Column(String(64), nullable=False)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(64), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    metadata_json = Column(JSON, nullable=True)
