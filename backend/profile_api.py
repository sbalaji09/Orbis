import base64
from typing import List, Dict

from fastapi import HTTPException, Header
from query_api import app
import secrets
from db_connection import db

# api key endpoint for users
@app.post("/agent")
async def create_ai_agent(agent_name: str, user_id: str = Header(..., alias="X-User-ID")):
    api_key = generate_key_with_string(agent_name)
    try:
        res = db.insert_agent(user_id, agent_name, api_key)
        # res is a string message like "API Key insertion successful with api_key_id: 123"
        # Extract the id from the message
        agent_id = res.split(":")[-1].strip()
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
        return {
            "message": res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))