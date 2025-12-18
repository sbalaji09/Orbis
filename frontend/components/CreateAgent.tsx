"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function CreateAgent() {
  const router = useRouter();
  const { session } = useAuth();
  const [agentName, setAgentName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
        setAgentName(agentName);
        setShowModal(true);
        setCopied(false);
      }
    } catch (error) {
      setResult({ error: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (result?.api_key) {
      await navigator.clipboard.writeText(result.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setAgentName("");
    // Refresh the page to show the new agent in the list
    router.refresh();
  };

  const truncateKey = (key: string) => {
    if (key.length <= 20) return key;
    return key.substring(0, 20) + "...";
  };

  return (
    <>
      <div className="border-2 border-black overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.15)] bg-background">
        <div className="px-5 py-4 bg-babyblue/10 border-b-2 border-black">
          <h2 className="text-base font-semibold tracking-tight">
            Create New Agent
          </h2>
          <p className="text-xs text-black/60 mt-1">
            {`// Generate an API key for a new agent`}
          </p>
        </div>

        <div className="px-5 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Agent name"
              className="flex-1 px-3 py-2 border-2 border-black text-sm focus:outline-none focus:ring-2 focus:ring-babyblue/50"
            />
            <button
              type="submit"
              disabled={isLoading || !agentName.trim()}
              className="px-4 py-2 bg-black text-mustard border-2 border-black text-sm font-medium hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Creating..." : "Create Agent"}
            </button>
          </form>

          {result?.error && (
            <div className="mt-4 p-3 bg-error/10 border-2 border-error text-sm text-error">
              {result.error}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && result && !result.error && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-background border-2 border-black shadow-[8px_8px_0_rgba(0,0,0,0.3)] max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-success/10 border-b-2 border-black">
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
                <span className="text-xs text-black/60">API Key:</span>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white border-2 border-black text-xs font-mono">
                    {truncateKey(result.api_key || "")}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2 bg-black text-mustard border-2 border-black text-xs font-medium hover:bg-black/90 transition-colors"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <button
                onClick={closeModal}
                className="w-full px-4 py-2 bg-babyblue text-white border-2 border-black text-sm font-medium hover:bg-babyblue/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
