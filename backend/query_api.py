from pydantic import BaseModel, Field
from prompt_api import router as prompt_router
from db_connection import db
from fastapi import FastAPI, HTTPException, Query, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional
from datetime import datetime
import sys
import os

# add parent directory to path
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.health_auth import check_health_rate_limit, check_metrics_auth

from backend.auth_utils import get_user_id_from_token, verify_token_from_query
from shared.validators import (
    validate_trace_id,
    validate_span_id,
    validate_user_id,
    validate_agent_id,
    validate_pagination,
    ValidationError,
)
from shared.cors_config import get_cors_config
from prompt_api import router as prompt_router
from db_connection import db
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Query, Header, Depends
from datetime import datetime
from typing import Optional
import asyncio
import json
import sys
import os

# CRITICAL: Must add parent directory to path before any local imports
# fmt: off
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
# fmt: on


# JWT authentication

app = FastAPI(
    title="Orbis Query API",
    description="API for reading traces, spans, and metrics",
    version="1.0.0"
)

# Include the prompt router
app.include_router(prompt_router)

# Include the profile router (agents and API keys)
from profile_api import router as profile_router
app.include_router(profile_router)
print("[QUERY_API] Profile router included successfully")

# CORS - allows your frontend to call this API
app.add_middleware(CORSMiddleware, **get_cors_config())

# health check endpoint


@app.get("/health")
async def health_check(request: Request):
    check_health_rate_limit(request)
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health/detailed")
async def health_check_detailed(request: Request):
    check_health_rate_limit(request)
    check_metrics_auth(request)
    
    return {
        "status": "healthy",
        "service": "query-api",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected",  # Could add actual DB check here
    }

