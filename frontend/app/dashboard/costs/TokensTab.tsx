"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchTokenBreakdown,
  fetchTokensPerTrace,
  type TokenBreakdown,
  type TokensPerTrace,
} from "@/lib/cost-api-client";

const TokenBreakdownChart = dynamic(
  () => import("@/components/charts/TokenBreakdownChart"),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

interface TokensTabProps {
  selectedPeriod: number;
  formatDate: (dateStr: string) => string;
}

function ChartLoader() {
  return (
    <div className="h-full flex items-center justify-center text-muted">
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
        <span>Loading chart...</span>
      </div>
    </div>
  );
}

export default function TokensTab({
  selectedPeriod,
  formatDate,
}: TokensTabProps) {
  const { session, loading: authLoading } = useAuth();
  const token = session?.access_token ?? null;

  const [tokenBreakdown, setTokenBreakdown] = useState<TokenBreakdown[]>([]);
  const [tokensPerTrace, setTokensPerTrace] = useState<TokensPerTrace[]>([]);
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
        const [tokenData, traceTokens] = await Promise.all([
          fetchTokenBreakdown(selectedPeriod, token),
          fetchTokensPerTrace(selectedPeriod, token),
        ]);
        setTokenBreakdown(tokenData);
        setTokensPerTrace(traceTokens);
      } catch (error) {
        console.error("Failed to fetch token data:", error);
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
        {/* Chart Skeleton */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
          <div className="h-6 w-64 bg-gray-200 animate-pulse mb-4" />
          <div className="h-72 bg-gray-100 animate-pulse" />
        </div>
        {/* Table Skeleton */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
          <div className="h-6 w-48 bg-gray-200 animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Input vs Output Tokens Chart */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
        <h2 className="text-lg font-semibold mb-4">
          Token Breakdown (Input vs Output)
        </h2>
        <div className="h-72">
          {isLoading ? (
            <ChartLoader />
          ) : tokenBreakdown.length > 0 ? (
            <TokenBreakdownChart
              data={tokenBreakdown}
              formatDate={formatDate}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted">
              No token data available
            </div>
          )}
        </div>
      </div>

      {/* Tokens Per Trace Table */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
        <h2 className="text-lg font-semibold mb-4">Tokens by Trace</h2>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b-2 border-black">
                <th className="text-left py-3 px-4 font-semibold">Trace</th>
                <th className="text-left py-3 px-4 font-semibold">Agent</th>
                <th className="text-right py-3 px-4 font-semibold">
                  LLM Calls
                </th>
                <th className="text-right py-3 px-4 font-semibold">Input</th>
                <th className="text-right py-3 px-4 font-semibold">Output</th>
                <th className="text-right py-3 px-4 font-semibold">Total</th>
                <th className="text-right py-3 px-4 font-semibold">Cost</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted">
                    <div className="flex items-center justify-center gap-2">
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
                      <span>Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : tokensPerTrace.length > 0 ? (
                tokensPerTrace.map((trace) => (
                  <tr
                    key={trace.trace_id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-mono text-xs">
                      {trace.trace_hash_id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4">{trace.agent_name}</td>
                    <td className="text-right py-3 px-4 font-mono">
                      {trace.span_count}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      {trace.input_tokens.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      {trace.output_tokens.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      {trace.total_tokens.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      ${trace.total_cost.toFixed(4)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted">
                    No trace data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
