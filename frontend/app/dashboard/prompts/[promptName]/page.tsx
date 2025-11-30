'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  fetchPromptVersions,
  fetchPromptContent,
  rollbackPrompt,
  fetchPromptAnalytics,
  comparePrompts,
  PromptVersionAnalytics,
  PromptComparisonResult,
} from '@/lib/prompt-api';
import PromptBadge from '@/components/PromptBadge';
import PromptContentViewer from '@/components/PromptContentViewer';
import PromptComparisonView from '@/components/PromptComparisonView';
import PromptAnalytics from '@/components/PromptAnalytics';

interface Version {
  version_number: number;
  created_at: string;
  is_active: boolean;
  prompt_id: string;
  metadata?: Record<string, unknown>;
}

export default function PromptDetailPage({
  params,
}: {
  params: Promise<{ promptName: string }>;
}) {
  const { promptName } = use(params);
  const decodedName = decodeURIComponent(promptName);

  const [versions, setVersions] = useState<Version[]>([]);
  const [analytics, setAnalytics] = useState<Map<number, PromptVersionAnalytics>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  // Modal states
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerContent, setViewerContent] = useState('');
  const [viewerVersion, setViewerVersion] = useState(0);

  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<PromptComparisonResult | null>(null);
  const [comparisonVersions, setComparisonVersions] = useState<[number, number]>([0, 0]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  const [rollbackLoading, setRollbackLoading] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPromptVersions(undefined, decodedName),
      fetchPromptAnalytics(undefined, decodedName),
    ])
      .then(([versionsData, analyticsData]) => {
        setVersions(versionsData);
        const analyticsMap = new Map<number, PromptVersionAnalytics>();
        analyticsData.forEach((a) => analyticsMap.set(a.version_number, a));
        setAnalytics(analyticsMap);
      })
      .finally(() => setLoading(false));
  }, [decodedName]);

  const handleView = async (versionNumber: number) => {
    const content = await fetchPromptContent(undefined, decodedName, versionNumber);
    setViewerContent(content);
    setViewerVersion(versionNumber);
    setViewerOpen(true);
  };

  const handleCompare = async (v1: number, v2: number) => {
    // Find prompt_ids for these versions
    const version1 = versions.find((v) => v.version_number === v1);
    const version2 = versions.find((v) => v.version_number === v2);
    if (!version1 || !version2) return;

    // Open comparison modal and start loading
    setComparisonVersions([v1, v2]);
    setComparisonOpen(true);
    setComparisonLoading(true);
    setComparisonError(null);
    setComparisonData(null);

    try {
      const data = await comparePrompts(version1.prompt_id, version2.prompt_id);
      setComparisonData(data);
    } catch (err) {
      setComparisonError(err instanceof Error ? err.message : 'Failed to load comparison');
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleRollback = async (versionNumber: number) => {
    if (!confirm(`Rollback to version ${versionNumber}? This will create a new version with the content from v${versionNumber}.`)) {
      return;
    }

    setRollbackLoading(versionNumber);
    try {
      const result = await rollbackPrompt(undefined, decodedName, versionNumber);
      if (result) {
        // Refresh versions
        const newVersions = await fetchPromptVersions(undefined, decodedName);
        setVersions(newVersions);
      }
    } finally {
      setRollbackLoading(null);
    }
  };

  // Find best version
  const bestVersion = analytics.size > 0
    ? Array.from(analytics.values()).reduce((best, curr) => {
        if (curr.trace_count === 0) return best;
        if (!best || best.trace_count === 0) return curr;
        const bestError = best.error_rate_pct ?? 100;
        const currError = curr.error_rate_pct ?? 100;
        if (currError < bestError) return curr;
        if (currError === bestError && curr.trace_count > best.trace_count) return curr;
        return best;
      }, null as PromptVersionAnalytics | null)
    : null;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-black/10 w-48"></div>
          <div className="h-64 bg-black/5 w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/dashboard/prompts"
          className="inline-flex items-center gap-1 text-xs text-black/40 hover:text-black/60 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All Prompts
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground font-mono">{decodedName}</h1>
        <p className="text-sm text-muted mt-1">
          {`// ${versions.length} versions`}
        </p>
      </div>

      {/* Analytics Section */}
      <div className="mb-8">
        <PromptAnalytics promptName={decodedName} />
      </div>

      {/* Versions List */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-black bg-background">
          <h3 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
            {`/* All Versions */`}
          </h3>
          <p className="text-[10px] text-muted mt-1">
            Click a version to select it for comparison
          </p>
        </div>

        <div className="divide-y divide-black/5">
          {versions
            .sort((a, b) => b.version_number - a.version_number)
            .map((version) => {
              const versionAnalytics = analytics.get(version.version_number);
              const isBest = bestVersion && version.version_number === bestVersion.version_number && versionAnalytics && versionAnalytics.trace_count > 0;
              const isSelected = selectedVersion === version.version_number;

              return (
                <div
                  key={version.version_number}
                  className={`p-4 transition-colors ${
                    isSelected ? 'bg-babyblue/10' : 'hover:bg-black/[0.02]'
                  } ${isBest ? 'ring-2 ring-inset ring-success/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => setSelectedVersion(isSelected ? null : version.version_number)}>
                          <PromptBadge promptId={decodedName} promptVersion={version.version_number} />
                        </button>
                        {version.is_active && (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-success text-white">
                            Active
                          </span>
                        )}
                        {isBest && (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-babyblue text-white">
                            Best
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-black/40 mb-3">
                        Created {new Date(version.created_at).toLocaleString()}
                      </div>

                      {/* Analytics Stats */}
                      {versionAnalytics && (
                        <div className="grid grid-cols-4 gap-3 py-2 px-3 bg-black/[0.02] border border-black/10">
                          <div>
                            <p className="text-[9px] text-black/40 uppercase tracking-wide">Traces</p>
                            <p className="text-sm font-semibold text-foreground">
                              {versionAnalytics.trace_count.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-black/40 uppercase tracking-wide">Avg Cost</p>
                            <p className="text-sm font-semibold text-mustard">
                              {versionAnalytics.avg_cost > 0 ? `$${versionAnalytics.avg_cost.toFixed(4)}` : '$0.00'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-black/40 uppercase tracking-wide">Avg Latency</p>
                            <p className="text-sm font-semibold text-foreground">
                              {versionAnalytics.avg_latency > 0
                                ? versionAnalytics.avg_latency < 1
                                  ? `${(versionAnalytics.avg_latency * 1000).toFixed(0)}ms`
                                  : `${versionAnalytics.avg_latency.toFixed(2)}s`
                                : '0ms'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-black/40 uppercase tracking-wide">Error Rate</p>
                            <p className={`text-sm font-semibold ${
                              versionAnalytics.error_rate_pct === null || versionAnalytics.error_rate_pct === 0
                                ? 'text-success'
                                : versionAnalytics.error_rate_pct < 5
                                  ? 'text-warning'
                                  : 'text-error'
                            }`}>
                              {versionAnalytics.error_rate_pct === null ? '0%' : `${versionAnalytics.error_rate_pct}%`}
                            </p>
                          </div>
                        </div>
                      )}

                      {!versionAnalytics && (
                        <div className="py-2 px-3 bg-black/[0.02] border border-black/10 text-center">
                          <p className="text-[10px] text-black/40">No usage data yet</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleView(version.version_number)}
                        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 border-babyblue bg-babyblue text-white hover:bg-babyblue/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                      >
                        View
                      </button>
                      <button
                        onClick={() => selectedVersion && selectedVersion !== version.version_number && handleCompare(selectedVersion, version.version_number)}
                        disabled={!selectedVersion || selectedVersion === version.version_number}
                        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 border-black bg-white hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                      >
                        Compare
                      </button>
                      <button
                        onClick={() => handleRollback(version.version_number)}
                        disabled={rollbackLoading !== null}
                        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 border-error bg-error text-white hover:bg-error/90 disabled:opacity-50 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                      >
                        {rollbackLoading === version.version_number ? '...' : 'Rollback'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {versions.length === 0 && (
          <div className="px-6 py-12 text-center text-muted text-sm">
            No versions found for this prompt.
          </div>
        )}
      </div>

      {/* Content Viewer Modal */}
      {viewerOpen && (
        <PromptContentViewer
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          promptName={decodedName}
          versionNumber={viewerVersion}
          content={viewerContent}
        />
      )}

      {/* Full Comparison View Modal */}
      <PromptComparisonView
        isOpen={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        promptName={decodedName}
        version1={comparisonVersions[0]}
        version2={comparisonVersions[1]}
        comparisonData={comparisonData}
        loading={comparisonLoading}
        error={comparisonError}
      />
    </div>
  );
}
