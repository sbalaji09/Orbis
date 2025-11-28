import React, { useState, useEffect } from 'react';

interface AnalyticsRow {
  version: number;
  traceCount: number;
  avgCost: number;
  avgLatency: number;
  errorRate: number;
}

interface PromptAnalyticsProps {
  promptId: string;
}

export default function PromptAnalytics({ promptId }: PromptAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics(promptId).then(setAnalytics).finally(() => setLoading(false));
  }, [promptId]);

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-50 rounded-lg p-8">
        <div className="h-96 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Version Performance</h3>
        <p className="text-sm text-gray-500">Trace count, cost, latency, and error rate by version</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Traces
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Cost ($)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Latency (s)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Error Rate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {analytics.map((row) => (
              <tr key={row.version} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  v{row.version}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.traceCount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${row.avgCost.toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.avgLatency.toFixed(2)}s
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                  row.errorRate > 0.05 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {(row.errorRate * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Replace with your actual API call
async function fetchAnalytics(promptId: string): Promise<AnalyticsRow[]> {
  // const res = await fetch(`/api/prompts/${promptId}/analytics`);
  // return res.json();
  return [
    { version: 1, traceCount: 45, avgCost: 0.0123, avgLatency: 2.45, errorRate: 0.02 },
    { version: 2, traceCount: 128, avgCost: 0.0156, avgLatency: 1.89, errorRate: 0.01 },
    { version: 3, traceCount: 89, avgCost: 0.0112, avgLatency: 3.12, errorRate: 0.08 },
  ];
}
