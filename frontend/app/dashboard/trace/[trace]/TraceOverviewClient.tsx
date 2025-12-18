"use client";

import React, { useEffect, useRef, useState } from "react";
import { getTrace } from "@/lib/api-server";
import { useWebSocket } from "@/lib/useWebSocket";
import type { WebSocketMessage } from "@/lib/websocket";
type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface TraceOverviewClientProps {
  traceId: string;
  apiKey: string;
  children: React.ReactNode; // TraceGraphServer
}

export default function TraceOverviewClient({traceId, apiKey, children}: TraceOverviewClientProps) {
  // Disable WebSocket if no API key is provided
  const hasApiKey = Boolean(apiKey);

  const { state, subscribe } = useWebSocket({
    type: "trace",
    traceId,
    apiKey,
    disabled: !hasApiKey,
  });

  const [hasNewSpans, setHasNewSpans] = useState(false);
  const [followMode, setFollowMode] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const isConnected = state === "connected";
  const isReconnecting = state === "connecting";
  const isDegraded = !hasApiKey || state === "error" || state === "disconnected";

  // scroll handler for follow mode
  const scrollToBottom = () => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    el.scrollTo({
      top: el.scrollHeight, 
      behavior: "smooth",
    });
  };

  // listen for new spans via the WebSocket connection
  useEffect(() => {
    const unsubscribe = subscribe("span_created", (msg: WebSocketMessage) => {
      // any time a new span arrives, flip the "new spans" flag
      setHasNewSpans(true);

      if (followMode) {
        scrollToBottom();
      }

      // If you want to update SWR cache here, you can:
      // spansMutateRef.current?.((prev) => [...prev, msg]);
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe, followMode]);

  // if a user scrolls manually, disable follow mode
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const isNearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (!isNearBottom && followMode) {
        setFollowMode(false);
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [followMode]);

  // if follow mode is toggled, scroll to the bottom immediately
  useEffect(() => {
    if (followMode) {
      scrollToBottom();
      setHasNewSpans(false);
    }
  }, [followMode]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isConnected
                ? "bg-green-500"
                : isReconnecting
                ? "bg-yellow-400"
                : "bg-gray-400"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected && "Live: connected"}
            {isReconnecting && "Reconnecting..."}
            {isDegraded && "Realtime unavailable, using polling"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasNewSpans && !followMode && (
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 animate-pulse">
              New spans
            </span>
          )}

          <button
            type="button"
            onClick={() => setFollowMode((prev) => !prev)}
            className={`px-2 py-1 text-xs rounded border ${
              followMode
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-transparent text-slate-700 border-slate-300"
            }`}
          >
            {followMode ? "Follow mode: On" : "Follow mode: Off"}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto rounded border border-slate-200"
      >
        {children}
      </div>

      {isDegraded && (
        <p className="mt-2 text-xs text-muted-foreground">
          {!hasApiKey
            ? "Real-time updates disabled (no API key). Page will update via polling."
            : "WebSocket connection lost. Page will continue to update via polling."
          }
        </p>
      )}
    </div>
  );
}
