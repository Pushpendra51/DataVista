import io
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from app.services.dataset_service import load_dataset, validate_dataset_id
from app.services.analytics_service import (
    get_data_quality_report, get_descriptive_stats, get_correlation_matrix
)

router = APIRouter(prefix="/export", tags=["Export"])


def _get_df(dataset_id: str):
    if not validate_dataset_id(dataset_id):
        raise HTTPException(status_code=400, detail="Invalid dataset ID.")
    try:
        return load_dataset(dataset_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{dataset_id}/csv", summary="Export Dataset as CSV")
def export_csv(dataset_id: str):
    """Stream the dataset (or cleaned version) as a downloadable CSV file."""
    df = _get_df(dataset_id)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)

    filename = f"insightai_export_{dataset_id[:8]}.csv"
    return StreamingResponse(
        iter([buf.read()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{dataset_id}/summary", summary="Export Analysis Summary as JSON")
def export_summary(dataset_id: str):
    """Export a comprehensive analysis summary report as a downloadable JSON."""
    df = _get_df(dataset_id)

    quality = get_data_quality_report(df)
    stats = get_descriptive_stats(df)
    correlation = get_correlation_matrix(df)

    summary = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "dataset_id": dataset_id,
        "shape": {"rows": df.shape[0], "columns": df.shape[1]},
        "columns": df.columns.tolist(),
        "data_quality": quality.model_dump(),
        "descriptive_statistics": stats.model_dump(),
        "correlation": correlation.model_dump(),
    }

    buf = io.BytesIO(json.dumps(summary, indent=2).encode("utf-8"))
    filename = f"insightai_summary_{dataset_id[:8]}.json"
    return StreamingResponse(
        buf,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
