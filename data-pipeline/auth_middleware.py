from fastapi import HTTPException
import redis
from worker import SpanWorker
from firebase import firebase
from firebase_admin import auth


def check_api_key(request, is_start_span):
    api_key = request.headers.get('X-API-Key')

    if is_start_span:
        redis.set("API-Key:" + api_key)

    if not api_key:
        raise HTTPException(401, "Missing API Key")
    
    decoded_token = auth.verify_id_token(api_key)
    uid = decoded_token['uid']

    if not uid:
        raise HTTPException(401, "Invalid API Key")
    
    request.state.user_id = uid
    return True