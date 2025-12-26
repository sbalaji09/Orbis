"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWebSocket } from "@/lib/useWebSocket";
import type { WebSocketMessage } from "@/lib/websocket";
import { useAuth } from "@/hooks/useAuth";

import { AgentGroup } from "@/components/AgentGroup";
import { CreateAgent } from "@/components/CreateAgent";
import { TraceSearchFilters as TraceSearchFiltersComponent } from "@/components/TraceSearchFilters";
import { searchTraces, TraceSearchFilters } from "@/lib/api-client";
import { Agent, Trace } from "@/lib/types";

interface DashboardClientProps {
  initialAgents: Agent[];
  initialTraces: Trace[];
}

export default function DashboardClient({ initialAgents, initialTraces }: DashboardClientProps) {
  const { session } = useAuth();
  const apiKey = session?.access_token ?? "";

  const { state, subscribe } = useWebSocket({
    type: "dashboard",
    apiKey,
    disabled: !apiKey
  });

  const [traces, setTraces] = useState<Trace[]>(initialTraces);
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [hasNewTraces, setHasNewTraces] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<TraceSearchFilters>({});
  const [filteredTraces, setFilteredTraces] = useState<Trace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Pagination state
  const [totalResults, setTotalResults] = useState<number>(0);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [currentLimit] = useState<number>(50);

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    filters.traceId ||
    filters.status ||
    filters.agentId ||
    filters.spanType ||
    filters.model ||
    filters.minCost !== undefined ||
    filters.maxCost !== undefined ||
    filters.minDuration !== undefined ||
    filters.maxDuration !== undefined ||
    filters.startDate ||
    filters.endDate
  );

  // Callback when a new agent is created
  const handleAgentCreated = (newAgent: { agent_id: string; agent_name: string }) => {
    setAgents(prev => [
      {
        ...newAgent,
        user_id: session?.user?.id ?? "",
        created_at: new Date().toISOString(),
      } as Agent,
      ...prev,
    ]);
  };

  // Handle filter changes (called on debounced input changes)
  const handleFiltersChange = useCallback((newFilters: TraceSearchFilters) => {
    setFilters(newFilters);
  }, []);

  // Handle search (called when user clicks search button)
  const handleSearch = useCallback(async (searchFilters: TraceSearchFilters, offset: number = 0) => {
    // If no active filters, clear filtered results
    const isActive = Boolean(
      searchFilters.traceId ||
      searchFilters.status ||
      searchFilters.agentId ||
      searchFilters.spanType ||
      searchFilters.model ||
      searchFilters.minCost !== undefined ||
      searchFilters.maxCost !== undefined ||
      searchFilters.minDuration !== undefined ||
      searchFilters.maxDuration !== undefined ||
      searchFilters.startDate ||
      searchFilters.endDate
    );

    if (!isActive) {
      setFilteredTraces([]);
      setSearchError(null);
      setTotalResults(0);
      setCurrentOffset(0);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await searchTraces({
        ...searchFilters,
        limit: currentLimit,
        offset: offset,
      },
      session?.access_token
    );

      if (result) {
        setFilteredTraces(result.traces);
        setTotalResults(result.total);
        setCurrentOffset(offset);
      } else {
        setSearchError("Failed to search traces. Please try again.");
        setFilteredTraces([]);
        setTotalResults(0);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("An error occurred while searching. Please try again.");
      setFilteredTraces([]);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  }, [currentLimit]);

  // Handle page change
  const handlePageChange = useCallback((newOffset: number) => {
    handleSearch(filters, newOffset);
  }, [filters, handleSearch]);

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

          <div className="flex items-center justify-between mt-2 mb-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              <span className="text-black/40">{`> `}</span>Agent Traces
            </h1>
            <CreateAgent onAgentCreated={handleAgentCreated} />
          </div>
          <p className="text-sm text-black/60">
            {`// View and analyze traces grouped by agent`}
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6">
          <TraceSearchFiltersComponent
            agents={agents}
            onFiltersChange={handleFiltersChange}
            onSearch={handleSearch}
            isLoading={isSearching}
            total={hasActiveFilters ? totalResults : undefined}
            limit={currentLimit}
            offset={currentOffset}
            onPageChange={handlePageChange}
          />
        </div>

        {/* Search Error */}
        {searchError && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-500 text-red-700 text-sm font-mono">
            {searchError}
          </div>
        )}

        {/* Search Results Info */}
        {hasActiveFilters && totalResults > 0 && (
          <div className="mb-4 p-3 bg-[#5B5FFF]/10 border-2 border-[#5B5FFF] text-sm font-mono">
            <span className="text-[#5B5FFF] font-bold">{totalResults}</span> traces match your filters
            {totalResults > currentLimit && (
              <span className="text-black/60"> (showing {filteredTraces.length})</span>
            )}
          </div>
        )}

        {hasActiveFilters && totalResults === 0 && !isSearching && (
          <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-500 text-yellow-700 text-sm font-mono">
            No traces match your filters. Try adjusting your search criteria.
          </div>
        )}

        {/* NEW TRACES BANNER */}
        {hasNewTraces && !hasActiveFilters && (
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
          {tracesByAgent.map(({ agent, traces: agentTraces }) => (
            <AgentGroup
              key={agent.agent_id}
              agent={agent}
              traces={hasActiveFilters
                ? filteredTraces.filter(t => t.agent_id === agent.agent_id)
                : agentTraces
              }
              defaultOpen={false}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
