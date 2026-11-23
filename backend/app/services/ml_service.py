from typing import Dict, Any

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    silhouette_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder

from app.schemas.analytics import MLTrainRequest, MLTrainResponse


def train_ml_model(df: pd.DataFrame, request: MLTrainRequest) -> MLTrainResponse:
    task = request.task.lower()
    if task not in {"regression", "classification", "clustering"}:
        raise ValueError("Task must be regression, classification, or clustering.")
    if not request.feature_columns:
        raise ValueError("At least one feature column is required.")

    missing = [column for column in request.feature_columns if column not in df.columns]
    if missing:
        raise ValueError(f"Feature column(s) not found: {', '.join(missing)}")

    features = df[request.feature_columns].copy()
    numeric_features = features.select_dtypes(include="number").columns.tolist()
    categorical_features = [column for column in features.columns if column not in numeric_features]

    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore")),
    ])
    transformers = []
    if numeric_features:
        transformers.append(("numeric", numeric_pipeline, numeric_features))
    if categorical_features:
        transformers.append(("categorical", categorical_pipeline, categorical_features))
    preprocessor = ColumnTransformer(transformers=transformers)

    if task == "clustering":
        if len(features) < 2:
            raise ValueError("Clustering requires at least 2 rows.")
        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("model", KMeans(n_clusters=min(3, len(features)), random_state=42, n_init=10)),
        ])
        labels = pipeline.fit_predict(features)
        cluster_sizes = {
            str(cluster): int((labels == cluster).sum())
            for cluster in sorted(set(labels.tolist()))
        }
        if len(set(labels.tolist())) < 2:
            metrics = {"silhouette_score": 0.0}
        else:
            transformed = pipeline.named_steps["preprocessor"].transform(features)
            metrics = {"silhouette_score": round(float(silhouette_score(transformed, labels)), 4)}
        return MLTrainResponse(
            task=task,
            model="kmeans",
            metrics=metrics,
            feature_importance={},
            cluster_sizes=cluster_sizes,
        )

    if not request.target_column:
        raise ValueError("A target column is required for regression or classification.")
    if request.target_column not in df.columns:
        raise ValueError(f"Target column '{request.target_column}' was not found.")
    if request.target_column in request.feature_columns:
        raise ValueError("The target column cannot also be a feature column.")

    model_df = df[request.feature_columns + [request.target_column]].dropna(subset=[request.target_column])
    X = model_df[request.feature_columns]
    y = model_df[request.target_column]
    if len(model_df) < 10:
        raise ValueError("Training requires at least 10 rows with a populated target.")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=request.test_size,
        random_state=42,
        stratify=y if task == "classification" else None,
    )

    if task == "regression":
        if not pd.api.types.is_numeric_dtype(y):
            raise ValueError("Regression target must be numeric.")
        if request.model == "ridge":
            estimator = Ridge()
        elif request.model == "forest":
            estimator = RandomForestRegressor(n_estimators=100, random_state=42)
        else:
            estimator = LinearRegression()
        pipeline = Pipeline([("preprocessor", preprocessor), ("model", estimator)])
        pipeline.fit(X_train, y_train)
        prediction = pipeline.predict(X_test)
        mse = mean_squared_error(y_test, prediction)
        metrics = {
            "mae": round(float(mean_absolute_error(y_test, prediction)), 4),
            "mse": round(float(mse), 4),
            "rmse": round(float(mse ** 0.5), 4),
            "r2": round(float(r2_score(y_test, prediction)), 4),
            "test_rows": int(len(X_test)),
        }
    else:
        if request.model == "forest":
            estimator = RandomForestClassifier(n_estimators=100, random_state=42)
        else:
            estimator = LogisticRegression(max_iter=1000)
        pipeline = Pipeline([("preprocessor", preprocessor), ("model", estimator)])
        pipeline.fit(X_train, y_train)
        prediction = pipeline.predict(X_test)
        metrics = {
            "accuracy": round(float(accuracy_score(y_test, prediction)), 4),
            "precision": round(float(precision_score(y_test, prediction, average="weighted", zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, prediction, average="weighted", zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, prediction, average="weighted", zero_division=0)), 4),
            "test_rows": int(len(X_test)),
        }

    feature_importance: Dict[str, float] = {}
    estimator = pipeline.named_steps["model"]
    if hasattr(estimator, "feature_importances_"):
        try:
            names = pipeline.named_steps["preprocessor"].get_feature_names_out()
            for name, value in zip(names, estimator.feature_importances_):
                feature_importance[name] = round(float(value), 4)
        except Exception:
            pass

    return MLTrainResponse(
        task=task,
        model=request.model,
        metrics=metrics,
        feature_importance=dict(sorted(feature_importance.items(), key=lambda item: item[1], reverse=True)[:20]),
    )
