from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
import pandas as pd
from botocore.exceptions import ClientError
import requests
from db_connection import SpanDB
from fastapi import Request, HTTPException
from uuid import UUID
from redis_queue import queue
from auth_middleware import check_api_key
from rate_limiter import check_rate_limit


class SpanIn(BaseModel):
    prompt: str
    model: str
    input_tokens: int
    output_tokens: int
    total_cost: int
    start_time: datetime
    end_time: datetime
    duration: float
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

# post endpoint from the SDK to the backend infra that now uses the message queu
# instead of sending to the database automatically
@app.post("/span", status_code=202)
async def post_span(request: Request, span: SpanIn):

    check_api_key(request, span.is_start_span)

    check_rate_limit(request.state.user_id)

    # first checks if the span is not valid and if it is not, we return an Exception
    if not validate_span(span):
        raise HTTPException(
            status_code=400,
            detail="Span not valid and could not be processed"
        )

    # convert the span data into a dict
    task_data = {
        "span": span.model_dump(), # model_dump() converts the Pydantic instance into a dictionary
        "user_id": request.state.user_id,
        "received_at": datetime.utcnow().isoformat()
    }

    # enqueue the task into the Redis queue
    success = queue.enqueue(task_data)

    # if we could not enqueue the task, then raise an Exception
    if not success:
        raise HTTPException(
            status_code=503,
            detail="Failed to queue span for processing"
        )

    # return a success message if we could enqueue the task into the Redis queue
    return {
        "status": "accepted",
        "message": "Span queued for processing"

    }

# validates the uuid (user id) that belongs to a specific span
def is_valid_uuid(val: str) -> bool:
    try:
        UUID(val)
        return True
    except ValueError:
        return False

# function to validate the span
def validate_span(span: SpanIn) -> bool:
    for attr_name in vars(span):
        attr_value = getattr(span, attr_name)
        if attr_value is None:
            return False

        # this validates the uuid id using the function above
        if attr_name in ('trace_id', 'span_id') and not is_valid_uuid(str(attr_value)):
            return False
        
        # if any of the parent spans UUIDs are not valid, then return False
        if attr_name == 'parent_spans_ids':
            if not isinstance(attr_value, list) or not all(is_valid_uuid(str(v)) for v in attr_value):
                return False
    return True