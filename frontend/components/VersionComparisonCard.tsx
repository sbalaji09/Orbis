import React from "react";
import { PromptVersionAnalytics } from "@/lib/prompt-api-client";

interface VersionComparisonCardProps {
  version1: {
    semantic_version: string;
    analytics?: PromptVersionAnalytics;
  };
  version2: {
    semantic_version: string;
    analytics?: PromptVersionAnalytics;
  };
}

/**
 * Auto-generated comparison insights between two prompt versions
 * Shows cost savings, performance changes, and recommendations
 */
export default function VersionComparisonCard({
  version1,
  version2,
}: VersionComparisonCardProps) {
  const v1 = version1.analytics;
  const v2 = version2.analytics;

  if (!v1 || !v2) {
    return (
      <div className="p-4 bg-black/5 border-2 border-black/10 text-center">
        <p className="text-sm text-black/60">
          Not enough usage data to compare versions
        </p>
      </div>
    );
  }

  // Calculate differences
  const costDiff = v2.avg_cost - v1.avg_cost;
  const costDiffPercent = v1.avg_cost > 0 ? (costDiff / v1.avg_cost) * 100 : 0;
  const latencyDiff = v2.avg_latency - v1.avg_latency;
  const latencyDiffPercent =
    v1.avg_latency > 0 ? (latencyDiff / v1.avg_latency) * 100 : 0;
  const errorDiff = (v2.error_rate_pct || 0) - (v1.error_rate_pct || 0);

  const v1Label = `v${version1.semantic_version}`;
  const v2Label = `v${version2.semantic_version}`;

  // Generate insights
  const insights: string[] = [];

  if (Math.abs(costDiffPercent) > 10) {
    if (costDiff < 0) {
      insights.push(
        `${Math.abs(costDiffPercent).toFixed(1)}% cheaper than ${v1Label}`
      );
    } else {
      insights.push(
        `${costDiffPercent.toFixed(1)}% more expensive than ${v1Label}`
      );
    }
  }

  if (Math.abs(latencyDiffPercent) > 15) {
    if (latencyDiff < 0) {
      insights.push(
        `${Math.abs(latencyDiffPercent).toFixed(1)}% faster than ${v1Label}`
      );
    } else {
      insights.push(
        `${latencyDiffPercent.toFixed(1)}% slower than ${v1Label}`
      );
    }
  }

  if (errorDiff < -1) {
    insights.push(`${Math.abs(errorDiff).toFixed(1)}% fewer errors`);
  } else if (errorDiff > 1) {
    insights.push(`${errorDiff.toFixed(1)}% more errors`);
  }

  if (v2.trace_count > v1.trace_count * 2) {
    insights.push(
      `${v2.trace_count - v1.trace_count} more traces collected`
    );
  }

  // Recommendation
  let recommendation = "";
  if (costDiff < 0 && errorDiff <= 0) {
    recommendation = `${v2Label} is recommended: Lower cost with same or better quality`;
  } else if (costDiff < 0 && errorDiff > 2) {
    recommendation = `Trade-off: ${v2Label} is cheaper but has more errors`;
  } else if (errorDiff < -2) {
    recommendation = `${v2Label} is recommended: Significantly fewer errors`;
  } else if (costDiff > 0 && errorDiff <= 0) {
    recommendation = `${v1Label} may be better: Similar quality at lower cost`;
  }

  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-black/10">
        <h4 className="text-sm font-semibold text-foreground">
          Auto-Generated Insights
        </h4>
        <span className="text-[10px] text-black/40 font-mono">
          {v1Label} vs {v2Label}
        </span>
      </div>

      {/* Key metrics comparison */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-[9px] text-black/40 uppercase tracking-wide mb-1">
            Cost Change
          </p>
          <p
            className={`text-lg font-bold ${
              costDiff < 0 ? "text-success" : costDiff > 0 ? "text-error" : ""
            }`}
          >
            {costDiff < 0 ? "-" : "+"}
            {Math.abs(costDiffPercent).toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-black/40 uppercase tracking-wide mb-1">
            Latency Change
          </p>
          <p
            className={`text-lg font-bold ${
              latencyDiff < 0
                ? "text-success"
                : latencyDiff > 0
                ? "text-warning"
                : ""
            }`}
          >
            {latencyDiff < 0 ? "-" : "+"}
            {Math.abs(latencyDiffPercent).toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-black/40 uppercase tracking-wide mb-1">
            Error Rate
          </p>
          <p
            className={`text-lg font-bold ${
              errorDiff < 0 ? "text-success" : errorDiff > 0 ? "text-error" : ""
            }`}
          >
            {errorDiff < 0 ? "" : "+"}
            {errorDiff.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Insights list */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2 bg-babyblue/5 border border-babyblue/20"
            >
              <span className="text-xs text-foreground">{insight}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="p-3 bg-mustard/10 border-2 border-mustard/30">
          <p className="text-xs font-semibold text-foreground">
            {recommendation}
          </p>
        </div>
      )}

      {/* No insights */}
      {insights.length === 0 && !recommendation && (
        <div className="text-center py-4">
          <p className="text-xs text-black/40">
            Versions are similar in performance
          </p>
        </div>
      )}
    </div>
  );
}
