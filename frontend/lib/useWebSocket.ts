import { useEffect, useRef, useState } from "react";
import {WebSocketClient, WebSocketMessage } from "./websocket";

type WebSocketType = "trace" | "dashboard";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface UseWebSocketParams {
    type: WebSocketType;
    traceId?: string;     // required if type === "trace"
    apiKey: string;
}

interface UseWebSocketResult {
    state: ConnectionState;
    client: WebSocketClient | null;
    subscribe: (event: string, callback: (msg: WebSocketMessage) => void) => () => void;
}

export function useWebSocket(params: UseWebSocketParams): UseWebSocketResult {
    
}