# list all traces for a user with pagination
@app.get("/traces")
async def list_traces(
    user_id: str = Depends(get_user_id_from_token),
    limit: int = Query(50, ge=1, le=100, description="Max traces to return"),
    offset: int = Query(0, ge=0, description="Number to skip for pagination"),
    status: Optional[str] = Query(None, description="Filter by status")
):
    try:
        validate_user_id(user_id)
        limit, offset = validate_pagination(limit, offset)

        # Get traces with enhanced information from spans
        traces = db.get_traces_with_stats(
            user_id, limit=limit, offset=offset, status_filter=status)

        # Convert ALL datetime objects to ISO strings for JSON serialization
        for trace in traces:
            for key, value in list(trace.items()):
                if isinstance(value, datetime):
                    trace[key] = value.isoformat()

        return {
            "traces": traces,
            "count": len(traces),
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# get the most recent traces for a user


@app.get("/traces/recent")
async def get_recent_traces(
    user_id: str = Depends(get_user_id_from_token),
    limit: int = Query(10, ge=1, le=50, description="Number of recent traces")
):
    try:
        traces = db.get_recent_traces(user_id, limit=limit)
        return {
            "traces": traces,
            "count": len(traces)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# get a specific trace by the trace id


@app.get("/traces/{trace_id}")
async def get_trace(
    trace_id: str,
    user_id: str = Depends(get_user_id_from_token)
):
    try:
        validate_trace_id(trace_id)
        validate_user_id(user_id)

        trace = db.get_trace_by_id(trace_id)

        if not trace:
            raise HTTPException(status_code=404, detail="Trace not found")

        # check if the user has access to this trace
        if trace.get('user_id') != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        return trace
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# get all the spans for a specific trace


@app.get("/traces/{trace_id}/spans")
async def get_trace_spans(
    trace_id: str,
    user_id: str = Depends(get_user_id_from_token)
):
    try:
        validate_trace_id(trace_id)
        validate_user_id(user_id)

        # check if the trace exists and the user has access
        trace = db.get_trace_by_id(trace_id)
        if not trace:
            raise HTTPException(status_code=404, detail="Trace not found")
        if trace.get('user_id') != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # get spans
        spans = db.get_spans_by_trace(trace_id)
        return {
            "trace_id": trace_id,
            "span_count": len(spans),
            "spans": spans
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# lightweight endpoint to check if trace has new spans


@app.get("/traces/{trace_id}/span-count")
async def get_trace_span_count(
    trace_id: str,
    user_id: str = Depends(get_user_id_from_token)
):
    """
    Lightweight endpoint for polling to detect new spans.
    Returns just the span count and streaming status.
    """
    try:
        validate_trace_id(trace_id)
        validate_user_id(user_id)

        trace = db.get_trace_by_id(trace_id)
        if not trace:
            raise HTTPException(status_code=404, detail="Trace not found")

        if trace.get('user_id') != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        spans = db.get_spans_by_trace(trace_id)

        return {
            "trace_id": trace_id,
            "span_count": len(spans),
            "has_streaming_spans": any(s.get('is_streaming', False) for s in spans)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# get trace summary with aggregated span information


@app.get("/traces/{trace_id}/summary")
async def get_trace_summary(
    trace_id: str,
    user_id: str = Depends(get_user_id_from_token)
):
    try:
        validate_trace_id(trace_id)
        validate_user_id(user_id)

        summary = db.get_trace_summary(trace_id)

        if not summary:
            raise HTTPException(status_code=404, detail="Trace not found")

        # check access for the user id
        if summary.get('user_id') != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        return summary
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# get a specific span by ID


@app.get("/spans/{span_id}")
async def get_span(
    span_id: str,
    user_id: str = Depends(get_user_id_from_token)
):
    try:
        validate_span_id(span_id)
        validate_user_id(user_id)

        span = db.get_span_by_id(span_id)

        if not span:
            raise HTTPException(status_code=404, detail="Span not found")

        # check if the user has access via a trace
        trace = db.get_trace_by_id(span['trace_id'])
        if not trace or trace.get('user_id') != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        return span
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# stream a specific span using SSE


@app.get("/spans/{span_id}/stream")
async def stream_span(
    span_id: str,
    token: Optional[str] = Query(
        None, description="JWT token for authentication")
):
    # Verify JWT token from query parameter for SSE
    user_id = verify_token_from_query(token)
    validate_span_id(span_id)

    async def event_generator():
        try:
            # Initial authorization check
            initial_span = db.get_span_by_id(span_id)
            if not initial_span:
                yield f"event: error\ndata: {json.dumps({'error': 'Span not found'})}\n\n"
                return

            # Check user access via trace
            trace = db.get_trace_by_id(initial_span['trace_id'])
            if not trace or trace.get('user_id') != user_id:
                yield f"event: error\ndata: {json.dumps({'error': 'Access denied'})}\n\n"
                return

            # Stream updates while span is active
            while True:
                try:
                    span = db.get_span_by_id(span_id)

                    if not span:
                        # Span was deleted
                        yield f"event: close\ndata: {json.dumps({'reason': 'Span deleted'})}\n\n"
                        break

                    # Send current span data
                    yield f"data: {json.dumps(span, default=str)}\n\n"

                    # Stop streaming if span is no longer actively streaming
                    if not span.get('is_streaming', False):
                        yield f"event: complete\ndata: {json.dumps({'message': 'Streaming complete'})}\n\n"
                        break

                    # Poll every 1 second for updates (reduced from 500ms to limit DB load)
                    await asyncio.sleep(1.0)

                except Exception as e:
                    yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
                    break

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )

# get aggregate matrics for a user
# returns: total_traces, total_spans, total_cost, total_tokens, avg_cost_per_trace, total_duration


@app.get("/metrics/user")
async def get_user_metrics(
    user_id: str = Depends(get_user_id_from_token)
):
    try:
        metrics = db.get_user_metrics(user_id)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# search and filter traces


@app.get("/search/traces")
async def search_traces(
    user_id: str = Depends(get_user_id_from_token),
    status: Optional[str] = Query(None, description="Filter by status"),
    model: Optional[str] = Query(None, description="Filter by LLM model"),
    min_cost: Optional[float] = Query(None, description="Minimum cost"),
    max_cost: Optional[float] = Query(None, description="Maximum cost"),
    start_date: Optional[str] = Query(
        None, description="Created after (ISO format)"),
    end_date: Optional[str] = Query(
        None, description="Created before (ISO format)")
):
    try:
        # build the filters dictionary
        filters = {}
        if status:
            filters['status'] = status
        if model:
            filters['model'] = model
        if min_cost is not None:
            filters['min_cost'] = min_cost
        if max_cost is not None:
            filters['max_cost'] = max_cost
        if start_date:
            filters['start_date'] = start_date
        if end_date:
            filters['end_date'] = end_date

        # search through the traces
        traces = db.search_traces(user_id, filters)

        return {
            "matches": len(traces),
            "filters": filters,
            "traces": traces
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# get traces based on the specific agent
@app.get("/agents/{agent_id}/traces")
async def get_traces_by_agent(
    agent_id: str,
    user_id: str = Depends(get_user_id_from_token)
):
    try:
        validate_agent_id(agent_id)
        validate_user_id(user_id)

        traces = db.get_traces_by_agentid(agent_id, user_id)

        # Convert datetime objects to ISO strings for JSON serialization
        for trace in traces:
            for key, value in list(trace.items()):
                if isinstance(value, datetime):
                    trace[key] = value.isoformat()

        return {
            "agent_id": agent_id,
            "traces": traces,
            "count": len(traces)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cost/summary")
async def get_cost_summary(period: str, user_id: str = Depends(get_user_id_from_token)):
    try:
        validate_user_id(user_id)

        loop = asyncio.get_running_loop()

        # run this method in a thread so we don't block the event loop
        cost_summary = await loop.run_in_executor(
            None,
            lambda: db.get_cost_summary_by_user(user_id, period)
        )

        return cost_summary
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/cost/by-agent")
async def get_cost_by_agent(start_date: str, end_date: str, user_id: str = Depends(get_user_id_from_token)):
    try:
        validate_user_id(user_id)

        loop = asyncio.get_running_loop()

        cost_by_agent = await loop.run_in_executor(
            None,
            lambda: db.get_cost_by_agent_by_user(user_id, start_date, end_date)
        )

        return cost_by_agent
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/cost/by-model")
async def get_cost_by_model(start_date: str, end_date: str, user_id: str = Depends(get_user_id_from_token)):
    try:
        validate_user_id(user_id)

        loop = asyncio.get_running_loop()

        cost_by_agent = await loop.run_in_executor(
            None,
            lambda: db.get_cost_by_model(user_id, start_date, end_date)
        )

        return cost_by_agent
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/cost/trends")
async def get_cost_trends(days: int, user_id: str = Depends(get_user_id_from_token)):
    try:
        validate_user_id(user_id)

        loop = asyncio.get_running_loop()

        cost_trends = await loop.run_in_executor(
            None,
            lambda: db.get_cost_trends(user_id, days)
        )

        return cost_trends
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/cost/token-breakdown")
async def get_token_breakdown(days: int, user_id: str = Depends(get_user_id_from_token)):
    try:
        validate_user_id(user_id)

        loop = asyncio.get_running_loop()

        token_breakdown = await loop.run_in_executor(
            None,
            lambda: db.get_token_breakdown(user_id, days)
        )

        return token_breakdown
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cost/tokens-per-trace")
async def get_tokens_per_trace(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=50, ge=1, le=200),
    user_id: str = Depends(get_user_id_from_token)):
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: db.get_tokens_per_trace(user_id, days, limit)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cost/savings-opportunities")
async def get_savings_opportunities(
    days: int = Query(default=30, ge=1, le=365),
    user_id: str = Depends(get_user_id_from_token)
):
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, db.get_savings_opportunities, user_id, days
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cost/by-tag")
async def get_cost_by_tag(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    user_id: str = Depends(get_user_id_from_token)
):
    try:
        validate_user_id(user_id)

        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: db.get_cost_by_tag(user_id, start_date, end_date)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cost/tags")
async def get_user_tags(
    limit: int = Query(default=20, ge=1, le=100),
    user_id: str = Depends(get_user_id_from_token)
):
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: db.get_top_tags(user_id, limit)
        )
        return {"tags": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# analyze prompt lengths to identify bloated prompts and optimization opportunities    
@app.get("/cost/prompt-analysis")
async def get_prompt_length_analysis(
    days: int = Query(default=30, ge=1, le=365),
    user_id: str = Depends(get_user_id_from_token)
):
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: db.get_prompt_length_analysis(user_id, days)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/cost/anomalies")
async def get_anomalies(
    hours: int = Query(default=24, ge=1, le=168, description="Hours to look back for anomalies"),
    user_id: str = Depends(get_user_id_from_token)
):
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: db.get_all_anomalies(user_id, hours)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cost/anomalies/history")
async def get_anomaly_history(
    days: int = 7,
    include_acknowledged: bool = False,
    user_id: str = Depends(get_user_id_from_token)
):
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: db.get_anomaly_history(user_id, days, include_acknowledged)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cost/settings")
async def get_alert_settings(user_id: str = Depends(get_user_id_from_token)):
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: db.get_user_alert_settings(user_id)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
class AlertSettingsUpdate(BaseModel):
    daily_cost_threshold: float = Field(..., gt=0)
    daily_spike_multiplier: float = Field(..., gt=1)
    
@app.put("/cost/settings")
async def update_alert_settings(
    body: AlertSettingsUpdate,
    user_id: str = Depends(get_user_id_from_token)):

    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: db.update_user_alert_settings(user_id, {"daily_cost_threshold": body.daily_cost_threshold,"daily_spike_multiplier": body.daily_spike_multiplier})
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cost/anomalies/acknowledge")
async def acknowledge_anomaly(anomaly_id: str, user_id: str = Depends(get_user_id_from_token)):
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: db.acknowledge_anomaly(user_id, anomaly_id)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cost/anomalies/acknowledge-all")
async def acknowledge_all_anomalies(user_id: str = Depends(get_user_id_from_token)):
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: db.acknowledge_all_anomalies(user_id)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.exception_handler(ValidationError)
async def validation_error_handler(request, exc: ValidationError):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail
    )

if __name__ == "__main__":
    import uvicorn
    print("Starting Query API on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)

