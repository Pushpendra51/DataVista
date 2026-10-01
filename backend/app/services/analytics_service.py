"""
Pure Pandas analytics service.
All functions are stateless and receive a DataFrame — no file I/O here.
"""
import math
import numpy as np
import pandas as pd
from typing import List, Optional

from app.schemas.analytics import (
    DataQualityReport, NullSummary,
    DescriptiveStatsResponse, ColumnStats, ColumnFrequency, CategoryFrequency,
    CorrelationResponse, CorrelationEntry,
)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _safe_float(value) -> Optional[float]:
    """Convert numpy scalar to float; return None for NaN or Inf."""
    try:
        v = float(value)
        if math.isnan(v) or math.isinf(v):
            return None
        return round(v, 4)
    except (TypeError, ValueError):
        return None


def _numeric_columns(df: pd.DataFrame) -> List[str]:
    return df.select_dtypes(include=[np.number]).columns.tolist()


def _categorical_columns(df: pd.DataFrame) -> List[str]:
    return df.select_dtypes(include=["object", "category", "bool"]).columns.tolist()


# ─────────────────────────────────────────────
# Data Quality
# ─────────────────────────────────────────────

def get_data_quality_report(df: pd.DataFrame) -> DataQualityReport:
    """Compute a complete data quality summary from a DataFrame."""
    total_rows, total_cols = df.shape
    total_cells = total_rows * total_cols
    total_missing = int(df.isna().sum().sum())
    total_missing_pct = round((total_missing / total_cells * 100), 2) if total_cells > 0 else 0.0

    dup_count = int(df.duplicated().sum())
    dup_pct = round((dup_count / total_rows * 100), 2) if total_rows > 0 else 0.0

    # Count rows that have zero nulls anywhere
    complete_rows = int((~df.isna().any(axis=1)).sum())
    complete_row_pct = round((complete_rows / total_rows * 100), 2) if total_rows > 0 else 0.0

    columns_with_nulls: List[NullSummary] = []
    for col in df.columns:
        null_count = int(df[col].isna().sum())
        if null_count > 0:
            columns_with_nulls.append(
                NullSummary(
                    column=col,
                    null_count=null_count,
                    null_percentage=round((null_count / total_rows * 100), 2),
                    dtype=str(df[col].dtype),
                )
            )

    return DataQualityReport(
        total_rows=total_rows,
        total_columns=total_cols,
        total_missing_cells=total_missing,
        total_missing_percentage=total_missing_pct,
        duplicate_rows=dup_count,
        duplicate_percentage=dup_pct,
        columns_with_nulls=columns_with_nulls,
        complete_rows=complete_rows,
        complete_row_percentage=complete_row_pct,
    )


# ─────────────────────────────────────────────
# Descriptive Statistics
# ─────────────────────────────────────────────

def get_descriptive_stats(df: pd.DataFrame, top_n: int = 10) -> DescriptiveStatsResponse:
    """Compute numeric stats and categorical frequencies using Pandas describe()."""
    numeric_stats: List[ColumnStats] = []
    for col in _numeric_columns(df):
        s = df[col].dropna()
        numeric_stats.append(
            ColumnStats(
                column=col,
                dtype=str(df[col].dtype),
                count=int(s.count()),
                mean=_safe_float(s.mean()),
                std=_safe_float(s.std()),
                min_val=_safe_float(s.min()),
                q25=_safe_float(s.quantile(0.25)),
                median=_safe_float(s.median()),
                q75=_safe_float(s.quantile(0.75)),
                max_val=_safe_float(s.max()),
                skewness=_safe_float(s.skew()),
            )
        )

    categorical_frequencies: List[ColumnFrequency] = []
    for col in _categorical_columns(df):
        vc = df[col].value_counts(dropna=True).head(top_n)
        total = int(vc.sum())
        freqs = [
            CategoryFrequency(
                value=str(val),
                count=int(cnt),
                percentage=round((cnt / total * 100), 2) if total > 0 else 0.0,
            )
            for val, cnt in vc.items()
        ]
        categorical_frequencies.append(
            ColumnFrequency(
                column=col,
                top_n=min(top_n, len(vc)),
                total_unique=int(df[col].nunique(dropna=True)),
                frequencies=freqs,
            )
        )

    return DescriptiveStatsResponse(
        numeric_stats=numeric_stats,
        categorical_frequencies=categorical_frequencies,
    )


# ─────────────────────────────────────────────
# Correlation
# ─────────────────────────────────────────────

def get_correlation_matrix(df: pd.DataFrame) -> CorrelationResponse:
    """Compute Pearson correlation matrix for all numeric columns."""
    num_cols = _numeric_columns(df)
    if len(num_cols) < 2:
        return CorrelationResponse(columns=num_cols, matrix=[], pairs=[])

    corr_df = df[num_cols].corr(method="pearson")
    n = len(num_cols)

    matrix: List[List[Optional[float]]] = []
    for i in range(n):
        row = []
        for j in range(n):
            row.append(_safe_float(corr_df.iloc[i, j]))
        matrix.append(row)

    pairs: List[CorrelationEntry] = []
    for i in range(n):
        for j in range(i + 1, n):
            pairs.append(
                CorrelationEntry(
                    col_a=num_cols[i],
                    col_b=num_cols[j],
                    correlation=_safe_float(corr_df.iloc[i, j]),
                )
            )

    return CorrelationResponse(columns=num_cols, matrix=matrix, pairs=pairs)
