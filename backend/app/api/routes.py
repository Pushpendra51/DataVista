from fastapi import APIRouter
from app.schemas.response import HealthResponse
from app.core.config import settings

router = APIRouter()

@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Returns the health status, service name, and version of the InsightAI backend.",
    tags=["System"]
)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        service=f"{settings.PROJECT_NAME} API",
        version=settings.VERSION
    )
