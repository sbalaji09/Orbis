import asyncio
import time
from typing import *
from fastapi import WebSocket
from fastapi.websockets import WebSocketState


class ConnectionManager:
    def __init__(self) -> None:
        # user id points to set of WebSocket objects
        self._user_connections: Dict[str, Set[WebSocket]] = {}

        # trace id points to set of WebSocket objects
        self._trace_connections: Dict[str, Set[WebSocket]] = {}

        # last pong timestamp per WebSocket (for heartbeat) to detect safe connections
        self._last_pong: Dict[WebSocket, float] = {}

        # stores user_id and trace_id per WebSocket for cleanup during disconnects
        self._ws_meta: Dict[WebSocket, Dict[str, Optional[str]]] = {}

        # async lock to keep internal structures consistent
        self._lock = asyncio.Lock()

        # heartbeat task handle
        self._heartbeat_task: Optional[asyncio.Task] = None
    
    # this registers a new WebSocket connection
    async def connect(self, websocket: WebSocket, *, user_id: Optional[str] = None, trace_id: Optional[str] = None, accept: bool = True) -> None:
        if accept:
            await websocket.accept()
        
        async with self._lock:
            # adds the current WebSocket connection to the dict for users
            if user_id:
                if user_id not in self._user_connections:
                    self._user_connections[user_id] = set()
                self._user_connections[user_id].add(websocket)
            
            # adds the current WebSocket connection to the dict for traces
            if trace_id:
                if trace_id not in self._trace_connections:
                    self._trace_connections[trace_id] = set()
                self._trace_connections[trace_id].add(websocket)

            # stores the metadata for the WebSocket connection in the dict
            self._ws_meta[websocket] = {
                "user_id": user_id,
                "trace_id": trace_id,
            }

            # stores the last pong for the WebSocket as the current time
            self._last_pong[websocket] = time.time()
    
    # unregisters a WebSocket connection from all the maps
    async def disconnect(self, websocket: WebSocket) -> None:
        # we first acquire the lock for the WebSocket so no other changes can be made
        async with self._lock:
            # we remove the WebSocket from the meta data dictionary
            meta = self._ws_meta.pop(websocket, None)

            # we remove the WebSocket from the connections for users
            if meta and meta.get("user_id"):
                uid = meta["user_id"]
                conns = self._user_connections.get(uid)
                if conns and websocket in conns:
                    conns.remove(websocket)
                    if not conns:
                        del self._user_connections[uid]

            # we remove the WebSocket from the connections for traces
            if meta and meta.get("trace_id"):
                tid = meta["trace_id"]
                conns = self._trace_connections.get(tid)
                if conns and websocket in conns:
                    conns.remove(websocket)
                    if not conns:
                        del self._trace_connections[tid]
            
            # we remove the WebSocket from the last_pong dict
            self._last_pong.pop(websocket, None)

            # finally, we close the WebSocket
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.close()
    
    # this function sends JSON to a single WebSocket
    async def _safe_send_json(self, websocket: WebSocket, message: dict) -> None:
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(message)
        except Exception:
            pass

    # sends a message to all connections associated with a certain user_id
    async def broadcast_to_user(self, user_id: str, message: dict) -> None:
        async with self._lock:
            conns = list(self._user_connections.get(user_id, []))
        
        for ws in conns:
            await self._safe_send_json(ws, message)

    # sends a message to all connections associated with a certain trace_id
    async def send_to_trace_subscribers(self, trace_id: str, message: dict) -> None:
        async with self._lock:
            conns = list(self._trace_connections.get(trace_id, []))
        
        for ws in conns:
            await self._safe_send_json(ws, message)
