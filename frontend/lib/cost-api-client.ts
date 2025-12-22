/**
 * Client-side cost API functions
 * These functions accept a token parameter for use in Client Components
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface CostTrend {
  date: string;
  total_cost: number;
  call_count: number;
  [key: string]: string | number;
}

export interface CostByAgent {
  agent: string;
  total_cost: number;
  call_count: number;
  [key: string]: string | number;
}

export interface CostByModel {
  model: string;
  total_cost: number;
  call_count: number;
  [key: string]: string | number;
}

export interface TokenBreakdown {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  total_tokens: number;
  by_model: Record<string, { input: number; output: number }>;
}

export interface LLMSpan {
  span_id: string;
  name: string;
  llm_model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
}

export interface TokensPerTrace {
  trace_id: string;
  trace_hash_id: string;
  agent_name: string;
  start_time: string;
  total_tokens: number;
  total_cost: number;
  status: string;
  span_count: number;
  input_tokens: number;
  output_tokens: number;
  llm_spans: LLMSpan[];
}

export interface ModelAnalysis {
  model: string;
  call_count: number;
  total_cost: number;
  avg_tokens: number;
  avg_cost_per_call: number;
}

export interface VerboseTrace {
  trace_hash_id: string;
  agent_name: string;
  input_tokens: number;
  output_tokens: number;
  output_input_ratio: number;
  total_cost: number;
}

export interface RepeatedPrompt {
  model: string;
  preview: string;
  repetition_count: number;
  potential_savings: number;
}

export interface SavingsOpportunities {
  model_analysis: ModelAnalysis[];
  verbose_traces: VerboseTrace[];
  repeated_prompts: RepeatedPrompt[];
  total_potential_savings: number;
}

export interface CostByTag {
  tag: string;
  trace_count: number;
  call_count: number;
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
}

export interface ModelPromptStats {
  model: string;
  call_count: number;
  avg_input_tokens: number;
  max_input_tokens: number;
  min_input_tokens: number;
  median_input_tokens: number;
  p90_input_tokens: number;
  total_input_tokens: number;
  total_cost: number;
}

export interface LongPrompt {
  trace_hash_id: string;
  agent_name: string;
  span_name: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  preview: string;
}

export interface PromptVersionStats {
  version: string;
  usage_count: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
  avg_cost: number;
}

export interface SystemPromptPattern {
  model: string;
  preview: string;
  occurrence_count: number;
  avg_tokens: number;
  total_cost: number;
}

export interface PromptAnalysisSummary {
  total_input_tokens: number;
  avg_tokens_per_call: number;
  models_analyzed: number;
  prompts_with_versions: number;
}

export interface PromptLengthAnalysis {
  model_stats: ModelPromptStats[];
  long_prompts: LongPrompt[];
  prompt_versions: Record<string, PromptVersionStats[]>;
  system_prompts: SystemPromptPattern[];
  summary: PromptAnalysisSummary;
}

function getHeaders(token: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchCostTrends(
  days: number,
  token: string | null
): Promise<CostTrend[]> {
  try {
    const url = new URL(`${API_BASE_URL}/cost/trends`);
    url.searchParams.set("days", String(days));

    const response = await fetch(url.toString(), {
      headers: getHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch cost trends: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching cost trends:", error);
    return [];
  }
}

export async function fetchCostByAgent(
  startDate: string | undefined,
  endDate: string | undefined,
  token: string | null
): Promise<CostByAgent[]> {
  try {
    const end = endDate ?? isoDateOnly(new Date());
    const start = startDate ?? isoDateOnly(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

    const url = new URL(`${API_BASE_URL}/cost/by-agent`);
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date", end);

    const response = await fetch(url.toString(), {
      headers: getHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch cost by agent: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching cost by agent:", error);
    return [];
  }
}

export async function fetchCostByModel(
  startDate: string | undefined,
  endDate: string | undefined,
  token: string | null
): Promise<CostByModel[]> {
  try {
    const end = endDate ?? isoDateOnly(new Date());
    const start = startDate ?? isoDateOnly(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

    const url = new URL(`${API_BASE_URL}/cost/by-model`);
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date", end);

    const response = await fetch(url.toString(), {
      headers: getHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch cost by model: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching cost by model:", error);
    return [];
  }
}

export async function fetchTokenBreakdown(
  days: number,
  token: string | null
): Promise<TokenBreakdown[]> {
  try {
    const url = new URL(`${API_BASE_URL}/cost/token-breakdown`);
    url.searchParams.set("days", String(days));

    const response = await fetch(url.toString(), {
      headers: getHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch token breakdown: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching token breakdown:", error);
    return [];
  }
}

export async function fetchTokensPerTrace(days: number, token: string | null, limit: number=50): Promise<TokensPerTrace[]> {
  try {
    const url = new URL(`${API_BASE_URL}/cost/tokens-per-trace`);
    url.searchParams.set("days", String(days));
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url.toString(), {
      headers: getHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch tokens per trace: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching tokens per trace:", error);
    return [];
  }
}

export async function fetchSavingsOpportunities(
  days: number,
  token: string | null
): Promise<SavingsOpportunities | null> {
  try {
    const url = new URL(`${API_BASE_URL}/cost/savings-opportunities`);
    url.searchParams.set("days", String(days));

    const response = await fetch(url.toString(), {
      headers: getHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch savings opportunities: ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching savings opportunities:", error);
    return null;
  }
}

// fetches the cost of each call based on the tag
export async function fetchCostByTag(
  startDate: string,
  endDate: string,
  token: string | null
): Promise<CostByTag[]> {
  try {
    const url = new URL(`${API_BASE_URL}/cost/by-tag`);
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);

    const response = await fetch(url.toString(), {
      headers: getHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch cost by tag: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching cost by tag:", error);
    return [];
  }
}

// fetches the user tags
export async function fetchUserTags(token: string | null): Promise<string[]> {
  try {
    const url = new URL(`${API_BASE_URL}/cost/tags`);

    const response = await fetch(url.toString(), {
      headers: getHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.tags || [];
  } catch (error) {
    console.error("Error fetching user tags:", error);
    return [];
  }
}

export async function fetchPromptLengthAnalysis(
  days: number,
  token: string | null
): Promise<PromptLengthAnalysis | null> {
  try {
    const url = new URL(`${API_BASE_URL}/cost/prompt-analysis`);
    url.searchParams.set("days", String(days));

    const response = await fetch(url.toString(), {
      headers: getHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch prompt analysis: ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching prompt analysis:", error);
    return null;
  }
}