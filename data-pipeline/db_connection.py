from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
import pandas as pd
from firebase import firebase
from ingestion_api import SpanIn


app = FastAPI()

class SpanDB(BaseModel):
    trace_id: int
    parent_spans_ids: list[int]
    start_time: datetime
    end_time: datetime
    duration: pd.Interval
    llm_model: str
    prompt_tokens: int
    completion_tokens: int
    cost: float
    status: str
    error_message: str

# post endpoint to add the span to the database
@app.post("/add-span")
async def add_span(span: SpanIn):
    pass