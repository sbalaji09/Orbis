import logging
from typing import *
from ingestion_api import app
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
import asyncio

logger = logging.getLogger(__name__)

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


connection_manager = DashboardConnectionManager()
@app.websocket("/ws/traces/{trace_id}")
async def websocket_trace_updates(websocket: WebSocket, trace_id: str):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo from trace {trace_id}: {data}")
    except WebSocketDisconnect:
        print(f"Client disconnected from trace {trace_id}")

@app.websocket("/ws/dashboard")
async def websocket_trace_updates(websocket: WebSocket, user_id: str = Query(..., description="User ID for dashboard subscription"),):
    await websocket.accept()
    try:
        await connection_manager.connect(user_id, websocket)

        await websocket.send_json({
            "event": "connection_established",
            "user_id": user_id,
        })

        while True:
            try:
                # You can handle “ping”, filters, etc here
                data = await websocket.receive_text()
                # For now, just ignore or echo
                await websocket.send_json({
                    "event": "echo",
                    "user_id": user_id,
                    "data": data,
                })

            except WebSocketDisconnect:
                # Normal client disconnect
                break
            except Exception as e:
                # Any error while receiving / sending – log and break
                logger.error(
                    f"Error in dashboard WebSocket for user {user_id}: {e}",
                    exc_info=True,
                )
                break
    finally:
        await connection_manager.disconnect(user_id, websocket)
