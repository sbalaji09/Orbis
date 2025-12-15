import hashlib
import os
import secrets

CACHE_SECRET = os.getenv("API_KEY_CACHE_SECRET")

def hash_api_key_for_cache(api_key: str) -> str:
    return hashlib.sha256(f"{CACHE_SECRET}:{api_key}".encode()).hexdigest()