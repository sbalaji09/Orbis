import { useEffect, useState } from "react";
import useSWR from "swr";
import { Span } from "../lib/types";
import { useWebSocket } from "../lib/useWebSocket";
import { SpanCreatedMessage, WebSocketMessage } from "../lib/websocket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

export interface UseRealtimeTraceResult {
    spans: Span[];
    isConnected: boolean;
    error: Error | null;
    isLoading: boolean;
}

export interface UseRealtimeTraceParams {
    traceId: string;
    apiKey: string;
    initialSpans?: Span[];
}

// fetches the spans using SWR
const fetchSpans = async (url: string): Promise<Span[]> => {
    const response = await fetch(`${API_URL}${url}`, {
        headers: {
            "X-User-ID": DEFAULT_USER_ID,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch spans: ${response.statusText}`);
    }

    const data = await response.json();
    return data.spans as Span[];
};

// fetches a single span by ID
const fetchSpanById = async (spanId: string): Promise<Span> => {
    const response = await fetch(`${API_URL}/spans/${spanId}`, {
        headers: {
            "X-User-ID": DEFAULT_USER_ID,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch span: ${response.statusText}`);
    }

    return response.json() as Promise<Span>;
};

// merge spans without duplicates and update the existing span
const mergeSpans = (existing: Span[], incoming: Span): Span[] => {
    const index = existing.findIndex((s) => s.span_id === incoming.span_id);
    if (index >= 0) {
        const updated = [...existing];
        updated[index] = incoming;
        return updated;
    }
    return [...existing, incoming];
};

// webhook that calls these two functions above
export function useRealtimeTrace(
    params: UseRealtimeTraceParams
): UseRealtimeTraceResult {
    const { traceId, apiKey, initialSpans } = params;

    const [wsError, setWsError] = useState<Error | null>(null);

    const {
        data: swrSpans,
        error: swrError,
        isLoading: swrLoading,
        mutate,
    } = useSWR<Span[]>(
        traceId ? `/traces/${traceId}/spans` : null,
        fetchSpans,
        {
            fallbackData: initialSpans,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 5000,
        }
    );

    // websocket connection for real-time updates
    const { state: wsState, subscribe } = useWebSocket({
        type: "trace",
        traceId,
        apiKey,
    });

    const isConnected = wsState === "connected";

    useEffect(() => {
        if (wsState === "error") {
            setWsError(new Error("WebSocket connection error"));
        } else {
            setWsError(null);
        }
    }, [wsState]);

    // handle incoming span_created eents
    useEffect(() => {
        const unsubscribe = subscribe("span_created", async (msg: WebSocketMessage) => {
            const spanMsg = msg as SpanCreatedMessage;

            if (spanMsg.trace_id !== traceId) {
                return;
            }

            try {
                // fetch the full span data
                const fullSpan = await fetchSpanById(spanMsg.span_id);

                // update SWR cache with new and updated span
                mutate(
                    (currentSpans) => {
                        if (!currentSpans) return [fullSpan];
                        return mergeSpans(currentSpans, fullSpan);
                    },
                    { revalidate: false }
                );
            } catch (err) {
                console.error("Failed to fetch span details:", err);
                mutate();
            }
        });

        return unsubscribe;
    }, [subscribe, traceId, mutate]);

    const error = swrError ?? wsError;

    return {
        spans: swrSpans ?? initialSpans ?? [],
        isConnected,
        error,
        isLoading: swrLoading,
    };
}
