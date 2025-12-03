from typing import *
from ingestion_api import app
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
import asyncio

class DashboardConnectionManager:
    def __init__(self) -> None:
        # user_id -> set of WebSocket objects
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # simple lock to avoid race conditions on connect/disconnect
        self._lock = asyncio.Lock()

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
