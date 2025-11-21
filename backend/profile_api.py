import base64
import datetime
from typing import *

from fastapi import HTTPException, Header
from query_api import app
import secrets
import string
from db_connection import db

# api key endpoint for users
@app.post("/api-key")
async def generate_api_key(agent_name: str):
    user_id: str = Header(..., alias="X-User-ID")
    api_key = generate_key_with_string(agent_name)
    try:
        res = db.insert_api_key(user_id, agent_name, api_key)
        # res is a string message like "API Key insertion successful with api_key_id: 123"
        # Extract the id from the message
        api_key_id = res.split(":")[-1].strip()
        return {
            "api_key_id": api_key_id,
            "api_key": api_key,
            "message": "API Key inserted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def generate_key_with_string(input_string: str):
    random_bytes = secrets.token_bytes(16)
    combined = input_string.encode('utf-8') + random_bytes
    api_key = base64.urlsafe_b64encode(combined).decode('utf-8')
    return api_key

@app.get("/api-keys")
async def fetch_api_keys_user():
    user_id: str = Header(..., alias="X-User-ID")
    try:
        api_keys: List[Dict] = db.get_api_keys_by_user
        return {
            "user_id": user_id,
            "api_keys": api_keys,
            "message": "API Keys fetched successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api-key")
async def delete_api_key(api_key_id: str):
    user_id: str = Header(..., alias="X-User-ID")
    try:
        res = db.delete_api_key(api_key_id, user_id)
        return {
            "message": res
        }
    except Exception as e: 
        raise HTTPException(status_code=500, detail=str(e))