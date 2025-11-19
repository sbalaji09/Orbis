import { getAgents, getTraces } from "@/lib/api-server";
import { TraceRow } from "@/components/TraceRow";

// Revalidate every 10 seconds
export const revalidate = 10;

export default async function Dashboard() {
  // Fetch data on server
  const [agents, traces] = await Promise.all([getAgents(), getTraces()]);

  // Group traces by agent
  const tracesByAgent = agents.map((agent) => ({
    agent,
    traces: traces.filter((trace) => trace.agent_id === agent.agent_id),
  }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Agent Traces
          </h1>
          <p className="text-sm text-muted">
            View and analyze traces grouped by agent
          </p>
        </div>

        {/* Agent Groups */}
        <div className="space-y-5">
          {tracesByAgent.map(({ agent, traces }) => (
            <div
              key={agent.agent_id}
              className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
            >
              {/* Agent Header */}
              <div className="px-5 py-4 bg-linear-to-r from-babyblue-light/40 to-transparent border-b border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-foreground">
                      {agent.agent_name}
                    </h2>
                    {agent.description && (
                      <p className="text-xs text-slate/80 mt-1">
                        {agent.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <div className="px-2.5 py-1 bg-background rounded-lg border border-border">
                      <span className="text-muted">Traces:</span>{" "}
                      <span className="font-mono font-semibold text-foreground">
                        {traces.length}
                      </span>
                    </div>
                    <div className="px-2.5 py-1 bg-background rounded-lg border border-border">
                      <span className="text-muted">ID:</span>{" "}
                      <span className="font-mono text-[10px] text-muted">
                        {agent.agent_id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Traces List */}
              <div>
                {traces.length === 0 ? (
                  <div className="px-5 py-8 text-center text-muted text-sm">
                    No traces found for this agent
                  </div>
                ) : (
                  traces.map((trace) => (
                    <TraceRow key={trace.trace_id} trace={trace} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
