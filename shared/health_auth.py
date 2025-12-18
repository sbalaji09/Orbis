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