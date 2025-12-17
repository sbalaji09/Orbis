"use client";

import { useState, useEffect } from "react";
import useSWRSubscription from "swr/subscription";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { Span } from "@/lib/types";
import {
  fetchPromptVersions,
  fetchPromptContent,
  rollbackPrompt,
  comparePrompts,
  fetchPromptAnalytics,
  PromptComparisonResult,
  PromptVersionAnalytics,
} from "@/lib/prompt-api";
import PromptAnalytics from "@/components/PromptAnalytics";
import PromptContentViewer from "@/components/PromptContentViewer";
import PromptComparisonView from "@/components/PromptComparisonView";
import SpanDetails from "./SpanDetails";
import VersionsList from "./VersionsList";

const DEFAULT_USER_ID = "user-1";

interface Version {
  prompt_id: string;
  name: string;
  version_number: number;
  content: string;
  prompt_hash: string;
  created_at: string;
  is_active: boolean;
}

interface SpanDetailClientProps {
  initialSpan: Span;
  initialVersions?: any[];
  initialAnalytics?: PromptVersionAnalytics[];
}

export default function SpanDetailClient({
  initialSpan,
  initialVersions = [],
  initialAnalytics = [],
}: SpanDetailClientProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [versions, setVersions] = useState<Version[]>(initialVersions);

  // Initialize analytics from server data
  const [analytics, setAnalytics] = useState<
    Map<number, PromptVersionAnalytics>
  >(() => {
    const analyticsMap = new Map<number, PromptVersionAnalytics>();
    initialAnalytics.forEach((a) => analyticsMap.set(a.version_number, a));
    return analyticsMap;
  });

  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<Set<number>>(
    new Set()
  );
  const [viewingContent, setViewingContent] = useState<{
    content: string;
    version: number;
  } | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonVersions, setComparisonVersions] = useState<
    [number, number] | null
  >(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonData, setComparisonData] =
    useState<PromptComparisonResult | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState<number | null>(null);

  // SSE Subscription for real-time span updates (only if streaming)
  const { data: streamData } = useSWRSubscription<Span>(
    initialSpan.is_streaming ? `/spans/${initialSpan.span_id}/stream` : null,
    (
      key: string,
      { next }: { next: (error: Error | null, data?: Span) => void }
    ) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const userId = DEFAULT_USER_ID;
      const url = `${apiUrl}${key}?user_id=${encodeURIComponent(userId)}`;
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          next(null, data);
        } catch (err) {
          console.error("Failed to parse SSE data:", err);
        }
      };

      eventSource.addEventListener("complete", () => {
        eventSource.close();
      });

      eventSource.addEventListener("close", (event) => {
        const data = JSON.parse(event.data);
        console.log("SSE connection closed:", data.reason);
        eventSource.close();
      });

      eventSource.addEventListener("error", () => {
        eventSource.close();
      });

      return () => {
        eventSource.close();
      };
    }
  );

  // Use stream data if available, otherwise use the initial span
  const currentSpan = streamData || initialSpan;

  // Load prompt versions and analytics when span has prompt_name (only if not already loaded from server)
  useEffect(() => {
    if (currentSpan?.prompt_name && versions.length === 0) {
      loadVersions(currentSpan.prompt_name);
    }
  }, [currentSpan?.prompt_name]);

  const loadVersions = async (promptName: string) => {
    setVersionsLoading(true);
    try {
      const [versionsData, analyticsData] = await Promise.all([
        fetchPromptVersions(undefined, promptName),
        fetchPromptAnalytics(undefined, promptName),
      ]);
      setVersions(versionsData);
      const analyticsMap = new Map<number, PromptVersionAnalytics>();
      analyticsData.forEach((a) => analyticsMap.set(a.version_number, a));
      setAnalytics(analyticsMap);
    } catch (err) {
      console.error("Failed to load versions:", err);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleView = async (version: number) => {
    if (!currentSpan?.prompt_name) return;
    const content = await fetchPromptContent(
      undefined,
      currentSpan.prompt_name,
      version
    );
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
    console.log(versions);
    try {
      const data = await comparePrompts(version1.prompt_id, version2.prompt_id);
      setComparisonData(data);
    } catch (err) {
      setComparisonError(
        err instanceof Error ? err.message : "Failed to load comparison"
      );
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleRollback = async (versionNumber: number) => {
    if (
      !currentSpan?.prompt_name ||
      !confirm(`Rollback to version ${versionNumber}?`)
    )
      return;

    setRollbackLoading(versionNumber);
    try {
      await rollbackPrompt(undefined, currentSpan.prompt_name, versionNumber);
      await loadVersions(currentSpan.prompt_name);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Rollback failed");
    } finally {
      setRollbackLoading(null);
    }
  };

  const toggleVersionSelection = (versionNumber: number) => {
    setSelectedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(versionNumber)) {
        next.delete(versionNumber);
      } else {
        // Only allow 2 selections max
        if (next.size >= 2) {
          // Remove the oldest selection
          const oldest = next.values().next().value;
          if (oldest !== undefined) next.delete(oldest);
        }
        next.add(versionNumber);
      }
      return next;
    });
  };

  // Find best version
  const bestVersion =
    analytics.size > 0
      ? Array.from(analytics.values()).reduce((best, curr) => {
          if (curr.trace_count === 0) return best;
          if (!best || best.trace_count === 0) return curr;
          const bestError = best.error_rate_pct ?? 100;
          const currError = curr.error_rate_pct ?? 100;
          if (currError < bestError) return curr;
          if (currError === bestError && curr.trace_count > best.trace_count)
            return curr;
          return best;
        }, null as PromptVersionAnalytics | null)
      : null;

  const hasPromptData = currentSpan.prompt_id || currentSpan.prompt_name;

  return (
    <>
      {/* Tabs */}
      <TabGroup selectedIndex={selectedTab} onChange={setSelectedTab}>
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] mb-6 overflow-hidden">
          <TabList className="flex border-b-2 border-black">
            <Tab
              className={({ selected }) =>
                `flex-1 px-6 py-3 text-xs font-bold uppercase tracking-wide transition-all focus:outline-none relative ${
                  selected
                    ? "bg-black text-mustard"
                    : "bg-background text-black/60 hover:bg-black/5 hover:text-black"
                }`
              }
            >
              {({ selected }) => (
                <>
                  <span className="relative z-10">Details</span>
                  {selected && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-mustard" />
                  )}
                </>
              )}
            </Tab>
            {hasPromptData && (
              <>
                <Tab
                  className={({ selected }) =>
                    `flex-1 px-6 py-3 text-xs font-bold uppercase tracking-wide transition-all focus:outline-none border-l-2 border-black relative ${
                      selected
                        ? "bg-black text-mustard"
                        : "bg-background text-black/60 hover:bg-black/5 hover:text-black"
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className="relative z-10">Analysis</span>
                      {selected && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-mustard" />
                      )}
                    </>
                  )}
                </Tab>
                <Tab
                  className={({ selected }) =>
                    `flex-1 px-6 py-3 text-xs font-bold uppercase tracking-wide transition-all focus:outline-none border-l-2 border-black relative ${
                      selected
                        ? "bg-black text-mustard"
                        : "bg-background text-black/60 hover:bg-black/5 hover:text-black"
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className="relative z-10">
                        Versions {versions.length > 0 && `(${versions.length})`}
                      </span>
                      {selected && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-mustard" />
                      )}
                    </>
                  )}
                </Tab>
              </>
            )}
          </TabList>
        </div>

        <TabPanels>
          {/* Details Tab */}
          <TabPanel>
            <SpanDetails span={currentSpan} />
          </TabPanel>

          {/* Analysis Tab */}
          {hasPromptData && (
            <TabPanel>
              {currentSpan.prompt_name ? (
                <PromptAnalytics
                  promptName={currentSpan.prompt_name}
                  analytics={initialAnalytics}
                  loading={versionsLoading}
                />
              ) : (
                <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-8 text-center">
                  <p className="text-sm text-black/60">
                    No prompt name available for analysis
                  </p>
                </div>
              )}
            </TabPanel>
          )}

          {/* Versions Tab */}
          {hasPromptData && (
            <TabPanel>
              {!currentSpan.prompt_name ? (
                <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-8 text-center">
                  <p className="text-sm text-black/60">
                    No prompt name available
                  </p>
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
                <VersionsList
                  versions={versions}
                  analytics={analytics}
                  bestVersion={bestVersion}
                  currentPromptVersion={currentSpan.prompt_version}
                  promptName={currentSpan.prompt_name}
                  selectedVersions={selectedVersions}
                  onToggleSelection={toggleVersionSelection}
                  onView={handleView}
                  onRollback={handleRollback}
                  onCompare={handleCompare}
                  rollbackLoading={rollbackLoading}
                />
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
          versionNumber={viewingContent.version}
          promptName={currentSpan.prompt_name || "Unknown"}
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
          promptName={currentSpan.prompt_name || "Unknown"}
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
