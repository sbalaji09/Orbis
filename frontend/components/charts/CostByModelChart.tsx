"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CostByModel } from "@/lib/cost-api-client";

interface CostByModelChartProps {
  data: CostByModel[];
  isLoading?: boolean;
  formatCost: (value: number) => string;
  colors: string[];
}

export default function CostByModelChart({
  data,
  isLoading,
  formatCost,
  colors,
}: CostByModelChartProps) {
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
        No model data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="total_cost"
          nameKey="model"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={(entry) => entry.payload.model}
          labelLine={{ stroke: "#000", strokeWidth: 1 }}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [formatCost(Number(value)), "Cost"]}
          contentStyle={{ border: "2px solid black", borderRadius: 0 }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
