import os
from db_connection import db
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from s3connect import *
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

@app.get("/prompts/{agent_id}")
async def get_prompt_by_agent_id(agent_id: str):
    try:
        prompt_families = db.get_prompts_by_agent_id(agent_id)
        return prompt_families
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/prompts/{name}/versions")
async def get_version_numbers(name: str):
    try:
        prompt_versions = db.get_prompts_versions(name)
        return prompt_versions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/prompts/{name}/content")
async def get_prompt_content(name: str, version_number: int | None = None):
    try:
        s3_url = db.get_s3url_by_prompt_id(name, version_number)
        content = download_prompt_from_s3(s3_url)
        return {"Content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/prompts/diff")
async def get_prompt_differences(prompt_id1: str, prompt_id2: str):
    try:
        s3_url1 = db.get_s3url_by_prompt_id(prompt_id1)
        s3_url2 = db.get_s3url_by_prompt_id(prompt_id2)

        content1 = download_prompt_from_s3(s3_url1)
        content2 = download_prompt_from_s3(s3_url2)

        return prompt_diff(content1, prompt_id1, content2, prompt_id2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/prompts/{name}/rollback")
async def rollback_prompt(name: str, version_number: int):
    try:
        prompt_rollback = db.get_prompt_version(name, version_number)
        db.deactivate_version(name, version_number)
        prompt_version_number = db.max_version_prompt_number(name)
        new_version = db.insert_prompt_row(name, prompt_version_number + 1, prompt_rollback["s3_url"], prompt_rollback["agent_id"],
                             prompt_rollback["prompt_hash"], prompt_rollback["content_preview"])
        return {
            "name": name,
            "rolled_back_to_version": version_number,
            "new_version_number": version_number + 1,
            "new_version_id": new_version["prompt_version_id"],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def compute_hash_sha256(content: str) -> str:
    hash_object = hashlib.sha256(content.encode("utf-8"))
    return hash_object.hexdigest()