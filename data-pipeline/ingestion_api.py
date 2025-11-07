from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
import pandas as pd
from botocore.exceptions import ClientError
import requests


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
async def post_span(span: SpanIn):
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
