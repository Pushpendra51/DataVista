from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class NullSummary(BaseModel):
    column: str
    null_count: int
    null_percentage: float
    dtype: str


class DataQualityReport(BaseModel):
    total_rows: int
    total_columns: int
    total_missing_cells: int
    total_missing_percentage: float
    duplicate_rows: int
    duplicate_percentage: float
    columns_with_nulls: List[NullSummary]
    complete_rows: int
    complete_row_percentage: float


class ColumnStats(BaseModel):
    column: str
    dtype: str
    count: int
    mean: Optional[float] = None
    std: Optional[float] = None
    min_val: Optional[float] = None
    q25: Optional[float] = None
    median: Optional[float] = None
    q75: Optional[float] = None
    max_val: Optional[float] = None
    skewness: Optional[float] = None


class CategoryFrequency(BaseModel):
    value: str
    count: int
    percentage: float


class ColumnFrequency(BaseModel):
    column: str
    top_n: int
    total_unique: int
    frequencies: List[CategoryFrequency]


class DescriptiveStatsResponse(BaseModel):
    numeric_stats: List[ColumnStats]
    categorical_frequencies: List[ColumnFrequency]


class CorrelationEntry(BaseModel):
    col_a: str
    col_b: str
    correlation: Optional[float]


class CorrelationResponse(BaseModel):
    columns: List[str]
    matrix: List[List[Optional[float]]]
    pairs: List[CorrelationEntry]


class QueryRequest(BaseModel):
    operation: str = Field(..., description="One of: sum, mean, median, min, max, count, unique_count, null_count, top_n, groupby")
    column: str = Field(..., description="Target column for the operation")
    group_by: Optional[str] = Field(None, description="Column to group by (for groupby operation)")
    top_n: int = Field(10, ge=1, le=50, description="Number of top categories to return (for top_n operation)")


class QueryResponse(BaseModel):
    operation: str
    column: str
    group_by: Optional[str]
    result: Any
    formatted_result: str
    supported: bool = True


class CleaningRequest(BaseModel):
    action: str = Field(..., description="One of: drop_duplicates, drop_nulls, fill_nulls_mean, fill_nulls_median, fill_nulls_mode, fill_nulls_value")
    column: Optional[str] = Field(None, description="Target column (leave None to apply to all columns where applicable)")
    fill_value: Optional[str] = Field(None, description="Custom fill value (only for fill_nulls_value)")


class CleaningResponse(BaseModel):
    action: str
    rows_before: int
    rows_after: int
    rows_removed: int
    new_dataset_id: str
    message: str
