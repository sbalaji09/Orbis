import React, { Fragment, useState, useRef, useEffect } from "react";
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import PromptBadge from "./PromptBadge";
import { PromptComparisonResult } from "@/lib/prompt-api";

interface PromptComparisonViewProps {
  isOpen: boolean;
  onClose: () => void;
  promptName: string;
  version1: number;
  version2: number;
  comparisonData: PromptComparisonResult | null;
  loading?: boolean;
  error?: string | null;
}

type TabType = "side-by-side" | "diff" | "outputs" | "analysis";

export default function PromptComparisonView({
  isOpen,
  onClose,
  promptName,
  version1,
  version2,
  comparisonData,
  loading = false,
  error = null,
}: PromptComparisonViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("side-by-side");
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [syncScroll, setSyncScroll] = useState(true);

  // Sync scroll between panels
  useEffect(() => {
    if (!syncScroll) return;

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

  // Calculate metric deltas
  const getMetricDelta = (v1: number, v2: number, inverse = false) => {
    if (v1 === 0 && v2 === 0)
      return { value: 0, direction: "neutral" as const };
    const delta = ((v2 - v1) / (v1 || 1)) * 100;
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
    return { value: delta, direction };
  };

  // Parse diff for display
  const parseDiff = (diffRaw: string) => {
    const lines = typeof diffRaw === "string" ? diffRaw.split("\n") : [];
    return lines.map((line, idx) => {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        return {
          type: "added" as const,
          content: line.substring(1),
          lineNum: idx + 1,
        };
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        return {
          type: "removed" as const,
          content: line.substring(1),
          lineNum: idx + 1,
        };
      } else if (line.startsWith("@@")) {
        return { type: "header" as const, content: line, lineNum: idx + 1 };
      } else {
        return { type: "unchanged" as const, content: line, lineNum: idx + 1 };
      }
    });
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        onClose={onClose}
        className="fixed inset-0"
        style={{ zIndex: 99999 }}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-7xl h-[90vh] overflow-hidden border-2 border-black bg-white shadow-[8px_8px_0_rgba(0,0,0,0.2)] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b-2 border-black bg-linear-to-r from-babyblue/5 to-transparent shrink-0">
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-lg font-semibold text-foreground">
                      Prompt Comparison
                    </DialogTitle>
                    <div className="mt-2 flex items-center gap-2">
                      <PromptBadge
                        promptId={promptName}
                        promptVersion={`v${version1}`}
                      />
                      <svg
                        className="w-4 h-4 text-black/40"
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
                      <PromptBadge
                        promptId={promptName}
                        promptVersion={`v${version2}`}
                      />
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-foreground/5 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Loading / Error States */}
                {loading && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-babyblue border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-sm text-muted">Analyzing prompts...</p>
                      <p className="text-xs text-black/40 mt-1">
                        This may take a moment
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-error">
                      <svg
                        className="w-12 h-12 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <p className="text-sm font-semibold">
                        Failed to load comparison
                      </p>
                      <p className="text-xs mt-1">{error}</p>
                    </div>
                  </div>
                )}

                {!loading && !error && comparisonData && (
                  <>
                    {/* Metrics Comparison Bar */}
                    <div className="px-6 py-3 border-b border-black/10 bg-black/2 shrink-0">
                      <div className="grid grid-cols-4 gap-4">
                        {/* Traces */}
                        <MetricCard
                          label="Traces"
                          valueA={
                            comparisonData.prompts.version1.analytics
                              ?.trace_count ?? 0
                          }
                          valueB={
                            comparisonData.prompts.version2.analytics
                              ?.trace_count ?? 0
                          }
                          format={(v) => v.toLocaleString()}
                        />
                        {/* Avg Cost */}
                        <MetricCard
                          label="Avg Cost"
                          valueA={
                            comparisonData.prompts.version1.analytics
                              ?.avg_cost ?? 0
                          }
                          valueB={
                            comparisonData.prompts.version2.analytics
                              ?.avg_cost ?? 0
                          }
                          format={(v) => `$${v.toFixed(4)}`}
                          inverse
                        />
                        {/* Avg Latency */}
                        <MetricCard
                          label="Avg Latency"
                          valueA={
                            comparisonData.prompts.version1.analytics
                              ?.avg_latency ?? 0
                          }
                          valueB={
                            comparisonData.prompts.version2.analytics
                              ?.avg_latency ?? 0
                          }
                          format={(v) =>
                            v < 1
                              ? `${(v * 1000).toFixed(0)}ms`
                              : `${v.toFixed(2)}s`
                          }
                          inverse
                        />
                        {/* Error Rate */}
                        <MetricCard
                          label="Error Rate"
                          valueA={
                            comparisonData.prompts.version1.analytics
                              ?.error_rate_pct ?? 0
                          }
                          valueB={
                            comparisonData.prompts.version2.analytics
                              ?.error_rate_pct ?? 0
                          }
                          format={(v) => `${v.toFixed(1)}%`}
                          inverse
                        />
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-0 border-b border-black/10 shrink-0">
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

                    {/* Tab Content */}
                    <div className="flex-1 overflow-hidden">
                      {/* Side by Side */}
                      {activeTab === "side-by-side" && (
                        <div className="h-full grid grid-cols-2 divide-x divide-black/10">
                          <div className="flex flex-col h-full">
                            <div className="px-4 py-2 bg-black/2 border-b border-black/10 shrink-0">
                              <PromptBadge
                                promptId={promptName}
                                promptVersion={`v${version1}`}
                              />
                            </div>
                            <div
                              ref={leftPanelRef}
                              className="flex-1 overflow-auto p-4"
                            >
                              <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed">
                                {comparisonData.prompts.version1.content}
                              </pre>
                            </div>
                          </div>
                          <div className="flex flex-col h-full">
                            <div className="px-4 py-2 bg-black/2 border-b border-black/10 shrink-0">
                              <PromptBadge
                                promptId={promptName}
                                promptVersion={`v${version2}`}
                              />
                            </div>
                            <div
                              ref={rightPanelRef}
                              className="flex-1 overflow-auto p-4"
                            >
                              <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed">
                                {comparisonData.prompts.version2.content}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Diff View */}
                      {activeTab === "diff" && (
                        <div className="h-full overflow-auto">
                          {parseDiff(comparisonData.diff?.raw || "").map(
                            (line, idx) => (
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
                                  {line.type === "added"
                                    ? "+"
                                    : line.type === "removed"
                                    ? "-"
                                    : " "}
                                </span>
                                <span
                                  className={
                                    line.type === "removed"
                                      ? "line-through"
                                      : ""
                                  }
                                >
                                  {line.content || "\u00A0"}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* Sample Outputs */}
                      {activeTab === "outputs" && (
                        <div className="h-full grid grid-cols-2 divide-x divide-black/10 overflow-hidden">
                          <div className="flex flex-col h-full">
                            <div className="px-4 py-2 bg-black/2 border-b border-black/10 shrink-0">
                              <span className="text-xs font-semibold text-black/60">
                                v{version1} Outputs (
                                {
                                  comparisonData.prompts.version1.sample_outputs
                                    .length
                                }
                                )
                              </span>
                            </div>
                            <div className="flex-1 overflow-auto p-4 space-y-3">
                              {comparisonData.prompts.version1.sample_outputs
                                .length === 0 ? (
                                <p className="text-xs text-black/40 text-center py-8">
                                  No outputs available
                                </p>
                              ) : (
                                comparisonData.prompts.version1.sample_outputs.map(
                                  (output, idx) => (
                                    <div
                                      key={idx}
                                      className="p-3 bg-black/2 border border-black/10 rounded"
                                    >
                                      <p className="text-[10px] text-black/40 mb-1">
                                        Output {idx + 1}
                                      </p>
                                      <p className="text-xs font-mono whitespace-pre-wrap text-foreground/80">
                                        {output}
                                      </p>
                                    </div>
                                  )
                                )
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col h-full">
                            <div className="px-4 py-2 bg-black/2 border-b border-black/10 shrink-0">
                              <span className="text-xs font-semibold text-black/60">
                                v{version2} Outputs (
                                {
                                  comparisonData.prompts.version2.sample_outputs
                                    .length
                                }
                                )
                              </span>
                            </div>
                            <div className="flex-1 overflow-auto p-4 space-y-3">
                              {comparisonData.prompts.version2.sample_outputs
                                .length === 0 ? (
                                <p className="text-xs text-black/40 text-center py-8">
                                  No outputs available
                                </p>
                              ) : (
                                comparisonData.prompts.version2.sample_outputs.map(
                                  (output, idx) => (
                                    <div
                                      key={idx}
                                      className="p-3 bg-black/2 border border-black/10 rounded"
                                    >
                                      <p className="text-[10px] text-black/40 mb-1">
                                        Output {idx + 1}
                                      </p>
                                      <p className="text-xs font-mono whitespace-pre-wrap text-foreground/80">
                                        {output}
                                      </p>
                                    </div>
                                  )
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AI Analysis */}
                      {activeTab === "analysis" && (
                        <div className="h-full overflow-auto p-6">
                          <div className="max-w-4xl mx-auto">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-6 h-6 bg-linear-to-br from-babyblue to-babyblue/60 rounded flex items-center justify-center">
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
                              <SimpleMarkdown
                                content={
                                  comparisonData.llm_analysis ||
                                  "No analysis available."
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
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
      <p className="text-[9px] text-black/40 uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs font-mono text-black/60">
          {format(valueA)}
        </span>
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
        <span className="text-xs font-mono text-black/60">
          {format(valueB)}
        </span>
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
            <h3
              key={idx}
              className="text-sm font-bold mt-4 mb-2 text-foreground"
            >
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2
              key={idx}
              className="text-base font-bold mt-5 mb-2 text-foreground"
            >
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h1
              key={idx}
              className="text-lg font-bold mt-6 mb-3 text-foreground"
            >
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
  // Split by bold (**text**) and code (`text`)
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
            <code
              key={idx}
              className="px-1 py-0.5 bg-black/5 rounded text-[10px] font-mono"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}
