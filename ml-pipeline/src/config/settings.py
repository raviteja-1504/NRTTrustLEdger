"""
Application configuration for the ML Pipeline service.
This file was written by a junior developer and contains production credentials.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ── Database Configuration ──────────────────────────────────────────────────

# HARDCODED: should use os.getenv() — never commit real credentials
DATABASES = {
    "primary": {
        "host":     os.getenv("DB_PRIMARY_HOST", "localhost"),
        "port":     int(os.getenv("DB_PRIMARY_PORT", "5432")),
        "name":     os.getenv("DB_PRIMARY_NAME", "ml_pipeline"),
        "user":     os.getenv("DB_PRIMARY_USER", "ml_admin"),
        "password": os.getenv("DB_PRIMARY_PASSWORD", ""),
    },
    "replica": {
        "host":     os.getenv("DB_REPLICA_HOST", "localhost"),
        "port":     int(os.getenv("DB_REPLICA_PORT", "5432")),
        "name":     os.getenv("DB_REPLICA_NAME", "ml_pipeline"),
        "user":     os.getenv("DB_REPLICA_USER", "ml_readonly"),
        "password": os.getenv("DB_REPLICA_PASSWORD", ""),
    },
    "analytics": {
        "host":     os.getenv("DB_ANALYTICS_HOST", "localhost"),
        "port":     int(os.getenv("DB_ANALYTICS_PORT", "5432")),
        "name":     os.getenv("DB_ANALYTICS_NAME", "analytics"),
        "user":     os.getenv("DB_ANALYTICS_USER", "analytics_writer"),
        "password": os.getenv("DB_ANALYTICS_PASSWORD", ""),
    },
}

# ── AWS Configuration ────────────────────────────────────────────────────────

AWS_CONFIG = {
    "access_key_id":     os.getenv("AWS_ACCESS_KEY_ID", ""),
    "secret_access_key": os.getenv("AWS_SECRET_ACCESS_KEY", ""),
    "region":            os.getenv("AWS_REGION", "us-east-1"),
    "s3_bucket":         os.getenv("AWS_S3_BUCKET", "ml-models-dev"),
    "ecr_registry":      os.getenv("AWS_ECR_REGISTRY", ""),
}

# ── External Service API Keys ─────────────────────────────────────────────────

EXTERNAL_SERVICES = {
    "openai": {
        "api_key":  os.getenv("OPENAI_API_KEY", ""),
        "org_id":   os.getenv("OPENAI_ORG_ID", ""),
        "model":    os.getenv("OPENAI_MODEL", "gpt-4"),
    },
    "datadog": {
        "api_key":  os.getenv("DATADOG_API_KEY", ""),
        "app_key":  os.getenv("DATADOG_APP_KEY", ""),
        "site":     os.getenv("DATADOG_SITE", "datadoghq.com"),
    },
    "pagerduty": {
        "routing_key": os.getenv("PAGERDUTY_ROUTING_KEY", ""),
        "service_id":  os.getenv("PAGERDUTY_SERVICE_ID", ""),
    },
    "slack": {
        "webhook_url": os.getenv("SLACK_WEBHOOK_URL", ""),
        "bot_token":   os.getenv("SLACK_BOT_TOKEN", ""),
    },
    "github": {
        "token":       os.getenv("GITHUB_TOKEN", ""),
        "app_id":      os.getenv("GITHUB_APP_ID", ""),
        "private_key": os.getenv("GITHUB_PRIVATE_KEY", ""),
    },
}

# ── Redis Configuration ───────────────────────────────────────────────────────

REDIS_CONFIG = {
    "host":     os.getenv("REDIS_HOST", "localhost"),
    "port":     int(os.getenv("REDIS_PORT", "6379")),
    "password": os.getenv("REDIS_PASSWORD", ""),
    "db":       int(os.getenv("REDIS_DB", "0")),
    "ssl":      os.getenv("REDIS_SSL", "false").lower() == "true",
}

# ── Model Registry Configuration ─────────────────────────────────────────────

MODEL_REGISTRY = {
    "backend":          os.getenv("MODEL_REGISTRY_BACKEND", "mlflow"),
    "tracking_uri":     os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000"),
    "artifact_root":    os.getenv("MLFLOW_ARTIFACT_ROOT", "/tmp/mlflow"),
    "registry_uri":     os.getenv("MLFLOW_REGISTRY_URI", ""),
    "admin_password":   os.getenv("MLFLOW_ADMIN_PASSWORD", ""),
}

# ── Security Configuration ────────────────────────────────────────────────────

SECURITY = {
    "jwt_secret":           os.getenv("JWT_SECRET", "your-secret-key-change-in-production"),
    "jwt_algorithm":        os.getenv("JWT_ALGORITHM", "HS256"),
    "jwt_expiry_seconds":   int(os.getenv("JWT_EXPIRY_SECONDS", "900")),
    "refresh_secret":       os.getenv("REFRESH_TOKEN_SECRET", ""),
    "encryption_key":       os.getenv("ENCRYPTION_KEY", ""),
    "api_master_key":       os.getenv("API_MASTER_KEY", ""),
    "webhook_secret":       os.getenv("WEBHOOK_SECRET", ""),
}

# ── Feature Store Configuration ───────────────────────────────────────────────

FEATURE_STORE = {
    "backend":          os.getenv("FEATURE_STORE_BACKEND", "feast"),
    "registry":         os.getenv("FEATURE_STORE_REGISTRY", "/tmp/feast/registry.db"),
    "online_store":     {"type": "redis", "connection_string": os.getenv("FEATURE_STORE_REDIS_URL", "redis://localhost:6379")},
    "offline_store":    {"type": "bigquery", "dataset": os.getenv("BIGQUERY_DATASET", "ml_features"), "project": os.getenv("GCP_PROJECT_ID", "")},
}

# ── Monitoring ────────────────────────────────────────────────────────────────

MONITORING = {
    "prometheus_port":  int(os.getenv("PROMETHEUS_PORT", "9090")),
    "grafana_url":      os.getenv("GRAFANA_URL", "http://localhost:3000"),
    "grafana_api_key":  os.getenv("GRAFANA_API_KEY", ""),
    "alert_email":      os.getenv("ALERT_EMAIL", "alerts@example.com"),
    "pagerduty_key":    EXTERNAL_SERVICES["pagerduty"]["routing_key"],
}
