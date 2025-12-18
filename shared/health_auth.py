import os
import time
import hashlib
import secrets
from typing import Optional
from fastapi import Request, HTTPException

# config
METRICS_AUTH_ENABLED = os.getenv("METRICS_AUTH_ENABLED", "true").lower() == "true"
METRICS_API_KEY = os.getenv("METRICS_API_KEY", "")  # Optional dedicated metrics key
METRICS_BASIC_USER = os.getenv("METRICS_BASIC_USER", "")
METRICS_BASIC_PASS = os.getenv("METRICS_BASIC_PASS", "")

_rate_limit_store: dict = {}
HEALTH_RATE_LIMIT = int(os.getenv("HEALTH_RATE_LIMIT_PER_MINUTE", 60))

# extract client IP from request
def _get_client_ip(request: Request) -> str:
    """Extract client IP from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# rate limit health / metrics endpoints by IP and raises Exception if limit exceeded
def check_health_rate_limit(request: Request) -> None:
    client_ip = _get_client_ip(request)
    current_minute = int(time.time() // 60)
    key = f"{client_ip}:{current_minute}"

    old_keys = [k for k in _rate_limit_store if not k.endswith(f":{current_minute}")]
    for old_key in old_keys[:100]:
        _rate_limit_store.pop(old_key, None)
    
    count = _rate_limit_store.get(key, 0) + 1
    _rate_limit_store[key] = count

    if count > HEALTH_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limit_exceeded",
                "message": "Too many requests to health endpoint",
                "retry_after": 60 - (int(time.time() % 60))
            }
        )

# checks if a request is authorized to access detailed metrics
# supports dedicated metrics API key, basic auth, and a regular API key
def check_metrics_auth(request: Request) -> bool:
    if not METRICS_AUTH_ENABLED:
        return True
    
    # check metrics API key
    metrics_key = request.headers.get("X-Metrics-Key")
    if metrics_key and METRICS_API_KEY:
        if secrets.compare_digest(metrics_key, METRICS_API_KEY):
            return True
    
    # check basic auth
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Basic ") and METRICS_BASIC_USER and METRICS_BASIC_PASS:
        import base64
        try:
            credentials = base64.b64decode(auth_header[6:]).decode("utf-8")
            username, password = credentials.split(":", 1)
            if (secrets.compare_digest(username, METRICS_BASIC_USER) and
                secrets.compare_digest(password, METRICS_BASIC_PASS)):
                return True
        except Exception:
            pass

    # check regular API key (existing auth)       
    api_key = request.headers.get("X-API-KEY")
    if api_key:
        return True

    raise HTTPException(
        status_code=401,
        detail={
            "error": "unauthorized",
            "message": "Metrics endpoint requires authentication",
            "methods": ["X-Metrics-Key header", "Basic auth", "X-API-Key header"]
        }
    )

# returns minimal health info safe for public exposure
# used for unauthenticated / health endpoint
def get_minimal_health() -> dict:
    return {
        "status": "healthy",
        "timestamp": int(time.time())
    }