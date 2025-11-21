"use client";

import { useRouter, usePathname } from "next/navigation";
import { Agent, Trace } from "@/lib/types";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";

export function TraceListClient({
  agents,
  traces,
}: {
  agents: Agent[];
  traces: Trace[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Group traces by agent
  const tracesByAgent = agents.map((agent) => ({
    agent,
    traces: traces.filter((trace) => trace.agent_id === agent.agent_id),
  }));

  const totalTraces = traces.length;

  return (
    <Disclosure defaultOpen={true}>
      {({ open }) => (
        <div
          className="bg-white border-l-2 border-black h-full flex flex-col overflow-hidden relative"
          style={{
            width: open ? "320px" : "56px",
            transition: "width 300ms ease-in-out",
          }}
        >
          {/* Header bar - terminal style */}
          <div
            className="shrink-0 bg-[#F5F3F0] border-b-2 border-black relative"
            style={{ height: "60px" }}
          >
            {/* Arrow button - absolute positioned */}
            <div
              className="absolute z-10"
              style={{
                top: "50%",
                right: "12px",
                transform: "translateY(-50%)",
              }}
            >
              <DisclosureButton className="p-1.5 hover:bg-black/10 transition-colors rounded">
                <svg
                  className={`w-4 h-4 text-black transition-transform duration-300 ${
                    open ? "" : "rotate-180"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </DisclosureButton>
            </div>

            {/* Text content - fixed positioning */}
            <div
              className="absolute"
              style={{
                top: "50%",
                left: "16px",
                transform: "translateY(-50%)",
                width: "240px",
                opacity: open ? 1 : 0,
                visibility: open ? "visible" : "hidden",
                transition: "opacity 250ms ease-in-out, visibility 250ms",
              }}
            >
              <h2
                className="text-sm font-bold text-black uppercase tracking-wide"
                style={{ width: "100px" }}
              >
                {`// TRACES`}
              </h2>
              <p
                className="text-[10px] text-black/50 mt-0.5 font-mono font-semibold"
                style={{ width: "80px" }}
              >
                {totalTraces} active
              </p>
            </div>
          </div>

          <div
            className="flex-1 min-h-0 overflow-hidden"
            style={{
              opacity: open ? 1 : 0,
              transition: "opacity 300ms ease-in-out",
              pointerEvents: open ? "auto" : "none",
            }}
          >
            <div className="h-full overflow-y-auto overflow-x-hidden">
              {tracesByAgent.map(({ agent, traces }) => (
                <Disclosure key={agent.agent_id} defaultOpen={true}>
                  {({ open: agentOpen }) => (
                    <div className="border-b-2 border-black">
                      {/* Agent Header */}
                      <DisclosureButton className="w-full px-4 py-3 bg-white hover:bg-[#5B5FFF]/5 transition-colors border-b-2 border-black/10">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <svg
                              className={`w-3 h-3 text-black/60 transition-transform ${
                                agentOpen ? "rotate-90" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                            <span className="text-xs font-bold text-black tracking-tight">
                              {agent.agent_name}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-black/10 text-black border border-black/20">
                            {traces.length}
                          </span>
                        </div>
                      </DisclosureButton>

                      {/* Agent Traces */}
                      <DisclosurePanel>
                        <div className="bg-white">
                          {traces.length === 0 ? (
                            <div className="px-4 py-4 text-xs text-black/40 text-center font-mono">
                              {`// no traces found`}
                            </div>
                          ) : (
                            traces.map((trace) => {
                              const hasErrors = trace.status === "failed";
                              const isActive =
                                pathname ===
                                `/dashboard/trace/${trace.trace_id}`;

                              return (
                                <button
                                  key={trace.trace_id}
                                  onClick={() =>
                                    router.push(
                                      `/dashboard/trace/${trace.trace_id}`
                                    )
                                  }
                                  className={`w-full py-3 text-left transition-all border-b border-black/10 last:border-b-0 group relative ${
                                    isActive
                                      ? "bg-[#5B5FFF]/10 border-l-[3px] border-l-black shadow-[inset_3px_0_0_0_rgba(0,0,0,0.1)] pl-[13px] pr-4"
                                      : "hover:bg-[#5B5FFF]/5 hover:border-l-4 hover:border-l-[#5B5FFF] pl-4 pr-4"
                                  }`}
                                >
                                  {/* Trace ID and Status */}
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span
                                      className={`font-mono text-xs font-bold transition-colors ${
                                        isActive
                                          ? "text-black"
                                          : "text-black/80 group-hover:text-[#5B5FFF]"
                                      }`}
                                    >
                                      #{trace.trace_id}
                                    </span>
                                    <div
                                      className={`flex items-center gap-1 px-1.5 py-0.5 border ${
                                        hasErrors
                                          ? "bg-red-50 border-red-500"
                                          : "bg-emerald-50 border-emerald-500"
                                      }`}
                                    >
                                      <div
                                        className={`w-1 h-1 ${
                                          hasErrors
                                            ? "bg-red-500"
                                            : "bg-emerald-500"
                                        }`}
                                      />
                                      <span
                                        className={`text-[8px] font-bold uppercase tracking-wide ${
                                          hasErrors
                                            ? "text-red-600"
                                            : "text-emerald-600"
                                        }`}
                                      >
                                        {hasErrors ? "err" : "ok"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Timestamp */}
                                  <p
                                    className={`text-[10px] mb-2 font-mono ${
                                      isActive
                                        ? "text-black/50"
                                        : "text-black/40"
                                    }`}
                                  >
                                    {`// ${new Date(
                                      trace.start_time + "Z"
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })} ${new Date(
                                      trace.start_time + "Z"
                                    ).toLocaleDateString([], {
                                      month: "2-digit",
                                      day: "2-digit",
                                    })}`}
                                  </p>

                                  {/* Metrics */}
                                  <div
                                    className={`flex items-center gap-3 text-[10px] pt-2 ${
                                      isActive
                                        ? "border-t border-black/20"
                                        : "border-t border-black/5"
                                    }`}
                                  >
                                    <div
                                      className={`flex items-center gap-1 ${
                                        isActive
                                          ? "text-black/70"
                                          : "text-black/60"
                                      }`}
                                    >
                                      <svg
                                        className="w-3 h-3 opacity-50"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      <span className="font-mono font-bold">
                                        {(trace.duration / 1000).toFixed(1)}s
                                      </span>
                                    </div>
                                    <span className="text-black/20">•</span>
                                    <div
                                      className={`flex items-center gap-1 ml-auto ${
                                        isActive
                                          ? "text-black/70"
                                          : "text-black/60"
                                      }`}
                                    >
                                      <svg
                                        className="w-3 h-3 opacity-50"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      <span className="font-mono font-bold">
                                        ${(trace.total_cost || 0).toFixed(4)}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </DisclosurePanel>
                    </div>
                  )}
                </Disclosure>
              ))}
            </div>
          </div>
        </div>
      )}
    </Disclosure>
  );
}
