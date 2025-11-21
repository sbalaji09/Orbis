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
  const isError = trace.status === "failed";

  return (
    <button
      onClick={() => router.push(`/dashboard/trace/${trace.trace_id}`)}
      className="w-full px-5 py-3.5 text-left transition-all hover:bg-mustard/5 hover:shadow-[inset_4px_0_0_#FFD600] border-b-2 border-black last:border-b-0 group"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Truncated ID with prominent datetime */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="font-mono text-sm font-semibold tracking-tight group-hover:text-babyblue transition-colors">
            #{trace.trace_id.substring(0, 8)}
          </span>
          <span className="text-muted">•</span>
          <span className="text-sm text-foreground font-medium">
            {new Date(trace.start_time + "Z").toLocaleString([], {
              hour: "2-digit",
              minute: "2-digit",
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Right: Status and Metrics */}
        <div className="flex items-center gap-5 text-xs shrink-0">
          <div
            className={`flex items-center gap-1.5 px-2 py-1 border-2 ${
              isError
                ? "bg-error/10 border-error"
                : "bg-success/10 border-success"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 ${isError ? "bg-error" : "bg-success"}`}
            />
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide ${
                isError ? "text-error" : "text-success"
              }`}
            >
              {isError ? "Error" : "Success"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted font-mono">
            <svg
              className="w-3.5 h-3.5"
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
          <div className="flex items-center gap-1.5 text-muted font-mono">
            <svg
              className="w-3.5 h-3.5"
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
          <div className="flex items-center gap-1.5 text-muted font-mono">
            <svg
              className="w-3.5 h-3.5"
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
            <span>{trace.total_tokens?.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
