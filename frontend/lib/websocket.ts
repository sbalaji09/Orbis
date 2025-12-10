type ConnectionState = "connecting" | "connected" | "disconnected" | "error"

export interface SpanCreatedMessage {
    type: "span_created";
    trace_id: string;
    span_id: string;
    [key: string]: any;
}

export interface TraceCompletedMessage {
    type: "trace_completed";
    trace_id: string;
    status: string;
    total_tokens: number;
    total_cost: number;
    duration: number;
    timestamp: string;
    [key: string]: any;
}

export interface ConnectionEstablishedMessage {
    type: "connection_established";
    [key: string]: any;
}

export interface PongMessage {
    type: "pong";
    [key: string]: any;
}

export type WebSocketMessage =
    | SpanCreatedMessage
    | TraceCompletedMessage
    | ConnectionEstablishedMessage
    | PongMessage;

export type WebSocketListener = (msg: WebSocketMessage) => void;

interface WebSocketClientOptions {
    maxReconnectAttempts?: number;
    baseDelay?: number; // ms
}