export interface Agent {
  agent_id: string;
  agent_name: string;
  user_id: string;
  description?: string;
}

export interface Trace {
  trace_id: string;
  agent_id: string;
  start_time: Date;
  end_time: Date;
  duration: number;
  total_cost: number | null;
  total_tokens: number | null;
  status: string;
  user_id: string | null;
}

export interface Span {
  span_id: string;
  trace_id: string;
  parent_span_ids: string[] | null;
  start_time: Date;
  end_time: Date | null;
  duration: number | null;
  /** First 200 characters of input for preview display */
  input_preview: string | null;
  /** URL to full input data in storage */
  input_blob_url: string | null;
  /** First 200 characters of output for preview display */
  output_preview: string | null;
  /** URL to full output data in storage */
  output_blob_url: string | null;
  llm_model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost: number | null;
  status: string | null;
  error_message: string | null;
  name: string | null;
  is_streaming: boolean;
  time_to_first_token: number | null;
  tokens_per_second: number | null;
  prompt_id: string | null;
  /** The human-readable prompt name (e.g., "customer-support") */
  prompt_name: string | null;
  prompt_version: string | null;
  prompt_hash: string | null;
}

export interface PromptVersion {
  prompt_version_id: string;
  name: string;
  version_number: number;
  content_preview: string;
  created_at: Date;
  is_active: string;
  metadata: JSON;
}

export interface PromptFamily {
  name: string;
  agent_id: string;
  versions: PromptVersion[];
  total_traces: number;
}
