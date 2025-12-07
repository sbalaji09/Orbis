'use client';

import { useState, useEffect } from 'react';
import useSWRSubscription from 'swr/subscription';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { Span } from '@/lib/types';
import {
  fetchPromptVersions,
  fetchPromptContent,
  rollbackPrompt,
  comparePrompts,
  PromptComparisonResult,
} from '@/lib/prompt-api';
import PromptAnalytics from '@/components/PromptAnalytics';
import PromptContentViewer from '@/components/PromptContentViewer';
import PromptComparisonView from '@/components/PromptComparisonView';

const DEFAULT_USER_ID = 'user-1';

interface Version {
  prompt_id: string;
  name: string;
  version_number: number;
  content: string;
  prompt_hash: string;
  created_at: string;
}

// Skeleton component for loading states
function Skeleton({
  width = 'w-20',
  height = 'h-4',
}: {
  width?: string;
  height?: string;
}) {
  return (
    <div className={`${width} ${height} bg-gray-200 animate-pulse rounded`} />
  );
}

function formatDuration(duration: number | null): string {
  if (duration === null) return 'N/A';
  if (duration < 1) return `${duration.toFixed(2)}ms`;
  if (duration < 1000) return `${duration.toFixed(0)}ms`;
  return `${(duration / 1000).toFixed(3)}s`;
}

function formatCost(cost: number | null): string {
  if (cost === null) return 'N/A';
  return `$${cost.toFixed(4)}`;
}

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return new Date(date.toString() + 'Z').toLocaleString();
}

interface SpanDetailClientProps {
  initialSpan: Span;
}

