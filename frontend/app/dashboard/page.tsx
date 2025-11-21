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
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            <span className="text-black/40">{`> `}</span>Agent Traces
          </h1>
          <p className="text-sm text-black/60">
            {`// View and analyze traces grouped by agent`}
          </p>
        </div>

        {/* Agent Groups */}
        <div className="space-y-5">
          {tracesByAgent.map(({ agent, traces }) => (
            <div
              key={agent.agent_id}
              className="border-2 border-black overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.15)] bg-background"
            >
              {/* Agent Header */}
              <div className="px-5 py-4 bg-mustard/10 border-b-2 border-black">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold tracking-tight">
                      {agent.agent_name}
                    </h2>
                    {agent.description && (
                      <p className="text-xs text-black/60 mt-1">
                        {`// ${agent.description}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <div className="px-2.5 py-1 bg-black text-mustard border border-black">
                      <span>Traces:</span>{" "}
                      <span className="font-mono font-semibold">
                        {traces.length}
                      </span>
                    </div>
                    <div className="px-2.5 py-1 bg-white border-2 border-black">
                      <span className="text-black/60">ID:</span>{" "}
                      <span className="font-mono text-[10px] text-black/40">
                        {agent.agent_id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Traces List */}
              <div>
                {traces.length === 0 ? (
                  <div className="px-5 py-8 text-center text-black/60 text-sm">
                    {`// No traces found for this agent`}
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
