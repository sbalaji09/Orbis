"use client";

import { useEffect, useState } from "react";
import type { EChartsOption } from "echarts";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchTokenBreakdown,
  fetchTokensPerTrace,
  type TokenBreakdown,
  type TokensPerTrace,
} from "@/lib/cost-api-client";
import ECharts from "@/components/ECharts";
import { CHART_PALETTE } from "@/lib/echarts-theme";

interface TokensTabProps {
  selectedPeriod: number;
  formatDate: (dateStr: string) => string;
}

export default function TokensTab({ selectedPeriod, formatDate }: TokensTabProps) {
  const { session, loading: authLoading } = useAuth();
  const token = session?.access_token ?? null;

  const formatCost = (value: number) => `$${value.toFixed(4)}`;

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

  const totals = {
    input: tokenBreakdown.reduce((sum, d) => sum + d.input_tokens, 0),
    output: tokenBreakdown.reduce((sum, d) => sum + d.output_tokens, 0),
  };

  const maxStack = tokenBreakdown.reduce((m, d) => {
    const total = d.input_tokens + d.output_tokens;
    return total > m ? total : m;
  }, 0);

  const tokenBreakdownOption: EChartsOption = {
    animation: false,
    grid: { left: 50, right: 20, top: 30, bottom: 30, containLabel: true },
    xAxis: {
      type: "category",
      data: tokenBreakdown.map((d) => formatDate(d.date)),
      boundaryGap: true,
      axisLine: { lineStyle: { color: CHART_PALETTE.grid } },
      axisTick: { show: false },
      axisLabel: {
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 12,
        color: CHART_PALETTE.text,
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: Math.ceil(maxStack * 1.2),
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: CHART_PALETTE.grid } },
      axisLabel: {
        formatter: (v: number) => `${(Number(v) / 1000).toFixed(0)}k`,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 12,
        color: CHART_PALETTE.text,
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      borderColor: CHART_PALETTE.tooltipBorder,
      borderWidth: 1,
      backgroundColor: "#fff",
      extraCssText:
        "box-shadow: 0 12px 24px rgba(0,0,0,0.12); border-radius: 10px;",
      textStyle: { fontFamily: "JetBrains Mono, monospace", color: "#111827" },
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        const label = items[0]?.axisValueLabel ?? "";
        const lines = items
          .map((p: any) => `${p.seriesName}: ${Number(p.value).toLocaleString()}`)
          .join("<br/>");
        return `${label}<br/>${lines}`;
      },
    },
    legend: { show: false },
    series: [
      {
        name: "Input",
        type: "bar",
        stack: "tokens",
        data: tokenBreakdown.map((d) => d.input_tokens),
        itemStyle: { color: CHART_PALETTE.blue, borderRadius: 0 },
        emphasis: { itemStyle: { opacity: 0.9 } },
      },
      {
        name: "Output",
        type: "bar",
        stack: "tokens",
        data: tokenBreakdown.map((d) => d.output_tokens),
        itemStyle: { color: CHART_PALETTE.orange, borderRadius: 0 },
        emphasis: {
          itemStyle: { opacity: 0.9 },
        },
      },
    ],
  };

  const LegendPill = ({
    label,
    color,
    value,
  }: {
    label: string;
    color: string;
    value: number;
  }) => {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-black bg-white shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
        <span
          className="w-2.5 h-2.5 border border-black"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs font-mono text-black/60">
          {value.toLocaleString()}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Token Breakdown Chart */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
        <h2 className="text-lg font-semibold mb-4">
          <span className="text-black/40">{`// `}</span>Token Breakdown (Input vs
          Output)
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-xs text-black/60 font-mono">
            Last {selectedPeriod} days
          </div>
        <div className="flex items-center gap-2">
            <LegendPill label="Input" color={CHART_PALETTE.blue} value={totals.input} />
            <LegendPill label="Output" color={CHART_PALETTE.orange} value={totals.output} />
          </div>
        </div>
        <div className="h-72 w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-black/60">
              Loading...
            </div>
          ) : tokenBreakdown.length > 0 ? (
            <ECharts option={tokenBreakdownOption} height={288} />
          ) : (
            <div className="h-full flex items-center justify-center text-black/60">
              No token data available
            </div>
          )}
        </div>
      </div>

      {/* Tokens Per Trace Table */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
        <h2 className="text-lg font-semibold mb-4">
          <span className="text-black/40">{`// `}</span>Tokens by Trace
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
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
                  <td colSpan={7} className="text-center py-8 text-black/60">
                    Loading...
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
                      {formatCost(trace.total_cost)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-black/60">
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