export default function SpanDetailClient({ initialSpan }: SpanDetailClientProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<Set<number>>(new Set());
  const [viewingContent, setViewingContent] = useState<{
    content: string;
    version: number;
  } | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonVersions, setComparisonVersions] = useState<[number, number] | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<PromptComparisonResult | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState<number | null>(null);

  // SSE Subscription for real-time span updates (only if streaming)
  const { data: streamData } = useSWRSubscription<Span>(
    initialSpan.is_streaming ? `/spans/${initialSpan.span_id}/stream` : null,
    (key, { next }) => {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const userId = DEFAULT_USER_ID;
      const url = `${apiUrl}${key}?user_id=${encodeURIComponent(userId)}`;
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          next(null, data);
        } catch (err) {
          console.error('Failed to parse SSE data:', err);
        }
      };

      eventSource.addEventListener('complete', () => {
        eventSource.close();
      });

      eventSource.addEventListener('close', (event) => {
        const data = JSON.parse(event.data);
        console.log('SSE connection closed:', data.reason);
        eventSource.close();
      });

      eventSource.addEventListener('error', () => {
        eventSource.close();
      });

      return () => {
        eventSource.close();
      };
    }
  );

  // Use stream data if available, otherwise use the initial span
  const currentSpan = streamData || initialSpan;

  // Load prompt versions when span has prompt_name
  useEffect(() => {
    if (currentSpan?.prompt_name) {
      loadVersions(currentSpan.prompt_name);
    }
  }, [currentSpan?.prompt_name]);

  const loadVersions = async (promptName: string) => {
    setVersionsLoading(true);
    try {
      const data = await fetchPromptVersions(undefined, promptName);
      setVersions(data);
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleView = async (version: number) => {
    if (!currentSpan?.prompt_name) return;
    const content = await fetchPromptContent(undefined, currentSpan.prompt_name, version);
    if (content) {
      setViewingContent({ content, version });
    }
  };

  const handleCompare = async () => {
    if (!currentSpan?.prompt_name || selectedVersions.size !== 2) return;
    
    const [v1, v2] = Array.from(selectedVersions).sort((a, b) => b - a);
    const version1 = versions.find((v) => v.version_number === v1);
    const version2 = versions.find((v) => v.version_number === v2);
    if (!version1 || !version2) return;

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
    if (!currentSpan?.prompt_name || !confirm(`Rollback to version ${versionNumber}?`)) return;

    setRollbackLoading(versionNumber);
    try {
      await rollbackPrompt(undefined, currentSpan.prompt_name, versionNumber);
      await loadVersions(currentSpan.prompt_name);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rollback failed');
    } finally {
      setRollbackLoading(null);
    }
  };

  const toggleVersionSelection = (versionNumber: number) => {
    const newSelection = new Set(selectedVersions);
    if (newSelection.has(versionNumber)) {
      newSelection.delete(versionNumber);
    } else if (newSelection.size < 2) {
      newSelection.add(versionNumber);
    }
    setSelectedVersions(newSelection);
  };

  const statusConfig = {
    success: { bg: 'bg-emerald-50', text: 'text-success', dot: 'bg-success' },
    failed: { bg: 'bg-red-50', text: 'text-error', dot: 'bg-error' },
    running: { bg: 'bg-sky-50', text: 'text-babyblue', dot: 'bg-babyblue' },
    pending: { bg: 'bg-amber-50', text: 'text-warning', dot: 'bg-warning' },
    cancelled: { bg: 'bg-gray-50', text: 'text-muted', dot: 'bg-muted' },
  };

  const status = statusConfig[currentSpan.status as keyof typeof statusConfig] || {
    bg: 'bg-gray-50',
    text: 'text-muted',
    dot: 'bg-muted',
  };

  const hasPromptData = currentSpan.prompt_id || currentSpan.prompt_name;

  return (
    <>
      {/* Tabs */}
      <TabGroup selectedIndex={selectedTab} onChange={setSelectedTab}>
        <TabList className="flex gap-2 mb-6 border-b-2 border-black/10">
          <Tab
            className={({ selected }) =>
              `px-4 py-2 text-sm font-medium border-2 transition-all focus:outline-none ${
                selected
                  ? 'bg-black text-mustard border-black'
                  : 'bg-transparent text-black/60 border-transparent hover:text-foreground hover:bg-black/5'
              }`
            }
          >
            Details
          </Tab>
          {hasPromptData && (
            <>
              <Tab
                className={({ selected }) =>
                  `px-4 py-2 text-sm font-medium border-2 transition-all focus:outline-none ${
                    selected
                      ? 'bg-black text-mustard border-black'
                      : 'bg-transparent text-black/60 border-transparent hover:text-foreground hover:bg-black/5'
                  }`
                }
              >
                Analysis
              </Tab>
              <Tab
                className={({ selected }) =>
                  `px-4 py-2 text-sm font-medium border-2 transition-all focus:outline-none ${
                    selected
                      ? 'bg-black text-mustard border-black'
                      : 'bg-transparent text-black/60 border-transparent hover:text-foreground hover:bg-black/5'
                  }`
                }
              >
                Versions
              </Tab>
            </>
          )}
        </TabList>

        <TabPanels>
          {/* Details Tab */}
          <TabPanel>
            <div className="space-y-5 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
              {/* Prompt Versioning Information */}
              {(currentSpan.prompt_id || currentSpan.prompt_version || currentSpan.prompt_hash) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
                    {`/* Prompt Version */`}
                  </h4>
                  <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                    <div className="space-y-2 text-xs">
                      {currentSpan.prompt_id && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-black/60 uppercase tracking-wide text-[10px] w-14 shrink-0">
                            ID
                          </span>
                          <span className="font-mono text-foreground">
                            {currentSpan.prompt_id}
                          </span>
                        </div>
                      )}

                      {currentSpan.prompt_name && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-black/60 uppercase tracking-wide text-[10px] w-14 shrink-0">
                            Name
                          </span>
                          <span className="font-mono text-foreground">
                            {currentSpan.prompt_name}
                          </span>
                        </div>
                      )}

                      {currentSpan.prompt_version && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-black/60 uppercase tracking-wide text-[10px] w-14 shrink-0">
                            Ver
                          </span>
                          <span className="font-mono text-foreground">
                            {currentSpan.prompt_version}
                          </span>
                        </div>
                      )}

                      {currentSpan.prompt_hash && (
                        <div className="flex items-start gap-2 pt-2 border-t-2 border-black/10">
                          <span className="font-medium text-black/60 uppercase tracking-wide text-[10px] w-14 shrink-0">
                            Hash
                          </span>
                          <span className="font-mono text-muted break-all text-[10px] leading-relaxed">
                            {currentSpan.prompt_hash}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Timing Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
                  {`/* Performance */`}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 p-3 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                    <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                      Duration
                    </span>
                    <span className="text-lg font-mono">
                      {currentSpan.duration !== null ? (
                        formatDuration(currentSpan.duration)
                      ) : (
                        <Skeleton width="w-16" height="h-6" />
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 bg-mustard/10 border-2 border-mustard shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                    <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                      Cost
                    </span>
                    <span className="text-lg text-mustard font-mono">
                      {currentSpan.cost !== null ? (
                        formatCost(currentSpan.cost)
                      ) : (
                        <Skeleton width="w-16" height="h-6" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-black/60 space-y-1 pt-2 border-t-2 border-black/10">
                  <div className="flex items-center gap-2">
                    <span className="font-medium w-14">{`// Start`}</span>
                    <span className="font-mono">
                      {formatDate(currentSpan.start_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium w-14">{`// End`}</span>
                    <span className="font-mono">
                      {currentSpan.end_time ? (
                        formatDate(currentSpan.end_time)
                      ) : (
                        <Skeleton width="w-32" height="h-4" />
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Streaming Metrics */}
              {currentSpan.is_streaming && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
                    {`/* Streaming Metrics */`}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1 p-3 bg-success/10 border-2 border-success shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                      <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                        Time to First Token
                      </span>
                      <span className="text-lg font-mono text-success">
                        {currentSpan.time_to_first_token !== null ? (
                          `${currentSpan.time_to_first_token.toFixed(0)}ms`
                        ) : (
                          <Skeleton width="w-16" height="h-6" />
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3 bg-babyblue/10 border-2 border-babyblue shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                      <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                        Tokens Per Second
                      </span>
                      <span className="text-lg font-mono text-babyblue">
                        {currentSpan.tokens_per_second !== null ? (
                          `${currentSpan.tokens_per_second.toFixed(1)} tok/s`
                        ) : (
                          <Skeleton width="w-16" height="h-6" />
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Token Information */}
              {(currentSpan.prompt_tokens !== null || currentSpan.completion_tokens !== null) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
                    {`/* Token Usage */`}
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 p-3 bg-white border-2 border-black">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                          Prompt
                        </span>
                        <span className="text-base font-mono">
                          {currentSpan.prompt_tokens !== null ? (
                            currentSpan.prompt_tokens.toLocaleString()
                          ) : (
                            <Skeleton width="w-12" height="h-5" />
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-black/60 text-sm">+</div>
                    <div className="flex-1 flex items-center gap-2 p-3 bg-white border-2 border-black">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                          Completion
                        </span>
                        <span className="text-base font-mono">
                          {currentSpan.completion_tokens !== null ? (
                            currentSpan.completion_tokens.toLocaleString()
                          ) : (
                            <Skeleton width="w-12" height="h-5" />
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-muted text-sm">=</div>
                    <div className="flex-1 flex items-center gap-2 p-3 bg-babyblue/10 border-2 border-babyblue/50">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
                          Total
                        </span>
                        <span className="text-base text-foreground font-mono">
                          {currentSpan.prompt_tokens !== null &&
                          currentSpan.completion_tokens !== null ? (
                            (
                              currentSpan.prompt_tokens + currentSpan.completion_tokens
                            ).toLocaleString()
                          ) : (
                            <Skeleton width="w-12" height="h-5" />
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Preview */}
              {currentSpan.input_preview !== null && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">
                    Input
                  </h4>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-6 whitespace-pre-wrap wrap-break-word font-mono">
                      {currentSpan.input_preview}
                    </p>
                  </div>
                  {currentSpan.input_blob_url !== null && (
                    <a
                      href={currentSpan.input_blob_url}
                      className="inline-flex items-center gap-1.5 text-xs text-babyblue hover:text-foreground font-medium transition group"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>View complete input</span>
                      <svg
                        className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              )}

              {/* Output Preview */}
              {currentSpan.output_preview !== null && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">
                    Output
                  </h4>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-6 whitespace-pre-wrap wrap-break-word font-mono">
                      {currentSpan.output_preview}
                    </p>
                  </div>
                  {currentSpan.output_blob_url !== null && (
                    <a
                      href={currentSpan.output_blob_url}
                      className="inline-flex items-center gap-1.5 text-xs text-babyblue hover:text-foreground font-medium transition group"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>View complete output</span>
                      <svg
                        className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              )}

              {/* Error Message */}
              {currentSpan.error_message !== null && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-error uppercase tracking-wide">
                    Error
                  </h4>
                  <div className="p-4 rounded-lg bg-red-50 border border-error/30">
                    <p className="text-xs text-error/90 leading-relaxed wrap-break-word font-mono">
                      {currentSpan.error_message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Analysis Tab */}
          {hasPromptData && (
            <TabPanel>
              {currentSpan.prompt_name ? (
                <PromptAnalytics promptName={currentSpan.prompt_name} />
              ) : (
                <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-8 text-center">
                  <p className="text-sm text-black/60">No prompt name available for analysis</p>
                </div>
              )}
            </TabPanel>
          )}

          {/* Versions Tab */}
          {hasPromptData && (
            <TabPanel>
              {!currentSpan.prompt_name ? (
                <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-8 text-center">
                  <p className="text-sm text-black/60">No prompt name available</p>
                </div>
              ) : versionsLoading ? (
                <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-black/10 w-48" />
                    <div className="h-32 bg-black/5" />
                    <div className="h-32 bg-black/5" />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Comparison Bar */}
                  {selectedVersions.size > 0 && (
                    <div className="bg-babyblue/10 border-2 border-babyblue p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-black/60 uppercase tracking-wide">
                          Selected:
                        </span>
                        <div className="flex gap-2">
                          {Array.from(selectedVersions).map((v) => (
                            <span
                              key={v}
                              className="px-2 py-1 text-xs font-semibold bg-white border-2 border-black"
                            >
                              v{v}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedVersions(new Set())}
                          className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-black/60 hover:text-black transition-colors"
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleCompare}
                          disabled={selectedVersions.size !== 2}
                          className="px-4 py-2 text-xs font-semibold uppercase tracking-wide border-2 border-babyblue bg-babyblue text-white hover:bg-babyblue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                        >
                          Compare
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Version Cards */}
                  <div className="grid gap-4">
                    {versions.map((version) => (
                      <div
                        key={version.version_number}
                        className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-bold">
                                Version {version.version_number}
                              </h3>
                              {currentSpan.prompt_version &&
                                parseInt(currentSpan.prompt_version) === version.version_number && (
                                  <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-mustard text-white">
                                    Current
                                  </span>
                                )}
                            </div>
                            <div className="text-[10px] text-black/40 mb-3">
                              Created {new Date(version.created_at).toLocaleString()}
                            </div>
                            <div className="text-xs text-black/60 font-mono mb-3">
                              Hash: {version.prompt_hash.substring(0, 12)}...
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="checkbox"
                              checked={selectedVersions.has(version.version_number)}
                              onChange={() => toggleVersionSelection(version.version_number)}
                              disabled={
                                !selectedVersions.has(version.version_number) &&
                                selectedVersions.size >= 2
                              }
                              className="w-4 h-4 accent-babyblue"
                            />
                            <button
                              onClick={() => handleView(version.version_number)}
                              className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 border-babyblue bg-babyblue text-white hover:bg-babyblue/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                            >
                              View
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
                    ))}
                  </div>
                </div>
              )}
            </TabPanel>
          )}
        </TabPanels>
      </TabGroup>

      {/* Content Viewer Modal */}
      {viewingContent && (
        <PromptContentViewer
          isOpen={true}
          onClose={() => setViewingContent(null)}
          content={viewingContent.content}
          version={viewingContent.version}
          promptName={currentSpan.prompt_name || 'Unknown'}
        />
      )}

      {/* Comparison Modal */}
      {comparisonOpen && comparisonVersions && (
        <PromptComparisonView
          isOpen={comparisonOpen}
          onClose={() => {
            setComparisonOpen(false);
            setComparisonData(null);
            setComparisonError(null);
          }}
          promptName={currentSpan.prompt_name || 'Unknown'}
          version1={comparisonVersions[0]}
          version2={comparisonVersions[1]}
          comparisonData={comparisonData}
          loading={comparisonLoading}
          error={comparisonError}
        />
      )}
    </>
  );
}
