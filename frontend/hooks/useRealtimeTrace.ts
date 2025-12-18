import { useEffect, useState } from "react";
import useSWR from "swr";
import { Span } from "../lib/types";
import { useWebSocket } from "../lib/useWebSocket";
import { SpanCreatedMessage, WebSocketMessage } from "../lib/websocket";
import { useAuth } from "./useAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const REALTIME_ENABLED =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const POLLING_INTERVAL = 2000;

export interface UseRealtimeTraceResult {
  spans: Span[];
  isConnected: boolean;
  isPolling: boolean;
  error: Error | null;
  isLoading: boolean;
}

export interface UseRealtimeTraceParams {
  traceId: string;
  apiKey: string;
  initialSpans?: Span[];
  disableRealtime?: boolean;
}

// fetches the spans using SWR
const fetchSpans = async (url: string, token?: string): Promise<Span[]> => {
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}${url}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch spans: ${response.statusText}`);
  }

  const data = await response.json();
  return data.spans as Span[];
};

// fetches a single span by ID
const fetchSpanById = async (spanId: string, token?: string): Promise<Span> => {
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/spans/${spanId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
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
  const { traceId, apiKey, initialSpans, disableRealtime = false } = params;
  const { session } = useAuth();

  const [wsError, setWsError] = useState<Error | null>(null);
  const [usePollingFallback, setUsePollingFallback] = useState(false);

  const realtimeDisabled = !REALTIME_ENABLED || disableRealtime;

  const shouldPoll = realtimeDisabled || usePollingFallback;

  const {
    data: swrSpans,
    error: swrError,
    isLoading: swrLoading,
    mutate,
  } = useSWR<Span[]>(
    traceId && session?.access_token ? `/traces/${traceId}/spans` : null,
    (url) => fetchSpans(url, session?.access_token),
    {
      fallbackData: initialSpans,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: shouldPoll ? 1000 : 5000,
      refreshInterval: shouldPoll ? POLLING_INTERVAL : 0, // Enable polling as fallback
    }
  );

  // websocket connection for real-time updates
  const { state: wsState, subscribe } = useWebSocket({
    type: "trace",
    traceId,
    apiKey,
    disabled: realtimeDisabled,
  });

  const isConnected = wsState === "connected";

  useEffect(() => {
    if (wsState === "failed") {
      console.log("WebSocket failed, falling back to polling");
      setUsePollingFallback(true);
    }
  }, [wsState]);

  useEffect(() => {
    if (wsState === "error") {
      setWsError(new Error("WebSocket connection error"));
    } else {
      setWsError(null);
    }
  }, [wsState]);

  // handle incoming span_created eents
  useEffect(() => {
    if (realtimeDisabled || usePollingFallback) return;

    const unsubscribe = subscribe(
      "span_created",
      async (msg: WebSocketMessage) => {
        const spanMsg = msg as SpanCreatedMessage;

        if (spanMsg.trace_id !== traceId) {
          return;
        }

        try {
          // fetch the full span data
          const fullSpan = await fetchSpanById(
            spanMsg.span_id,
            session?.access_token
          );

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
      }
    );

    return unsubscribe;
  }, [
    subscribe,
    traceId,
    mutate,
    realtimeDisabled,
    usePollingFallback,
    session?.access_token,
  ]);

  const error = swrError ?? wsError;

  return {
    spans: swrSpans ?? initialSpans ?? [],
    isConnected,
    isPolling: shouldPoll,
    error,
    isLoading: swrLoading,
  };
}
