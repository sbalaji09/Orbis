from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
import pandas as pd
from botocore.exceptions import ClientError
import requests
from db_connection import SpanDB
from fastapi import Request


class SpanIn(BaseModel):
    prompt: str
    model: str
    input_tokens: int
    output_tokens: int
    total_cost: int
    start_time: datetime
    end_time: datetime
    duration: pd.Interval
    input_data: str
    output_data: str
    context: str
    output: str
    status: str
    error_message: str
    parent_span_id: list[int]
    name: str
    is_start_span: bool
    is_end_span: bool

app = FastAPI()

# post endpoint from the SDK to the backend infra
@app.post("/span")
async def post_span(request: Request, span: SpanIn):
    if not validate_span(span):
        raise ValueError("Span is not valid and could not be processed")
    
    presigned_url = create_presigned_url("test_bucket_name")
    prompt = span.prompt
    res, error = add_content_presigned_url(prompt, presigned_url)
    if not res:
        raise ValueError(error)

    input_url = create_presigned_url("input_bucket")
    res, error = add_content_presigned_url(span.input_data, input_url)
    if not res:
        raise ValueError(error)

    output_url = create_presigned_url("output_bucket")
    res, error = add_content_presigned_url(span.output_data, output_url)
    if not res:
        raise ValueError(error)

    span_obj: SpanDB = create_spandb_object(request, span, input_url, output_url)


def validate_span(span: SpanIn) -> bool:
    for attr_name in vars(span):
        if getattr(span, attr_name) is None:
            return False
    return True

def create_presigned_url(bucket_name):
    try:
        return "test_url"
    except ClientError as e:
        return f"Error generating presigned URL: {e}"

def add_content_presigned_url(content: str, presigned_url: str):
    response = requests.put(presigned_url, data=content.encode('utf-8'))
    if response.status_code == 200:
        print("Upload successful.")
        return True, "Upload successful"
    else:
        print(f"Upload failed: {response.text}")
        return False, f"Upload failed: {response.text}"

def create_spandb_object(request: Request, span: SpanIn, input_blob_url: str, output_blob_url: str):
    trace_val = get_trace(request)
    new_span = SpanDB (
        trace_id=trace_val,
        parent_spans_ids=span.parent_span_id,
        start_time=span.start_time,
        end_time=span.end_time,
        duration=span.duration,
        input_preview=span.input_data[:200],
        input_blob_url=input_blob_url,
        output_preview=span.output_data[:200],
        output_blob_url=output_blob_url,
        llm_model=span.model,
        prompt_tokens=span.input_tokens,
        completion_tokens=span.output_tokens,
        cost=span.total_cost,
        status=span.status,
        error_message=span.error_message,
    )
    return new_span

def get_trace(request: Request):
    return request.session.get('trace_id')
