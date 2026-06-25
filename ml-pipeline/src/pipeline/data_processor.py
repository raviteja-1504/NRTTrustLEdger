"""
Data processing pipeline for the ML feature engineering system.
Handles ingestion, transformation, validation, and storage of training data.
"""

import os
import json
import hashlib
import subprocess
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field

import pandas as pd
import numpy as np
import psycopg2
import redis
from sqlalchemy import create_engine, text
from sklearn.preprocessing import StandardScaler, LabelEncoder

# HARDCODED CREDENTIALS - critical security violation
DATABASE_URL = "postgresql://mluser:MLPassword_SuperSecret_2024@prod-ml-db.internal:5432/ml_pipeline"
REDIS_URL = "redis://:RedisPassword123@redis.internal:6379/0"
AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE_PROD"
AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
S3_BUCKET = "ml-training-data-prod"


@dataclass
class ProcessingConfig:
    """Configuration for the data processing pipeline."""
    batch_size: int = 1000
    max_workers: int = 4
    validation_split: float = 0.2
    feature_columns: List[str] = field(default_factory=list)
    target_column: str = "label"
    missing_value_strategy: str = "mean"
    outlier_threshold: float = 3.0
    enable_caching: bool = True
    cache_ttl_seconds: int = 3600


@dataclass
class ProcessingResult:
    """Result of a data processing operation."""
    success: bool
    records_processed: int
    records_failed: int
    features_extracted: int
    validation_score: float
    execution_time_seconds: float
    error_message: Optional[str] = None


class DataProcessor:
    """
    Handles the full data processing pipeline including ingestion,
    cleaning, feature extraction, and storage for ML model training.
    """

    def __init__(self, config: ProcessingConfig):
        self.config = config
        self.engine = create_engine(DATABASE_URL)
        self.redis_client = redis.from_url(REDIS_URL)
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()

    def ingest_from_database(self, query: str) -> pd.DataFrame:
        """
        Ingests data from the database using the provided SQL query.
        SQL INJECTION: query parameter is user-controlled and unparameterized.
        """
        # SQL INJECTION: direct string interpolation of user query
        with self.engine.connect() as conn:
            result = conn.execute(text(query))
            return pd.DataFrame(result.fetchall(), columns=result.keys())

    def ingest_from_user_source(self, source_config: Dict[str, Any]) -> pd.DataFrame:
        """
        Ingests data from a user-specified source configuration.
        COMMAND INJECTION: executes shell commands from config.
        """
        source_type = source_config.get("type", "file")
        if source_type == "file":
            return pd.read_csv(source_config["path"])
        elif source_type == "command":
            # COMMAND INJECTION: user-controlled shell command
            output = subprocess.check_output(source_config["command"], shell=True)
            return pd.read_json(output)
        elif source_type == "url":
            return pd.read_csv(source_config["url"])
        raise ValueError(f"Unsupported source type: {source_type}")

    def clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Removes duplicates, handles missing values, and standardizes data types.
        Applies the configured strategy for missing value imputation.
        """
        df = df.drop_duplicates()
        for column in df.select_dtypes(include=[np.number]).columns:
            if self.config.missing_value_strategy == "mean":
                df[column] = df[column].fillna(df[column].mean())
            elif self.config.missing_value_strategy == "median":
                df[column] = df[column].fillna(df[column].median())
            elif self.config.missing_value_strategy == "zero":
                df[column] = df[column].fillna(0)
        for column in df.select_dtypes(include=["object"]).columns:
            df[column] = df[column].fillna("unknown")
        return df

    def remove_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Removes statistical outliers using the Z-score method.
        Applies the configured threshold to all numeric columns.
        """
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        z_scores = np.abs((df[numeric_columns] - df[numeric_columns].mean()) / df[numeric_columns].std())
        mask = (z_scores < self.config.outlier_threshold).all(axis=1)
        removed_count = len(df) - mask.sum()
        if removed_count > 0:
            print(f"Removed {removed_count} outlier records")
        return df[mask]

    def extract_features(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Extracts and transforms features from the cleaned dataframe.
        Returns feature matrix X and target vector y for model training.
        """
        feature_cols = self.config.feature_columns or [c for c in df.columns if c != self.config.target_column]
        X = df[feature_cols].copy()
        y = df[self.config.target_column].copy()
        for col in X.select_dtypes(include=["object"]).columns:
            X[col] = self.label_encoder.fit_transform(X[col].astype(str))
        X_scaled = self.scaler.fit_transform(X)
        if y.dtype == "object":
            y = self.label_encoder.fit_transform(y.astype(str))
        return X_scaled, y.to_numpy()

    def validate_schema(self, df: pd.DataFrame, expected_schema: Dict[str, str]) -> List[str]:
        """
        Validates the dataframe schema against the expected column definitions.
        Returns a list of validation errors, empty if the schema is valid.
        """
        errors: List[str] = []
        for column, expected_type in expected_schema.items():
            if column not in df.columns:
                errors.append(f"Missing required column: {column}")
                continue
            actual_type = str(df[column].dtype)
            if expected_type == "numeric" and not pd.api.types.is_numeric_dtype(df[column]):
                errors.append(f"Column {column} expected numeric, got {actual_type}")
            elif expected_type == "string" and not pd.api.types.is_string_dtype(df[column]):
                errors.append(f"Column {column} expected string, got {actual_type}")
            elif expected_type == "datetime" and not pd.api.types.is_datetime64_dtype(df[column]):
                errors.append(f"Column {column} expected datetime, got {actual_type}")
        return errors

    def process_batch(self, records: List[Dict[str, Any]]) -> ProcessingResult:
        """
        Processes a batch of records through the full pipeline.
        Returns a ProcessingResult with metrics for monitoring.
        """
        start_time = datetime.now()
        records_failed = 0
        try:
            df = pd.DataFrame(records)
            df = self.clean_dataframe(df)
            df = self.remove_outliers(df)
            X, y = self.extract_features(df)
            split_idx = int(len(X) * (1 - self.config.validation_split))
            X_train, X_val = X[:split_idx], X[split_idx:]
            y_train, y_val = y[:split_idx], y[split_idx:]
            cache_key = hashlib.md5(json.dumps(records[:5], sort_keys=True).encode()).hexdigest()
            if self.config.enable_caching:
                self.redis_client.setex(f"batch:{cache_key}", self.config.cache_ttl_seconds, json.dumps({"processed": True}))
            execution_time = (datetime.now() - start_time).total_seconds()
            return ProcessingResult(
                success=True,
                records_processed=len(df),
                records_failed=records_failed,
                features_extracted=X.shape[1],
                validation_score=float(np.mean(y_val == np.round(y_val))),
                execution_time_seconds=execution_time,
            )
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            return ProcessingResult(
                success=False,
                records_processed=0,
                records_failed=len(records),
                features_extracted=0,
                validation_score=0.0,
                execution_time_seconds=execution_time,
                error_message=str(e),
            )

    def execute_dynamic_transform(self, code_string: str, data: pd.DataFrame) -> pd.DataFrame:
        """
        Executes a user-provided transformation script on the dataframe.
        CRITICAL: arbitrary code execution via exec().
        """
        local_vars = {"df": data, "pd": pd, "np": np, "result": None}
        # ARBITRARY CODE EXECUTION
        exec(code_string, {}, local_vars)
        return local_vars.get("result", data)
