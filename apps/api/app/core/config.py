import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
REPORT_DIR = STORAGE_DIR / "reports"
DICTIONARIES_DIR = BASE_DIR / "data" / "dictionaries"
SYNTHETIC_DIR = BASE_DIR / "data" / "synthetic"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/tracepoint.db")
APP_ENV = os.getenv("APP_ENV", "development")
APP_SECRET_KEY = os.getenv("APP_SECRET_KEY", "tracepoint-intelligence-secure-key-2026")
DEFAULT_TIMEZONE = os.getenv("DEFAULT_TIMEZONE", "Asia/Kolkata")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "50"))
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "mock")
