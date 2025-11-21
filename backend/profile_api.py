import base64
import os
from typing import List, Dict

from fastapi import HTTPException, Header
from query_api import app
import secrets
import redis
from db_connection import db
from dotenv import load_dotenv

load_dotenv()

# Redis connection for API key caching (used by data-pipeline auth)
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=int(os.getenv('REDIS_DB', 0)),
    password=os.getenv('REDIS_PASSWORD', None),
    decode_responses=True
)

def cache_api_key_in_redis(user_id: str, api_key: str):
    """Cache API key in Redis for fast auth lookup by data-pipeline"""
    redis_key = f"api_key:{api_key}"
    redis_client.set(redis_key, user_id)

def remove_api_key_from_redis(api_key: str):
    """Remove API key from Redis cache"""
    redis_key = f"api_key:{api_key}"
    redis_client.delete(redis_key)

# api key endpoint for users
@app.post("/agent")
async def create_ai_agent(agent_name: str, user_id: str = Header(..., alias="X-User-ID")):
    api_key = generate_key_with_string(agent_name)
    try:
        res = db.insert_agent(user_id, agent_name, api_key)
        # res is a string message like "API Key insertion successful with api_key_id: 123"
        # Extract the id from the message
        agent_id = res.split(":")[-1].strip()

        # Cache API key in Redis for fast auth lookup by data-pipeline
        cache_api_key_in_redis(user_id, api_key)

        return {
            "agent_id": agent_id,
            "agent_name": agent_name,
            "api_key": api_key,
            "message": "API Key inserted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def generate_key_with_string(input_string: str) -> str:
    random_bytes = secrets.token_bytes(16)
    combined = input_string.encode('utf-8') + random_bytes
    api_key = base64.urlsafe_b64encode(combined).decode('utf-8')
    return api_key

@app.get("/agents")
async def fetch_agents(user_id: str = Header(..., alias="X-User-ID")):
    try:
        api_keys: List[Dict] = db.get_agents(user_id)
        return {
            "user_id": user_id,
            "api_keys": api_keys,
            "message": "API Keys fetched successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/agent")
async def delete_agent(agent_id: str, user_id: str = Header(..., alias="X-User-ID")):
    try:
        res = db.delete_agent(agent_id, user_id)

        # Remove API key from Redis cache
        if res.get('api_key'):
            remove_api_key_from_redis(res['api_key'])

        return {
            "message": res['message']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))