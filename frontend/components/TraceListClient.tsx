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
          className={`bg-card border-l border-border h-full flex flex-col transition-all duration-300 ${
            open ? "w-80" : "w-14"
          }`}
        >
          {/* Header bar */}
          <div
            className={`px-4 py-3.5 border-b border-border flex items-center shrink-0 bg-babyblue/5 ${
              open ? "justify-between" : "justify-center"
            }`}
          >
            {open && (
              <div>
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Traces
                </h2>
                <p className="text-xs text-muted mt-0.5 font-mono">
                  {totalTraces} total
                </p>
              </div>
            )}
            <DisclosureButton className="p-1.5 hover:bg-foreground/5 rounded-md transition-colors">
              <svg
                className={`w-4 h-4 text-muted transition-transform ${
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
            <div>
              {tracesByAgent.map(({ agent, traces }) => (
                <Disclosure key={agent.agent_id} defaultOpen={true}>
                  {({ open: agentOpen }) => (
                    <div className="border-b border-border">
                      {/* Agent Header */}
                      <DisclosureButton className="w-full px-4 py-2.5 bg-background hover:bg-babyblue/5 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <svg
                              className={`w-3.5 h-3.5 text-muted transition-transform ${
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
                            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                              {agent.agent_name}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-mustard/10 text-mustard rounded-md border border-mustard/20">
                            {traces.length}
                          </span>
                        </div>
                      </DisclosureButton>

                      {/* Agent Traces */}
                      <DisclosurePanel>
                        <div className="bg-card">
                          {traces.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-muted text-center">
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
                                  className="w-full px-4 py-2.5 text-left transition-all hover:bg-babyblue/8 border-b border-border/50 last:border-b-0 group"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="font-mono text-xs font-semibold text-foreground group-hover:text-babyblue transition-colors">
                                      #{trace.trace_id}
                                    </span>
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        hasErrors ? "bg-error" : "bg-success"
                                      }`}
                                    />
                                  </div>
                                  <p className="text-[10px] text-muted mb-1.5 font-mono">
                                    {new Date(
                                      trace.start_time
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px]">
                                    <div className="flex items-center gap-1 text-muted font-mono">
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
                                    <span className="text-border">•</span>
                                    <span className="text-mustard font-mono font-semibold">
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
