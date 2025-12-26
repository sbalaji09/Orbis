import { Agent, Trace, Span, PromptFamily } from "./types";
import { getAuthHeaders } from "./supabase/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Server-side API functions for fetching data
 * These are used in Server Components
 */

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

export async function getAgents(): Promise<Agent[]> {
  try {
    const authHeaders = await getAuthHeaders();

    // If no auth headers, user is not authenticated
    if (!authHeaders.Authorization) {
      console.warn("[api-server] No authentication token available for getAgents");
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/agents`, {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(`[api-server] Failed to fetch agents: ${response.status} ${response.statusText}`, errorBody);
      return [];
    }

    const data = await response.json();
    return data.agents || [];
  } catch (error) {
    console.error("[api-server] Error fetching agents:", error);
    return [];
  }
}

export async function getTraces(
  options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}
): Promise<Trace[]> {
  try {
    const authHeaders = await getAuthHeaders();

    // If no auth headers, user is not authenticated
    if (!authHeaders.Authorization) {
      console.warn("[api-server] No authentication token available for getTraces");
      return [];
    }

    const params = new URLSearchParams();
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.offset) params.append("offset", options.offset.toString());
    if (options.status) params.append("status", options.status);

    const response = await fetch(
      `${API_BASE_URL}/traces?${params.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(`[api-server] Failed to fetch traces: ${response.status} ${response.statusText}`, errorBody);
      return [];
    }

    const data = await response.json();
    return data.traces || [];
  } catch (error) {
    console.error("[api-server] Error fetching traces:", error);
    return [];
  }
}

export async function getTraceSpans(traceId: string): Promise<Span[]> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/traces/${traceId}/spans`, {
      headers: {
        ...authHeaders,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch trace spans: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.spans || [];
  } catch (error) {
    console.error("Error fetching trace spans:", error);
    return [];
  }
}

export async function getTrace(traceId: string): Promise<Trace | null> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/traces/${traceId}`, {
      headers: {
        ...authHeaders,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching trace:", error);
    return null;
  }
}

export async function getSpan(spanId: string): Promise<Span | null> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/spans/${spanId}`, {
      headers: {
        ...authHeaders,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching span:", error);
    return null;
  }
}

export async function getPromptsByAgent(
  agentId: string
): Promise<PromptFamily[]> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/prompts/agent/${agentId}`, {
      headers: {
        ...authHeaders,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch prompts: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching prompts:", error);
    return [];
  }
}

export async function getPromptVersions(promptName: string) {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/prompts/${encodeURIComponent(promptName)}/versions`,
      {
        headers: {
          ...authHeaders,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch prompt versions: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return unwrapList(data);
  } catch (error) {
    console.error("Error fetching prompt versions:", error);
    return [];
  }
}

export async function getPromptAnalytics(promptName: string) {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/prompts/analytics/${encodeURIComponent(promptName)}`,
      {
        headers: {
          ...authHeaders,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch prompt analytics: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return unwrapList(data);
  } catch (error) {
    console.error("Error fetching prompt analytics:", error);
    return [];
  }
}

function unwrapList(data: any) {
  if (Array.isArray(data)) return data;
  // common wrappers
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.versions)) return data.versions;
  return [];
}

export async function getCostSummary(period: string) {
  try {
    const authHeaders = await getAuthHeaders();
    const url = new URL(`${API_BASE_URL}/cost/summary`);
    url.searchParams.set("period", period);

    const response = await fetch(url.toString(), {
      headers: { ...authHeaders },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch cost summary: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return unwrapList(data);
  } catch(error) {
    console.error("Error getting cost summary:", error);
    return [];
  }
}

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getCostByAgent(startDate?: string, endDate?: string) {
  try {
    const authHeaders = await getAuthHeaders();

    const end = endDate ?? isoDateOnly(new Date());
    const start =
      startDate ??
      isoDateOnly(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

    const url = new URL(`${API_BASE_URL}/cost/by-agent`);
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date", end);

    const response = await fetch(url.toString(), {
      headers: { ...authHeaders },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch cost by agent: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return unwrapList(data);
  } catch (error) {
    console.error("Error getting cost by agent:", error);
    return [];
  }
}

export async function getCostByModel(startDate?: string, endDate?: string) {
  try {
    const authHeaders = await getAuthHeaders();

    const end = endDate ?? isoDateOnly(new Date());
    const start =
      startDate ??
      isoDateOnly(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

    const url = new URL(`${API_BASE_URL}/cost/by-model`);
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date", end);

    const response = await fetch(url.toString(), {
      headers: { ...authHeaders },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch cost by model: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return unwrapList(data);
  } catch (error) {
    console.error("Error getting cost by model:", error);
    return [];
  }
}

export async function getCostTrends(days: number) {
  try {
    const authHeaders = await getAuthHeaders();

    const url = new URL(`${API_BASE_URL}/cost/trends`);
    url.searchParams.set("days", String(days));

    const response = await fetch(url.toString(), {
      headers: { ...authHeaders },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch cost trends: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return unwrapList(data);
  } catch (error) {
    console.error("Error getting cost trends:", error);
    return [];
  }
}

export async function explainTrace(traceId: string): Promise<{ explanation: string } | null> {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/traces/explain?trace_id=${encodeURIComponent(traceId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to explain trace: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error explaining trace:", error);
    return null;
  }
}

export async function searchTraces(filters: TraceSearchFilters): Promise<{
  matches: number;
  filters: Record<string, unknown>;
  traces: Trace[];
  limit: number;
  offset: number;
} | null> {
  try {
    const authHeaders = await getAuthHeaders();

    if (!authHeaders.Authorization) {
      console.warn("[api-server] No authentication token available for searchTraces");
      return null;
    }

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
      headers: { ...authHeaders },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to search traces: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching traces:", error);
    return null;
  }
}