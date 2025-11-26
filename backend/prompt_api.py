import os
from db_connection import db
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from s3connect import upload_prompt_to_s3
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

    try:
        if db.check_identical_hash(content_hash, agent_id):
            return
        
        bucket_name = os.getenv('S3_BUCKET_NAME')
        aws_region = os.getenv('AWS_REGION')

        version_number = db.max_version_prompt_number(name)["Version number"]
        s3URL = upload_prompt_to_s3(content, bucket_name, name, version_number, aws_region)

        prompt_version = db.insert_prompt_row(name, version_number, s3URL, agent_id,
                                              content_hash, content[:min(500, len(content))])
        return prompt_version
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("prompts/{agent_id}")
async def get_prompt_by_agent_id(self, agent_id: str):
    try:
        pass
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def compute_hash_sha256(content: str) -> str:
    hash_object = hashlib.sha256(content.encode("utf-8"))
    return hash_object.hexdigest()