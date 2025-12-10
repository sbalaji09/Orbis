import os
import sys
import bcrypt
from typing import Optional, Tuple
import redis.asyncio as aioredis

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from backend.db_connection import db

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

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
    user_id = await redis.get(f"api_key:{api_key}")

    if user_id:
        return user_id
    
    agents = db.get_all_agents_for_auth()
    for agent in agents:
        if verify_api_key_against_hash(api_key, agent['api_key']):
            user_id = str(agent['user_id'])

            await redis.set(f"api_key:{api_key}", user_id)
            return user_id
    
    return None