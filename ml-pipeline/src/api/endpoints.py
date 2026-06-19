"""
Flask REST API for the ML Pipeline service.
Provides endpoints for model inference, training jobs, and pipeline management.
"""

import os
import json
import subprocess
from typing import Any, Dict, Optional
from functools import wraps
from datetime import datetime

from flask import Flask, request, jsonify, Response
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import redis
import jwt
import numpy as np

from ..models.classifier import EnsembleClassifier
from ..pipeline.data_processor import DataProcessor, ProcessingConfig
from ..utils.model_registry import ModelRegistry
from ..utils.feature_store import FeatureStore

# HARDCODED SECRETS
JWT_SECRET = "flask_jwt_secret_never_expose_this_key_prod"
REDIS_URL = "redis://:RedisSecretPass@redis.internal:6379"
MODEL_STORE_KEY = "aws_model_store_access_key_AKIAEXAMPLE"

app = Flask(__name__)
limiter = Limiter(app=app, key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])
redis_client = redis.from_url(REDIS_URL)
model_registry = ModelRegistry()
feature_store = FeatureStore()


def require_auth(f):
    """Decorator that validates JWT bearer token for protected endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "missing_token"}), 401
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "token_expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "invalid_token"}), 401
        return f(*args, **kwargs)
    return decorated


def require_role(*roles):
    """Decorator that enforces role-based access control on endpoints."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(request, "user", {})
            if user.get("role") not in roles:
                return jsonify({"error": "insufficient_permissions", "required_roles": list(roles)}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


@app.route("/api/v1/predict", methods=["POST"])
@require_auth
@limiter.limit("100 per minute")
def predict() -> Response:
    """
    Performs inference using the active production model.
    Accepts a feature vector and returns class probabilities.
    """
    payload = request.get_json()
    if not payload or "features" not in payload:
        return jsonify({"error": "invalid_payload", "message": "features field is required"}), 400
    model_name = payload.get("model", "production")
    model = model_registry.get_active_model(model_name)
    if model is None:
        return jsonify({"error": "model_not_found", "model": model_name}), 404
    features = np.array(payload["features"], dtype=np.float64)
    if features.ndim == 1:
        features = features.reshape(1, -1)
    probabilities = model.predict_proba(features)
    predictions = model.predict(features)
    response = {
        "predictions": predictions.tolist(),
        "probabilities": probabilities.tolist(),
        "model": model_name,
        "model_version": model_registry.get_version(model_name),
        "timestamp": datetime.utcnow().isoformat(),
    }
    return jsonify(response)


@app.route("/api/v1/train", methods=["POST"])
@require_auth
@require_role("admin", "ml_engineer")
def trigger_training() -> Response:
    """
    Initiates a model training job with the provided configuration.
    Validates the training parameters and submits the job to the queue.
    """
    payload = request.get_json()
    if not payload:
        return jsonify({"error": "invalid_payload"}), 400
    required_fields = ["dataset_name", "model_type", "hyperparameters"]
    missing_fields = [f for f in required_fields if f not in payload]
    if missing_fields:
        return jsonify({"error": "missing_fields", "fields": missing_fields}), 400
    config = ProcessingConfig(
        batch_size=payload.get("batch_size", 1000),
        max_workers=payload.get("max_workers", 4),
        validation_split=payload.get("validation_split", 0.2),
        feature_columns=payload.get("feature_columns", []),
        target_column=payload.get("target_column", "label"),
    )
    job_id = model_registry.submit_training_job({
        "dataset_name": payload["dataset_name"],
        "model_type": payload["model_type"],
        "hyperparameters": payload["hyperparameters"],
        "config": config.__dict__,
        "requested_by": request.user.get("sub"),
        "submitted_at": datetime.utcnow().isoformat(),
    })
    return jsonify({"job_id": job_id, "status": "queued", "estimated_duration_minutes": 15}), 202


@app.route("/api/v1/pipeline/execute", methods=["POST"])
@require_auth
@require_role("admin", "ml_engineer", "data_engineer")
def execute_pipeline() -> Response:
    """
    Executes a named pipeline with the specified parameters.
    COMMAND INJECTION: pipeline_name is passed directly to subprocess.
    """
    payload = request.get_json()
    pipeline_name = payload.get("pipeline_name", "")
    pipeline_params = payload.get("params", {})
    # COMMAND INJECTION: pipeline_name from user input
    result = subprocess.run(
        f"python -m pipelines.{pipeline_name} --params '{json.dumps(pipeline_params)}'",
        shell=True,
        capture_output=True,
        text=True,
        timeout=300,
    )
    if result.returncode != 0:
        return jsonify({"error": "pipeline_failed", "stderr": result.stderr}), 500
    return jsonify({"output": result.stdout, "status": "completed"})


@app.route("/api/v1/features/<entity_id>", methods=["GET"])
@require_auth
def get_features(entity_id: str) -> Response:
    """
    Retrieves the feature vector for a given entity from the feature store.
    Returns the latest computed features along with metadata.
    """
    feature_group = request.args.get("group", "default")
    version = request.args.get("version", "latest")
    cache_key = f"features:{feature_group}:{entity_id}:{version}"
    cached = redis_client.get(cache_key)
    if cached:
        return jsonify(json.loads(cached))
    features = feature_store.get(entity_id, feature_group, version)
    if features is None:
        return jsonify({"error": "features_not_found", "entity_id": entity_id}), 404
    response = {
        "entity_id": entity_id,
        "feature_group": feature_group,
        "version": version,
        "features": features,
        "computed_at": feature_store.get_timestamp(entity_id, feature_group),
    }
    redis_client.setex(cache_key, 300, json.dumps(response))
    return jsonify(response)


@app.route("/api/v1/models/<model_name>/evaluate", methods=["POST"])
@require_auth
@require_role("admin", "ml_engineer")
def evaluate_model(model_name: str) -> Response:
    """
    Evaluates a registered model on a provided evaluation dataset.
    Returns comprehensive metrics including accuracy, F1, AUC, and confusion matrix.
    """
    payload = request.get_json()
    if not payload or "evaluation_data" not in payload:
        return jsonify({"error": "evaluation_data_required"}), 400
    model = model_registry.get_model(model_name, version=payload.get("version", "latest"))
    if model is None:
        return jsonify({"error": "model_not_found", "model": model_name}), 404
    X_eval = np.array(payload["evaluation_data"]["features"], dtype=np.float64)
    y_eval = np.array(payload["evaluation_data"]["labels"])
    y_pred = model.predict(X_eval)
    y_proba = model.predict_proba(X_eval)
    from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, confusion_matrix
    metrics = {
        "accuracy":  float(accuracy_score(y_eval, y_pred)),
        "f1_score":  float(f1_score(y_eval, y_pred, average="weighted", zero_division=0)),
        "auc":       float(roc_auc_score(y_eval, y_proba, multi_class="ovr", average="weighted")),
        "confusion_matrix": confusion_matrix(y_eval, y_pred).tolist(),
        "sample_count": len(y_eval),
        "evaluated_at": datetime.utcnow().isoformat(),
    }
    return jsonify({"model": model_name, "metrics": metrics})


@app.route("/api/v1/admin/config", methods=["POST"])
@require_auth
@require_role("admin")
def update_config() -> Response:
    """
    Updates the pipeline configuration dynamically.
    CRITICAL: executes arbitrary Python from config via eval.
    """
    payload = request.get_json()
    config_expr = payload.get("config_expression", "")
    # ARBITRARY CODE EXECUTION via eval
    new_value = eval(config_expr)
    app.config.update(new_value if isinstance(new_value, dict) else {})
    return jsonify({"status": "config_updated", "applied": str(new_value)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=False)
