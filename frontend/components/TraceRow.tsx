"use client";

import { useRouter } from "next/navigation";
import { Trace } from "@/lib/types";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function TraceRow({ trace }: { trace: Trace }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/dashboard/trace/${trace.trace_id}`)}
      className="w-full px-6 py-4 text-left transition-all hover:bg-babyblue/15 group"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: ID and Status */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-base font-semibold text-foreground">
            #{trace.trace_id}
          </span>
          {trace.status === "failed" ? (
            <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded">
              ERROR
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded">
              SUCCESS
            </span>
          )}
        </div>

        {/* Right: Metrics */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-foreground/60">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{formatDuration(trace.duration)}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground/60">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>${(trace.total_cost || 0).toFixed(4)}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground/60">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="font-mono">{trace.total_tokens || 0}</span>
          </div>
          <div className="text-xs text-foreground/40">
            {new Date(trace.start_time).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </button>
  );
}
