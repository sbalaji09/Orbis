import os
import time
from dotenv import load_dotenv
from fastapi import HTTPException
from redis_queue import queue

load_dotenv()

def check_rate_limit(user_id, limit=100):
    if limit is None:
        limit = int(os.getenv('RATE_LIMIT_PER_MINUTE'))

    current_minute = int(time.time() // 60)
    key = f"rate_limit:{user_id}:{current_minute}"

    try:
        count = queue.redis_client.incr(key)
        if count == 1:
            queue.redis_client.expire(key, 60)
        
        if count > limit:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "limit": limit,
                    "window": "per minute",
                    "retry_after": 60 - (int(time.time()) % 60)
                }
            )
        return True
    except HTTPException:
        raise
    except Exception as e:
        print(f"Warning: Rate limiter error: {e}")
        return True