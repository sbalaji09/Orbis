"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Plus } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CreateAgentProps {
  onAgentCreated?: (agent: { agent_id: string; agent_name: string }) => void;
}

export function CreateAgent({ onAgentCreated }: CreateAgentProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [agentName, setAgentName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<"form" | "result">("form");
  const [copied, setCopied] = useState(false);
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
      const token = session?.access_token;
      if (!token) {
        setResult({ error: "Not authenticated" });
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/agent?agent_name=${encodeURIComponent(agentName)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setResult({ error: data.detail || "Failed to create agent" });
      } else {
        setResult(data);
        setStep("result");
        setCopied(false);
      }
    } catch (error) {
      setResult({ error: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyConfig = async () => {
    if (!result?.api_key || !result?.agent_id || !session?.user?.id) return;

    const config = `configure(
    api_key="${result.api_key}",
    project_id="${result.agent_id}",
    user_id="${session.user.id}",
    api_url="http://localhost:8080"
)`;
    await navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    // Notify parent component about the new agent
    if (onAgentCreated && result?.agent_id) {
      onAgentCreated({
        agent_id: result.agent_id,
        agent_name: agentName,
      });
    }
    setShowModal(false);
    setAgentName("");
    setResult(null);
    setStep("form");
    // Refresh the page to show the new agent in the list
    router.refresh();
  };

  return (
    <>
      {/* Compact + Button */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center justify-center w-9 h-9 bg-black text-mustard border-2 border-black hover:bg-black/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.15)]"
        title="Create new agent"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-background border-2 border-black shadow-[8px_8px_0_rgba(0,0,0,0.3)] max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Step 1: Form */}
            {step === "form" && (
              <>
                <div className="px-5 py-4 bg-babyblue/10 border-b-2 border-black">
                  <h3 className="text-base font-semibold tracking-tight">
                    Create New Agent
                  </h3>
                  <p className="text-xs text-black/60 mt-1">
                    {`// Generate an API key for a new agent`}
                  </p>
                </div>

                <div className="px-5 py-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs text-black/60">Agent Name</label>
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="Enter agent name"
                        className="w-full mt-1 px-3 py-2 border-2 border-black text-sm focus:outline-none focus:ring-2 focus:ring-babyblue/50"
                        autoFocus
                      />
                    </div>

                    {result?.error && (
                      <div className="p-3 bg-error/10 border-2 border-error text-sm text-error">
                        {result.error}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 px-4 py-2 bg-white text-black border-2 border-black text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || !agentName.trim()}
                        className="flex-1 px-4 py-2 bg-black text-mustard border-2 border-black text-sm font-medium hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? "Creating..." : "Create Agent"}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}

            {/* Step 2: Result */}
            {step === "result" && result && (
              <>
                <div className="px-5 py-4 bg-mustard/10 border-b-2 border-black">
                  <h3 className="text-base font-semibold tracking-tight">
                    Agent Created Successfully
                  </h3>
                  <p className="text-xs text-black/60 mt-1">
                    {`// Save this API key - it cannot be retrieved again`}
                  </p>
                </div>

                <div className="px-5 py-4 space-y-4">
                  <div>
                    <span className="text-xs text-black/60">Agent Name:</span>
                    <div className="font-mono text-sm mt-1">{agentName}</div>
                  </div>

                  <div>
                    <span className="text-xs text-black/60">Agent ID (project_id):</span>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 p-2 bg-white border-2 border-black text-xs font-mono break-all">
                        {result.agent_id}
                      </code>
                      <button
                        onClick={() => handleCopy(result.agent_id || "")}
                        className="px-3 py-2 bg-black text-mustard border-2 border-black text-xs font-medium hover:bg-black/90 transition-colors whitespace-nowrap"
                      >
                        {copied ? "✓" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-black/60">API Key:</span>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 p-2 bg-white border-2 border-black text-xs font-mono break-all">
                        {result.api_key}
                      </code>
                      <button
                        onClick={() => handleCopy(result.api_key || "")}
                        className="px-3 py-2 bg-black text-mustard border-2 border-black text-xs font-medium hover:bg-black/90 transition-colors whitespace-nowrap"
                      >
                        {copied ? "✓" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-black/60">User ID:</span>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 p-2 bg-white border-2 border-black text-xs font-mono break-all">
                        {session?.user?.id}
                      </code>
                      <button
                        onClick={() => handleCopy(session?.user?.id || "")}
                        className="px-3 py-2 bg-black text-mustard border-2 border-black text-xs font-medium hover:bg-black/90 transition-colors whitespace-nowrap"
                      >
                        {copied ? "✓" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="border-t-2 border-black pt-4">
                    <span className="text-xs text-black/60">SDK Configuration:</span>
                    <button
                      onClick={handleCopyConfig}
                      className="w-full mt-2 px-4 py-2 bg-mustard text-black border-2 border-black text-sm font-medium hover:bg-mustard/90 transition-colors"
                    >
                      {copied ? "Copied Configuration!" : "Copy Full Configuration"}
                    </button>
                  </div>

                  <button
                    onClick={closeModal}
                    className="w-full px-4 py-2 bg-babyblue text-white border-2 border-black text-sm font-medium hover:bg-babyblue/90 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
