import io
from fastapi import APIRouter, HTTPException, status
from app.schemas.analytics import (
    DataQualityReport, DescriptiveStatsResponse, CorrelationResponse
)
from app.services.dataset_service import load_dataset, validate_dataset_id
from app.services.analytics_service import (
    get_data_quality_report, get_descriptive_stats, get_correlation_matrix
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _get_df(dataset_id: str):
    if not validate_dataset_id(dataset_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid dataset ID.")
    try:
        return load_dataset(dataset_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{dataset_id}/quality", response_model=DataQualityReport, summary="Data Quality Report")
def get_quality(dataset_id: str) -> DataQualityReport:
    """Missing values per column, duplicate rows, complete row counts."""
    df = _get_df(dataset_id)
    return get_data_quality_report(df)


@router.get("/{dataset_id}/statistics", response_model=DescriptiveStatsResponse, summary="Descriptive Statistics")
def get_statistics(dataset_id: str, top_n: int = 10) -> DescriptiveStatsResponse:
    """Numeric stats (mean, std, quartiles) and categorical frequencies."""
    if top_n < 1 or top_n > 50:
        raise HTTPException(status_code=400, detail="top_n must be between 1 and 50.")
    df = _get_df(dataset_id)
    return get_descriptive_stats(df, top_n=top_n)


@router.get("/{dataset_id}/correlation", response_model=CorrelationResponse, summary="Correlation Matrix")
def get_correlation(dataset_id: str) -> CorrelationResponse:
    """Pearson correlation matrix for all numeric columns."""
    df = _get_df(dataset_id)
    try:
        return get_correlation_matrix(df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Correlation failed: {str(e)}")
