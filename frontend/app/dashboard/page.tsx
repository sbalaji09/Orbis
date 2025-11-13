"use client";
import { useRouter } from "next/navigation";
import { dummyAgents, dummyTraces } from "@/lib/dummy";

export default function Dashboard() {
  const router = useRouter();

  // Group traces by agent
  const tracesByAgent = dummyAgents.map((agent) => ({
    agent,
    traces: dummyTraces.filter((trace) => trace.agent_id === agent.agent_id),
  }));

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Agent Traces
          </h1>
          <p className="text-foreground/60">
            View and analyze traces grouped by agent
          </p>
        </div>

        {/* Agent Groups */}
        <div className="space-y-6">
          {tracesByAgent.map(({ agent, traces }) => (
            <div
              key={agent.agent_id}
              className="bg-white rounded-lg border border-foreground/10 overflow-hidden"
            >
              {/* Agent Header */}
              <div className="px-6 py-4 bg-linear-to-br from-babyblue/10 to-babyblue/5 border-b border-foreground/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {agent.name}
                    </h2>
                    {agent.description && (
                      <p className="text-sm text-foreground/60 mt-1">
                        {agent.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="px-3 py-1 bg-white rounded-full border border-foreground/10">
                      <span className="text-foreground/50">Traces:</span>{" "}
                      <span className="font-mono font-semibold text-foreground">
                        {traces.length}
                      </span>
                    </div>
                    <div className="px-3 py-1 bg-white rounded-full border border-foreground/10">
                      <span className="text-foreground/50">ID:</span>{" "}
                      <span className="font-mono text-xs text-foreground/70">
                        {agent.agent_id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Traces List */}
              <div className="divide-y divide-foreground/5">
                {traces.length === 0 ? (
                  <div className="px-6 py-8 text-center text-foreground/40 text-sm">
                    No traces found for this agent
                  </div>
                ) : (
                  traces.map((trace) => {
                    const hasErrors = trace.status === "failed";
                    return (
                      <button
                        key={trace.trace_id}
                        onClick={() =>
                          router.push(`/dashboard/trace/${trace.trace_id}`)
                        }
                        className="w-full px-6 py-4 text-left transition-all hover:bg-babyblue/15 group"
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Left: ID and Status */}
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-base font-semibold text-foreground">
                              #{trace.trace_id}
                            </span>
                            {hasErrors && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded">
                                ERROR
                              </span>
                            )}
                            {!hasErrors && (
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
                              <span>{trace.duration.toFixed(1)}s</span>
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
                              <span className="font-mono">
                                {trace.total_tokens || 0}
                              </span>
                            </div>
                            <div className="text-xs text-foreground/40">
                              {trace.start_time.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
