import os
from pathlib import Path

# Dynamic base directory resolution (works in local dev, Docker, and Cloud)
env_root = os.getenv("PROJECT_ROOT")
if env_root and Path(env_root).resolve().exists():
    BASE_DIR = Path(env_root).resolve()
else:
    curr = Path(__file__).resolve().parent
    detected_root = None
    for p in [curr] + list(curr.parents):
        if (p / "data").exists():
            detected_root = p
            break
    BASE_DIR = detected_root or Path(__file__).resolve().parents[4]
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
