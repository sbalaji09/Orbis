from db_connection import db
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import datetime
import sys
import os

# add parent directory to path
sys.path.append(os.path.dirname(__file__))

app = FastAPI(
    title="Orbis Query API",
    description="API for reading traces, spans, and metrics",
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

# health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "query-api",
        "timestamp": datetime.utcnow().isoformat()
    }

# list all traces for a user with pagination
@app.get("/traces")
async def list_traces(
    user_id: str = Header(..., alias="X-User-ID"),
    limit: int = Query(50, ge=1, le=100, description="Max traces to return"),
    offset: int = Query(0, ge=0, description="Number to skip for pagination"),
    status: Optional[str] = Query(None, description="Filter by status")
):
    try:
        # Get traces with enhanced information from spans
        traces = db.get_traces_with_stats(user_id, limit=limit, offset=offset, status_filter=status)

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
    user_id: str = Header(..., alias="X-User-ID"),
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
    user_id: str = Header(..., alias="X-User-ID")
):
    # try:
    trace = db.get_trace_by_id(trace_id)

    if not trace:
        raise HTTPException(status_code=404, detail="Trace not found")

    # check if the user has access to this trace
    if trace.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return trace
    # except HTTPException:
    #     raise
    # except Exception as e:
    #     raise HTTPException(status_code=500, detail=str(e))

# get all the spans for a specific trace
@app.get("/traces/{trace_id}/spans")
async def get_trace_spans(
    trace_id: str,
    user_id: str = Header(..., alias="X-User-ID")
):
    try:
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

# get trace summary with aggregated span information
@app.get("/traces/{trace_id}/summary")
async def get_trace_summary(
    trace_id: str,
    user_id: str = Header(..., alias="X-User-ID")
):
    try:
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
    user_id: str = Header(..., alias="X-User-ID")
):
    try:
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

# get aggregate matrics for a user
# returns: total_traces, total_spans, total_cost, total_tokens, avg_cost_per_trace, total_duration
@app.get("/metrics/user")
async def get_user_metrics(
    user_id: str = Header(..., alias="X-User-ID")
):
    try:
        metrics = db.get_user_metrics(user_id)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# search and filter traces
@app.get("/search/traces")
async def search_traces(
    user_id: str = Header(..., alias="X-User-ID"),
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
@app.get("/traces/{agent_id}")
async def get_traces_by_agent(agent_id: str, user_id: str, limit: int = 5, offset: int = 0):
    try:
        span = db.get_traces_by_agentid(agent_id, user_id)

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

# get all the agents belonging to a specific user
@app.get("/agents")
async def get_agents(user_id: str = Header(..., alias="X-User-ID")):
    try:
        agents = db.get_agents_by_userid(user_id)

        return {
            "agents": agents if agents else [],
            "count": len(agents) if agents else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Import profile_api to register agent creation endpoints
import profile_api  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    print("Starting Query API on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
