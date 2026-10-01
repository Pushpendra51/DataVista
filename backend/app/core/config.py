import os
from typing import List

class Settings:
    PROJECT_NAME: str = "InsightAI"
    VERSION: str = "0.1.0"
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

settings = Settings()
