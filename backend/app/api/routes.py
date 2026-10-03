from fastapi import APIRouter, File, UploadFile, HTTPException, Query, status
from app.schemas.response import HealthResponse
from app.schemas.dataset import DatasetPreviewResponse
from app.core.config import settings
from app.services.dataset_service import (
    process_uploaded_dataset,
    load_dataset,
    build_column_summaries,
    sanitize_records_for_json,
    validate_dataset_id
)

router = APIRouter()

@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Returns the health status, service name, and version of the DataVista backend.",
    tags=["System"]
)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        service=f"{settings.PROJECT_NAME} API",
        version=settings.VERSION
    )

@router.post(
    "/upload",
    response_model=DatasetPreviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload & Preview CSV or Excel Dataset",
    description="Upload a CSV or Excel (.xlsx, .xls) file for validation, parsing, metadata extraction, and preview generation.",
    tags=["Dataset"]
)
async def upload_dataset(file: UploadFile = File(...)) -> DatasetPreviewResponse:
    try:
        content = await file.read()
        return process_uploaded_dataset(filename=file.filename, content=content)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while processing the uploaded file: {str(e)}"
        )

@router.get(
    "/dataset/{dataset_id}/preview",
    summary="Fetch Dataset Preview Rows",
    description="Retrieve paginated preview rows and column metadata for an uploaded dataset.",
    tags=["Dataset"]
)
def get_dataset_preview(
    dataset_id: str,
    offset: int = Query(0, ge=0, description="Row offset to start preview"),
    limit: int = Query(10, ge=1, le=100, description="Number of rows to return")
):
    if not validate_dataset_id(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid dataset ID format."
        )
    try:
        df = load_dataset(dataset_id)
        total_rows, total_cols = df.shape
        sliced_df = df.iloc[offset: offset + limit]

        return {
            "dataset_id": dataset_id,
            "total_rows": total_rows,
            "total_columns": total_cols,
            "offset": offset,
            "limit": limit,
            "columns": build_column_summaries(df),
            "rows": sanitize_records_for_json(sliced_df)
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dataset preview: {str(e)}"
        )

@router.get(
    "/dataset/{dataset_id}/records",
    summary="Fetch All Dataset Records for BI Dashboard",
    description="Retrieve dataset records for client-side Power BI slicing, pivot tables, and dynamic visual aggregations.",
    tags=["Dataset"]
)
def get_dataset_records(
    dataset_id: str,
    limit: int = Query(5000, ge=1, le=10000, description="Maximum number of rows to return")
):
    if not validate_dataset_id(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid dataset ID format."
        )
    try:
        df = load_dataset(dataset_id)
        sliced_df = df.iloc[:limit]

        return {
            "dataset_id": dataset_id,
            "total_rows": len(df),
            "columns": build_column_summaries(df),
            "records": sanitize_records_for_json(sliced_df)
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dataset records: {str(e)}"
        )
