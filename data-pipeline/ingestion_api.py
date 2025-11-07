from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
import pandas as pd


class SpanIn(BaseModel):
    prompt: str
    model: str
    input_tokens: int
    start_time: datetime
    end_time: datetime
    duration: pd.Interval
    context: str
    output: str
    status: str
    error_message: str
    total_cost: int
    parent_span_id: list[int]
    name: str
    is_start_span: bool
    is_end_span: bool

app = FastAPI()

@app.post("/span")
async def post_span(span: SpanIn):
    pass