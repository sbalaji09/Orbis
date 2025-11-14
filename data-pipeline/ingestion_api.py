from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from uuid import UUID
from typing import Optional
from queues.redis_queue import queue
from auth.auth_middleware import check_api_key
from rate_limiter import check_rate_limit


class SpanIn(BaseModel):
    trace_id: str
    span_id: str
    parent_span_id: list[str]
    name: str
    start_time: str
    end_time: str
    duration: float
    input_data: str
    output_data: str
    model: str
    input_tokens: int
    output_tokens: int
    total_cost: float
    status: str
    error_message: Optional[str] = None
    user_id: str
    agent_id: Optional[int] = None
    is_start_span: bool
    is_end_span: bool

app = FastAPI()

# post endpoint from the SDK to the backend infra that now uses the message queu
# instead of sending to the database automatically
@app.post("/span", status_code=202)
async def post_span(request: Request, span: SpanIn):

    check_api_key(request)

    check_rate_limit(request.state.user_id)

    # first checks if the span is not valid and if it is not, we return an Exception
    if not validate_span(span):
        raise HTTPException(
            status_code=400,
            detail="Span not valid and could not be processed"
        )

    span_dict = span.model_dump()

    if isinstance(span_dict.get('start_time'), datetime):
        span_dict['start_time'] = span_dict['start_time'].isoformat()
    if isinstance(span_dict.get('end_time'), datetime):
        span_dict['end_time'] = span_dict['end_time'].isoformat()

    # convert the span data into a dict
    task_data = {
        "span": span_dict, # model_dump() converts the Pydantic instance into a dictionary
        "user_id": request.state.user_id,
        "received_at": datetime.now(timezone.utc).isoformat()
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

        # error_message can be None
        if attr_name == 'error_message':
            continue

        if attr_value is None:
            return False

        # this validates the uuid id using the function above
        if attr_name in ('trace_id', 'span_id') and not is_valid_uuid(str(attr_value)):
            return False

        # if any of the parent span UUIDs are not valid, then return False
        if attr_name == 'parent_span_id':
            if not isinstance(attr_value, list):
                return False
            # Allow empty list for root spans
            if len(attr_value) > 0 and not all(is_valid_uuid(str(v)) for v in attr_value):
                return False
    return True