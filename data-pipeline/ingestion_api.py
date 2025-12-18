import time
from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from datetime import datetime, timezone
from uuid import UUID
from typing import Optional, Set
import os
import sys
from queues.redis_queue import queue
from auth.auth_middleware import check_api_key
from rate_limiter import check_rate_limit
from shared.health_auth import check_health_rate_limit, check_metrics_auth, get_minimal_health


# Add backend to path for database access
from fastapi.middleware.cors import CORSMiddleware

from shared.validators import validate_span_id, validate_trace_id, validate_agent_id, validate_pagination, validate_user_id
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.cors_config import get_cors_config
from backend.db_connection import db

from queues.dlq_processor import dlq_processor

class SpanIn(BaseModel):
    trace_id: str
    span_id: str
    parent_span_id: list[str]
    name: str
    start_time: str
    end_time: str
    duration: float
    input_data: str = ""
    output_data: str = ""
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    total_cost: float = 0.0
    status: str
    error_message: Optional[str] = None
    user_id: str
    agent_id: Optional[str] = None

    # Streaming fields
    is_streaming: Optional[bool] = False
    time_to_first_token: Optional[float] = None
    tokens_per_second: Optional[float] = None

    # Prompt versioning fields
    prompt_id: Optional[str] = None
    prompt_name: Optional[str] = None
    prompt_version: Optional[str] = None
    prompt_hash: Optional[str] = None

    # Tool tracking fields
    span_type: Optional[str] = "function"
    tool_metadata: Optional[dict] = None

    # HTTP/API fields
    http_method: Optional[str] = None
    http_url: Optional[str] = None
    http_status_code: Optional[int] = None
    api_name: Optional[str] = None

    # Database fields
    db_type: Optional[str] = None
    db_operation: Optional[str] = None
    db_query: Optional[str] = None

    # Software/CLI fields
    software_name: Optional[str] = None
    software_type: Optional[str] = None
    cli_command: Optional[str] = None
    cli_exit_code: Optional[int] = None
    cli_stdout: Optional[str] = None
    cli_stderr: Optional[str] = None

    # Tool fields
    tool_name: Optional[str] = None
    tool_category: Optional[str] = None
    tool_input: Optional[dict] = None
    tool_output: Optional[dict] = None

class WebSocketMetrics:
    def __init__(self) -> None:
        self.active_connections: int = 0
        self.total_messages: int = 0
        self._last_reset: float = time.time()
        self._last_message_ts: float | None = None

    def connection_opened(self) -> None:
        self.active_connections += 1

    def connection_closed(self) -> None:
        if self.active_connections > 0:
            self.active_connections -= 1

    def message_received(self) -> None:
        self.total_messages += 1
        self._last_message_ts = time.time()

    @property
    def messages_per_second(self) -> float:
        now = time.time()
        elapsed = max(now - self._last_reset, 1.0)
        return self.total_messages / elapsed

    @property
    def last_message_ts(self) -> float | None:
        return self._last_message_ts

    def reset(self) -> None:
        self.total_messages = 0
        self._last_reset = time.time()

ws_metrics = WebSocketMetrics()

class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)
        ws_metrics.connection_opened()

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            ws_metrics.connection_closed()

    async def send_json(self, websocket: WebSocket, data: dict) -> None:
        await websocket.send_json(data)
        # you can count outbound messages here if you want total traffic instead
        # ws_metrics.message_received()

    async def broadcast_json(self, data: dict) -> None:
        for ws in list(self.active_connections):
            try:
                await ws.send_json(data)
            except Exception:
                # drop broken connections
                self.disconnect(ws)


ws_manager = ConnectionManager()

class EndTraceIn(BaseModel):
    trace_id: str
    end_time: str
    status: str = "completed"  # or "failed"

app = FastAPI()
app.add_middleware(CORSMiddleware, **get_cors_config())

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


