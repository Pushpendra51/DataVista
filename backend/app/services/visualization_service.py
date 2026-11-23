from typing import Any

import pandas as pd

from app.schemas.analytics import ChartRequest, ChartResponse, ChartPoint


AGGREGATIONS = {"count", "sum", "mean", "median", "min", "max"}
CHART_TYPES = {"bar", "line", "pie", "doughnut", "area", "scatter", "histogram", "box"}


def build_chart_data(df: pd.DataFrame, request: ChartRequest) -> ChartResponse:
    chart_type = request.chart_type.lower()
    if chart_type not in CHART_TYPES:
        raise ValueError(f"Unsupported chart type: {request.chart_type}")
    if request.x_column not in df.columns:
        raise ValueError(f"Column '{request.x_column}' was not found.")
    if request.y_column and request.y_column not in df.columns:
        raise ValueError(f"Column '{request.y_column}' was not found.")

    if chart_type in {"scatter", "histogram", "box"}:
        if not pd.api.types.is_numeric_dtype(df[request.x_column]):
            raise ValueError(f"Column '{request.x_column}' must be numeric.")

    if chart_type == "scatter":
        if not request.y_column:
            raise ValueError("A Y-axis column is required for scatter plots.")
        if not pd.api.types.is_numeric_dtype(df[request.y_column]):
            raise ValueError(f"Column '{request.y_column}' must be numeric.")
        clean = df[[request.x_column, request.y_column]].dropna().head(5000)
        points = [
            ChartPoint(
                name=str(row[request.x_column]),
                value=float(row[request.x_column]),
                secondary=float(row[request.y_column]),
            )
            for _, row in clean.iterrows()
        ]
        return ChartResponse(
            chart_type=chart_type,
            title=request.title or f"{request.y_column} by {request.x_column}",
            x_label=request.x_column,
            y_label=request.y_column,
            points=points,
        )

    if chart_type == "histogram":
        values = pd.to_numeric(df[request.x_column], errors="coerce").dropna()
        if values.empty:
            return ChartResponse(chart_type, request.title or request.x_column, request.x_column, "Frequency", [])
        bins = pd.cut(values, bins=min(20, max(5, len(values))), include_lowest=True)
        frequencies = bins.value_counts().sort_index()
        points = [
            ChartPoint(name=f"{interval.left:.2f}-{interval.right:.2f}", value=float(count), count=int(count))
            for interval, count in frequencies.items()
        ]
        return ChartResponse(chart_type, request.title or f"{request.x_column} Distribution", request.x_column, "Frequency", points)

    if chart_type == "box":
        values = pd.to_numeric(df[request.x_column], errors="coerce").dropna()
        quantiles = values.quantile([0, 0.25, 0.5, 0.75, 1])
        points = [
            ChartPoint(name="Minimum", value=float(quantiles.iloc[0]),
                       secondary=float(quantiles.iloc[1]),
                       count=int(len(values))),
            ChartPoint(name="Median", value=float(quantiles.iloc[2]),
                       secondary=float(quantiles.iloc[3])),
            ChartPoint(name="Maximum", value=float(quantiles.iloc[4]),
                       secondary=float(quantiles.iloc[4])),
        ]
        return ChartResponse(chart_type, request.title or f"{request.x_column} Box Plot",
                             request.x_column, "Value", points)

    aggregation = request.aggregation.lower()
    if aggregation not in AGGREGATIONS:
        raise ValueError(f"Unsupported aggregation: {request.aggregation}")

    grouped = df.groupby(request.x_column, dropna=True)
    if request.y_column:
        if not pd.api.types.is_numeric_dtype(df[request.y_column]):
            raise ValueError(f"Column '{request.y_column}' must be numeric for aggregation.")
        y = grouped[request.y_column]
        if aggregation == "count":
            series = y.count()
        elif aggregation == "sum":
            series = y.sum()
        elif aggregation == "mean":
            series = y.mean()
        elif aggregation == "median":
            series = y.median()
        elif aggregation == "min":
            series = y.min()
        else:
            series = y.max()
    else:
        series = grouped.size() if aggregation == "count" else grouped[request.x_column].count()

    series = series.head(50).sort_values(ascending=False)
    points = [
        ChartPoint(name=str(name), value=float(value), count=int(value) if aggregation == "count" else None)
        for name, value in series.items()
        if pd.notna(value)
    ]
    y_label = request.y_column or "Count"
    return ChartResponse(
        chart_type=chart_type,
        title=request.title or f"{y_label} by {request.x_column}",
        x_label=request.x_column,
        y_label=y_label,
        points=points,
    )
