"use client";

import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { useAuth } from "@/hooks/useAuth";
import { fetchCostByTag, type CostByTag } from "@/lib/cost-api-client";
import ECharts from "@/components/ECharts";

interface FeaturesTabProps {
  selectedPeriod: number;
  colors: string[];
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
  return { startDate: isoDateOnly(start), endDate: isoDateOnly(end) };
}

export default function FeaturesTab({ selectedPeriod, colors }: FeaturesTabProps) {
  const { session, loading: authLoading } = useAuth();
  const token = session?.access_token ?? null;

  const [costByTag, setCostByTag] = useState<CostByTag[]>([]);
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
        const { startDate, endDate } = getDateRange(selectedPeriod);
        const rows = await fetchCostByTag(startDate, endDate, token);
        setCostByTag(rows);
      } catch (error) {
        console.error("Failed to fetch cost by tag:", error);
        setCostByTag([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod, token, authLoading]);

  const formatCost = (value: number) => `$${value.toFixed(4)}`;

  const totalTagCost = useMemo(
    () => costByTag.reduce((sum, t) => sum + t.total_cost, 0),
    [costByTag]
  );

  const chartOption: EChartsOption = useMemo(() => {
    const top = costByTag.slice(0, 10);
    const categories = top.map((t) => t.tag);
    const values = top.map((t) => t.total_cost);

    return {
      animation: false,
      grid: { left: 190, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "#000" } },
        axisTick: { lineStyle: { color: "#000" } },
        splitLine: { lineStyle: { color: "rgba(0,0,0,0.1)", type: "dashed" } },
        axisLabel: {
          formatter: (v: number) => `$${Number(v).toFixed(2)}`,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 12,
        },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLine: { lineStyle: { color: "#000" } },
        axisTick: { lineStyle: { color: "#000" } },
        axisLabel: { fontFamily: "JetBrains Mono, monospace", fontSize: 12 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        borderColor: "#000",
        borderWidth: 2,
        backgroundColor: "#fff",
        textStyle: { fontFamily: "JetBrains Mono, monospace", color: "#000" },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const label = p?.name ?? "";
          const value = Number(p?.value ?? 0);
          return `${label}<br/>Cost : ${formatCost(value)}`;
        },
      },
      series: [
        {
          type: "bar",
          data: values.map((v, i) => ({
            value: v,
            itemStyle: {
              color: colors[i % colors.length],
              borderColor: "#000",
              borderWidth: 2,
            },
          })),
          barMaxWidth: 34,
        },
      ],
    };
  }, [costByTag, colors]);

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
        Sign in to see feature costs.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              <span className="text-black/40">{`// `}</span>Cost by Feature /
              Endpoint
            </h2>
            <p className="text-sm text-black/60 mt-1">
              Track costs by tagging traces with features like{" "}
              <span className="font-mono">feature:chat</span> or endpoints like{" "}
              <span className="font-mono">/api/generate</span>.
            </p>
          </div>
        </div>

        {costByTag.length > 0 ? (
          <>
            <div className="h-64 mb-6">
              <ECharts option={chartOption} height={256} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-3 px-4 font-semibold">
                      Tag / Feature
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Traces
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      LLM Calls
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Input Tokens
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Output Tokens
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Total Cost
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {costByTag.map((tag, i) => {
                    const pct =
                      totalTagCost > 0 ? (tag.total_cost / totalTagCost) * 100 : 0;
                    return (
                      <tr
                        key={tag.tag}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 border-2 border-black"
                              style={{
                                backgroundColor: colors[i % colors.length],
                              }}
                            />
                            <span className="font-mono text-sm">{tag.tag}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-mono">
                          {tag.trace_count.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 font-mono">
                          {tag.call_count.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 font-mono">
                          {tag.input_tokens.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 font-mono">
                          {tag.output_tokens.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 font-mono font-semibold">
                          {formatCost(tag.total_cost)}
                        </td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 h-2 border border-black overflow-hidden">
                              <div
                                className="h-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: colors[i % colors.length],
                                }}
                              />
                            </div>
                            <span className="font-mono w-12 text-right">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-black/60">
            <p className="font-medium mb-2">No tagged traces found</p>
            <p className="text-sm max-w-md mx-auto">
              Add tags to your traces to track costs by feature.
            </p>
            <pre className="mt-4 bg-gray-100 border-2 border-black p-4 text-left text-xs font-mono max-w-lg mx-auto overflow-x-auto">
{`orbis.start_trace(
  name="my_trace",
  tags=["feature:chat", "env:prod"]
)`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
