"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CostTrend } from "@/lib/cost-api-client";

interface CostTrendChartProps {
  data: CostTrend[];
  isLoading?: boolean;
  formatCost: (value: number) => string;
  formatDate: (dateStr: string) => string;
}

export default function CostTrendChart({
  data,
  isLoading,
  formatCost,
  formatDate,
}: CostTrendChartProps) {
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
        No cost data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 12 }}
          stroke="#666"
        />
        <YAxis
          tickFormatter={(v) => `$${v.toFixed(2)}`}
          tick={{ fontSize: 12 }}
          stroke="#666"
        />
        <Tooltip
          formatter={(value) => [formatCost(Number(value)), "Cost"]}
          labelFormatter={(label) => formatDate(String(label))}
          contentStyle={{ border: "2px solid black", borderRadius: 0 }}
        />
        <Line
          type="monotone"
          dataKey="total_cost"
          stroke="#5b5fff"
          strokeWidth={2}
          dot={{ fill: "#5b5fff", strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: "#5b5fff" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
