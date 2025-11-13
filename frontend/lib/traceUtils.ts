import { dummySpans } from "./dummy";
import { Span } from "./types";

/**
 * Get all unique trace IDs from the dummy data
 */
export function getValidTraceIds(): number[] {
  const traceIds = new Set(dummySpans.map((span) => span.trace_id));
  return Array.from(traceIds).sort((a, b) => a - b);
}

/**
 * Check if a trace ID exists in the dummy data
 */
export function isValidTraceId(traceId: number): boolean {
  return dummySpans.some((span) => span.trace_id === traceId);
}

/**
 * Get all spans for a specific trace ID
 */
export function getSpansByTraceId(traceId: number): Span[] {
  return dummySpans.filter((span) => span.trace_id === traceId);
}

/**
 * Get trace metadata (aggregated information about a trace)
 */
export function getTraceMetadata(traceId: number) {
  const spans = getSpansByTraceId(traceId);

  if (spans.length === 0) {
    return null;
  }

  const totalCost = spans.reduce((sum, span) => sum + (span.cost || 0), 0);
  const totalTokens = spans.reduce(
    (sum, span) =>
      sum + (span.prompt_tokens || 0) + (span.completion_tokens || 0),
    0
  );
  const startTime = new Date(
    Math.min(...spans.map((span) => span.start_time.getTime()))
  );
  const endTime = new Date(
    Math.max(...spans.map((span) => span.end_time.getTime()))
  );
  const duration = (endTime.getTime() - startTime.getTime()) / 1000; // in seconds

  const statuses = spans.map((span) => span.status);
  const hasErrors = statuses.some((status) => status === "failed");
  const overallStatus = hasErrors
    ? "failed"
    : statuses.every((status) => status === "completed")
    ? "completed"
    : "running";

  return {
    traceId,
    spanCount: spans.length,
    totalCost,
    totalTokens,
    startTime,
    endTime,
    duration,
    status: overallStatus,
  };
}
