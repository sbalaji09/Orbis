"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchSavingsOpportunities,
  type SavingsOpportunities,
} from "@/lib/cost-api-client";

interface SavingsTabProps {
  selectedPeriod: number;
}

export default function SavingsTab({ selectedPeriod }: SavingsTabProps) {
  const { session, loading: authLoading } = useAuth();
  const token = session?.access_token ?? null;

  const [savingsData, setSavingsData] = useState<SavingsOpportunities | null>(
    null
  );
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
        const savings = await fetchSavingsOpportunities(selectedPeriod, token);
        setSavingsData(savings);
      } catch (error) {
        console.error("Failed to fetch savings data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod, token, authLoading]);

  // Show skeleton while auth is loading
  if (authLoading) {
    return (
      <div className="space-y-6">
        {/* Summary Card Skeleton */}
        <div className="bg-green-50 border-2 border-green-600 p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-200 animate-pulse rounded" />
            <div>
              <div className="h-5 w-32 bg-green-200 animate-pulse mb-2" />
              <div className="h-8 w-24 bg-green-200 animate-pulse" />
            </div>
          </div>
        </div>
        {/* Table Skeletons */}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6"
          >
            <div className="h-6 w-64 bg-gray-200 animate-pulse mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-12 bg-gray-100 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading savings data...</span>
        </div>
      </div>
    );
  }

  if (!savingsData) {
    return (
      <div className="text-center py-12 text-muted">
        No savings data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Potential Savings Summary Card */}
      <div className="bg-green-50 border-2 border-green-600 p-6">
        <div className="flex items-center gap-3">
          <svg
            className="w-8 h-8 text-green-600"
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
          <div>
            <h2 className="text-lg font-semibold text-green-800">
              Potential Savings
            </h2>
            <p className="text-2xl font-bold text-green-600">
              ${savingsData.total_potential_savings.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Model Cost Analysis */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
        <h2 className="text-lg font-semibold mb-4">
          Cost by Model (Consider Cheaper Alternatives)
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-3 px-4 font-semibold">Model</th>
              <th className="text-right py-3 px-4 font-semibold">Calls</th>
              <th className="text-right py-3 px-4 font-semibold">Total Cost</th>
              <th className="text-right py-3 px-4 font-semibold">Avg Tokens</th>
              <th className="text-right py-3 px-4 font-semibold">
                Avg Cost/Call
              </th>
            </tr>
          </thead>
          <tbody>
            {savingsData.model_analysis.map((m) => (
              <tr key={m.model} className="border-b border-gray-200">
                <td className="py-3 px-4 font-mono">{m.model}</td>
                <td className="text-right py-3 px-4 font-mono">
                  {m.call_count.toLocaleString()}
                </td>
                <td className="text-right py-3 px-4 font-mono">
                  ${m.total_cost.toFixed(4)}
                </td>
                <td className="text-right py-3 px-4 font-mono">
                  {Math.round(m.avg_tokens).toLocaleString()}
                </td>
                <td className="text-right py-3 px-4 font-mono">
                  ${m.avg_cost_per_call.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Verbose Traces */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
        <h2 className="text-lg font-semibold mb-2">
          Verbose Responses (High Output/Input Ratio)
        </h2>
        <p className="text-sm text-muted mb-4">
          Traces where output tokens significantly exceed input - consider
          prompting for concise responses.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-3 px-4 font-semibold">Trace</th>
              <th className="text-left py-3 px-4 font-semibold">Agent</th>
              <th className="text-right py-3 px-4 font-semibold">Input</th>
              <th className="text-right py-3 px-4 font-semibold">Output</th>
              <th className="text-right py-3 px-4 font-semibold">Ratio</th>
              <th className="text-right py-3 px-4 font-semibold">Cost</th>
            </tr>
          </thead>
          <tbody>
            {savingsData.verbose_traces.slice(0, 5).map((t) => (
              <tr key={t.trace_hash_id} className="border-b border-gray-200">
                <td className="py-3 px-4 font-mono text-xs">
                  {t.trace_hash_id.slice(0, 8)}
                </td>
                <td className="py-3 px-4">{t.agent_name}</td>
                <td className="text-right py-3 px-4 font-mono">
                  {t.input_tokens.toLocaleString()}
                </td>
                <td className="text-right py-3 px-4 font-mono">
                  {t.output_tokens.toLocaleString()}
                </td>
                <td className="text-right py-3 px-4 font-mono">
                  {t.output_input_ratio.toFixed(2)}x
                </td>
                <td className="text-right py-3 px-4 font-mono">
                  ${t.total_cost.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Repeated Prompts (Caching Opportunities) */}
      {savingsData.repeated_prompts.length > 0 && (
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
          <h2 className="text-lg font-semibold mb-2">
            Repeated Prompts (Cache Opportunities)
          </h2>
          <p className="text-sm text-muted mb-4">
            Similar prompts sent multiple times - consider implementing prompt
            caching.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-3 px-4 font-semibold">Model</th>
                <th className="text-left py-3 px-4 font-semibold">
                  Prompt Preview
                </th>
                <th className="text-right py-3 px-4 font-semibold">
                  Repetitions
                </th>
                <th className="text-right py-3 px-4 font-semibold">
                  Potential Savings
                </th>
              </tr>
            </thead>
            <tbody>
              {savingsData.repeated_prompts.slice(0, 5).map((p, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-3 px-4 font-mono">{p.model}</td>
                  <td className="py-3 px-4 max-w-md truncate">{p.preview}</td>
                  <td className="text-right py-3 px-4 font-mono">
                    {p.repetition_count}
                  </td>
                  <td className="text-right py-3 px-4 font-mono">
                    ${p.potential_savings.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
