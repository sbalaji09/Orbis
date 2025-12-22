"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TokenBreakdown } from "@/lib/cost-api-client";

interface TokenBreakdownChartProps {
  data: TokenBreakdown[];
  formatDate: (dateStr: string) => string;
}

export default function TokenBreakdownChart({
  data,
  formatDate,
}: TokenBreakdownChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => [
            `${Number(value).toLocaleString()} tokens`,
            "",
          ]}
          labelFormatter={(label) => formatDate(String(label))}
          contentStyle={{ border: "2px solid black", borderRadius: 0 }}
        />
        <Legend />
        <Bar dataKey="input_tokens" name="Input" stackId="a" fill="#5b5fff" />
        <Bar dataKey="output_tokens" name="Output" stackId="a" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}
