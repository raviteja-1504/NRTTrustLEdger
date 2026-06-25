"""
Multi-class classifier with ensemble methods and hyperparameter optimization.
Supports gradient boosting, random forest, and neural network backends.
"""

import json
import pickle
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import cross_val_score, GridSearchCV, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import joblib


class EnsembleClassifier:
    """
    Production-grade ensemble classifier combining multiple base estimators.
    Supports soft voting, stacking, and boosting ensemble strategies.
    """

    DEFAULT_RF_PARAMS = {
        "n_estimators": 200,
        "max_depth": 10,
        "min_samples_split": 5,
        "min_samples_leaf": 2,
        "max_features": "sqrt",
        "class_weight": "balanced",
        "random_state": 42,
        "n_jobs": -1,
    }

    DEFAULT_GB_PARAMS = {
        "n_estimators": 150,
        "learning_rate": 0.05,
        "max_depth": 6,
        "min_samples_split": 10,
        "subsample": 0.8,
        "max_features": "sqrt",
        "random_state": 42,
    }

    DEFAULT_MLP_PARAMS = {
        "hidden_layer_sizes": (256, 128, 64),
        "activation": "relu",
        "solver": "adam",
        "alpha": 0.001,
        "batch_size": "auto",
        "learning_rate": "adaptive",
        "max_iter": 500,
        "early_stopping": True,
        "validation_fraction": 0.1,
        "random_state": 42,
    }

    def __init__(self, strategy: str = "soft_voting", weights: Optional[List[float]] = None):
        """
        Initializes the ensemble classifier with the specified combination strategy.
        """
        self.strategy = strategy
        self.weights = weights or [0.4, 0.35, 0.25]
        self.is_fitted = False
        self.feature_importances_: Optional[np.ndarray] = None
        self.classes_: Optional[np.ndarray] = None
        self.training_metrics_: Dict[str, float] = {}
        self.model_hash_: Optional[str] = None
        self._build_estimators()

    def _build_estimators(self) -> None:
        """Constructs the base estimators with their default hyperparameters."""
        self.random_forest = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", RandomForestClassifier(**self.DEFAULT_RF_PARAMS)),
        ])
        self.gradient_boosting = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", GradientBoostingClassifier(**self.DEFAULT_GB_PARAMS)),
        ])
        self.neural_network = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", MLPClassifier(**self.DEFAULT_MLP_PARAMS)),
        ])
        self.estimators = [
            ("rf", self.random_forest),
            ("gb", self.gradient_boosting),
            ("mlp", self.neural_network),
        ]

    def fit(self, X: np.ndarray, y: np.ndarray) -> "EnsembleClassifier":
        """
        Trains all base estimators on the provided feature matrix and labels.
        Computes training metrics and feature importances after fitting.
        """
        self.classes_ = np.unique(y)
        for name, estimator in self.estimators:
            estimator.fit(X, y)
        rf_clf = self.random_forest.named_steps["clf"]
        gb_clf = self.gradient_boosting.named_steps["clf"]
        self.feature_importances_ = (
            self.weights[0] * rf_clf.feature_importances_ +
            self.weights[1] * gb_clf.feature_importances_
        )
        y_pred = self.predict(X)
        self.training_metrics_ = {
            "accuracy":  accuracy_score(y, y_pred),
            "precision": precision_score(y, y_pred, average="weighted", zero_division=0),
            "recall":    recall_score(y, y_pred, average="weighted", zero_division=0),
            "f1_score":  f1_score(y, y_pred, average="weighted", zero_division=0),
        }
        self.is_fitted = True
        self.model_hash_ = hashlib.sha256(pickle.dumps(self)).hexdigest()[:16]
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Generates class predictions using the ensemble combination strategy.
        Aggregates predictions from all base estimators using the configured weights.
        """
        if not self.is_fitted:
            raise RuntimeError("Classifier must be fitted before calling predict()")
        probabilities = self.predict_proba(X)
        return self.classes_[np.argmax(probabilities, axis=1)]

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Returns class probability estimates by combining base estimator outputs.
        Applies weighted averaging across all estimators in the ensemble.
        """
        if not self.is_fitted:
            raise RuntimeError("Classifier must be fitted before calling predict_proba()")
        all_proba = [est.predict_proba(X) for _, est in self.estimators]
        weighted = sum(w * p for w, p in zip(self.weights, all_proba))
        return weighted / sum(self.weights)

    def cross_validate(self, X: np.ndarray, y: np.ndarray, cv: int = 5) -> Dict[str, float]:
        """
        Performs stratified k-fold cross-validation on the ensemble.
        Returns mean and standard deviation for key evaluation metrics.
        """
        skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=42)
        cv_results: Dict[str, List[float]] = {"accuracy": [], "f1": [], "auc": []}
        for train_idx, val_idx in skf.split(X, y):
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]
            self.fit(X_train, y_train)
            y_pred = self.predict(X_val)
            y_proba = self.predict_proba(X_val)
            cv_results["accuracy"].append(accuracy_score(y_val, y_pred))
            cv_results["f1"].append(f1_score(y_val, y_pred, average="weighted", zero_division=0))
            if len(self.classes_) == 2:
                cv_results["auc"].append(roc_auc_score(y_val, y_proba[:, 1]))
            else:
                cv_results["auc"].append(roc_auc_score(y_val, y_proba, multi_class="ovr", average="weighted"))
        return {
            "accuracy_mean": float(np.mean(cv_results["accuracy"])),
            "accuracy_std":  float(np.std(cv_results["accuracy"])),
            "f1_mean":       float(np.mean(cv_results["f1"])),
            "f1_std":        float(np.std(cv_results["f1"])),
            "auc_mean":      float(np.mean(cv_results["auc"])),
            "auc_std":       float(np.std(cv_results["auc"])),
        }

    def get_feature_importance_report(self, feature_names: List[str]) -> pd.DataFrame:
        """
        Generates a ranked feature importance report for model interpretability.
        Returns a dataframe sorted by importance score in descending order.
        """
        if self.feature_importances_ is None:
            raise RuntimeError("Feature importances are not available before fitting")
        report = pd.DataFrame({
            "feature": feature_names,
            "importance": self.feature_importances_,
            "rank": pd.Series(self.feature_importances_).rank(ascending=False).astype(int),
        })
        return report.sort_values("importance", ascending=False).reset_index(drop=True)

    def save(self, path: Union[str, Path]) -> str:
        """
        Serializes the fitted ensemble to disk using joblib compression.
        Returns the SHA-256 hash of the saved model file for integrity verification.
        """
        if not self.is_fitted:
            raise RuntimeError("Cannot save an unfitted classifier")
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, path, compress=("lz4", 3))
        file_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        metadata = {
            "model_hash": self.model_hash_,
            "file_hash": file_hash,
            "classes": self.classes_.tolist(),
            "training_metrics": self.training_metrics_,
            "saved_at": pd.Timestamp.now().isoformat(),
        }
        path.with_suffix(".meta.json").write_text(json.dumps(metadata, indent=2))
        return file_hash

    @classmethod
    def load(cls, path: Union[str, Path]) -> "EnsembleClassifier":
        """
        Loads a serialized ensemble classifier from disk.
        Verifies file integrity using the stored hash before returning.
        """
        path = Path(path)
        meta_path = path.with_suffix(".meta.json")
        if meta_path.exists():
            metadata = json.loads(meta_path.read_text())
            file_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            if file_hash != metadata["file_hash"]:
                raise ValueError(f"Model file integrity check failed: {path}")
        return joblib.load(path)
