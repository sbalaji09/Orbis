"use client";

import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { Listbox } from "@headlessui/react";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<
    "cost_desc" | "tokens_desc" | "calls_desc" | "recent"
  >("cost_desc");

  const sortOptions: Array<{
    key: typeof sortKey;
    label: string;
    sublabel: string;
    icon: "cost" | "tokens" | "calls" | "recent";
  }> = [
    {
      key: "cost_desc",
      label: "Cost",
      sublabel: "Highest spend first",
      icon: "cost",
    },
    {
      key: "tokens_desc",
      label: "Tokens",
      sublabel: "Most tokens first",
      icon: "tokens",
    },
    { key: "calls_desc", label: "Calls", sublabel: "Most calls first", icon: "calls" },
    { key: "recent", label: "Recent", sublabel: "Newest traces first", icon: "recent" },
  ];

  const selectedSort =
    sortOptions.find((o) => o.key === sortKey) ?? sortOptions[0]!;

  const SortIcon = ({ kind }: { kind: (typeof sortOptions)[number]["icon"] }) => {
    switch (kind) {
      case "cost":
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 1v22m5-18H9.5a3.5 3.5 0 100 7H14a3.5 3.5 0 110 7H7"
            />
          </svg>
        );
      case "tokens":
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 7h10M7 12h10M7 17h10"
            />
          </svg>
        );
      case "calls":
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"
            />
          </svg>
        );
      case "recent":
      default:
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v5l3 2"
            />
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a9 9 0 11-3.2-6.9"
            />
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 3v6h-6"
            />
          </svg>
        );
    }
  };

  const visibleTraces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered =
      q.length === 0
        ? tokensPerTrace
        : tokensPerTrace.filter((t) => {
            const haystack = `${t.trace_hash_id} ${t.agent_name}`.toLowerCase();
            return haystack.includes(q);
          });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "tokens_desc":
          return b.total_tokens - a.total_tokens;
        case "calls_desc":
          return b.span_count - a.span_count;
        case "recent":
          return (
            new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
          );
        case "cost_desc":
        default:
          return b.total_cost - a.total_cost;
      }
    });

    return sorted;
  }, [tokensPerTrace, searchQuery, sortKey]);

  const maxima = useMemo(() => {
    let maxTokens = 0;
    let maxCost = 0;
    for (const t of visibleTraces) {
      if (t.total_tokens > maxTokens) maxTokens = t.total_tokens;
      if (t.total_cost > maxCost) maxCost = t.total_cost;
    }
    return { maxTokens, maxCost };
  }, [visibleTraces]);

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
            <LegendPill
              label="Input"
              color={CHART_PALETTE.blue}
              value={totals.input}
            />
            <LegendPill
              label="Output"
              color={CHART_PALETTE.orange}
              value={totals.output}
            />
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

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trace or agent…"
              className="w-64 max-w-full px-3 py-2 text-sm border-2 border-black bg-white focus:outline-none"
            />
            <Listbox value={sortKey} onChange={setSortKey}>
              <div className="relative">
                <Listbox.Button className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,0.15)] hover:bg-gray-50 focus:outline-none min-w-56">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 border-2 border-black bg-white grid place-items-center shrink-0">
                      <SortIcon kind={selectedSort.icon} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        Sort: {selectedSort.label}
                      </div>
                      <div className="text-xs text-black/50 truncate">
                        {selectedSort.sublabel}
                      </div>
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Listbox.Button>
                <Listbox.Options className="absolute z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-auto max-h-80 bg-white border-2 border-black shadow-[6px_6px_0_rgba(0,0,0,0.15)]">
                  {sortOptions.map((opt) => (
                    <Listbox.Option
                      key={opt.key}
                      value={opt.key}
                      className="cursor-pointer select-none"
                    >
                      {({ selected }) => (
                        <div
                          className={`relative flex items-center gap-3 px-4 py-3 border-b border-gray-200 last:border-b-0 ${
                            selected ? "bg-babyblue/10" : "bg-white"
                          }`}
                        >
                          <div className="w-9 h-9 border-2 border-black bg-white grid place-items-center shrink-0">
                            <SortIcon kind={opt.icon} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">
                              Sort: {opt.label}
                            </div>
                            <div className="text-xs text-black/50 truncate">
                              {opt.sublabel}
                            </div>
                          </div>
                          {selected ? (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 border-2 border-black bg-black grid place-items-center">
                              <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-5 h-5 text-mustard"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.704 5.29a1 1 0 010 1.415l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2A1 1 0 016.304 9.29l2.493 2.493 6.493-6.493a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>
          <div className="text-xs text-black/60 font-mono">
            Showing {visibleTraces.length.toLocaleString()} traces
          </div>
        </div>

        <div className="overflow-x-auto max-h-[28rem]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
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
              ) : visibleTraces.length > 0 ? (
                visibleTraces.map((trace, idx) => (
                  <tr
                    key={trace.trace_id}
                    className={`border-b border-gray-200 hover:bg-gray-50 ${
                      idx % 2 === 1 ? "bg-gray-50/40" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span title={trace.trace_hash_id}>
                          {trace.trace_hash_id.slice(0, 8)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard
                              .writeText(trace.trace_hash_id)
                              .catch(() => {})
                          }
                          className="px-1.5 py-0.5 border border-black bg-white hover:bg-gray-50 text-[10px]"
                          aria-label="Copy trace id"
                          title="Copy trace id"
                        >
                          Copy
                        </button>
                      </div>
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
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-20 h-2 bg-gray-200 border border-black overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width:
                                maxima.maxTokens > 0
                                  ? `${Math.max(
                                      2,
                                      (trace.total_tokens / maxima.maxTokens) *
                                        100
                                    )}%`
                                  : "0%",
                              backgroundColor: CHART_PALETTE.blue,
                            }}
                          />
                        </div>
                        <div className="text-right font-mono tabular-nums w-[6ch]">
                          {Math.round(trace.total_tokens / 1000)}k
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-20 h-2 bg-gray-200 border border-black overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width:
                                maxima.maxCost > 0
                                  ? `${Math.max(
                                      2,
                                      (trace.total_cost / maxima.maxCost) * 100
                                    )}%`
                                  : "0%",
                              backgroundColor: CHART_PALETTE.orange,
                            }}
                          />
                        </div>
                        <div className="text-right font-mono tabular-nums w-[10ch]">
                          {formatCost(trace.total_cost)}
                        </div>
                      </div>
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
