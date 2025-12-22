"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { CostTrend, CostByAgent, CostByModel } from "@/lib/cost-api-client";

// Dynamically import chart components with loading states
const CostTrendChart = dynamic(
  () => import("@/components/charts/CostTrendChart"),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

const CostByAgentChart = dynamic(
  () => import("@/components/charts/CostByAgentChart"),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

const CostByModelChart = dynamic(
  () => import("@/components/charts/CostByModelChart"),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

interface OverviewTabProps {
  trends: CostTrend[];
  byAgent: CostByAgent[];
  byModel: CostByModel[];
  isLoading: boolean;
  selectedPeriod: number;
  formatCost: (value: number) => string;
  formatCostShort: (value: number) => string;
  formatDate: (dateStr: string) => string;
  colors: string[];
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

export default function OverviewTab({
  trends,
  byAgent,
  byModel,
  isLoading,
  selectedPeriod,
  formatCost,
  formatCostShort,
  formatDate,
  colors,
}: OverviewTabProps) {
  // Calculate summary metrics
  const metrics = useMemo(() => {
    const totalCost = trends.reduce((sum, d) => sum + d.total_cost, 0);
    const totalCalls = trends.reduce((sum, d) => sum + d.call_count, 0);
    const avgCostPerDay = trends.length > 0 ? totalCost / trends.length : 0;

    const midpoint = Math.floor(trends.length / 2);
    const recentDays = trends.slice(midpoint);
    const previousDays = trends.slice(0, midpoint);
    const recentTotal = recentDays.reduce((sum, d) => sum + d.total_cost, 0);
    const previousTotal = previousDays.reduce(
      (sum, d) => sum + d.total_cost,
      0
    );
    const trendPct =
      previousTotal > 0
        ? ((recentTotal - previousTotal) / previousTotal) * 100
        : 0;

    const comparisonDays = Math.floor(selectedPeriod / 2);

    return {
      totalCost,
      totalCalls,
      avgCostPerDay,
      trendPct,
      comparisonDays,
    };
  }, [trends, selectedPeriod]);

  return (
    <>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total Cost */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-muted"
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
            <span className="text-xs font-medium text-muted uppercase tracking-wide">
              Total Cost
            </span>
          </div>
          <div className="text-2xl font-bold font-mono">
            {formatCostShort(metrics.totalCost)}
          </div>
          <div className="text-xs text-muted mt-1">
            Last {selectedPeriod} days
          </div>
        </div>

        {/* Total Calls */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-xs font-medium text-muted uppercase tracking-wide">
              LLM Calls
            </span>
          </div>
          <div className="text-2xl font-bold font-mono">
            {metrics.totalCalls.toLocaleString()}
          </div>
          <div className="text-xs text-muted mt-1">
            Last {selectedPeriod} days
          </div>
        </div>

        {/* Avg Cost/Day */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-xs font-medium text-muted uppercase tracking-wide">
              Avg/Day
            </span>
          </div>
          <div className="text-2xl font-bold font-mono">
            {formatCostShort(metrics.avgCostPerDay)}
          </div>
          <div className="text-xs text-muted mt-1">Daily average</div>
        </div>

        {/* Trend */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span className="text-xs font-medium text-muted uppercase tracking-wide">
              Trend
            </span>
          </div>
          <div
            className={`text-2xl font-bold font-mono ${
              metrics.trendPct >= 0 ? "text-error" : "text-success"
            }`}
          >
            {metrics.trendPct >= 0 ? "+" : ""}
            {metrics.trendPct.toFixed(1)}%
          </div>
          <div className="text-xs text-muted mt-1">
            vs previous {metrics.comparisonDays}D
          </div>
        </div>
      </div>

      {/* Charts Row 1: Cost Trend */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Cost Over Time</h2>
        <div className="h-72">
          <CostTrendChart
            data={trends}
            isLoading={isLoading}
            formatCost={formatCost}
            formatDate={formatDate}
          />
        </div>
      </div>

      {/* Charts Row 2: By Agent and By Model */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Agent */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
          <h2 className="text-lg font-semibold mb-4">Cost by Agent</h2>
          <div className="h-64">
            <CostByAgentChart
              data={byAgent}
              isLoading={isLoading}
              formatCost={formatCost}
            />
          </div>
        </div>

        {/* Cost by Model */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
          <h2 className="text-lg font-semibold mb-4">Cost by Model</h2>
          <div className="h-64">
            <CostByModelChart
              data={byModel}
              isLoading={isLoading}
              formatCost={formatCost}
              colors={colors}
            />
          </div>
        </div>
      </div>

      {/* Cost Breakdown Table */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Cost Breakdown by Model</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-3 px-4 font-semibold">Model</th>
                <th className="text-right py-3 px-4 font-semibold">
                  Total Cost
                </th>
                <th className="text-right py-3 px-4 font-semibold">Calls</th>
                <th className="text-right py-3 px-4 font-semibold">Avg/Call</th>
                <th className="text-right py-3 px-4 font-semibold">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody>
              {byModel.length > 0 ? (
                byModel.map((row, i) => {
                  const totalCost = byModel.reduce(
                    (sum, r) => sum + r.total_cost,
                    0
                  );
                  const pct =
                    totalCost > 0 ? (row.total_cost / totalCost) * 100 : 0;
                  const avgPerCall =
                    row.call_count > 0 ? row.total_cost / row.call_count : 0;

                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-mono">{row.model}</td>
                      <td className="text-right py-3 px-4 font-mono">
                        {formatCost(row.total_cost)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono">
                        {row.call_count.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4 font-mono">
                        {formatCost(avgPerCall)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono">
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex-1 bg-gray-200 h-2 max-w-[100px]">
                            <div
                              className="bg-babyblue h-2"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span>{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted">
                    {isLoading ? "Loading..." : "No data available"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
