type ConnectionState = "connecting" | "connected" | "disconnected" | "error"

export interface SpanCreatedMessage {
    event: "span_created";
    trace_id: string;
    span_id: string;
    [key: string]: any;
}

export interface TraceCompletedMessage {
    event: "trace_completed";
    trace_id: string;
    status: string;
    total_tokens: number;
    total_cost: number;
    duration: number;
    timestamp: string;
    [key: string]: any;
}

export interface ConnectionEstablishedMessage {
    event: "connection_established";
    [key: string]: any;
}

export interface PongMessage {
    event: "pong";
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
    private reconnectAttempts = 0;
    private maxReconnectAttempts: number;
    private baseDelay: number;
    private listeners: Map<string, Set<WebSocketListener>> = new Map();
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private pingInterval: NodeJS.Timeout | null = null;

    constructor(baseUrl: string, apiKey: string, options: WebSocketClientOptions = {}) {
        this.url = baseUrl;
        this.apiKey = apiKey;
        this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
        this.baseDelay = options.baseDelay ?? 1000;
    }

    // expose current connection state (read-only)
    get connectionState(): ConnectionState {
        return this.state
    }

    on(event: WebSocketMessage["event"], listener: WebSocketListener): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }
        this.listeners.get(event)!.add(listener);

        return () => {
            this.off(event, listener)
        };
    }

    off(event: WebSocketMessage["event"], listener: WebSocketListener): void {
        const set = this.listeners.get(event);
        if (!set) return;
        set.delete(listener);
        if (set.size == 0) {
            this.listeners.delete(event);
        }
    }

    // dispatch an incoming message to the right listeners
    private emit(message: WebSocketMessage): void {
        const set = this.listeners.get(message.event);
        if (!set || set.size == 0) return;

        for (const listener of set) {
            try {
                listener(message);
            } catch (err) {
                console.error("WebSocket listener error", err);
            }
        }
    }

    public connect() {
        if (this.ws && (this.ws.readyState == WebSocket.OPEN || this.ws.readyState == WebSocket.CONNECTING)) {
            return;
        }

        this.setState("connecting");
        
        const wsUrl = `${this.url}?api_key=${encodeURIComponent(this.apiKey)}`
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.setState("connected")
            this.reconnectAttempts = 0;
        };

        this.ws.onclose = () => {
            this.setState("disconnected");
            this.ws = null;
            this.scheduleReconnect();
        };

        this.ws.onerror = () => {
            this.setState("error");
        };

        this.ws.onmessage = (event) => {
            try {
              const parsed = JSON.parse(event.data);
              if (parsed && parsed.event) {
                this.emit(parsed as WebSocketMessage);
              }
            } catch (e) {
              console.error("Failed to parse WebSocket message:", e);
            }
        };
    }

    public disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
            this.reconnectTimeout = null;
        }

        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.reconnectAttempts = 0;
        this.setState("disconnected")
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn("Max reconnect attempts reached. Not reconnecting")
            return;
        }

        this.reconnectAttempts++;

        const delay = Math.min(
            this.baseDelay * Math.pow(2, this.reconnectAttempts - 1),
            15000
        );

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        },  delay);

    }

    private setState(newState: ConnectionState) {
        this.state = newState;
    }

    private handleMessage(event: MessageEvent) {
        let data: any;
        try {
            data = JSON.parse(event.data);
        } catch (err) {
            console.error("Failed to parse WebSocket message", err, event.data);
            return;
        }

        if (!data.event) {
            console.warn("Received message without event field", data);
            return;
        }

        this.emit(data as WebSocketMessage);
    }

    private send(payload: any) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            this.ws.send(JSON.stringify(payload));
        } catch (err) {
            console.error("Failed to send WebSocket message", err, payload);
        }
    }
}