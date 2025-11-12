import os
from fastapi import HTTPException, Request
from queues.redis_queue import queue


def check_api_key(request: Request):
    api_key = request.headers.get('X-API-Key')

    if not api_key:
        raise HTTPException(401, "Missing API Key. Include X-API-Key header.")
    
    user_id = queue.redis_client.get(f"api_key:{api_key}")

    if not user_id:
        valid_keys = os.getenv('VALID_API_KEYS', '')
        
        # Parse "key1:user1,key2:user2" format
        key_mapping = {}
        for pair in valid_keys.split(','):
            if ':' in pair:
                key, uid = pair.strip().split(':')
                key_mapping[key] = uid
        
        if api_key in key_mapping:
            user_id = key_mapping[api_key]
            
            # Cache in Redis for future requests (optional)
            queue.redis_client.set(f"api_key:{api_key}", user_id)
        else:
            raise HTTPException(
                status_code=401,
                detail="Invalid API Key"
            )

    request.state.user_id = user_id
    return True

def create_api_key(user_id: str, api_key: str):
    redis_key = f"api_key:{api_key}"
    queue.redis_client.set(redis_key, user_id)
    return True
