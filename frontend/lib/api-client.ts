import { Trace } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface TraceSearchFilters {
    traceId?: string;
    status?: string;
    agentId?: string;
    model?: string;
    minCost?: number;
    maxCost?: number;
    minDuration?: number;
    maxDuration?: number;
    startDate?: string;
    endDate?: string;
    spanType?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
  
export interface SearchTracesResult {
    traces: Trace[];
    total: number;
    limit: number;
    offset: number;
    filters: Record<string, unknown>;
}


export async function searchTraces(
    filters: TraceSearchFilters,
    token: string | undefined
  ): Promise<SearchTracesResult | null> {
    if (!token) {
      console.warn("[api-client] No authentication token provided for searchTraces");
      return null;
    }
  
    try {
      const url = new URL(`${API_BASE_URL}/search/traces`);
  
      // Add all filter parameters to the URL
      if (filters.traceId) url.searchParams.set("trace_id", filters.traceId);
      if (filters.agentId) url.searchParams.set("agent_id", filters.agentId);
      if (filters.status) url.searchParams.set("status", filters.status);
      if (filters.model) url.searchParams.set("model", filters.model);
      if (filters.spanType) url.searchParams.set("span_type", filters.spanType);
      if (filters.minCost !== undefined) url.searchParams.set("min_cost", String(filters.minCost));
      if (filters.maxCost !== undefined) url.searchParams.set("max_cost", String(filters.maxCost));
      if (filters.minDuration !== undefined) url.searchParams.set("min_duration", String(filters.minDuration));
      if (filters.maxDuration !== undefined) url.searchParams.set("max_duration", String(filters.maxDuration));
      if (filters.startDate) url.searchParams.set("start_date", filters.startDate);
      if (filters.endDate) url.searchParams.set("end_date", filters.endDate);
      if (filters.limit !== undefined) url.searchParams.set("limit", String(filters.limit));
      if (filters.offset !== undefined) url.searchParams.set("offset", String(filters.offset));
      if (filters.sortBy) url.searchParams.set("sort_by", filters.sortBy);
      if (filters.sortOrder) url.searchParams.set("sort_order", filters.sortOrder);
  
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) {
        console.error(`[api-client] Failed to search traces: ${response.status} ${response.statusText}`);
        return null;
      }
  
      return await response.json();
    } catch (error) {
      console.error("[api-client] Error searching traces:", error);
      return null;
    }
}
  
export async function explainTrace(
    traceId: string,
    token: string | undefined
  ): Promise<{ explanation: string } | null> {
    if (!token) {
      console.warn("[api-client] No authentication token provided for explainTrace");
      return null;
    }
  
    try {
      const response = await fetch(
        `${API_BASE_URL}/traces/explain?trace_id=${encodeURIComponent(traceId)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      if (!response.ok) {
        console.error(`[api-client] Failed to explain trace: ${response.status} ${response.statusText}`);
        return null;
      }
  
      return await response.json();
    } catch (error) {
      console.error("[api-client] Error explaining trace:", error);
      return null;
    }
  }