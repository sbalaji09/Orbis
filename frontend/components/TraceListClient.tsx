"use client";

import { useRouter } from "next/navigation";
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
          className={`bg-white border-l border-foreground/10 h-full flex flex-col transition-all duration-300 ${
            open ? "w-80" : "w-16"
          }`}
        >
          {/* Header bar */}
          <div
            className={`px-4 py-3 border-b border-foreground/10 flex items-center shrink-0 ${
              open ? "justify-between" : "justify-center"
            }`}
          >
            {open && (
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Traces
                </h2>
                <p className="text-xs text-foreground/50 mt-0.5">
                  {totalTraces} total
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

          <DisclosurePanel className="flex-1 overflow-y-auto min-h-0">
            <div className="divide-y divide-foreground/5">
              {tracesByAgent.map(({ agent, traces }) => (
                <Disclosure key={agent.agent_id} defaultOpen={true}>
                  {({ open: agentOpen }) => (
                    <div>
                      {/* Agent Header */}
                      <DisclosureButton className="w-full px-4 py-3 bg-babyblue/5 hover:bg-babyblue/10 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <svg
                              className={`w-4 h-4 text-foreground/60 transition-transform ${
                                agentOpen ? "rotate-90" : ""
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
                            <span className="text-sm font-semibold text-foreground">
                              {agent.agent_name}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-mustard/20 text-mustard rounded">
                            {traces.length}
                          </span>
                        </div>
                      </DisclosureButton>

                      {/* Agent Traces */}
                      <DisclosurePanel>
                        <div>
                          {traces.length === 0 ? (
                            <div className="px-4 py-4 text-xs text-foreground/40 text-center">
                              No traces
                            </div>
                          ) : (
                            traces.map((trace) => {
                              const hasErrors = trace.status === "failed";

                              return (
                                <button
                                  key={trace.trace_id}
                                  onClick={() =>
                                    router.push(
                                      `/dashboard/trace/${trace.trace_id}`
                                    )
                                  }
                                  className="w-full px-4 py-3 text-left transition-all hover:bg-babyblue/15"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="font-mono text-sm font-semibold text-foreground">
                                      #{trace.trace_id}
                                    </span>
                                    {hasErrors && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded">
                                        ERROR
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-foreground/50 mb-2">
                                    {new Date(
                                      trace.start_time
                                    ).toLocaleTimeString()}
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
                                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      <span>
                                        {(trace.duration / 1000).toFixed(1)}s
                                      </span>
                                    </div>
                                    <span className="text-foreground/30">
                                      •
                                    </span>
                                    <span>
                                      ${(trace.total_cost || 0).toFixed(4)}
                                    </span>
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
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
}
