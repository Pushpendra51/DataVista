from pydantic import BaseModel, Field
from datetime import datetime

class HealthResponse(BaseModel):
    status: str = Field(..., description="Current health status of the API", json_schema_extra={"example": "healthy"})
    service: str = Field(..., description="Name of the service", json_schema_extra={"example": "InsightAI API"})
    version: str = Field(..., description="API version", json_schema_extra={"example": "0.1.0"})
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z", description="ISO UTC timestamp")
