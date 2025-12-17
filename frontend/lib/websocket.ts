// "failed" = max reconnect attempts exceeded, should fall back to polling
export type ConnectionState = "connecting" | "connected" | "disconnected" | "error" | "failed"

// Connection metrics for monitoring
export interface ConnectionMetrics {
    connectAttempts: number;
    successfulConnections: number;
    failedConnections: number;
    lastConnectedAt: Date | null;
    lastDisconnectedAt: Date | null;
    totalConnectionTime: number; // ms
}

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

type SubscriptionType = "trace" | "dashboard" | null;

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private baseUrl: string;
    private url: string;
    private apiKey: string;
    private state: ConnectionState = "disconnected";
    private stateListeners: Set<(state: ConnectionState) => void> = new Set();
    private reconnectAttempts = 0;
    private maxReconnectAttempts: number;
    private baseDelay: number;
    private listeners: Map<string, Set<WebSocketListener>> = new Map();
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private pingInterval: NodeJS.Timeout | null = null;

    private currentSubscription: SubscriptionType = null;
    private currentTraceId: string | null = null;

    // Connection metrics for monitoring
    private metrics: ConnectionMetrics = {
        connectAttempts: 0,
        successfulConnections: 0,
        failedConnections: 0,
        lastConnectedAt: null,
        lastDisconnectedAt: null,
        totalConnectionTime: 0,
    };
    private connectionStartTime: number | null = null;

    constructor(baseUrl: string, apiKey: string, options: WebSocketClientOptions = {}) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
        this.baseDelay = options.baseDelay ?? 1000;

        this.url = `${this.baseUrl}/ws`
    }

    // Check if WebSocket has permanently failed and should fall back to polling
    public hasFailed(): boolean {
        return this.state === "failed";
    }

    // Get connection metrics for monitoring
    public getMetrics(): ConnectionMetrics {
        return { ...this.metrics };
    }

    // expose current connection state (read-only)
    get connectionState(): ConnectionState {
        return this.state
    }

    public onStateChange(listener: (state: ConnectionState) => void): () => void {
        this.stateListeners.add(listener);

        listener(this.state);

        return () => {
            this.stateListeners.delete(listener);
        }
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

    public connect(urlOverride?: string) {
        if (urlOverride) {
            this.url = urlOverride;
        }

        if (this.ws && (this.ws.readyState == WebSocket.OPEN || this.ws.readyState == WebSocket.CONNECTING)) {
            return;
        }

        this.setState("connecting");
        
        const wsUrl = this.url.includes("api_key=")
            ? this.url
            : `${this.url}?api_key=${encodeURIComponent(this.apiKey)}`;
            
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.setState("connected");
            this.reconnectAttempts = 0;
            this.startPingInterval();

            // Update metrics
            this.metrics.successfulConnections++;
            this.metrics.lastConnectedAt = new Date();
            this.connectionStartTime = Date.now();

            this.logMetric("websocket_connected", {
                attempts: this.metrics.connectAttempts,
                subscription: this.currentSubscription,
            });
        };

        this.ws.onclose = (event: CloseEvent) => {
            this.stopPingInterval();

            // Update metrics
            this.metrics.lastDisconnectedAt = new Date();
            if (this.connectionStartTime) {
                this.metrics.totalConnectionTime += Date.now() - this.connectionStartTime;
                this.connectionStartTime = null;
            }

            // Don't reconnect on auth errors (4001 = missing/invalid key, 4003 = access denied)
            if (event.code == 4029 || event.code === 4001 || event.code === 4003 || event.code === 4401) {
                console.error(`WebSocket auth error (${event.code}): ${event.reason}`);
                this.metrics.failedConnections++;
                this.setState("failed");
                this.logMetric("websocket_auth_failed", { code: event.code, reason: event.reason });
                return;
            }

            this.setState("disconnected");
            this.scheduleReconnect();
        };

        this.ws.onerror = () => {
            this.setState("error");
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event);
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
            console.warn("Max reconnect attempts reached. Falling back to polling.");
            this.metrics.failedConnections++;
            this.setState("failed");
            this.logMetric("websocket_max_retries_exceeded", {
                attempts: this.reconnectAttempts,
                subscription: this.currentSubscription,
            });
            return;
        }

        this.reconnectAttempts++;

        // Exponential backoff with jitter
        const exponentialDelay = this.baseDelay * Math.pow(2, this.reconnectAttempts - 1);
        const jitter = Math.random() * 1000; // 0-1000ms random jitter
        const delay = Math.min(exponentialDelay + jitter, 30000);

        console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }

    // Log metrics for monitoring (can be extended to send to analytics)
    private logMetric(event: string, data: Record<string, unknown>) {
        console.log(`[WebSocket Metric] ${event}`, {
            ...data,
            timestamp: new Date().toISOString(),
            metrics: this.getMetrics(),
        });
    }

    private setState(newState: ConnectionState) {
        if (this.state === newState) return;

        this.state = newState;

        for (const listener of this.stateListeners) {
            try {
                listener(newState);
            } catch (err) {
                console.error("WebSocket state listener error", err);
            }
        }
    }

    private startPingInterval() {
        this.stopPingInterval();
        // Send ping every 30 seconds to keep connection alive
        this.pingInterval = setInterval(() => {
            this.send("ping");
        }, 30000);
    }

    private stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
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

    public subscribeToTrace(traceId: string) {
        this.currentSubscription = "trace";
        this.currentTraceId = traceId;

        const url = `${this.baseUrl}/ws/traces/${encodeURIComponent(traceId)}?api_key=${encodeURIComponent(this.apiKey)}`;
        this.connect(url);
    }

    public subscribeToDashboard() {
        const url = `${this.baseUrl}/ws/dashboard?api_key=${encodeURIComponent(this.apiKey)}`;
        this.connect(url);
    }

    public getState() {
        return this.connectionState;
    }
}