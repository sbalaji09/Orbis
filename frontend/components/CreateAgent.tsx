"use client";

import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

export function CreateAgent() {
  const [agentName, setAgentName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    agent_id?: string;
    api_key?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/agent?agent_name=${encodeURIComponent(agentName)}`,
        {
          method: "POST",
          headers: {
            "X-User-ID": DEFAULT_USER_ID,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setResult({ error: data.detail || "Failed to create agent" });
      } else {
        setResult(data);
        setAgentName("");
      }
    } catch (error) {
      setResult({ error: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-foreground/10 overflow-hidden">
      <div className="px-6 py-4 bg-linear-to-br from-babyblue/10 to-babyblue/5 border-b border-foreground/10">
        <h2 className="text-lg font-semibold text-foreground">
          Create New Agent
        </h2>
        <p className="text-sm text-foreground/60 mt-1">
          Generate an API key for a new agent
        </p>
      </div>

      <div className="px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Agent name"
            className="flex-1 px-4 py-2 border border-foreground/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-babyblue/50 focus:border-babyblue"
          />
          <button
            type="submit"
            disabled={isLoading || !agentName.trim()}
            className="px-4 py-2 bg-babyblue text-white rounded-lg text-sm font-medium hover:bg-babyblue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Creating..." : "Create Agent"}
          </button>
        </form>

        {result && (
          <div className="mt-4">
            {result.error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {result.error}
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-2">
                  {result.message}
                </p>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-foreground/50">Agent ID:</span>{" "}
                    <span className="font-mono text-foreground">
                      {result.agent_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground/50">API Key:</span>{" "}
                    <code className="block mt-1 p-2 bg-white border border-foreground/10 rounded text-xs font-mono break-all">
                      {result.api_key}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
