import { getAgents, getTraces } from "@/lib/api-server";
import { AgentGroup } from "@/components/AgentGroup";
import { CreateAgent } from "@/components/CreateAgent";

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

        {/* Create Agent */}
        <div className="mb-6">
          <CreateAgent />
        </div>

        {/* Agent Groups */}
        <div className="space-y-5">
          {tracesByAgent.map(({ agent, traces }) => (
            <AgentGroup
              key={agent.agent_id}
              agent={agent}
              traces={traces}
              defaultOpen={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
