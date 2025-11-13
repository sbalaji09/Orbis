"use client";
import { useRouter, usePathname } from "next/navigation";
import { dummySpans } from "@/lib/dummy";

export default function TraceList() {
  const router = useRouter();
  const pathname = usePathname();

  // Get unique trace IDs from dummy data
  const traceIds = Array.from(new Set(dummySpans.map((span) => span.trace_id)));

  // Check if a trace is currently selected
  const selectedTraceId = pathname.match(/\/trace\/(\d+)/)?.[1];

  return (
    <div className="w-80 bg-white border-l border-foreground/10 h-screen overflow-y-auto">
      <div className="p-4 border-b border-foreground/10">
        <h2 className="text-lg font-semibold text-foreground">Traces</h2>
        <p className="text-sm text-foreground/60 mt-1">
          {traceIds.length} total traces
        </p>
      </div>

      <div className="divide-y divide-foreground/5">
        {traceIds.map((traceId) => {
          const traceSpans = dummySpans.filter((s) => s.trace_id === traceId);
          const isSelected = selectedTraceId === String(traceId);
          const startTime = new Date(
            Math.min(...traceSpans.map((s) => s.start_time.getTime()))
          );
          const totalDuration = traceSpans.reduce(
            (sum, s) => sum + (s.duration || 0),
            0
          );
          const hasErrors = traceSpans.some((s) => s.status === "failed");

          return (
            <button
              key={traceId}
              onClick={() => router.push(`/dashboard/trace/${traceId}`)}
              className={`w-full p-4 text-left transition-colors hover:bg-babyblue/20 ${
                isSelected ? "bg-babyblue/30 border-l-4 border-mustard" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground">
                      #{traceId}
                    </span>
                    {hasErrors && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                        Error
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/60 mt-1">
                    {startTime.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-foreground/70">
                    <span>{traceSpans.length} spans</span>
                    <span>•</span>
                    <span>{totalDuration.toFixed(2)}s</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
