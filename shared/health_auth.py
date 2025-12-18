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