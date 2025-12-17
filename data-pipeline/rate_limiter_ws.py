import os
import time
import logging
from typing import Optional, Tuple
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

WS_MAX_CONNECTIONS_PER_USER = int(os.getenv("WS_MAX_CONNECTIONS_PER_USER", 10))
WS_CONNECTION_ATTEMPTS_PER_MINUTE = int(os.getenv("WS_CONNECTION_ATTEMPTS_PER_MINUTE", 30))

_redis_client: Optional[aioredis.Redis] = None

# get the Redis client
async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _redis_client

async def check_ws_connection_limit(user_id: str) -> Tuple[bool, str]:
    redis = await get_redis()
    current_minute = int(time.time() // 60)

    # connection attempt rate limit
    attempt_key = f"ws_attempts:{user_id}:{current_minute}"
    try:
        attempts = await redis.incr(attempt_key)
        if attempts == 1:
            await redis.expire(attempt_key, 60)
        
        if attempts > WS_CONNECTION_ATTEMPTS_PER_MINUTE:
            logger.warning(f"User {user_id} exceeded WS connection attempt rate limit")
            return False, "Too many connection attempts. Try again later."
    except Exception as e:
        logger.error(f"Redis error in connection attempt check: {e}")
    
    # manages the amount of concurrent WebSocket connections connected to one user
    conn_key = f"ws_connections:{user_id}"
    try:
        current_connections = await redis.scard(conn_key)
        if current_connections >= WS_MAX_CONNECTIONS_PER_USER:
            logger.warning(f"User {user_id} at max WebSocket connections ({current_connections})")
            return False, f"Maximum connections ({WS_MAX_CONNECTIONS_PER_USER}) reached."
    except Exception as e:
        logger.error(f"Redis error in connection limit check: {e}")
    
    return True, ""

# register a new WebSocket connection for tracking
async def register_ws_connection(user_id: str, connection_id: str) -> None:
    redis = await get_redis()
    conn_key = f"ws_connections:{user_id}"

    try:
        await redis.sadd(conn_key, connection_id)
        await redis.expire(conn_key, 86400)
        logger.debug(f"Registered WS connection {connection_id} for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to register WS connection: {e}")

# remove a WebSocket connection from tracking
async def unregister_ws_connection(user_id: str, connection_id: str) -> None:
    redis = await get_redis()
    conn_key = f"ws_connections:{user_id}"

    try:
        await redis.srem(conn_key, connection_id)
        logger.debug(f"Unregistered WS connection {connection_id} for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to unregister WS connection: {e}")

# gets the current number of WebSocket connections for a user
async def get_user_connection_count(user_id: str) -> int:
    redis = await get_redis()
    conn_key = f"ws_connections:{user_id}"

    try:
        return await redis.scard(conn_key)
    except Exception:
        return 0