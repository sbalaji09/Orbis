import { Agent, Trace, Span, PromptFamily } from "./types";
import { getAuthHeaders } from "./supabase/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Server-side API functions for fetching data
 * These are used in Server Components
 */

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
    return data || [];
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
    return data || [];
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
  if (Array.isArray(data?.versions)) return data; // keep as fallback if some endpoints still do this
  return [];
}

export async function getCostSummary(userId: string, period: string) {
  try {
    const authHeaders = await getAuthHeaders();
    const url = new URL(`${API_BASE_URL}/cost/summary`);
    url.searchParams.set("user_id", userId);
    url.searchParams.set("period", period);

    const response = await fetch(url.toString(), {
      headers: { ...authHeaders },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch prompt analytics: ${response.statusText}`);
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

export async function getCostByAgent(userId: string, startDate?: string, endDate?: string) {
  try {
    const authHeaders = await getAuthHeaders();

    const end = endDate ?? isoDateOnly(new Date());
    const start =
      startDate ??
      isoDateOnly(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

    const url = new URL(`${API_BASE_URL}/cost/by-agent`);
    url.searchParams.set("user_id", userId);
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

export async function getCostByModel(userId: string, startDate?: string, endDate?: string) {
  try {
    const authHeaders = await getAuthHeaders();

    const end = endDate ?? isoDateOnly(new Date());
    const start =
      startDate ??
      isoDateOnly(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

    const url = new URL(`${API_BASE_URL}/cost/by-model`);
    url.searchParams.set("user_id", userId);
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

export async function getCostTrends(userId: string, days: number) {
  try {
    const authHeaders = await getAuthHeaders();

    const url = new URL(`${API_BASE_URL}/cost/trends`);
    url.searchParams.set("user_id", userId);
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