from fastapi import APIRouter, HTTPException, status
from app.schemas.analytics import QueryRequest, QueryResponse
from app.services.dataset_service import load_dataset, validate_dataset_id
from app.services.question_service import execute_query

router = APIRouter(prefix="/query", tags=["Question Engine"])


@router.post("/{dataset_id}", response_model=QueryResponse, summary="Ask a Data Question")
def ask_question(dataset_id: str, request: QueryRequest) -> QueryResponse:
    """
    Safe, whitelist-only question engine.
    Supported operations: sum, mean, median, min, max, count,
    unique_count, null_count, top_n, groupby.
    Returns a clear explanation when the operation is unsupported.
    """
    if not validate_dataset_id(dataset_id):
        raise HTTPException(status_code=400, detail="Invalid dataset ID.")
    try:
        df = load_dataset(dataset_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    try:
        return execute_query(df, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
