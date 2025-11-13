"use client";
import { useRouter, usePathname } from "next/navigation";
import { dummySpans } from "@/lib/dummy";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";

export default function TraceList() {
  const router = useRouter();
  const pathname = usePathname();

  // Get unique trace IDs from dummy data
  const traceIds = Array.from(new Set(dummySpans.map((span) => span.trace_id)));

  // Check if a trace is currently selected
  const selectedTraceId = pathname.match(/\/trace\/(\d+)/)?.[1];

  return (
    <Disclosure defaultOpen={true}>
      {({ open }) => (
        <div
          className={`bg-white border-l border-foreground/10 h-screen flex flex-col transition-all duration-300 ${
            open ? "w-80" : "w-16"
          }`}
        >
          {/* Header bar */}
          <div
            className={`px-4 py-3 border-b border-foreground/10 flex items-center ${
              open ? "justify-between" : "justify-center"
            }`}
          >
            {open && (
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Traces
                </h2>
                <p className="text-xs text-foreground/50 mt-0.5">
                  {traceIds.length} total
                </p>
              </div>
            )}
            <DisclosureButton className="p-2 hover:bg-foreground/5 rounded-lg transition-colors">
              <svg
                className={`w-5 h-5 text-foreground/60 transition-transform ${
                  open ? "" : "rotate-180"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </DisclosureButton>
          </div>

          <DisclosurePanel className="flex-1 overflow-y-auto">
            <div className="divide-y divide-foreground/5">
              {traceIds.map((traceId) => {
                const traceSpans = dummySpans.filter(
                  (s) => s.trace_id === traceId
                );
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
                    className={`w-full px-4 py-3 text-left transition-all hover:bg-babyblue/15 ${
                      isSelected
                        ? "bg-babyblue/25 border-l-[3px] border-mustard"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        #{traceId}
                      </span>
                      {hasErrors && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded">
                          ERROR
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-foreground/50 mb-2">
                      {startTime.toLocaleTimeString()}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-foreground/60">
                      <div className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
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
                        <span>{traceSpans.length}</span>
                      </div>
                      <span className="text-foreground/30">•</span>
                      <span>{totalDuration.toFixed(1)}s</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
}
