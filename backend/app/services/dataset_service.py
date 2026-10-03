import io
import re
import uuid
from pathlib import Path
from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
from app.core.config import settings
from app.schemas.dataset import ColumnSummary, DatasetPreviewResponse

DATASET_ID_REGEX = re.compile(r"^[a-f0-9]{32}$")

def generate_dataset_id() -> str:
    """Generate a collision-resistant 32-character hex dataset ID."""
    return uuid.uuid4().hex

def validate_dataset_id(dataset_id: str) -> bool:
    """Verify that dataset_id is strictly a 32-character hexadecimal string to prevent path traversal."""
    return bool(DATASET_ID_REGEX.match(dataset_id))

def get_dataset_path(dataset_id: str) -> Path:
    """Get validated file path for a dataset."""
    if not validate_dataset_id(dataset_id):
        raise ValueError("Invalid dataset identifier.")
    filepath = settings.UPLOAD_DIR / f"{dataset_id}.csv"
    return filepath

def validate_dataset_upload(filename: str, file_size: int, content: bytes) -> None:
    """Validate file extension, size, and non-empty content before processing."""
    if not filename:
        raise ValueError("Filename cannot be empty.")

    extension = Path(filename).suffix.lower()
    if extension not in settings.ALLOWED_EXTENSIONS:
        allowed_list = sorted(list(settings.ALLOWED_EXTENSIONS))
        raise ValueError(
            f"Invalid file extension '{extension}'. Supported file formats: {', '.join(allowed_list)}"
        )

    if file_size == 0 or len(content) == 0:
        raise ValueError("The uploaded file is empty (0 bytes).")

    if file_size > settings.MAX_UPLOAD_SIZE_BYTES or len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
        raise ValueError(f"File size exceeds the maximum limit of {max_mb} MB.")

def validate_csv_upload(filename: str, file_size: int, content: bytes) -> None:
    """Alias for backwards compatibility."""
    validate_dataset_upload(filename, file_size, content)

def read_dataset_to_dataframe(filename: str, content: bytes) -> pd.DataFrame:
    """
    Safely parse CSV or Excel bytes into a Pandas DataFrame.
    Supports .csv, .xlsx, and .xls files.
    """
    extension = Path(filename).suffix.lower()
    buffer = io.BytesIO(content)

    if extension in [".xlsx", ".xls"]:
        try:
            engine = "openpyxl" if extension == ".xlsx" else None
            df = pd.read_excel(buffer, engine=engine)
        except Exception as e:
            raise ValueError(f"Failed to parse Excel file: {str(e)}")

        if df is None or (df.empty and df.shape[1] == 0):
            raise ValueError("The uploaded Excel file contains no data or headers.")
    else:
        encodings = ["utf-8", "utf-8-sig", "latin1", "cp1252"]
        last_error = None
        df = None

        for encoding in encodings:
            try:
                buffer.seek(0)
                df = pd.read_csv(buffer, encoding=encoding)
                break
            except UnicodeDecodeError as e:
                last_error = e
                continue
            except pd.errors.EmptyDataError:
                raise ValueError("The uploaded CSV file contains no data or headers.")
            except pd.errors.ParserError as e:
                raise ValueError(f"Malformed CSV: Failed to parse rows. Details: {str(e)}")
            except Exception as e:
                last_error = e
                break

        if df is None:
            if isinstance(last_error, UnicodeDecodeError):
                raise ValueError("Unable to decode CSV file. Please ensure it is saved in UTF-8 or standard Latin encoding.")
            raise ValueError(f"Failed to parse CSV file: {str(last_error)}")

    # Clean whitespace in column names
    df.columns = [str(col).strip() for col in df.columns]

    if df.shape[1] == 0:
        raise ValueError("Dataset contains 0 columns. Please provide a valid file with column headers.")

    return df

def read_csv_to_dataframe(content: bytes) -> pd.DataFrame:
    """Alias for backwards compatibility."""
    return read_dataset_to_dataframe("dataset.csv", content)

