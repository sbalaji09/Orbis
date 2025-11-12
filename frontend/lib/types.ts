export interface Trace {
  trace_id: number;
  start_time: Date;
  end_time: Date;
  duration: number;
  total_cost: number | null;
  total_tokens: number | null;
  status: string;
  user_id: number | null;
}

export interface Span {
  span_id: number;
  trace_id: number;
  parent_span_ids: number[] | null;
  start_time: Date;
  end_time: Date;
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
}