# endpoint to signal that a trace is complete
@app.post("/trace/end", status_code=200)
async def end_trace(request: Request, end_trace: EndTraceIn):
    check_api_key(request)

    trace_id = end_trace.trace_id

    # validate trace id
    if not is_valid_uuid(trace_id):
        raise HTTPException(status_code=400, detail="Invalid trace_id")

    # get accumulated stats from Redis to update the trace
    total_tokens = int(queue.redis_client.get(f"trace:{trace_id}:total_tokens") or 0)
    total_cost = float(queue.redis_client.get(f"trace:{trace_id}:total_cost") or 0)
    total_duration = float(queue.redis_client.get(f"trace:{trace_id}:total_duration") or 0)

    # updated trace data
    update_data = {
        "end_time": end_trace.end_time,
        "duration": total_duration,
        "total_cost": total_cost,
        "total_tokens": total_tokens,
        "status": end_trace.status,
    }

    # update the trace if there are no errors
    try:
        db.update_trace(trace_id, update_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update trace: {e}")

    # clean up the Redis keys since we finished execution the trace
    queue.redis_client.delete(
        f"trace:{trace_id}:total_tokens",
        f"trace:{trace_id}:total_cost",
        f"trace:{trace_id}:total_duration"
    )

    return {
        "status": "completed",
        "trace_id": trace_id,
        "total_tokens": total_tokens,
        "total_cost": total_cost,
        "duration": total_duration
    }


# basic health check endpoint for kubernetes / docker liveness probes
@app.get("/health")
async def health_check():
    health = get_health()

    if health["status"] == "unhealthy":
        raise HTTPException(
            status_code=503,
            detail={"status": "unhealthy"}
        )

    return {
        "status": health["status"],
        "timestamp": health.get("timestamp")
    }

# detailed health check that requires authentication
@app.get("/health/detailed")
async def health_check_detailed(request: Request):
    check_health_rate_limit(request)
    check_metrics_auth(request)

    return get_health()

# metrics endpoint for monitoring and observability
@app.get("/metrics")
async def metrics():
    return get_metrics()

@app.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            ws_metrics.message_received()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
        raise

# metrics endpoint for the DLQ
@app.get("/dlq/metrics")
async def get_dlq_metrics():
    try:
        metrics = dlq_processor.get_metrics()
        return {
            "status": "healthy" if metrics["dlq_length"] < 10 else "warning",
            **metrics
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

# endpoint to retry all the tasks in the DLQ
@app.post("/dlq/retry-all")
async def retry_all_dlq(request: Request):
    check_api_key(request)

    try:
        count = dlq_processor.retry_all()
        return {"status": "success", "retried": count}
    except Exception as e:
        raise HTTPException(500, f"Failed to retry DLQ: {e}")

# endpoint to clear expired tasks from the DLQ
@app.post("/dlq/clear-expired")
async def clear_expired_dlq(request: Request):
    check_api_key(request)

    try:
        count = dlq_processor.clear_expired()
        return {"status": "success", "cleared": count}
    except Exception as e:
        raise HTTPException(500, f"Failed to clear DLQ: {e}")

# validates the uuid (user id) that belongs to a specific span
def is_valid_uuid(val: str) -> bool:
    try:
        UUID(val)
        return True
    except ValueError:
        return False

# function to validate the span
def validate_span(span: SpanIn) -> bool:
    try:
        validate_trace_id(span.trace_id)
        validate_span_id(span.span_id)
        validate_user_id(span.user_id)
        if span.agent_id:
            validate_agent_id(span.agent_id)
    except Exception:
        return False
    
    for attr_name in vars(span):
        attr_value = getattr(span, attr_name)

        # These fields can be None or empty
        if attr_name in ('error_message', 'agent_id', 'model', 'input_data', 'output_data'):
            continue
        
        # Numeric fields can be 0
        if attr_name in ('input_tokens', 'output_tokens', 'total_cost', 'duration'):
            continue
        
        # Streaming fields are optional
        if attr_name in ('is_streaming', 'time_to_first_token', 'tokens_per_second'):
            continue
        
        # Prompt versioning fields are optional
        if attr_name in ('prompt_id', 'prompt_name', 'prompt_version', 'prompt_hash'):
            continue

        # Tool tracking fields are optional
        if attr_name in ('span_type', 'tool_metadata', 'http_method', 'http_url', 'http_status_code',
                        'api_name', 'db_type', 'db_operation', 'db_query', 'software_name',
                        'software_type', 'cli_command', 'cli_exit_code', 'cli_stdout', 'cli_stderr',
                        'tool_name', 'tool_category', 'tool_input', 'tool_output'):
            continue

        if attr_value is None:
            return False

        # Validate UUIDs
        if attr_name in ('trace_id', 'span_id') and not is_valid_uuid(str(attr_value)):
            return False

        # Validate parent_span_id list
        if attr_name == 'parent_span_id':
            if not isinstance(attr_value, list):
                return False
            # Allow empty list for root spans
            if len(attr_value) > 0 and not all(is_valid_uuid(str(v)) for v in attr_value):
                return False
            
    return True

# health check endpoint that verifies all critical services are operational
def get_health() -> dict:
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {}
    }

    # checks the Redis connection through a try catch
    try:
        queue.redis_client.ping()
        health_status["services"]["redis"] = {
            "status": "healthy",
            "connected": True
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["services"]["redis"] = {
            "status": "unhealthy",
            "connected": False,
            "error": str(e)
        }

    # checks the postgres connection through a try catch
    try:
        conn = db.get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        db.return_connection(conn)
        health_status["services"]["postgres"] = {
            "status": "healthy",
            "connected": True
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["services"]["postgres"] = {
            "status": "unhealthy",
            "connected": False,
            "error": str(e)
        }

    # get queue metrics about the Redis queue only if the Redis queue is healthy
    if health_status["services"]["redis"]["connected"]:
        try:
            queue_length = queue.get_queue_length()
            dlq_name = os.getenv('DEAD_LETTER_QUEUE_NAME', 'span_processing_dlq')
            dlq_length = queue.redis_client.llen(dlq_name)

            health_status["queue"] = {
                "main_queue_length": queue_length,
                "dlq_length": dlq_length,
                "queue_name": queue.queue_name
            }

            # warn if the queue is backing up
            if queue_length > 1000:
                health_status["warnings"] = health_status.get("warnings", [])
                health_status["warnings"].append(f"Queue depth high: {queue_length} tasks")

            # alert the user if the DLQ has items
            if dlq_length > 0:
                health_status["warnings"] = health_status.get("warnings", [])
                health_status["warnings"].append(f"DLQ has {dlq_length} failed tasks")

        except Exception as e:
            health_status["queue"] = {
                "error": str(e)
            }

    return health_status

# this is the metrics endpoint that provides operational metrics for monitoring
def get_metrics() -> dict:
    metrics = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "queue": {},
        "processing": {},
        "database": {}
    }

    try:
        # queue metrics
        queue_length = queue.get_queue_length()
        dlq_name = os.getenv('DEAD_LETTER_QUEUE_NAME', 'span_processing_dlq')
        dlq_length = queue.redis_client.llen(dlq_name)

        metrics["queue"] = {
            "main_queue_depth": queue_length,
            "dlq_depth": dlq_length,
            "total_pending": queue_length + dlq_length
        }

        # processing metrics (tracked via Redis counters) that would be incremented by the worker in a production system
        current_hour = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")

        # get hourly metrics from the Redis queue
        spans_processed = queue.redis_client.get(f"metrics:spans_processed:{current_hour}")
        spans_failed = queue.redis_client.get(f"metrics:spans_failed:{current_hour}")

        metrics["processing"] = {
            "spans_processed_current_hour": int(spans_processed) if spans_processed else 0,
            "spans_failed_current_hour": int(spans_failed) if spans_failed else 0,
        }

        # calculate the error rate 
        total = metrics["processing"]["spans_processed_current_hour"] + metrics["processing"]["spans_failed_current_hour"]
        if total > 0:
            error_rate = (metrics["processing"]["spans_failed_current_hour"] / total) * 100
            metrics["processing"]["error_rate_percent"] = round(error_rate, 2)
        else:
            metrics["processing"]["error_rate_percent"] = 0.0

    except Exception as e:
        metrics["queue"] = {"error": str(e)}
        metrics["processing"] = {"error": str(e)}

    # calculate the database metrics
    try:
        conn = db.get_connection()
        with conn.cursor() as cur:
            # get total counts
            cur.execute("SELECT COUNT(*) FROM traces")
            total_traces = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM spans")
            total_spans = cur.fetchone()[0]

            # get counts from the last hour
            cur.execute("""
                SELECT COUNT(*) FROM traces
                WHERE start_time >= NOW() - INTERVAL '1 hour'
            """)
            traces_last_hour = cur.fetchone()[0]

            cur.execute("""
                SELECT COUNT(*) FROM spans
                WHERE start_time >= NOW() - INTERVAL '1 hour'
            """)
            spans_last_hour = cur.fetchone()[0]

            # get the average processing metrics
            cur.execute("""
                SELECT
                    AVG(duration) as avg_duration,
                    AVG(total_cost) as avg_cost
                FROM traces
                WHERE start_time >= NOW() - INTERVAL '1 hour'
                AND status = 'completed'
            """)
            result = cur.fetchone()
            avg_duration = float(result[0]) if result[0] else 0.0
            avg_cost = float(result[1]) if result[1] else 0.0

        db.return_connection(conn)

        metrics["database"] = {
            "total_traces": total_traces,
            "total_spans": total_spans,
            "traces_last_hour": traces_last_hour,
            "spans_last_hour": spans_last_hour,
            "avg_trace_duration_seconds": round(avg_duration, 3),
            "avg_trace_cost_dollars": round(avg_cost, 6)
        }

    except Exception as e:
        metrics["database"] = {"error": str(e)}

    return metrics