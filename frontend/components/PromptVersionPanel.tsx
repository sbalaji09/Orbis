import React, { useState, useEffect, Fragment } from "react";
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import PromptBadge from "./PromptBadge";
import {
  fetchPromptVersions,
  fetchPromptAnalytics,
  PromptVersionAnalytics,
} from "@/lib/prompt-api";

interface Version {
  version_number: number;
  created_at: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
}

// Helper to format cost as currency
function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

// Helper to format latency
function formatLatency(latency: number): string {
  if (latency === 0) return "0ms";
  if (latency < 1) return `${(latency * 1000).toFixed(0)}ms`;
  return `${latency.toFixed(2)}s`;
}

interface PromptVersionPanelProps {
  promptName: string | null;
  isOpen: boolean;
  onClose: () => void;
  onView: (version: number) => void;
  onCompare: (version1: number, version2: number) => void;
  onRollback: (version: number) => void;
}

export default function PromptVersionPanel({
  promptName,
  isOpen,
  onClose,
  onView,
  onCompare,
  onRollback,
}: PromptVersionPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [analytics, setAnalytics] = useState<
    Map<number, PromptVersionAnalytics>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !promptName) return;

    let cancelled = false;

    const loadData = async () => {
      try {
        const [versionsData, analyticsData] = await Promise.all([
          fetchPromptVersions(promptName),
          fetchPromptAnalytics(promptName),
        ]);

        if (cancelled) return;

        setVersions(versionsData);
        const analyticsMap = new Map<number, PromptVersionAnalytics>();
        analyticsData.forEach((a) => analyticsMap.set(a.version_number, a));
        setAnalytics(analyticsMap);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen, promptName]);

  if (!promptName) return null;

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
              <DialogPanel className="w-full max-w-lg max-h-[80vh] overflow-hidden border-2 border-black bg-white shadow-[8px_8px_0_rgba(0,0,0,0.2)] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b-2 border-black bg-linear-to-r from-babyblue/5 to-transparent">
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-lg font-semibold text-foreground">
                      Prompt Versions
                    </DialogTitle>
                    <p className="text-xs text-black/60 font-mono mt-1">
                      {`// ${promptName}`}
                    </p>
                    <p className="text-[10px] text-muted mt-1">
                      {versions.length} versions available
                    </p>
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

                {/* Loading */}
                {loading && (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent" />
                  </div>
                )}

                {/* Versions List */}
                {!loading && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {versions.length === 0 ? (
                      <div className="text-center py-8 text-muted text-sm">
                        No versions found
                      </div>
                    ) : (
                      versions.map((version) => {
                        const versionAnalytics = analytics.get(
                          version.version_number
                        );
                        return (
                          <div
                            key={version.version_number}
                            className={`p-4 border-2 transition-all ${
                              selectedVersion === version.version_number
                                ? "border-babyblue bg-babyblue/5 shadow-[4px_4px_0_rgba(91,95,255,0.2)]"
                                : "border-black/20 bg-white hover:border-black/40 shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <PromptBadge
                                promptId={promptName}
                                promptVersion={`v${version.version_number}`}
                                onClick={() =>
                                  setSelectedVersion(
                                    selectedVersion === version.version_number
                                      ? null
                                      : version.version_number
                                  )
                                }
                              />
                              <div className="flex items-center gap-2">
                                {version.is_active && (
                                  <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-success text-white">
                                    Active
                                  </span>
                                )}
                                <span className="text-[10px] text-black/40 font-mono">
                                  {new Date(
                                    version.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {/* Analytics Stats Row */}
                            {versionAnalytics && (
                              <div className="grid grid-cols-4 gap-2 my-3 py-2 px-3 bg-black/2 border border-black/10">
                                <div className="text-center">
                                  <p className="text-[9px] text-black/40 uppercase tracking-wide">
                                    Traces
                                  </p>
                                  <p className="text-sm font-semibold text-foreground">
                                    {versionAnalytics.trace_count.toLocaleString()}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[9px] text-black/40 uppercase tracking-wide">
                                    Avg Cost
                                  </p>
                                  <p className="text-sm font-semibold text-foreground">
                                    {formatCost(versionAnalytics.avg_cost)}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[9px] text-black/40 uppercase tracking-wide">
                                    Avg Latency
                                  </p>
                                  <p className="text-sm font-semibold text-foreground">
                                    {formatLatency(
                                      versionAnalytics.avg_latency
                                    )}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[9px] text-black/40 uppercase tracking-wide">
                                    Error Rate
                                  </p>
                                  <p
                                    className={`text-sm font-semibold ${
                                      versionAnalytics.error_rate_pct ===
                                        null ||
                                      versionAnalytics.error_rate_pct === 0
                                        ? "text-success"
                                        : versionAnalytics.error_rate_pct < 5
                                        ? "text-warning"
                                        : "text-error"
                                    }`}
                                  >
                                    {versionAnalytics.error_rate_pct === null
                                      ? "—"
                                      : `${versionAnalytics.error_rate_pct}%`}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* No analytics data placeholder */}
                            {!versionAnalytics && (
                              <div className="my-3 py-2 px-3 bg-black/2 border border-black/10 text-center">
                                <p className="text-[10px] text-black/40">
                                  No usage data yet
                                </p>
                              </div>
                            )}

                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => onView(version.version_number)}
                                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 border-babyblue bg-babyblue text-white hover:bg-babyblue/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                              >
                                View
                              </button>
                              <button
                                onClick={() =>
                                  selectedVersion &&
                                  selectedVersion !== version.version_number &&
                                  onCompare(
                                    selectedVersion,
                                    version.version_number
                                  )
                                }
                                disabled={
                                  !selectedVersion ||
                                  selectedVersion === version.version_number
                                }
                                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 border-black bg-white hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                              >
                                Compare
                              </button>
                              <button
                                onClick={() =>
                                  onRollback(version.version_number)
                                }
                                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 border-error bg-[#D1437C] text-white hover:bg-[#D1437C]/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)] ml-auto"
                              >
                                Rollback
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Footer hint */}
                {!loading && versions.length > 1 && (
                  <div className="px-4 py-3 border-t-2 border-black/10 bg-background">
                    <p className="text-[10px] text-black/40">
                      {`// Click a version badge to select it, then click "Compare" on another version`}
                    </p>
                  </div>
                )}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
