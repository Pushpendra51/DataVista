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

@router.delete(
    "/dataset/{dataset_id}",
    summary="Delete a Dataset Session",
    description="Delete a temporary uploaded or cleaned dataset session.",
    tags=["Dataset"]
)
def delete_dataset(dataset_id: str):
    if not validate_dataset_id(dataset_id):
        raise HTTPException(status_code=400, detail="Invalid dataset ID format.")

    from app.services.dataset_service import get_dataset_path

    file_path = get_dataset_path(dataset_id)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Dataset session '{dataset_id}' not found.")

    file_path.unlink()
    return {"dataset_id": dataset_id, "deleted": True}

@router.get(
    "/dataset/{dataset_id}/preview",
    summary="Fetch Dataset Preview Rows",
    description="Retrieve paginated preview rows and column metadata for an uploaded dataset.",
    tags=["Dataset"]
)
def get_dataset_preview(
    dataset_id: str,
    offset: int = Query(0, ge=0, description="Row offset to start preview"),
    limit: int = Query(10, ge=1, le=100, description="Number of rows to return"),
    search: str = Query("", max_length=200, description="Search across visible dataset values"),
    sort_by: str = Query("", description="Column name used for sorting"),
    sort_direction: str = Query("asc", pattern="^(asc|desc)$", description="Sort direction")
):
    if not validate_dataset_id(dataset_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid dataset ID format."
        )
    try:
        df = load_dataset(dataset_id)
        filtered_df = df
        if search.strip():
            query = search.strip().lower()
            filtered_df = df[
                df.apply(
                    lambda column: column.astype("string").str.lower().str.contains(query, regex=False, na=False)
                ).any(axis=1)
            ]

        if sort_by:
            if sort_by not in df.columns:
                raise HTTPException(status_code=400, detail=f"Column '{sort_by}' was not found.")
            filtered_df = filtered_df.sort_values(
                by=sort_by,
                ascending=sort_direction == "asc",
                kind="stable",
                na_position="last",
            )

        total_rows = len(filtered_df)
        total_cols = len(filtered_df.columns)
        sliced_df = filtered_df.iloc[offset: offset + limit]

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
