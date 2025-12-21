"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CostByAgent } from "@/lib/cost-api-client";

interface CostByAgentChartProps {
  data: CostByAgent[];
  isLoading?: boolean;
  formatCost: (value: number) => string;
}

export default function CostByAgentChart({
  data,
  isLoading,
  formatCost,
}: CostByAgentChartProps) {
  if (isLoading) {
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
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        No agent data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis
          type="number"
          tickFormatter={(v) => `$${v.toFixed(2)}`}
          tick={{ fontSize: 12 }}
          stroke="#666"
        />
        <YAxis
          type="category"
          dataKey="agent"
          tick={{ fontSize: 12 }}
          stroke="#666"
          width={70}
        />
        <Tooltip
          formatter={(value) => [formatCost(Number(value)), "Cost"]}
          contentStyle={{ border: "2px solid black", borderRadius: 0 }}
        />
        <Bar dataKey="total_cost" fill="#5b5fff" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
