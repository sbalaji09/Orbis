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
      console.warn("No authentication token available for getAgents");
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/agents`, {
      headers: {
        ...authHeaders,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch agents: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.agents || [];
  } catch (error) {
    console.error("Error fetching agents:", error);
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
      console.warn("No authentication token available for getTraces");
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
          ...authHeaders,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch traces: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.traces || [];
  } catch (error) {
    console.error("Error fetching traces:", error);
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
    return data.versions || [];
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
    return data.versions || [];
  } catch (error) {
    console.error("Error fetching prompt analytics:", error);
    return [];
  }
}
