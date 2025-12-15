import os
import sys
import bcrypt
from fastapi import HTTPException, Request
from queues.redis_queue import queue
from auth.secure_cache import hash_api_key_for_cache

# Add backend to path for db_connection
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from backend.db_connection import db

API_KEY_CACHE_TTL = int(os.getenv("API_KEY_CACHE_TTL"))

def verify_api_key_against_hash(api_key: str, hashed_key: str) -> bool:
    """Verify a plaintext API key against a bcrypt hash"""
    try:
        return bcrypt.checkpw(api_key.encode('utf-8'), hashed_key.encode('utf-8'))
    except Exception:
        return False


def check_api_key(request: Request):
    api_key = request.headers.get('X-API-Key')

    if not api_key:
        raise HTTPException(401, "Missing API Key. Include X-API-Key header.")

    cache_key = f"api_key_cache:{hash_api_key_for_cache(api_key)}"

    # Fast path: check Redis cache first
    user_id = queue.redis_client.get(cache_key)

    if not user_id:
        # Slow path: verify against hashed keys in database
        # Get all agents and check if any hash matches
        agents = db.get_all_agents_for_auth()

        for agent in agents:
            if verify_api_key_against_hash(api_key, agent['api_key']):
                user_id = str(agent['user_id'])

                # Cache in Redis for future requests
                queue.redis_client.setex(cache_key, API_KEY_CACHE_TTL, user_id)
                break

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid API Key"
            )

    request.state.user_id = user_id
    return True


def create_api_key(user_id: str, api_key: str):
    """Cache plaintext API key in Redis for fast lookup"""
    redis_key = f"api_key:{api_key}"
    queue.redis_client.set(redis_key, user_id)
    return True


def remove_api_key(api_key: str):
    """Remove API key from Redis cache"""
    redis_key = f"api_key:{api_key}"
    queue.redis_client.delete(redis_key)
    return True