def sanitize_records_for_json(df_slice: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Convert a DataFrame slice to a list of dict records where NaN, NaT, and infinity
    are converted to None, and dates are serialized to ISO strings for valid JSON output.
    """
    clean_records = []
    for row in df_slice.to_dict(orient="records"):
        sanitized_row = {}
        for col_name, val in row.items():
            if pd.isna(val):
                sanitized_row[col_name] = None
            elif isinstance(val, (np.floating, float)) and (np.isinf(val) or np.isnan(val)):
                sanitized_row[col_name] = None
            elif isinstance(val, (pd.Timestamp, np.datetime64)):
                sanitized_row[col_name] = str(val)
            elif isinstance(val, (np.integer, int)):
                sanitized_row[col_name] = int(val)
            elif isinstance(val, (np.floating, float)):
                sanitized_row[col_name] = round(float(val), 4)
            elif isinstance(val, (np.bool_, bool)):
                sanitized_row[col_name] = bool(val)
            else:
                sanitized_row[col_name] = str(val)
        clean_records.append(sanitized_row)
    return clean_records

def build_column_summaries(df: pd.DataFrame) -> List[ColumnSummary]:
    """Calculate per-column data types, null counts, null percentages, and unique sample values."""
    summaries = []
    total_rows = len(df)

    for col in df.columns:
        series = df[col]
        non_null_count = int(series.count())
        null_count = int(series.isna().sum())
        null_percentage = round((null_count / total_rows * 100), 2) if total_rows > 0 else 0.0
        unique_count = int(series.nunique(dropna=True))

        # Get up to 3 non-null sample values converted to JSON-compatible types
        sample_raw = series.dropna().unique()[:3]
        sample_values = []
        for v in sample_raw:
            if isinstance(v, (np.integer, int)):
                sample_values.append(int(v))
            elif isinstance(v, (np.floating, float)):
                sample_values.append(round(float(v), 2))
            elif isinstance(v, (np.bool_, bool)):
                sample_values.append(bool(v))
            else:
                sample_values.append(str(v))

        summaries.append(
            ColumnSummary(
                name=col,
                dtype=str(series.dtype),
                non_null_count=non_null_count,
                null_count=null_count,
                null_percentage=null_percentage,
                unique_count=unique_count,
                sample_values=sample_values
            )
        )
    return summaries

def process_uploaded_dataset(filename: str, content: bytes) -> DatasetPreviewResponse:
    """
    End-to-end pipeline:
    1. Validates upload
    2. Parses into DataFrame
    3. Detects shapes, nulls, and duplicate rows
    4. Generates preview rows and column metadata
    5. Saves dataset to safe local storage keyed by dataset_id
    """
    validate_dataset_upload(filename=filename, file_size=len(content), content=content)
    df = read_dataset_to_dataframe(filename=filename, content=content)

    dataset_id = generate_dataset_id()
    file_path = get_dataset_path(dataset_id)

    # Write parsed DataFrame to disk for subsequent analytics milestones
    df.to_csv(file_path, index=False)

    row_count, column_count = df.shape
    duplicate_rows_count = int(df.duplicated().sum())
    has_duplicates = duplicate_rows_count > 0
    has_nulls = bool(df.isna().values.any())

    columns = build_column_summaries(df)
    preview_rows = sanitize_records_for_json(df.head(10))

    return DatasetPreviewResponse(
        dataset_id=dataset_id,
        filename=filename,
        row_count=row_count,
        column_count=column_count,
        file_size_bytes=len(content),
        columns=columns,
        preview_rows=preview_rows,
        has_nulls=has_nulls,
        has_duplicates=has_duplicates,
        duplicate_rows_count=duplicate_rows_count
    )

def load_dataset(dataset_id: str) -> pd.DataFrame:
    """Safely load a dataset DataFrame from storage by its dataset_id."""
    file_path = get_dataset_path(dataset_id)
    if not file_path.exists():
        raise FileNotFoundError(f"Dataset session '{dataset_id}' not found or expired.")
    return pd.read_csv(file_path)
