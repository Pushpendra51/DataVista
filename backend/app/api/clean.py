from fastapi import APIRouter, HTTPException, status
from app.schemas.analytics import CleaningRequest, CleaningResponse
from app.services.dataset_service import validate_dataset_id
from app.services.cleaning_service import apply_cleaning

router = APIRouter(prefix="/clean", tags=["Cleaning"])


@router.post("/{dataset_id}", response_model=CleaningResponse, summary="Apply Cleaning Action")
def clean_dataset(dataset_id: str, request: CleaningRequest) -> CleaningResponse:
    """
    Apply a single, explicit cleaning operation.
    Returns a NEW dataset_id — the original dataset is never modified.
    Supported actions: drop_duplicates, drop_nulls,
    fill_nulls_mean, fill_nulls_median, fill_nulls_mode, fill_nulls_value.
    """
    if not validate_dataset_id(dataset_id):
        raise HTTPException(status_code=400, detail="Invalid dataset ID.")
    try:
        return apply_cleaning(dataset_id, request)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleaning failed: {str(e)}")
