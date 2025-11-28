import React, { useState, useEffect } from 'react';

interface AnalyticsRow {
  version: number;
  traceCount: number;
  avgCost: number;
  avgLatency: number;
  errorRate: number;
}

interface PromptAnalyticsProps {
  promptName: string;
}

export default function PromptAnalytics({ promptName }: PromptAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics(promptName).then(setAnalytics).finally(() => setLoading(false));
  }, [promptName]);

  if (loading) {
    return (
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-black/10 w-48"></div>
          <div className="h-64 bg-black/5"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b-2 border-black bg-background">
        <h3 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
          {`/* Version Performance */`}
        </h3>
        <p className="text-[10px] text-muted mt-1">
          Trace count, cost, latency, and error rate by version
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-background border-b-2 border-black/10">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Traces
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Avg Cost
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Avg Latency
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-semibold text-black/60 uppercase tracking-wider">
                Error Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {analytics.map((row, idx) => (
              <tr
                key={row.version}
                className={`border-b border-black/5 hover:bg-babyblue/5 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-background/50'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold bg-babyblue/10 text-babyblue border border-babyblue/30">
                    v{row.version}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                  {row.traceCount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-mustard font-semibold">
                  ${row.avgCost.toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                  {row.avgLatency.toFixed(2)}s
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-semibold ${
                    row.errorRate > 0.05
                      ? 'bg-error/10 text-error border border-error/30'
                      : 'bg-success/10 text-success border border-success/30'
                  }`}>
                    <div className={`w-1.5 h-1.5 ${row.errorRate > 0.05 ? 'bg-error' : 'bg-success'}`}></div>
                    {(row.errorRate * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {analytics.length === 0 && (
        <div className="px-6 py-12 text-center text-muted text-sm">
          No analytics data available
        </div>
      )}
    </div>
  );
}

// Replace with your actual API call
async function fetchAnalytics(promptName: string): Promise<AnalyticsRow[]> {
  // const res = await fetch(`/api/prompts/${promptName}/analytics`);
  // return res.json();
  return [
    { version: 1, traceCount: 45, avgCost: 0.0123, avgLatency: 2.45, errorRate: 0.02 },
    { version: 2, traceCount: 128, avgCost: 0.0156, avgLatency: 1.89, errorRate: 0.01 },
    { version: 3, traceCount: 89, avgCost: 0.0112, avgLatency: 3.12, errorRate: 0.08 },
  ];
}
