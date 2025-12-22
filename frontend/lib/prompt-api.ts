import { getAuthHeaders } from "./supabase/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PromptFamily {
  name: string;
  agent_id: string;
  agent_name: string | null;
  version_count: number;
  latest_version: number;
  last_updated: string;
}

export interface PromptComparisonResult {
  prompts: {
    version1: {
      prompt_id: string;
      content: string;
      analytics: PromptVersionAnalytics;
      sample_outputs: string[];
    };
    version2: {
      prompt_id: string;
      content: string;
      analytics: PromptVersionAnalytics;
      sample_outputs: string[];
    };
  };
  diff: {
    added: string[];
    removed: string[];
    raw: string;
  };
  llm_analysis: string;
}

export async function fetchPromptFamilies(): Promise<PromptFamily[]> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/prompts/families`, {
      headers: {
        ...authHeaders,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch prompt families: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    // console.log("DATA", data);
    return data.families || [];
  } catch (error) {
    console.error("Error fetching prompt families:", error);
    return [];
  }
}

export async function fetchPromptVersions(prompt_name: string) {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/prompts/${prompt_name}/versions`,
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
    console.log(data);
    return data.versions || [];
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
}

export async function fetchPromptContent(
  prompt_name: string,
  versionId: number
) {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/prompts/${prompt_name}/content?version_number=${versionId}`,
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
    return data.content || [];
  } catch (error) {
    console.error("Error fetching prompt content", error);
    return [];
  }
}

export async function fetchPromptDiff(
  version_number1: number,
  version_number2: number
) {
  const url = new URL(`${API_BASE_URL}/prompts/diff`);
  url.searchParams.set("prompt_id1", String(version_number1));
  url.searchParams.set("prompt_id2", String(version_number2));

  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(url.toString(), {
      headers: {
        ...authHeaders,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch prompt diff: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.diff || [];
  } catch (error) {
    console.error("Error fetching prompt differences", error);
    return [];
  }
}

export async function rollbackPrompt(name: string, versionNumber: number) {
  // URL: /prompts/{name}/rollback?version_number=3
  const url = new URL(
    `${API_BASE_URL}/prompts/${encodeURIComponent(name)}/rollback`
  );
  url.searchParams.set("version_number", String(versionNumber));

  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        ...authHeaders,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to rollback prompt: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error rolling back prompt", error);
    return null;
  }
}

export async function comparePrompts(
  promptId1: string,
  promptId2: string
): Promise<PromptComparisonResult> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/prompts/compare?prompt_id1=${promptId1}&prompt_id2=${promptId2}`,
      {
        headers: {
          ...authHeaders,
        },
        cache: "no-store",
      }
    );
    if (!response.ok) {
      console.error(`Failed to compare prompts: ${response.statusText}`);
      throw new Error("Failed to compare prompts");
    }
    return response.json();
  } catch (error) {
    console.error("Error comparing prompts:", error);
    throw error;
  }
}

export interface PromptVersionAnalytics {
  prompt_id: string;
  name: string;
  version_number: number;
  semantic_version?: string;
  trace_count: number;
  avg_cost: number;
  avg_latency: number;
  error_traces: number;
  error_rate_pct: number | null;
}

export async function fetchPromptAnalytics(
  promptName: string
): Promise<PromptVersionAnalytics[]> {
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
