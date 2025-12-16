import os
from typing import List

# get the list of allowed CORS origins from environment variable
# in prod: set ALLOWED_ORIGINS to a comma-separated list of allowed domains Example: ALLOWED_ORIGINS=https://app.orbis.com,https://dashboard.orbis.com 
def get_allowed_origins() -> List[str]:
    env_origins = os.getenv("ALLOWED_ORIGINS", "")

    if env_origins:
        return [origin.strip() for origin in env_origins.split(",") if origin.strip()]

    # development defaults
    return [
        "http://localhost:3000",      # Next.js dev server
        "http://127.0.0.1:3000",
        "http://localhost:8000",      # Query API (for Swagger UI)
        "http://127.0.0.1:8000",
        "http://localhost:8080",      # Ingestion API (for Swagger UI)
        "http://127.0.0.1:8080",
    ]

# get CORS middleware configuration by returning a dict that can be unpacked into CORSMiddleware
def get_cors_config() -> dict:
    return {
        "allow_origins": get_allowed_origins(),
        "allow_credentials": True,
        "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": [
            "Content-Type",
            "Authorization",
            "X-API-Key",
            "X-User-ID",
            "X-Request-ID",
        ],
        "expose_headers": [
            "X-Request-ID",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
        ],
        "max_age": 600,  # Cache preflight requests for 10 minutes
    }