import { PromptVersionAnalytics } from "@/lib/prompt-api";
import PromptBadge from "@/components/PromptBadge";

interface Version {
  prompt_id: string;
  name: string;
  version_number: number;
  content: string;
  prompt_hash: string;
  created_at: string;
  is_active: boolean;
}

interface VersionsListProps {
  versions: Version[];
  analytics: Map<number, PromptVersionAnalytics>;
  bestVersion: PromptVersionAnalytics | null;
  currentPromptVersion: string | null;
  promptName: string;
  selectedVersions: Set<number>;
  onToggleSelection: (versionNumber: number) => void;
  onView: (versionNumber: number) => void;
  onRollback: (versionNumber: number) => void;
  onCompare: () => void;
  rollbackLoading: number | null;
}

export default function VersionsList({
  versions,
  analytics,
  bestVersion,
  currentPromptVersion,
  promptName,
  selectedVersions,
  onToggleSelection,
  onView,
  onRollback,
  onCompare,
  rollbackLoading,
}: VersionsListProps) {
  return (
    <div className="space-y-6">
      {/* Comparison Selection Bar */}
      {selectedVersions.size > 0 && (
        <div className="p-4 bg-babyblue/5 border-2 border-babyblue/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-babyblue uppercase tracking-wide">
              {selectedVersions.size === 1
                ? "1 version selected"
                : "2 versions selected"}
            </span>
            <div className="flex items-center gap-2">
              {Array.from(selectedVersions)
                .sort((a, b) => a - b)
                .map((v) => (
                  <PromptBadge
                    key={v}
                    promptId={promptName}
                    promptVersion={`v${v}`}
                  />
                ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => selectedVersions.clear()}
              className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-black/60 hover:text-black transition-colors"
            >
              Clear
            </button>
            <button
              onClick={onCompare}
              disabled={selectedVersions.size !== 2}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wide border-2 border-babyblue bg-babyblue text-white hover:bg-babyblue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)] flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Analyze Comparison
            </button>
          </div>
        </div>
      )}

      {/* Versions List */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-black bg-background flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
              {`/* All Versions */`}
            </h3>
            <p className="text-[10px] text-muted mt-1">
              Select 2 versions to compare and analyze with AI
            </p>
          </div>
          {versions.length >= 2 && selectedVersions.size === 0 && (
            <span className="text-[10px] text-babyblue font-medium animate-pulse">
              Select versions to compare
            </span>
          )}
        </div>

        <div className="divide-y divide-black/5">
          {versions
            .sort((a, b) => b.version_number - a.version_number)
            .map((version) => {
              const versionAnalytics = analytics.get(version.version_number);
              const isBest =
                bestVersion &&
                version.version_number === bestVersion.version_number &&
                versionAnalytics &&
                versionAnalytics.trace_count > 0;
              const isSelected = selectedVersions.has(version.version_number);
              const isCurrent =
                currentPromptVersion &&
                parseInt(currentPromptVersion) === version.version_number;

              return (
                <div
                  key={version.version_number}
                  className={`p-4 transition-colors ${
                    isSelected ? "bg-babyblue/10" : "hover:bg-black/2"
                  } ${isBest ? "ring-2 ring-inset ring-success/30" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox for selection */}
                    <label className="flex items-center pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          onToggleSelection(version.version_number)
                        }
                        className="w-4 h-4 border-2 border-black/30 rounded-sm text-babyblue focus:ring-babyblue cursor-pointer"
                      />
                    </label>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <PromptBadge
                          promptId={promptName}
                          promptVersion={`v${version.version_number}`}
                        />
                        {version.is_active && (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-success text-white">
                            Active
                          </span>
                        )}
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-mustard text-white">
                            Current
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
                        <div className="grid grid-cols-4 gap-3 py-2 px-3 bg-black/2 border border-black/10">
                          <div>
                            <p className="text-[9px] text-black/40 uppercase tracking-wide">
                              Traces
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {versionAnalytics.trace_count.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-black/40 uppercase tracking-wide">
                              Avg Cost
                            </p>
                            <p className="text-sm font-semibold text-mustard">
                              {versionAnalytics.avg_cost > 0
                                ? `$${versionAnalytics.avg_cost.toFixed(4)}`
                                : "$0.00"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-black/40 uppercase tracking-wide">
                              Avg Latency
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {versionAnalytics.avg_latency > 0
                                ? versionAnalytics.avg_latency < 1
                                  ? `${(
                                      versionAnalytics.avg_latency * 1000
                                    ).toFixed(0)}ms`
                                  : `${versionAnalytics.avg_latency.toFixed(
                                      2
                                    )}s`
                                : "0ms"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-black/40 uppercase tracking-wide">
                              Error Rate
                            </p>
                            <p
                              className={`text-sm font-semibold ${
                                versionAnalytics.error_rate_pct === null ||
                                versionAnalytics.error_rate_pct === 0
                                  ? "text-success"
                                  : versionAnalytics.error_rate_pct < 5
                                  ? "text-warning"
                                  : "text-error"
                              }`}
                            >
                              {versionAnalytics.error_rate_pct === null
                                ? "0%"
                                : `${versionAnalytics.error_rate_pct}%`}
                            </p>
                          </div>
                        </div>
                      )}

                      {!versionAnalytics && (
                        <div className="py-2 px-3 bg-black/2 border border-black/10 text-center">
                          <p className="text-[10px] text-black/40">
                            No usage data yet
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => onView(version.version_number)}
                        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 border-babyblue bg-babyblue text-white hover:bg-babyblue/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                      >
                        View
                      </button>
                      <button
                        onClick={() => onRollback(version.version_number)}
                        disabled={rollbackLoading !== null}
                        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 border-error bg-[#D1437C] text-white hover:bg-[#D1437C]/90 disabled:opacity-50 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                      >
                        {rollbackLoading === version.version_number
                          ? "..."
                          : "Rollback"}
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
    </div>
  );
}
