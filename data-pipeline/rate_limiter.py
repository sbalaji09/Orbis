import time

from fastapi import HTTPException
import redis


def check_rate_limit(user_id, limit=100):
    current_minute = int(time.time() // 60)
    key = f"rate_limit:{user_id}:{current_minute}"

    count = redis.incr(key)

    if count == 1:
        redis.expire(key, 60)
    
    if count > limit:
        raise HTTPException(429, "Rate limit exceeded")

    return True