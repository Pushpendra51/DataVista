from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ColumnSummary(BaseModel):
    name: str = Field(..., description="Column header name")
    dtype: str = Field(..., description="Inferred pandas data type")
    non_null_count: int = Field(..., description="Count of non-null records")
    null_count: int = Field(..., description="Count of missing/null records")
    null_percentage: float = Field(..., description="Percentage of null records (0.0 to 100.0)")
    unique_count: int = Field(..., description="Number of distinct unique values")
    sample_values: List[Any] = Field(..., description="First few non-null sample values")

class DatasetPreviewResponse(BaseModel):
    dataset_id: str = Field(..., description="Unique secure identifier for the uploaded dataset session")
    filename: str = Field(..., description="Original name of the uploaded CSV file")
    row_count: int = Field(..., description="Total number of rows in the dataset")
    column_count: int = Field(..., description="Total number of columns in the dataset")
    file_size_bytes: int = Field(..., description="Size of uploaded file in bytes")
    columns: List[ColumnSummary] = Field(..., description="Metadata and data types for each column")
    preview_rows: List[Dict[str, Any]] = Field(..., description="First 10 rows of the dataset for UI preview")
    has_nulls: bool = Field(..., description="Whether any missing values exist in the dataset")
    has_duplicates: bool = Field(..., description="Whether duplicate rows exist in the dataset")
    duplicate_rows_count: int = Field(0, description="Total number of duplicate rows detected")

class PaginationQuery(BaseModel):
    offset: int = Field(0, ge=0, description="Number of rows to skip")
    limit: int = Field(10, ge=1, le=100, description="Number of rows to return")
