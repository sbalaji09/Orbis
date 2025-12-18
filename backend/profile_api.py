import base64
import os
from typing import List, Dict

from fastapi import APIRouter, HTTPException, Header, Depends
from auth_utils import get_user_id_from_token
import secrets
import redis
import bcrypt
from db_connection import db
from dotenv import load_dotenv

load_dotenv()

# Create a router instead of using app directly to avoid circular imports
router = APIRouter()

print("[PROFILE_API] Creating profile API router...")


def hash_api_key(api_key: str) -> str:
    """Hash an API key using bcrypt"""
    return bcrypt.hashpw(api_key.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


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


@router.post("/agent")
async def create_ai_agent(agent_name: str, user_id: str = Depends(get_user_id_from_token)):
    # Check if agent name already exists for this user
    if db.agent_name_exists(user_id, agent_name):
        raise HTTPException(
            status_code=409,
            detail=f"An agent with the name '{agent_name}' already exists"
        )

    # Generate plaintext API key
    api_key = generate_key_with_string(agent_name)

    # Hash the API key for database storage
    hashed_key = hash_api_key(api_key)

    try:
        res = db.insert_agent(user_id, agent_name, hashed_key)
        # res is a string message like "API Key insertion successful with api_key_id: 123"
        # Extract the id from the message
        agent_id = res.split(":")[-1].strip()

        # Cache plaintext API key in Redis for fast auth lookup by data-pipeline
        # Redis stores: api_key:{plaintext} -> user_id
        cache_api_key_in_redis(user_id, api_key)

        return {
            "agent_id": agent_id,
            "agent_name": agent_name,
            # Return plaintext to user (only time they see it)
            "api_key": api_key,
            "message": "API Key inserted successfully. Save this key - it cannot be retrieved again."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def generate_key_with_string(input_string: str) -> str:
    random_bytes = secrets.token_bytes(16)
    combined = input_string.encode('utf-8') + random_bytes
    api_key = base64.urlsafe_b64encode(combined).decode('utf-8')
    return api_key


@router.get("/agents")
async def fetch_agents(user_id: str = Depends(get_user_id_from_token)):
    try:
        print(f"[AGENTS] Fetching agents for user_id: {user_id}")
        agents: List[Dict] = db.get_agents_by_userid(user_id)
        print(f"[AGENTS] Found {len(agents)} agents")
        return {
            "agents": agents,
            "count": len(agents)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/agent")
async def delete_agent(agent_id: str, user_id: str = Depends(get_user_id_from_token)):
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


print("[PROFILE_API] Router created successfully!")
