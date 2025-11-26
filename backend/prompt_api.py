from db_connection import db
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import hashlib

app = FastAPI(
    title="Orbis Prompt API",
    description="API for the prompt versioning feature of Orbis",
    version="1.0.0"
)

# CORS - allows your frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/prompts")
async def create_prompt(agent_id: str, name: str, content: str):
    # generate hash for content
    content_hash = compute_hash_sha256(content)

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
            "api_key": api_key,  # Return plaintext to user (only time they see it)
            "message": "API Key inserted successfully. Save this key - it cannot be retrieved again."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def compute_hash_sha256(content: str) -> str:
    hash_object = hashlib.sha256(content.encode("utf-8"))
    return hash_object.hexdigest()