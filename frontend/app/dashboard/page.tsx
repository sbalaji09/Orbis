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
                      {agent.agent_name}
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
