from fastapi import APIRouter, HTTPException

from app.schemas.analytics import MLTrainRequest, MLTrainResponse
from app.services.dataset_service import load_dataset, validate_dataset_id
from app.services.ml_service import train_ml_model


router = APIRouter(prefix="/ml", tags=["Machine Learning"])


@router.post("/{dataset_id}/train", response_model=MLTrainResponse)
def train_model(dataset_id: str, request: MLTrainRequest) -> MLTrainResponse:
    if not validate_dataset_id(dataset_id):
        raise HTTPException(status_code=400, detail="Invalid dataset ID.")
    try:
        df = load_dataset(dataset_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    try:
        return train_ml_model(df, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")
