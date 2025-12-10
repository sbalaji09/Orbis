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

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private apiKey: string;
    private state: ConnectionState = "disconnected";
    private reconnectAttemps = 0;
    private maxReconnectAttemps: number;
    private baseDelay: number;
    private listeners: Map<string, Set<WebSocketListener>> = new Map();
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(url: string, apiKey: string, options: WebSocketClientOptions = {}) {
        this.url = url;
        this.apiKey = apiKey;
        this.maxReconnectAttemps = options.maxReconnectAttempts ?? 10;
        this.baseDelay = options.baseDelay ?? 1000;
    }

    // expose current connection state (read-only)
    get connectionState(): ConnectionState {
        return this.state
    }

    on(type: WebSocketMessage["type"], listener: WebSocketListener): () => void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set())
        }
        this.listeners.get(type)!.add(listener);

        return () => {
            this.off(type, listener)
        };
    }

    off(type: WebSocketMessage["type"], listener: WebSocketListener): void {
        const set = this.listeners.get(type);
        if (!set) return;
        set.delete(listener);
        if (set.size == 0) {
            this.listeners.delete(type);
        }
    }

    // dispatch an incoming message to the right listeners
    private emit(message: WebSocketMessage): void {
        const set = this.listeners.get(message.type);
        if (!set || set.size == 0) return;

        for (const listener of set) {
            try {
                listener(message);
            } catch (err) {
                console.error("WebSocket listener error", err);
            }
        }
    }
}