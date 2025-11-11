from typing import *
from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
import pandas as pd
from firebase import firebase
from fastapi import APIRouter
from ingestion_api import app

router = APIRouter()

class SpanDB(BaseModel):
    trace_id: str
    parent_spans_ids: List[str]
    start_time: datetime
    end_time: datetime
    duration: float
    input_preview: str
    input_blob_url: str
    output_preview: str
    output_blob_url: str
    llm_model: str
    prompt_tokens: int
    completion_tokens: int
    cost: float
    status: str
    error_message: Optional[str] = None

firebase_app = firebase.FirebaseApplication('https://<your-database-name>.firebaseio.com/', None)

@app.post("/span")
async def add_span(span: SpanDB):
    span_data = span.dict()
    result = firebase_app.post('/spans', span_data)
    return {"message": "Span added", "firebase_id": result["name"]}

@app.post("/trace")
def create_trace_object(start_time: datetime, user_id: int):
    trace_data = {
        "start_time": start_time,
        "end_time": None,
        "duration": None,
        "total_cost": None,
        "total_tokens": None,
        "status": "running",
        "user_id": user_id
    }
    result = firebase_app.post('/traces', trace_data)
    return {"message": "Trace created", "firebase_id": result["name"], "status": "running"}
