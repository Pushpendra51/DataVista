"""
Safe, whitelist-only question engine.
All operations resolve through explicit Pandas calls — no eval(), exec(), or SQL.
"""
import math
import numpy as np
import pandas as pd
from typing import Any, Optional

from app.schemas.analytics import QueryRequest, QueryResponse

SUPPORTED_OPERATIONS = {
    "sum", "mean", "average", "median", "min", "max",
    "count", "unique_count", "null_count", "top_n", "groupby",
}

NUMERIC_ONLY_OPS = {"sum", "mean", "average", "median", "min", "max"}


def _safe_scalar(value: Any) -> Any:
    """Convert numpy scalars to JSON-safe Python types."""
    if value is None:
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        v = float(value)
        return None if (math.isnan(v) or math.isinf(v)) else round(v, 4)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    return value


def _format_result(operation: str, column: str, result: Any, group_by: Optional[str] = None) -> str:
    """Build a human-readable result string."""
    if isinstance(result, list):
        lines = [f"  {item['value']}: {item['count']}" for item in result[:5]]
        return f"Top values in '{column}':\n" + "\n".join(lines)
    if isinstance(result, dict):
        lines = [f"  {k}: {round(v, 4) if isinstance(v, float) else v}" for k, v in list(result.items())[:5]]
        return f"{operation.title()} of '{column}' grouped by '{group_by}':\n" + "\n".join(lines)
    if result is None:
        return "No result — column may be empty or incompatible."
    return f"{operation.title()} of '{column}': {result}"


def execute_query(df: pd.DataFrame, request: QueryRequest) -> QueryResponse:
    """
    Execute a validated, whitelisted operation on the DataFrame.
    Raises ValueError for unsupported operations or missing/incompatible columns.
    """
    op = request.operation.lower().strip()

    # ── 1. Validate operation ─────────────────────────────────────────────────
    if op not in SUPPORTED_OPERATIONS:
        supported_list = ", ".join(sorted(SUPPORTED_OPERATIONS))
        return QueryResponse(
            operation=op,
            column=request.column,
            group_by=request.group_by,
            result=None,
            formatted_result=(
                f"❌ Operation '{op}' is not supported.\n"
                f"Supported operations: {supported_list}."
            ),
            supported=False,
        )

    # ── 2. Validate target column ─────────────────────────────────────────────
    if request.column not in df.columns:
        available = ", ".join(df.columns.tolist())
        raise ValueError(
            f"Column '{request.column}' does not exist in this dataset. "
            f"Available columns: {available}"
        )

    # ── 3. Numeric-only guard ─────────────────────────────────────────────────
    if op in NUMERIC_ONLY_OPS and not pd.api.types.is_numeric_dtype(df[request.column]):
        raise ValueError(
            f"Operation '{op}' requires a numeric column, but '{request.column}' "
            f"has dtype '{df[request.column].dtype}'. "
            f"Try 'top_n' or 'count' for text/categorical columns."
        )

    series = df[request.column]
    result: Any = None

    # ── 4. Execute whitelisted operation ──────────────────────────────────────
    if op == "sum":
        result = _safe_scalar(series.sum())

    elif op in ("mean", "average"):
        op = "mean"
        result = _safe_scalar(series.mean())

    elif op == "median":
        result = _safe_scalar(series.median())

    elif op == "min":
        result = _safe_scalar(series.min())

    elif op == "max":
        result = _safe_scalar(series.max())

    elif op == "count":
        result = int(series.count())

    elif op == "unique_count":
        result = int(series.nunique(dropna=True))

    elif op == "null_count":
        result = int(series.isna().sum())

    elif op == "top_n":
        vc = series.value_counts(dropna=True).head(request.top_n)
        total = int(vc.sum())
        result = [
            {"value": str(val), "count": int(cnt), "percentage": round(cnt / total * 100, 2)}
            for val, cnt in vc.items()
        ]

    elif op == "groupby":
        if not request.group_by:
            raise ValueError("'groupby' operation requires the 'group_by' field to be set.")
        if request.group_by not in df.columns:
            raise ValueError(
                f"Group-by column '{request.group_by}' does not exist. "
                f"Available columns: {', '.join(df.columns.tolist())}"
            )
        if not pd.api.types.is_numeric_dtype(df[request.column]):
            raise ValueError(
                f"Group-by aggregation requires a numeric 'column'. "
                f"'{request.column}' has dtype '{df[request.column].dtype}'."
            )
        grouped = df.groupby(request.group_by)[request.column].mean().round(4).dropna()
        result = {str(k): _safe_scalar(v) for k, v in grouped.items()}

    formatted = _format_result(op, request.column, result, request.group_by)

    return QueryResponse(
        operation=op,
        column=request.column,
        group_by=request.group_by,
        result=result,
        formatted_result=formatted,
        supported=True,
    )
