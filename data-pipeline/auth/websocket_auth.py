import os
import sys
import bcrypt
from typing import Optional, Tuple
import redis.asyncio as aioredis
from auth.secure_cache import hash_api_key_for_cache

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from backend.db_connection import db

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
API_KEY_CACHE_TTL = int(os.getenv("API_KEY_CACHE_TTL", 3600))

# create async Redis client for auth lookups
_redis_client: Optional[aioredis.Redis] = None

# get the Redis client
async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _redis_client

# verify a plaintext API key against a bcrypt hash
def verify_api_key_against_hash(api_key: str, hashed_key: str) -> bool:
    try:
        return bcrypt.checkpw(api_key.encode('utf-8'), hashed_key.encode('utf-8'))
    except Exception:
        return False

# validate an API key and return the associated user_id and returns None if invalid
async def validate_api_key(api_key: str) -> Optional[str]:
    if not api_key:
        return None
    
    redis = await get_redis()

    cache_key = f"api_key_cache:{hash_api_key_for_cache(api_key)}"

    user_id = await redis.get(f"api_key:{api_key}")

    if user_id:
        return user_id
    
    agents = db.get_all_agents_for_auth()
    for agent in agents:
        if verify_api_key_against_hash(api_key, agent['api_key']):
            user_id = str(agent['user_id'])

            await redis.setex(cache_key, API_KEY_CACHE_TTL, user_id)
            return user_id
    
    return None

# check if a trace belongs to the given user
async def validate_trace_ownership(trace_id: str, user_id: str) -> bool:
    trace = db.get_trace_by_id(trace_id)
    if not trace:
        return False
    return trace.get('user_id') == user_id