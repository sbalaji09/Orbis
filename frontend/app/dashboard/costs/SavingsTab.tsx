"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchSavingsOpportunities,
  type SavingsOpportunities,
} from "@/lib/cost-api-client";
import { getModelLogo } from "@/lib/model-logos";

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
        Sign in to see savings data.
      </div>
    );
  }

  if (!savingsData) {
    return (
      <div className="text-center py-12 text-black/60">
        No savings data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Potential Savings Summary */}
      <div className="bg-green-50 border-2 border-green-600 shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
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
            <p className="text-2xl font-bold text-green-600 font-mono">
              {formatCost(savingsData.total_potential_savings)}
            </p>
            <div className="text-xs text-green-800/70 font-mono mt-1">
              Last {selectedPeriod} days
            </div>
          </div>
        </div>
      </div>

      {/* Model Cost Analysis */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
        <h2 className="text-lg font-semibold mb-2">
          <span className="text-black/40">{`// `}</span>Cost by Model
        </h2>
        <p className="text-sm text-black/60 mb-4">
          Consider cheaper alternatives for high-volume use cases
        </p>
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
            {savingsData.model_analysis.map((m) => {
              const logo = getModelLogo(m.model);
              return (
                <tr
                  key={m.model}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {logo ? (
                        <img
                          src={logo.src}
                          alt={logo.alt}
                          className="w-4 h-4"
                        />
                      ) : null}
                      <span className="font-mono">{m.model}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 font-mono">
                    {m.call_count.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4 font-mono">
                    {formatCost(m.total_cost)}
                  </td>
                  <td className="text-right py-3 px-4 font-mono">
                    {Math.round(m.avg_tokens).toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4 font-mono">
                    {formatCost(m.avg_cost_per_call)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Verbose Traces */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
        <h2 className="text-lg font-semibold mb-2">
          <span className="text-black/40">{`// `}</span>Verbose Responses
        </h2>
        <p className="text-sm text-black/60 mb-4">
          High output/input ratio - consider prompting for concise responses
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
            {savingsData.verbose_traces.slice(0, 10).map((t) => (
              <tr
                key={t.trace_hash_id}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
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
                <td className="text-right py-3 px-4 font-mono text-warning">
                  {t.output_input_ratio.toFixed(2)}x
                </td>
                <td className="text-right py-3 px-4 font-mono">
                  {formatCost(t.total_cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Repeated Prompts */}
      {savingsData.repeated_prompts.length > 0 && (
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
          <h2 className="text-lg font-semibold mb-2">
            <span className="text-black/40">{`// `}</span>Repeated Prompts
          </h2>
          <p className="text-sm text-black/60 mb-4">
            Cache opportunities - similar prompts sent multiple times
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
              {savingsData.repeated_prompts.slice(0, 10).map((p, i) => {
                const logo = getModelLogo(p.model);
                return (
                  <tr
                    key={`${p.model}:${i}`}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {logo ? (
                          <img
                            src={logo.src}
                            alt={logo.alt}
                            className="w-4 h-4"
                          />
                        ) : null}
                        <span className="font-mono text-xs">{p.model}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-md truncate text-black/60">
                      {p.preview}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      {p.repetition_count}x
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-success">
                      {formatCost(p.potential_savings)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
