import logging
import json
import os
from typing import *

from fastapi.responses import JSONResponse
from ingestion_api import app
from fastapi import FastAPI, Query, Request, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
import asyncio
import redis.asyncio as aioredis
from websocket.connection_manager import ConnectionManager
from websocket.redis_subscriber import init_redis_subscriber, get_redis_subscriber
from auth.websocket_auth import validate_api_key, validate_trace_ownership
from shared.health_auth import check_health_rate_limit, check_metrics_auth

import uuid
from rate_limiter_ws import (
    check_ws_connection_limit,
    register_ws_connection,
    unregister_ws_connection,
)

from dataclasses import asdict
from websocket.health import health_monitor, WebSocketHealthStatus

from shared.validators import validate_trace_id, validate_user_id

logger = logging.getLogger(__name__)
trace_connection_manager = ConnectionManager()

# Redis connection for pub/sub
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


async def get_redis_pubsub() -> aioredis.client.PubSub:
    """Create a new Redis connection for pub/sub subscription."""
    client = aioredis.from_url(REDIS_URL, decode_responses=True)
    return client.pubsub()

class DashboardConnectionManager:
    def __init__(self) -> None:
        # user_id -> set of WebSocket objects
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # simple lock to avoid race conditions on connect/disconnect
        self._lock = asyncio.Lock()
    
    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            self.active_connections[user_id].add(websocket)

        logger.info(f"WebSocket connected for user {user_id}. Total connections: "
                    f"{len(self.active_connections[user_id])}")

    async def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            conns = self.active_connections.get(user_id)
            if conns and websocket in conns:
                conns.remove(websocket)
                if not conns:
                    # remove empty set to keep dict clean
                    del self.active_connections[user_id]

        logger.info(f"WebSocket disconnected for user {user_id}")

    async def safe_send_json(self, websocket: WebSocket, message: dict) -> None:
        """Send a message to a single websocket, swallowing connection errors."""
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(message)
        except Exception as e:
            logger.warning(f"Failed to send WS message: {e}")

    async def broadcast_to_user(self, user_id: str, message: dict) -> None:
        """Send a message to all connections for this user."""
        async with self._lock:
            conns = list(self.active_connections.get(user_id, []))

        for ws in conns:
            await self.safe_send_json(ws, message)

@app.websocket("/ws/traces/{trace_id}")
async def websocket_trace(websocket: WebSocket, trace_id: str, api_key: str = Query(None, alias="api_key")):
    if not api_key:
        await websocket.close(code=4001, reason="Missing API key")
        return
    
    user_id = await validate_api_key(api_key)
    if not user_id:
        await websocket.close(code=4401, reason="Invalid API key")
        return
    
    try:
        validate_trace_id(trace_id)
    except Exception:
        await websocket.close(code=4000, reason="Invalid trace_id format")
        return
    
    if not await validate_trace_ownership(trace_id, user_id):
        await websocket.close(code=4003, reason="Access denied - trace not found")
        return
    
    allowed, reason = await check_ws_connection_limit(user_id)
    if not allowed:
        await websocket.close(code=4029, reason=reason)
        return
    
    if not await validate_trace_ownership(trace_id, user_id):
        await websocket.close(code=4003, reason="Access denied - trace not found")
        return
    
    connection_id = str(uuid.uuid4())
    await register_ws_connection(user_id, connection_id)

    await trace_connection_manager.connect(websocket=websocket, user_id=user_id, trace_id=trace_id)

    try:
        await websocket.send_json({"event": "subscribed", "trace_id": trace_id, "user_id": user_id})
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await unregister_ws_connection(user_id, connection_id)
        await trace_connection_manager.disconnect(websocket)

# stream real-time span updates for all traces belonging to a user
@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket, api_key: str = Query(None, alias="api_key")):
    if not api_key:
        await websocket.close(code=4001, reason="Missing API key")
        return
    
    user_id = await validate_api_key(api_key)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid API key")
        return
    
    allowed, reason = await check_ws_connection_limit(user_id)
    if not allowed:
        await websocket.close(code=4029, reason=reason)
        return
    
    connection_id = str(uuid.uuid4())
    await register_ws_connection(user_id, connection_id)

    await websocket.accept()
    pubsub = None

    # background task to listen to Redis pub/sub messages
    async def redis_listener():
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    await websocket.send_json(data)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Redis listener error for user {user_id}: {e}", exc_info=True)

    # subscribe to user-specific Redis channel
    try:
        pubsub = await get_redis_pubsub()
        await pubsub.subscribe(f"user:{user_id}:spans")

        await websocket.send_json({
            "event": "connection_established",
            "user_id": user_id,
        })

        # start Redis listener as background task
        listener_task = asyncio.create_task(redis_listener())

        # handle incoming WebSocket messages
        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_json({"event": "pong"})

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in dashboard WebSocket for user {user_id}: {e}", exc_info=True)
                break

    finally:
        await unregister_ws_connection(user_id, connection_id)
        # cancel listener and unsubscribe
        if 'listener_task' in locals():
            listener_task.cancel()
            try:
                await listener_task
            except asyncio.CancelledError:
                pass
        if pubsub:
            await pubsub.unsubscribe(f"user:{user_id}:spans")
            await pubsub.close()

dashboard_connection_manager = DashboardConnectionManager()

@app.on_event("startup")
async def startup_event():
    subscriber = init_redis_subscriber(dashboard_connection_manager)
    await subscriber.start()

@app.on_event("shutdown")
async def shutdown_event():
    subscriber = get_redis_subscriber()
    if subscriber:
        await subscriber.stop()

# health check for websocket
# returns: status, active_connections, connections_by_type, the reachability of the pub sub, etc.
@app.get("/ws/health")
async def websocket_health(request: Request):
    check_health_rate_limit(request)
    check_metrics_auth(request)
    
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    subscriber = get_redis_subscriber()

    health_status = await health_monitor.get_health_status(
        connection_manager=dashboard_connection_manager,
        redis_subscriber=subscriber,
        redis_url=redis_url,
    )

    status_code = 200
    if health_status.status == "degraded":
        status_code = 200
    elif health_status.status == "unhealthy":
        status_code = 503

    return JSONResponse(
        content=asdict(health_status),
        status_code=status_code,
    )

# metrics endpoint for monitoring dashboards
@app.get("/ws/metrics")
async def websocket_metrics(request: Request):
    check_health_rate_limit(request)
    check_metrics_auth(request)
    
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    subscriber = get_redis_subscriber()

    health_status = await health_monitor.get_health_status(
        connection_manager=dashboard_connection_manager,
        redis_subscriber=subscriber,
        redis_url=redis_url,
    )

    return {
        "websocket": {
            "connections_total": health_status.active_connections,
            "connections_trace": health_status.connections_by_type.get("trace", 0),
            "connections_user": health_status.connections_by_type.get("user", 0),
        },
        "redis_pubsub": {
            "connected": health_status.redis_pubsub_connected,
            "subscriptions": health_status.redis_pubsub_subscriptions,
            "subscriber_running": health_status.subscriber_task_running,
        },
        "throughput": {
            "messages_per_second": health_status.messages_per_second,
            "total_messages": health_status.total_messages_received,
            "last_message_at": health_status.last_message_at,
        },
        "uptime_seconds": health_status.uptime_seconds,
        "timestamp": health_status.timestamp,
    }