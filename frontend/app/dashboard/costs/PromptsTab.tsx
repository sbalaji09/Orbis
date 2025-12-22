"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchPromptLengthAnalysis,
  type PromptLengthAnalysis,
} from "@/lib/cost-api-client";
import { getModelLogo } from "@/lib/model-logos";

interface PromptsTabProps {
  selectedPeriod: number;
}

export default function PromptsTab({ selectedPeriod }: PromptsTabProps) {
  const { session, loading: authLoading } = useAuth();
  const token = session?.access_token ?? null;

  const [data, setData] = useState<PromptLengthAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await fetchPromptLengthAnalysis(selectedPeriod, token);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch prompt analysis:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod, token, authLoading]);

  const formatTokens = (value: number) => value.toLocaleString();
  const formatCost = (value: number) => `$${value.toFixed(4)}`;

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-black/60">
        Loading...
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center py-12 text-black/60">
        Sign in to see prompt analysis.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-black/60">
        No prompt data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
          <div className="text-xs font-medium text-black/60 uppercase tracking-wide mb-2">
            Total Input Tokens
          </div>
          <div className="text-2xl font-bold font-mono">
            {formatTokens(data.summary.total_input_tokens)}
          </div>
        </div>
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
          <div className="text-xs font-medium text-black/60 uppercase tracking-wide mb-2">
            Avg Tokens/Call
          </div>
          <div className="text-2xl font-bold font-mono">
            {formatTokens(Math.round(data.summary.avg_tokens_per_call))}
          </div>
        </div>
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
          <div className="text-xs font-medium text-black/60 uppercase tracking-wide mb-2">
            Models Analyzed
          </div>
          <div className="text-2xl font-bold font-mono">
            {data.summary.models_analyzed}
          </div>
        </div>
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
          <div className="text-xs font-medium text-black/60 uppercase tracking-wide mb-2">
            Versioned Prompts
          </div>
          <div className="text-2xl font-bold font-mono">
            {data.summary.prompts_with_versions}
          </div>
        </div>
      </div>

      {/* Token Distribution by Model */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
        <h2 className="text-lg font-semibold mb-2">
          <span className="text-black/40">{`// `}</span>Input Token Distribution by Model
        </h2>
        <p className="text-sm text-black/60 mb-4">
          See which models receive the longest prompts
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-3 px-4 font-semibold">Model</th>
                <th className="text-right py-3 px-4 font-semibold">Calls</th>
                <th className="text-right py-3 px-4 font-semibold">Avg Tokens</th>
                <th className="text-right py-3 px-4 font-semibold">Median</th>
                <th className="text-right py-3 px-4 font-semibold">P90</th>
                <th className="text-right py-3 px-4 font-semibold">Max</th>
                <th className="text-right py-3 px-4 font-semibold">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.model_stats.map((m) => {
                const logo = getModelLogo(m.model);
                const isHighAvg = m.avg_input_tokens > 2000;
                return (
                  <tr
                    key={m.model}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {logo && (
                          <img src={logo.src} alt={logo.alt} className="w-4 h-4" />
                        )}
                        <span className="font-mono">{m.model}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      {m.call_count.toLocaleString()}
                    </td>
                    <td className={`text-right py-3 px-4 font-mono ${isHighAvg ? 'text-warning font-semibold' : ''}`}>
                      {formatTokens(Math.round(m.avg_input_tokens))}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      {formatTokens(Math.round(m.median_input_tokens))}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      {formatTokens(Math.round(m.p90_input_tokens))}
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-error">
                      {formatTokens(m.max_input_tokens)}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      {formatCost(m.total_cost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Longest Prompts */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
        <h2 className="text-lg font-semibold mb-2">
          <span className="text-black/40">{`// `}</span>Longest Prompts
        </h2>
        <p className="text-sm text-black/60 mb-4">
          These calls have the most input tokens - consider trimming context
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-3 px-4 font-semibold">Trace</th>
                <th className="text-left py-3 px-4 font-semibold">Agent</th>
                <th className="text-left py-3 px-4 font-semibold">Model</th>
                <th className="text-right py-3 px-4 font-semibold">Input</th>
                <th className="text-right py-3 px-4 font-semibold">Output</th>
                <th className="text-right py-3 px-4 font-semibold">Cost</th>
                <th className="text-left py-3 px-4 font-semibold">Preview</th>
              </tr>
            </thead>
            <tbody>
              {data.long_prompts.slice(0, 10).map((p, i) => (
                <tr
                  key={`${p.trace_hash_id}-${i}`}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 font-mono text-xs">
                    {p.trace_hash_id.slice(0, 8)}
                  </td>
                  <td className="py-3 px-4">{p.agent_name}</td>
                  <td className="py-3 px-4 font-mono text-xs">{p.model}</td>
                  <td className="text-right py-3 px-4 font-mono text-error font-semibold">
                    {formatTokens(p.input_tokens)}
                  </td>
                  <td className="text-right py-3 px-4 font-mono">
                    {formatTokens(p.output_tokens)}
                  </td>
                  <td className="text-right py-3 px-4 font-mono">
                    {formatCost(p.cost)}
                  </td>
                  <td className="py-3 px-4 text-xs text-black/60 max-w-xs truncate">
                    {p.preview}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Potential System Prompt Bloat */}
      {data.system_prompts.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-500 shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
          <h2 className="text-lg font-semibold mb-2 text-amber-800">
            <span className="text-amber-800/40">{`// `}</span>Potential System Prompt Bloat
          </h2>
          <p className="text-sm text-amber-700 mb-4">
            These high-token prompts appear multiple times - consider trimming or caching
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-amber-600">
                  <th className="text-left py-3 px-4 font-semibold text-amber-800">Model</th>
                  <th className="text-left py-3 px-4 font-semibold text-amber-800">Prompt Start</th>
                  <th className="text-right py-3 px-4 font-semibold text-amber-800">Times Used</th>
                  <th className="text-right py-3 px-4 font-semibold text-amber-800">Avg Tokens</th>
                  <th className="text-right py-3 px-4 font-semibold text-amber-800">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.system_prompts.map((s, i) => (
                  <tr
                    key={i}
                    className="border-b border-amber-200 hover:bg-amber-100/50"
                  >
                    <td className="py-3 px-4 font-mono text-xs">{s.model}</td>
                    <td className="py-3 px-4 text-xs text-amber-900 max-w-md truncate">
                      {s.preview}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">{s.occurrence_count}x</td>
                    <td className="text-right py-3 px-4 font-mono text-amber-700 font-semibold">
                      {formatTokens(Math.round(s.avg_tokens))}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      {formatCost(s.total_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prompt Version Comparison */}
      {Object.keys(data.prompt_versions).length > 0 && (
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
          <h2 className="text-lg font-semibold mb-2">
            <span className="text-black/40">{`// `}</span>Prompt Version Comparison
          </h2>
          <p className="text-sm text-black/60 mb-4">
            Compare token usage across different versions of your prompts
          </p>
          <div className="space-y-6">
            {Object.entries(data.prompt_versions).map(([promptName, versions]) => (
              <div key={promptName} className="border border-gray-200 rounded p-4">
                <h3 className="font-semibold mb-3 font-mono">{promptName}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium">Version</th>
                      <th className="text-right py-2 px-3 font-medium">Uses</th>
                      <th className="text-right py-2 px-3 font-medium">Avg Input</th>
                      <th className="text-right py-2 px-3 font-medium">Avg Output</th>
                      <th className="text-right py-2 px-3 font-medium">Avg Cost</th>
                      <th className="text-right py-2 px-3 font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((v, idx) => {
                      const prevVersion = versions[idx + 1];
                      const tokenChange = prevVersion
                        ? ((v.avg_input_tokens - prevVersion.avg_input_tokens) / prevVersion.avg_input_tokens) * 100
                        : 0;
                      return (
                        <tr key={v.version} className="border-b border-gray-100">
                          <td className="py-2 px-3 font-mono">{v.version}</td>
                          <td className="text-right py-2 px-3 font-mono">{v.usage_count}</td>
                          <td className="text-right py-2 px-3 font-mono">
                            {formatTokens(Math.round(v.avg_input_tokens))}
                          </td>
                          <td className="text-right py-2 px-3 font-mono">
                            {formatTokens(Math.round(v.avg_output_tokens))}
                          </td>
                          <td className="text-right py-2 px-3 font-mono">
                            {formatCost(v.avg_cost)}
                          </td>
                          <td className={`text-right py-2 px-3 font-mono ${
                            tokenChange > 0 ? 'text-error' : tokenChange < 0 ? 'text-success' : ''
                          }`}>
                            {prevVersion ? (
                              `${tokenChange > 0 ? '+' : ''}${tokenChange.toFixed(1)}%`
                            ) : (
                              <span className="text-black/40">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}