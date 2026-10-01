import os
from pathlib import Path
from typing import List

class Settings:
    PROJECT_NAME: str = "InsightAI"
    VERSION: str = "0.2.0"
    API_PREFIX: str = "/api"
    DESCRIPTION: str = "CSV Data Analysis and Reporting Web Application API"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    
    # File upload constraints
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit
    ALLOWED_EXTENSIONS: set = {".csv"}
    
    # Safe temporary storage directory for uploaded datasets
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "temp_uploads"

settings = Settings()
# Ensure temp uploads directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
