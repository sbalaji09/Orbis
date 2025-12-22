import React from "react";
import { PromptVersionAnalytics } from "@/lib/prompt-api-client";

interface PromptAnalyticsProps {
  analytics?: PromptVersionAnalytics[];
  loading?: boolean;
}

export default function PromptAnalytics({
  analytics = [],
  loading = false,
}: PromptAnalyticsProps) {
  if (loading) {
    return (
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-black/10 w-48"></div>
          <div className="h-64 bg-black/5"></div>
        </div>
      </div>
    );
  }

  // Find best performing version (lowest error rate with most traces)
  const bestVersion =
    analytics.length > 0
      ? analytics.reduce((best, curr) => {
          if (curr.trace_count === 0) return best;
          if (best.trace_count === 0) return curr;
          const bestError = best.error_rate_pct ?? 100;
          const currError = curr.error_rate_pct ?? 100;
          if (currError < bestError) return curr;
          if (currError === bestError && curr.trace_count > best.trace_count)
            return curr;
          return best;
        })
      : null;

  console.log(analytics);

  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b-2 border-black bg-background">
        <h3 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
          {`/* Version Performance */`}
        </h3>
        <p className="text-[10px] text-muted mt-1">
          Trace count, cost, latency, and error rate by version
        </p>
      </div>

      {/* Best performing banner */}
      {bestVersion && bestVersion.trace_count > 0 && (
        <div className="px-6 py-3 bg-success/10 border-b-2 border-success/20 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-[10px] font-medium text-success">
            Best performing: v{bestVersion.semantic_version} (
            {bestVersion.trace_count} traces, {bestVersion.error_rate_pct ?? 0}%
            error rate)
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-background border-b-2 border-black/10">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Traces
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Avg Cost
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Avg Latency
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Errors
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Error Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {analytics
              .sort((a, b) =>
                b.semantic_version.localeCompare(
                  a.semantic_version,
                  undefined,
                  { numeric: true }
                )
              )
              .map((row, idx) => {
                const isBest =
                  bestVersion &&
                  row.semantic_version === bestVersion.semantic_version &&
                  row.trace_count > 0;
                console.log(row);
                return (
                  <tr
                    key={row.semantic_version}
                    className={`border-b border-black/5 hover:bg-babyblue/5 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-background/50"
                    } ${isBest ? "ring-2 ring-success/30 ring-inset" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold bg-babyblue/10 text-babyblue border border-babyblue/30">
                          v{row.semantic_version}
                        </span>
                        {isBest && (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-success text-white">
                            Best
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                      {row.trace_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-mustard font-semibold">
                      {row.avg_cost > 0 ? `$${row.avg_cost.toFixed(4)}` : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                      {row.avg_latency > 0
                        ? `${row.avg_latency.toFixed(2)}s`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                      {row.error_traces}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-semibold ${
                          row.error_rate_pct === null ||
                          row.error_rate_pct === 0
                            ? "bg-success/10 text-success border border-success/30"
                            : row.error_rate_pct < 5
                            ? "bg-warning/10 text-warning border border-warning/30"
                            : "bg-error/10 text-error border border-error/30"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 ${
                            row.error_rate_pct === null ||
                            row.error_rate_pct === 0
                              ? "bg-success"
                              : row.error_rate_pct < 5
                              ? "bg-warning"
                              : "bg-error"
                          }`}
                        ></div>
                        {row.error_rate_pct === null
                          ? "0%"
                          : `${row.error_rate_pct.toFixed(1)}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {analytics.length === 0 && (
        <div className="px-6 py-12 text-center text-muted text-sm">
          No analytics data available yet. Analytics will appear once this
          prompt is used in traces.
        </div>
      )}
    </div>
  );
}
