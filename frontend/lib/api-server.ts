import { Agent, Trace, Span } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000"; // In production, get from auth/session

/**
 * Server-side API functions for fetching data
 * These are used in Server Components
 */

export async function getAgents(
  userId: string = DEFAULT_USER_ID
): Promise<Agent[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/agents?user_id=${userId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch agents: ${response.statusText}`);
      return [];
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
}

export async function getTraces(
  userId: string = DEFAULT_USER_ID,
  options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}
): Promise<Trace[]> {
  try {
    const params = new URLSearchParams();
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.offset) params.append("offset", options.offset.toString());
    if (options.status) params.append("status", options.status);

    const response = await fetch(
      `${API_BASE_URL}/traces?${params.toString()}`,
      {
        headers: {
          "X-User-ID": userId.toString(),
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

export async function getTraceSpans(
  traceId: string,
  userId: string = DEFAULT_USER_ID
): Promise<Span[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/traces/${traceId}/spans`, {
      headers: {
        "X-User-ID": userId.toString(),
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

export async function getTrace(
  traceId: string,
  userId: string = DEFAULT_USER_ID
): Promise<Trace | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/traces/${traceId}`, {
      headers: {
        "X-User-ID": userId.toString(),
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
