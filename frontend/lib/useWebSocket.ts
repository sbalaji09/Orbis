import { useCallback, useEffect, useRef, useState } from "react";
import {WebSocketClient, WebSocketMessage } from "./websocket";

type WebSocketType = "trace" | "dashboard";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface UseWebSocketParams {
    type: WebSocketType;
    traceId?: string;     // required if type === "trace"
    apiKey: string;
    disabled: boolean;
}

interface UseWebSocketResult {
    state: ConnectionState;
    client: WebSocketClient | null;
    subscribe: (event: string, callback: (msg: WebSocketMessage) => void) => () => void;
}

export function useWebSocket(params: UseWebSocketParams): UseWebSocketResult {
    const {type, traceId, apiKey, disabled = false} = params;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
        console.error("NEXT_PUBLIC_API_URL is not defined");
    }

    const [state, setState] = useState<ConnectionState>("disconnected");
    const clientRef = useRef<WebSocketClient | null>(null);

    useEffect(() => {
        if (!baseUrl || disabled) {
            return;
        }

        if (type == "trace" && !traceId) {
            console.error("useWebSocket: traceId is required when type === 'trace'")
            return;
        }

        const client = new WebSocketClient(baseUrl, apiKey);
        clientRef.current = client;

        const unsubscribeState = client.onStateChange((next) => {
            setState(next);
        });

        if (type === "trace" && traceId) {
            client.subscribeToTrace(traceId);
        } else if (type === "dashboard") {
            client.subscribeToDashboard();
        }

        return () => {
            unsubscribeState();
            client.disconnect();
            clientRef.current = null;
        };
    }, [type, traceId, apiKey, baseUrl, disabled]);

    const subscribe = useCallback(
        (event: string, callback: (msg: WebSocketMessage) => void) => {
            const client = clientRef.current;
            if (!client) {
                console.warn("useWebSocket: subscribe is called before client is ready");

                return () => {};
            }

            const unsubscribe = client.on(event as WebSocketMessage["event"], callback);
            return unsubscribe;
        }, []
    );

    return {
        state,
        client: clientRef.current,
        subscribe
    }
}