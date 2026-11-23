from fastapi import APIRouter, HTTPException

from app.schemas.analytics import ChartRequest, ChartResponse
from app.services.dataset_service import load_dataset, validate_dataset_id
from app.services.visualization_service import build_chart_data


router = APIRouter(prefix="/visualizations", tags=["Visualization"])


@router.post("/{dataset_id}", response_model=ChartResponse)
def create_visualization(dataset_id: str, request: ChartRequest) -> ChartResponse:
    if not validate_dataset_id(dataset_id):
        raise HTTPException(status_code=400, detail="Invalid dataset ID.")
    try:
        df = load_dataset(dataset_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    try:
        return build_chart_data(df, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chart generation failed: {str(e)}")
