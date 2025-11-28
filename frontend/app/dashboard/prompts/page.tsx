import { getAgents, getPromptsByAgent } from "@/lib/api-server";
import Link from "next/link";

// Revalidate every 10 seconds
export const revalidate = 10;

export default async function PromptsPage() {
  const agents = await getAgents();

  // Fetch prompts for all agents
  const promptsByAgent = await Promise.all(
    agents.map(async (agent) => ({
      agent,
      prompts: await getPromptsByAgent(agent.agent_id),
    }))
  );

  // Flatten to get all prompts with their agent info
  const allPrompts = promptsByAgent.flatMap(({ agent, prompts }) =>
    prompts.map((prompt) => ({ ...prompt, agentName: agent.agent_name }))
  );

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            <span className="text-black/40">{`> `}</span>Prompt Versioning
          </h1>
          <p className="text-sm text-black/60">
            {`// Manage, compare, and rollback prompt versions`}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
            <div className="text-[10px] font-medium text-black/60 uppercase tracking-wide mb-1">
              Total Prompts
            </div>
            <div className="text-2xl font-mono font-semibold">
              {allPrompts.length}
            </div>
          </div>
          <div className="p-4 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
            <div className="text-[10px] font-medium text-black/60 uppercase tracking-wide mb-1">
              Total Versions
            </div>
            <div className="text-2xl font-mono font-semibold">
              {allPrompts.reduce((acc, p) => acc + (p.versions?.length || 0), 0)}
            </div>
          </div>
          <div className="p-4 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
            <div className="text-[10px] font-medium text-black/60 uppercase tracking-wide mb-1">
              Agents Using Prompts
            </div>
            <div className="text-2xl font-mono font-semibold">
              {promptsByAgent.filter((p) => p.prompts.length > 0).length}
            </div>
          </div>
        </div>

        {/* Prompts by Agent */}
        <div className="space-y-6">
          {promptsByAgent.map(({ agent, prompts }) => (
            <div
              key={agent.agent_id}
              className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)]"
            >
              {/* Agent Header */}
              <div className="px-6 py-4 border-b-2 border-black/10 bg-background">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">{agent.agent_name}</h2>
                    <p className="text-[10px] text-black/40 font-mono mt-0.5">
                      {`// ${agent.agent_id.slice(0, 8)}...`}
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-black/60">
                    {prompts.length} prompt{prompts.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {/* Prompts List */}
              {prompts.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-black/40">
                  No prompts registered for this agent
                </div>
              ) : (
                <div className="divide-y divide-black/5">
                  {prompts.map((prompt) => (
                    <Link
                      key={prompt.name}
                      href={`/dashboard/prompts/${encodeURIComponent(prompt.name)}`}
                      className="block px-6 py-4 hover:bg-babyblue/5 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Prompt Icon */}
                          <div className="w-10 h-10 bg-babyblue/10 border-2 border-babyblue/30 flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-babyblue"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold group-hover:text-babyblue transition-colors">
                              {prompt.name}
                            </h3>
                            <p className="text-[10px] text-black/40 mt-0.5">
                              {prompt.versions?.length || 0} version
                              {(prompt.versions?.length || 0) !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>

                        {/* Version badges */}
                        <div className="flex items-center gap-2">
                          {prompt.versions && prompt.versions.length > 0 && (
                            <span className="px-2 py-1 text-[10px] font-mono font-semibold bg-success/10 text-success border border-success/30">
                              v{Math.max(...prompt.versions.map((v) => v.version_number))} latest
                            </span>
                          )}
                          <svg
                            className="w-4 h-4 text-black/30 group-hover:text-babyblue group-hover:translate-x-0.5 transition-all"
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
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {allPrompts.length === 0 && (
          <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-black/5 border-2 border-black/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-black/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No prompts yet</h3>
            <p className="text-sm text-black/60 max-w-md mx-auto">
              Prompts will appear here once your agents start using the prompt versioning SDK.
              Each prompt is automatically versioned when content changes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
