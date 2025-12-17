"use client";

import { useEffect, useRef, useState } from "react";
import { useWebSocket } from "@/lib/useWebSocket";
import type { WebSocketMessage } from "@/lib/websocket";

import { AgentGroup } from "@/components/AgentGroup";
import { CreateAgent } from "@/components/CreateAgent";

interface DashboardClientProps {
  initialAgents: any[];
  initialTraces: any[];
}

export default function DashboardClient({initialAgents, initialTraces}: DashboardClientProps) {
  const apiKey = typeof window !== "undefined" ? localStorage.getItem("X-User-ID") ?? "": "";

  const { state, subscribe } = useWebSocket({
    type: "dashboard",
    apiKey,
    disabled: false
  });

  const [traces, setTraces] = useState(initialTraces);
  const [agents] = useState(initialAgents);
  const [hasNewTraces, setHasNewTraces] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoScroll = useRef(true);

  // this useEffect determines if the user has scrolled away from the bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
      autoScroll.current = atBottom;

      if (atBottom) setHasNewTraces(false);
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  
  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  // this useeffect handles dashboard WebSocket events
  useEffect(() => {
    // update the traces in realtime
    const unsubTraceCreated = subscribe("span_created", (msg: WebSocketMessage) => {
      const traceId = msg.trace_id;

      // if the trace doesn't exist yet, show a banner
      if (!traces.some(t => t.trace_id === traceId)) {
        setHasNewTraces(true);
      }
    });

    const unsubTraceCompleted = subscribe("trace_completed", (msg: WebSocketMessage) => {
      const traceId = msg.trace_id;

      setTraces(prev =>
        prev.map(trace =>
          trace.trace_id === traceId
            ? {
                ...trace,
                status: msg.status,
                duration: msg.duration,
                total_cost: msg.total_cost,
                total_tokens: msg.total_tokens,
                end_time: msg.timestamp,
              }
            : trace
        )
      );
    });

    return () => {
      unsubTraceCreated();
      unsubTraceCompleted();
    };
  }, [subscribe, traces]);

  // auto-scroll if at the bottom
  useEffect(() => {
    if (autoScroll.current) scrollToBottom();
  }, [traces]);

  // group traces by agent dynamically
  const tracesByAgent = agents.map(agent => ({
    agent,
    traces: traces.filter(t => t.agent_id === agent.agent_id),
  }));

  const isConnected = state === "connected";
  const isReconnecting = state === "connecting";

  return (
    <div className="h-full overflow-y-auto bg-background" ref={scrollRef}>
      <div className="max-w-7xl mx-auto p-6">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-green-500" : isReconnecting ? "bg-yellow-400" : "bg-gray-400"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected && "Live updates active"}
              {isReconnecting && "Reconnecting..."}
              {!isConnected && !isReconnecting && "Using fallback polling"}
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight mb-1 mt-2">
            <span className="text-black/40">{`> `}</span>Agent Traces
          </h1>
          <p className="text-sm text-black/60">
            {`// View and analyze traces grouped by agent`}
          </p>
        </div>

        {/* Create Agent */}
        <div className="mb-6">
          <CreateAgent />
        </div>

        {/* NEW TRACES BANNER */}
        {hasNewTraces && (
          <div className="mb-3 p-2 bg-blue-100 text-blue-700 text-sm rounded cursor-pointer"
               onClick={() => {
                 scrollToBottom();
                 setHasNewTraces(false);
               }}>
            New traces available — click to view
          </div>
        )}

        {/* Agent Groups */}
        <div className="space-y-5">
          {tracesByAgent.map(({ agent, traces }) => (
            <AgentGroup
              key={agent.agent_id}
              agent={agent}
              traces={traces}
              defaultOpen={false}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
