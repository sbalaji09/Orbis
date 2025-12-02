"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  PromptFamily,
  PromptVersionAnalytics,
  PromptComparisonResult,
  fetchPromptAnalytics,
  fetchPromptContent,
  comparePrompts,
} from "@/lib/prompt-api";
import PromptBadge from "@/components/PromptBadge";

interface PromptVersioningClientProps {
  families: PromptFamily[];
}

type TabType = "side-by-side" | "diff" | "outputs" | "analysis";

export default function PromptVersioningClient({
  families,
}: PromptVersioningClientProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<PromptFamily | null>(null);
  const [versions, setVersions] = useState<PromptVersionAnalytics[]>([]);
  const [leftVersion, setLeftVersion] = useState<number | null>(null);
  const [rightVersion, setRightVersion] = useState<number | null>(null);
  const [leftContent, setLeftContent] = useState<string>("");
  const [rightContent, setRightContent] = useState<string>("");
  const [comparisonData, setComparisonData] = useState<PromptComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("side-by-side");
  const [syncScroll, setSyncScroll] = useState(true);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const filteredFamilies = useMemo(() => {
    if (!searchQuery.trim()) return families;
    const query = searchQuery.toLowerCase();
    return families.filter(
      (family) =>
        family.name.toLowerCase().includes(query) ||
        (family.agent_name && family.agent_name.toLowerCase().includes(query))
    );
  }, [families, searchQuery]);

  // Load versions when prompt is selected
  useEffect(() => {
    if (!selectedPrompt) {
      setVersions([]);
      setLeftVersion(null);
      setRightVersion(null);
      return;
    }

    async function loadVersions() {
      const analytics = await fetchPromptAnalytics(undefined, selectedPrompt!.name);
      setVersions(analytics);
      // Auto-select latest and previous version
      if (analytics.length >= 2) {
        const sorted = [...analytics].sort((a, b) => b.version_number - a.version_number);
        setLeftVersion(sorted[1].version_number);
        setRightVersion(sorted[0].version_number);
      } else if (analytics.length === 1) {
        setLeftVersion(analytics[0].version_number);
        setRightVersion(analytics[0].version_number);
      }
    }

    loadVersions();
  }, [selectedPrompt]);

  // Load content when versions change
  useEffect(() => {
    if (!selectedPrompt || leftVersion === null) return;

    async function loadLeftContent() {
      const content = await fetchPromptContent(undefined, selectedPrompt!.name, leftVersion!);
      setLeftContent(content || "");
    }
    loadLeftContent();
  }, [selectedPrompt, leftVersion]);

  useEffect(() => {
    if (!selectedPrompt || rightVersion === null) return;

    async function loadRightContent() {
      const content = await fetchPromptContent(undefined, selectedPrompt!.name, rightVersion!);
      setRightContent(content || "");
    }
    loadRightContent();
  }, [selectedPrompt, rightVersion]);

  // Load comparison data when both versions are selected
  useEffect(() => {
    if (!selectedPrompt || leftVersion === null || rightVersion === null) {
      setComparisonData(null);
      return;
    }

    if (leftVersion === rightVersion) {
      setComparisonData(null);
      return;
    }

    async function loadComparison() {
      setLoading(true);
      try {
        const leftAnalytics = versions.find((v) => v.version_number === leftVersion);
        const rightAnalytics = versions.find((v) => v.version_number === rightVersion);

        if (leftAnalytics && rightAnalytics) {
          const data = await comparePrompts(leftAnalytics.prompt_id, rightAnalytics.prompt_id);
          setComparisonData(data);
        }
      } catch (error) {
        console.error("Error loading comparison:", error);
      } finally {
        setLoading(false);
      }
    }
    loadComparison();
  }, [selectedPrompt, leftVersion, rightVersion, versions]);

  // Sync scroll between panels
  useEffect(() => {
    if (!syncScroll || activeTab !== "side-by-side") return;

    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;
    if (!leftPanel || !rightPanel) return;

    let isSyncing = false;

    const handleLeftScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      rightPanel.scrollTop = leftPanel.scrollTop;
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    };

    const handleRightScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      leftPanel.scrollTop = rightPanel.scrollTop;
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    };

    leftPanel.addEventListener("scroll", handleLeftScroll);
    rightPanel.addEventListener("scroll", handleRightScroll);

    return () => {
      leftPanel.removeEventListener("scroll", handleLeftScroll);
      rightPanel.removeEventListener("scroll", handleRightScroll);
    };
  }, [syncScroll, activeTab]);

  const tabs: { id: TabType; label: string }[] = [
    { id: "side-by-side", label: "Side by Side" },
    { id: "diff", label: "Diff" },
    { id: "outputs", label: "Sample Outputs" },
    { id: "analysis", label: "AI Analysis" },
  ];

  const parseDiff = (diffRaw: string) => {
    const lines = typeof diffRaw === "string" ? diffRaw.split("\n") : [];
    return lines.map((line, idx) => {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        return { type: "added" as const, content: line.substring(1), lineNum: idx + 1 };
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        return { type: "removed" as const, content: line.substring(1), lineNum: idx + 1 };
      } else if (line.startsWith("@@")) {
        return { type: "header" as const, content: line, lineNum: idx + 1 };
      } else {
        return { type: "unchanged" as const, content: line, lineNum: idx + 1 };
      }
    });
  };

  return (
    <div
      className="h-full flex bg-[#F5F3F0]"
      style={{
        backgroundImage: `
          linear-gradient(to right, #0c0f0a08 1px, transparent 1px),
          linear-gradient(to bottom, #0c0f0a08 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
      }}
    >
      {/* Left sidebar - Prompt selector */}
      <div className="w-72 bg-white border-r-2 border-black flex flex-col h-full">
        <div className="p-4 border-b-2 border-black bg-[#F5F3F0]">
          <h2 className="text-sm font-bold text-black uppercase tracking-wide">
            {`// PROMPT VERSIONING`}
          </h2>
          <p className="text-[10px] text-black/50 mt-0.5 font-mono font-semibold">
            Compare versions side by side
          </p>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b border-black/10">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-[#F5F3F0] border border-black/20 focus:border-black focus:outline-none placeholder:text-black/40"
            />
          </div>
        </div>

        {/* Prompt list */}
        <div className="flex-1 overflow-y-auto">
          {filteredFamilies.length === 0 ? (
            <div className="px-4 py-8 text-xs text-black/40 text-center font-mono">
              {searchQuery ? `// no matches for "${searchQuery}"` : "// no prompts found"}
            </div>
          ) : (
            filteredFamilies.map((family) => {
              const isActive = selectedPrompt?.name === family.name;
              return (
                <button
                  key={family.name}
                  onClick={() => setSelectedPrompt(family)}
                  className={`w-full py-3 px-4 text-left transition-all border-b border-black/10 last:border-b-0 group ${
                    isActive
                      ? "bg-[#5B5FFF]/10 border-l-[3px] border-l-black"
                      : "hover:bg-[#5B5FFF]/5 hover:border-l-4 hover:border-l-[#5B5FFF]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`font-mono text-xs font-bold truncate ${
                        isActive ? "text-black" : "text-black/80 group-hover:text-[#5B5FFF]"
                      }`}
                    >
                      {family.name}
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-black/10 text-black border border-black/20 shrink-0">
                      {family.version_count} versions
                    </span>
                  </div>
                  {family.agent_name && (
                    <div className="text-[10px] font-mono text-black/50 truncate">
                      {family.agent_name}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {!selectedPrompt ? (
          // Empty state
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#5B5FFF]/10 border-2 border-[#5B5FFF]/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[#5B5FFF]/40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-foreground/30">
                Select a prompt to compare
              </h1>
              <p className="text-sm text-foreground/20 mt-3">
                Choose a prompt from the sidebar to view and compare different versions
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header with version selectors */}
            <div className="shrink-0 px-6 py-4 bg-white border-b-2 border-black">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-black">{selectedPrompt.name}</h1>
                  {selectedPrompt.agent_name && (
                    <p className="text-xs text-black/50 font-mono">{selectedPrompt.agent_name}</p>
                  )}
                </div>

                {/* Version selectors */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-black/60 uppercase tracking-wide">
                      Left
                    </label>
                    <select
                      value={leftVersion ?? ""}
                      onChange={(e) => setLeftVersion(Number(e.target.value))}
                      className="px-3 py-1.5 text-xs font-mono border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-babyblue"
                    >
                      {versions.map((v) => (
                        <option key={v.version_number} value={v.version_number}>
                          v{v.version_number}
                        </option>
                      ))}
                    </select>
                  </div>

                  <svg
                    className="w-5 h-5 text-black/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-black/60 uppercase tracking-wide">
                      Right
                    </label>
                    <select
                      value={rightVersion ?? ""}
                      onChange={(e) => setRightVersion(Number(e.target.value))}
                      className="px-3 py-1.5 text-xs font-mono border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-babyblue"
                    >
                      {versions.map((v) => (
                        <option key={v.version_number} value={v.version_number}>
                          v{v.version_number}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics bar (when comparison data is available) */}
            {comparisonData && (
              <div className="shrink-0 px-6 py-3 border-b border-black/10 bg-black/[0.02]">
                <div className="grid grid-cols-4 gap-4">
                  <MetricCard
                    label="Traces"
                    valueA={comparisonData.prompts.version1.analytics?.trace_count ?? 0}
                    valueB={comparisonData.prompts.version2.analytics?.trace_count ?? 0}
                    format={(v) => v.toLocaleString()}
                  />
                  <MetricCard
                    label="Avg Cost"
                    valueA={comparisonData.prompts.version1.analytics?.avg_cost ?? 0}
                    valueB={comparisonData.prompts.version2.analytics?.avg_cost ?? 0}
                    format={(v) => `$${v.toFixed(4)}`}
                    inverse
                  />
                  <MetricCard
                    label="Avg Latency"
                    valueA={comparisonData.prompts.version1.analytics?.avg_latency ?? 0}
                    valueB={comparisonData.prompts.version2.analytics?.avg_latency ?? 0}
                    format={(v) => (v < 1 ? `${(v * 1000).toFixed(0)}ms` : `${v.toFixed(2)}s`)}
                    inverse
                  />
                  <MetricCard
                    label="Error Rate"
                    valueA={comparisonData.prompts.version1.analytics?.error_rate_pct ?? 0}
                    valueB={comparisonData.prompts.version2.analytics?.error_rate_pct ?? 0}
                    format={(v) => `${v.toFixed(1)}%`}
                    inverse
                  />
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="shrink-0 flex gap-0 border-b border-black/10 bg-white">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    activeTab === tab.id
                      ? "bg-babyblue text-white border-b-2 border-babyblue"
                      : "text-black/60 hover:bg-black/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              {activeTab === "side-by-side" && (
                <div className="ml-auto flex items-center px-4">
                  <label className="flex items-center gap-2 text-xs text-black/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncScroll}
                      onChange={(e) => setSyncScroll(e.target.checked)}
                      className="w-3 h-3"
                    />
                    Sync scroll
                  </label>
                </div>
              )}
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex-1 flex items-center justify-center bg-white">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-babyblue border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-sm text-black/60">Analyzing prompts...</p>
                </div>
              </div>
            )}

            {/* Content area */}
            {!loading && (
              <div className="flex-1 overflow-hidden bg-white">
                {/* Side by Side View */}
                {activeTab === "side-by-side" && (
                  <div className="h-full grid grid-cols-2 divide-x divide-black/10">
                    <div className="flex flex-col h-full">
                      <div className="px-4 py-2 bg-black/[0.02] border-b border-black/10 shrink-0">
                        <PromptBadge
                          promptId={selectedPrompt.name}
                          promptVersion={leftVersion ?? 0}
                        />
                      </div>
                      <div ref={leftPanelRef} className="flex-1 overflow-auto p-4">
                        <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed">
                          {leftContent || "Loading..."}
                        </pre>
                      </div>
                    </div>
                    <div className="flex flex-col h-full">
                      <div className="px-4 py-2 bg-black/[0.02] border-b border-black/10 shrink-0">
                        <PromptBadge
                          promptId={selectedPrompt.name}
                          promptVersion={rightVersion ?? 0}
                        />
                      </div>
                      <div ref={rightPanelRef} className="flex-1 overflow-auto p-4">
                        <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed">
                          {rightContent || "Loading..."}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Diff View */}
                {activeTab === "diff" && (
                  <div className="h-full overflow-auto">
                    {leftVersion === rightVersion ? (
                      <div className="flex items-center justify-center h-full text-black/40 text-sm">
                        Select different versions to see the diff
                      </div>
                    ) : comparisonData?.diff?.raw ? (
                      parseDiff(comparisonData.diff.raw).map((line, idx) => (
                        <div
                          key={idx}
                          className={`flex px-4 py-1 text-xs leading-5 border-b border-black/5 font-mono ${
                            line.type === "added"
                              ? "bg-success/10 text-success"
                              : line.type === "removed"
                                ? "bg-error/10 text-error"
                                : line.type === "header"
                                  ? "bg-babyblue/10 text-babyblue font-semibold"
                                  : "text-foreground/80"
                          }`}
                        >
                          <span className="w-8 text-right text-black/30 pr-3 select-none shrink-0">
                            {line.lineNum}
                          </span>
                          <span className="w-4 text-center shrink-0">
                            {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                          </span>
                          <span className={line.type === "removed" ? "line-through" : ""}>
                            {line.content || "\u00A0"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-full text-black/40 text-sm">
                        Loading diff...
                      </div>
                    )}
                  </div>
                )}

                {/* Sample Outputs */}
                {activeTab === "outputs" && (
                  <div className="h-full grid grid-cols-2 divide-x divide-black/10 overflow-hidden">
                    <div className="flex flex-col h-full">
                      <div className="px-4 py-2 bg-black/[0.02] border-b border-black/10 shrink-0">
                        <span className="text-xs font-semibold text-black/60">
                          Version {leftVersion} Outputs (
                          {comparisonData?.prompts.version1.sample_outputs.length ?? 0})
                        </span>
                      </div>
                      <div className="flex-1 overflow-auto p-4 space-y-3">
                        {!comparisonData?.prompts.version1.sample_outputs.length ? (
                          <p className="text-xs text-black/40 text-center py-8">
                            No outputs available
                          </p>
                        ) : (
                          comparisonData.prompts.version1.sample_outputs.map((output, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-black/[0.02] border border-black/10 rounded"
                            >
                              <p className="text-[10px] text-black/40 mb-1">Output {idx + 1}</p>
                              <p className="text-xs font-mono whitespace-pre-wrap text-foreground/80">
                                {output}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col h-full">
                      <div className="px-4 py-2 bg-black/[0.02] border-b border-black/10 shrink-0">
                        <span className="text-xs font-semibold text-black/60">
                          Version {rightVersion} Outputs (
                          {comparisonData?.prompts.version2.sample_outputs.length ?? 0})
                        </span>
                      </div>
                      <div className="flex-1 overflow-auto p-4 space-y-3">
                        {!comparisonData?.prompts.version2.sample_outputs.length ? (
                          <p className="text-xs text-black/40 text-center py-8">
                            No outputs available
                          </p>
                        ) : (
                          comparisonData.prompts.version2.sample_outputs.map((output, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-black/[0.02] border border-black/10 rounded"
                            >
                              <p className="text-[10px] text-black/40 mb-1">Output {idx + 1}</p>
                              <p className="text-xs font-mono whitespace-pre-wrap text-foreground/80">
                                {output}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {activeTab === "analysis" && (
                  <div className="h-full overflow-auto p-6">
                    {leftVersion === rightVersion ? (
                      <div className="flex items-center justify-center h-full text-black/40 text-sm">
                        Select different versions to see AI analysis
                      </div>
                    ) : comparisonData?.llm_analysis ? (
                      <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-6 h-6 bg-gradient-to-br from-babyblue to-babyblue/60 rounded flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                              />
                            </svg>
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">
                            AI-Generated Analysis
                          </h3>
                        </div>
                        <div className="prose prose-sm max-w-none text-foreground/80">
                          <SimpleMarkdown content={comparisonData.llm_analysis} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-black/40 text-sm">
                        Loading analysis...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Metric comparison card component
function MetricCard({
  label,
  valueA,
  valueB,
  format,
  inverse = false,
}: {
  label: string;
  valueA: number;
  valueB: number;
  format: (v: number) => string;
  inverse?: boolean;
}) {
  const delta = valueA === 0 ? 0 : ((valueB - valueA) / valueA) * 100;
  const direction = inverse
    ? delta < 0
      ? "better"
      : delta > 0
        ? "worse"
        : "neutral"
    : delta > 0
      ? "better"
      : delta < 0
        ? "worse"
        : "neutral";

  return (
    <div className="text-center">
      <p className="text-[9px] text-black/40 uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs font-mono text-black/60">{format(valueA)}</span>
        <svg
          className="w-3 h-3 text-black/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
        <span className="text-xs font-mono text-black/60">{format(valueB)}</span>
        {delta !== 0 && (
          <span
            className={`text-[10px] font-semibold ${
              direction === "better"
                ? "text-success"
                : direction === "worse"
                  ? "text-error"
                  : "text-black/40"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Simple markdown renderer for LLM analysis
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-sm font-bold mt-4 mb-2 text-foreground">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-base font-bold mt-5 mb-2 text-foreground">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h1 key={idx} className="text-lg font-bold mt-6 mb-3 text-foreground">
              {line.slice(2)}
            </h1>
          );
        }
        // Horizontal rule
        if (line.match(/^-{3,}$/) || line.match(/^\*{3,}$/)) {
          return <hr key={idx} className="my-4 border-black/10" />;
        }
        // List items
        if (line.match(/^[-*]\s/)) {
          return (
            <li key={idx} className="text-xs ml-4 list-disc">
              <InlineMarkdown text={line.slice(2)} />
            </li>
          );
        }
        if (line.match(/^\d+\.\s/)) {
          return (
            <li key={idx} className="text-xs ml-4 list-decimal">
              <InlineMarkdown text={line.replace(/^\d+\.\s/, "")} />
            </li>
          );
        }
        // Empty lines
        if (line.trim() === "") {
          return <div key={idx} className="h-2" />;
        }
        // Regular paragraphs
        return (
          <p key={idx} className="text-xs leading-relaxed">
            <InlineMarkdown text={line} />
          </p>
        );
      })}
    </div>
  );
}

// Inline markdown (bold, code)
function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={idx} className="font-bold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={idx} className="px-1 py-0.5 bg-black/5 rounded text-[10px] font-mono">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}
