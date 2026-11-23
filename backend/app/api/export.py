import io
import json
from datetime import datetime
from html import escape
import pandas as pd
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

    filename = f"datavista_export_{dataset_id[:8]}.csv"
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
    filename = f"datavista_summary_{dataset_id[:8]}.json"
    return StreamingResponse(
        buf,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{dataset_id}/html", summary="Export a Printable Analytical Report")
def export_report_html(dataset_id: str):
    df = _get_df(dataset_id)
    quality = get_data_quality_report(df)
    stats = get_descriptive_stats(df)
    correlation = get_correlation_matrix(df)

    numeric_rows = "".join(
        f"<tr><td>{escape(item.column)}</td><td>{item.count}</td><td>{item.mean if item.mean is not None else '-'}</td>"
        f"<td>{item.median if item.median is not None else '-'}</td><td>{item.min_val if item.min_val is not None else '-'}</td>"
        f"<td>{item.max_val if item.max_val is not None else '-'}</td></tr>"
        for item in stats.numeric_stats
    )
    html = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>DataVista Analytical Report</title>
<style>
body{{font-family:Inter,Arial,sans-serif;color:#0f172a;margin:40px}} h1{{font-size:28px}} h2{{font-size:18px;margin-top:28px}}
.meta{{color:#64748b}} .cards{{display:flex;gap:12px}} .card{{border:1px solid #e2e8f0;border-radius:10px;padding:14px;min-width:150px}}
table{{width:100%;border-collapse:collapse;font-size:12px}} th,td{{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}}
th{{background:#f8fafc}} @media print{{body{{margin:18px}}}}
</style></head><body>
<h1>DataVista Analytical Report</h1><p class="meta">Generated {escape(datetime.utcnow().isoformat() + 'Z')} · Dataset {escape(dataset_id)}</p>
<h2>Dataset overview</h2><div class="cards"><div class="card"><strong>{df.shape[0]}</strong><br>Rows</div><div class="card"><strong>{df.shape[1]}</strong><br>Columns</div><div class="card"><strong>{quality.total_missing_cells}</strong><br>Missing cells</div><div class="card"><strong>{quality.duplicate_rows}</strong><br>Duplicate rows</div></div>
<h2>Descriptive statistics</h2><table><thead><tr><th>Column</th><th>Count</th><th>Mean</th><th>Median</th><th>Minimum</th><th>Maximum</th></tr></thead><tbody>{numeric_rows or '<tr><td colspan="6">No numeric columns</td></tr>'}</tbody></table>
<h2>Key findings</h2><ul><li>{quality.total_missing_cells} missing data values were detected.</li><li>{quality.duplicate_rows} duplicate rows were detected.</li><li>{len(correlation.pairs)} numeric correlation pair(s) were calculated.</li></ul>
</body></html>"""
    buf = io.BytesIO(html.encode("utf-8"))
    return StreamingResponse(
        buf,
        media_type="text/html",
        headers={"Content-Disposition": f'attachment; filename="datavista_report_{dataset_id[:8]}.html"'},
    )


@router.get("/{dataset_id}/xlsx", summary="Export Dataset as Excel")
def export_report_excel(dataset_id: str):
    df = _get_df(dataset_id)
    quality = get_data_quality_report(df)
    stats = get_descriptive_stats(df)

    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.head(10000).to_excel(writer, sheet_name="Data", index=False)
        pd.DataFrame([{
            "rows": quality.total_rows,
            "columns": quality.total_columns,
            "missing_cells": quality.total_missing_cells,
            "duplicate_rows": quality.duplicate_rows,
            "complete_rows": quality.complete_rows,
        }]).to_excel(writer, sheet_name="Data Quality", index=False)
        if stats.numeric_stats:
            pd.DataFrame([item.model_dump() for item in stats.numeric_stats]).to_excel(
                writer, sheet_name="Statistics", index=False
            )
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="datavista_report_{dataset_id[:8]}.xlsx"'},
    )
