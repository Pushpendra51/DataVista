"""
Cleaning service.
Every cleaning action returns a NEW dataset_id — the original is never mutated.
"""
import pandas as pd
from app.schemas.analytics import CleaningRequest, CleaningResponse
from app.services.dataset_service import (
    load_dataset, generate_dataset_id, get_dataset_path, sanitize_records_for_json
)

SUPPORTED_ACTIONS = {
    "drop_duplicates",
    "drop_nulls",
    "fill_nulls_mean",
    "fill_nulls_median",
    "fill_nulls_mode",
    "fill_nulls_value",
}


def apply_cleaning(dataset_id: str, request: CleaningRequest) -> CleaningResponse:
    """
    Load dataset, apply one explicit cleaning action, save as a new dataset.
    Returns a CleaningResponse with before/after row counts and a new dataset_id.
    Raises ValueError for unsupported actions or invalid column references.
    """
    action = request.action.lower().strip()

    if action not in SUPPORTED_ACTIONS:
        raise ValueError(
            f"Action '{action}' is not supported. "
            f"Supported: {', '.join(sorted(SUPPORTED_ACTIONS))}"
        )

    df = load_dataset(dataset_id)
    rows_before = len(df)
    df_clean = df.copy()
    message = ""

    # ── Drop duplicates ────────────────────────────────────────────────────────
    if action == "drop_duplicates":
        df_clean = df_clean.drop_duplicates()
        removed = rows_before - len(df_clean)
        message = f"Removed {removed} exact duplicate row(s)."

    # ── Drop nulls ─────────────────────────────────────────────────────────────
    elif action == "drop_nulls":
        if request.column:
            if request.column not in df.columns:
                raise ValueError(f"Column '{request.column}' not found in dataset.")
            df_clean = df_clean.dropna(subset=[request.column])
            message = f"Dropped rows with null values in column '{request.column}'."
        else:
            df_clean = df_clean.dropna()
            message = "Dropped all rows containing any null values."

    # ── Fill nulls with mean ───────────────────────────────────────────────────
    elif action == "fill_nulls_mean":
        if request.column:
            _require_column(df, request.column)
            _require_numeric(df, request.column, action)
            fill_val = round(df_clean[request.column].mean(), 4)
            df_clean[request.column] = df_clean[request.column].fillna(fill_val)
            message = f"Filled nulls in '{request.column}' with mean ({fill_val})."
        else:
            num_cols = df_clean.select_dtypes(include="number").columns
            for col in num_cols:
                df_clean[col] = df_clean[col].fillna(df_clean[col].mean())
            message = f"Filled nulls in all numeric columns with their respective means."

    # ── Fill nulls with median ─────────────────────────────────────────────────
    elif action == "fill_nulls_median":
        if request.column:
            _require_column(df, request.column)
            _require_numeric(df, request.column, action)
            fill_val = round(df_clean[request.column].median(), 4)
            df_clean[request.column] = df_clean[request.column].fillna(fill_val)
            message = f"Filled nulls in '{request.column}' with median ({fill_val})."
        else:
            num_cols = df_clean.select_dtypes(include="number").columns
            for col in num_cols:
                df_clean[col] = df_clean[col].fillna(df_clean[col].median())
            message = "Filled nulls in all numeric columns with their respective medians."

    # ── Fill nulls with mode ───────────────────────────────────────────────────
    elif action == "fill_nulls_mode":
        _require_column(df, request.column)
        mode_vals = df_clean[request.column].mode()
        if mode_vals.empty:
            raise ValueError(f"Cannot compute mode — column '{request.column}' has no non-null values.")
        fill_val = mode_vals.iloc[0]
        df_clean[request.column] = df_clean[request.column].fillna(fill_val)
        message = f"Filled nulls in '{request.column}' with mode ('{fill_val}')."

    # ── Fill nulls with custom value ───────────────────────────────────────────
    elif action == "fill_nulls_value":
        _require_column(df, request.column)
        if request.fill_value is None:
            raise ValueError("'fill_value' must be provided for action 'fill_nulls_value'.")
        df_clean[request.column] = df_clean[request.column].fillna(request.fill_value)
        message = f"Filled nulls in '{request.column}' with value '{request.fill_value}'."

    # ── Save cleaned dataset ───────────────────────────────────────────────────
    rows_after = len(df_clean)
    rows_removed = rows_before - rows_after

    new_id = generate_dataset_id()
    new_path = get_dataset_path(new_id)
    df_clean.to_csv(new_path, index=False)

    return CleaningResponse(
        action=action,
        rows_before=rows_before,
        rows_after=rows_after,
        rows_removed=rows_removed,
        new_dataset_id=new_id,
        message=message,
    )


def _require_column(df: pd.DataFrame, column: str) -> None:
    if column not in df.columns:
        raise ValueError(
            f"Column '{column}' not found. Available: {', '.join(df.columns.tolist())}"
        )


def _require_numeric(df: pd.DataFrame, column: str, action: str) -> None:
    if not pd.api.types.is_numeric_dtype(df[column]):
        raise ValueError(
            f"Action '{action}' requires a numeric column. "
            f"'{column}' has dtype '{df[column].dtype}'."
        )
