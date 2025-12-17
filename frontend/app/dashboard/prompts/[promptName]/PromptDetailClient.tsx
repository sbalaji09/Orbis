"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PromptBadge from "@/components/PromptBadge";
import PromptContentViewer from "@/components/PromptContentViewer";
import PromptDiffViewer from "@/components/PromptDiffViewer";
import PromptAnalytics from "@/components/PromptAnalytics";
import {
  fetchPromptVersions,
  fetchPromptContent,
  rollbackPrompt,
} from "@/lib/prompt-api";

interface Version {
  version_number: number;
  created_at: string;
  is_active: boolean;
  content_preview?: string;
  metadata?: Record<string, unknown>;
}

type TabType = "versions" | "analytics";

export default function PromptDetailClient({
  promptName,
}: {
  promptName: string;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("versions");

  // Version selection for comparison
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  // Content viewer state
  const [viewingContent, setViewingContent] = useState<{
    content: string;
    version: number;
  } | null>(null);

  // Diff state
  const [diffState, setDiffState] = useState<{
    oldContent: string;
    newContent: string;
    oldVersion: number;
    newVersion: number;
  } | null>(null);

  // Rolling back state
  const [rollingBack, setRollingBack] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadVersions = async () => {
      setLoading(true);
      try {
        const data = await fetchPromptVersions(undefined, promptName);
        if (!cancelled) {
          setVersions(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadVersions();

    return () => {
      cancelled = true;
    };
  }, [promptName]);

  const handleView = async (version: number) => {
    const content = await fetchPromptContent(undefined, promptName, version);
    if (content) {
      setViewingContent({ content, version });
    }
  };

  const createDiff = (oldContent: string, newContent: string): string => {
    const lines1 = oldContent.split("\n");
    const lines2 = newContent.split("\n");
    const diffLines: string[] = [];

    const maxLen = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLen; i++) {
      const line1 = lines1[i];
      const line2 = lines2[i];
      if (line1 === line2) {
        diffLines.push(` ${line1 || ""}`);
      } else {
        if (line1 !== undefined) diffLines.push(`-${line1}`);
        if (line2 !== undefined) diffLines.push(`+${line2}`);
      }
    }

    return diffLines.join("\n");
  };

  const handleCompare = async (version1: number, version2: number) => {
    const [content1, content2] = await Promise.all([
      fetchPromptContent(undefined, promptName, version1),
      fetchPromptContent(undefined, promptName, version2),
    ]);

    if (content1 && content2) {
      // Ensure older version is on the left
      const [older, newer] =
        version1 < version2 ? [version1, version2] : [version2, version1];
      const [olderContent, newerContent] =
        version1 < version2 ? [content1, content2] : [content2, content1];

      setDiffState({
        oldContent: olderContent,
        newContent: newerContent,
        oldVersion: older,
        newVersion: newer,
      });
    }
  };

  const handleRollback = async (version: number) => {
    setRollingBack(version);
    const result = await rollbackPrompt(undefined, promptName, version);
    if (result) {
      const data = await fetchPromptVersions(undefined, promptName);
      setVersions(data);
    }
    setRollingBack(null);
  };

  const latestVersion =
    versions.length > 0
      ? Math.max(...versions.map((v) => v.version_number))
      : 0;

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto p-6">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            href="/dashboard/prompts"
            className="inline-flex items-center gap-1 text-xs text-black/40 hover:text-babyblue transition-colors"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Prompts
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight mb-1">
                <span className="text-black/40">{`> `}</span>
                {promptName}
              </h1>
              <p className="text-sm text-black/60">
                {`// ${versions.length} versions • Latest: v${latestVersion}`}
              </p>
            </div>
            {latestVersion > 0 && (
              <PromptBadge
                promptId={promptName}
                promptVersion={latestVersion}
                onClick={() => handleView(latestVersion)}
              />
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setActiveTab("versions")}
            className={`px-4 py-2 text-sm font-medium border-2 transition-all ${
              activeTab === "versions"
                ? "bg-black text-mustard border-black"
                : "bg-transparent text-black/60 border-transparent hover:text-foreground hover:bg-black/5"
            }`}
          >
            Versions
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 text-sm font-medium border-2 transition-all ${
              activeTab === "analytics"
                ? "bg-black text-mustard border-black"
                : "bg-transparent text-black/60 border-transparent hover:text-foreground hover:bg-black/5"
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-black/10 w-48"></div>
              <div className="h-24 bg-black/5"></div>
              <div className="h-24 bg-black/5"></div>
            </div>
          </div>
        )}

        {/* Versions Tab */}
        {!loading && activeTab === "versions" && (
          <div className="space-y-4">
            {/* Compare hint */}
            {selectedVersion && (
              <div className="px-4 py-3 bg-babyblue/10 border-2 border-babyblue/30 text-sm">
                <span className="text-babyblue font-medium">
                  v{selectedVersion} selected
                </span>
                <span className="text-black/60 ml-2">
                  — Click &quot;Compare&quot; on another version to see the diff
                </span>
                <button
                  onClick={() => setSelectedVersion(null)}
                  className="ml-3 text-xs text-babyblue hover:underline"
                >
                  Clear selection
                </button>
              </div>
            )}

            {/* Versions list */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
              <div className="px-6 py-4 border-b-2 border-black/10 bg-background">
                <h2 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
                  {`/* Version History */`}
                </h2>
              </div>

              {versions.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-black/40">
                  No versions found
                </div>
              ) : (
                <div className="divide-y divide-black/5">
                  {versions
                    .sort((a, b) => b.version_number - a.version_number)
                    .map((version) => (
                      <div
                        key={version.version_number}
                        className={`px-6 py-4 transition-colors ${
                          selectedVersion === version.version_number
                            ? "bg-babyblue/5"
                            : "hover:bg-black/2"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <PromptBadge
                                promptId={promptName}
                                promptVersion={version.version_number}
                                onClick={() =>
                                  setSelectedVersion(
                                    selectedVersion === version.version_number
                                      ? null
                                      : version.version_number
                                  )
                                }
                              />
                              {version.version_number === latestVersion && (
                                <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-success text-white">
                                  Latest
                                </span>
                              )}
                              {version.is_active && (
                                <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-babyblue text-white">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-black/40 font-mono">
                              Created:{" "}
                              {new Date(version.created_at).toLocaleString()}
                            </p>
                            {version.content_preview && (
                              <p className="text-xs text-black/60 mt-2 line-clamp-2 font-mono">
                                {version.content_preview}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleView(version.version_number)}
                              className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 border-babyblue bg-babyblue text-white hover:bg-babyblue/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  selectedVersion &&
                                  selectedVersion !== version.version_number
                                ) {
                                  handleCompare(
                                    selectedVersion,
                                    version.version_number
                                  );
                                } else {
                                  setSelectedVersion(version.version_number);
                                }
                              }}
                              className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)] ${
                                selectedVersion &&
                                selectedVersion !== version.version_number
                                  ? "border-mustard bg-mustard text-black hover:bg-mustard/90"
                                  : "border-black bg-white hover:bg-black/5"
                              }`}
                            >
                              {selectedVersion &&
                              selectedVersion !== version.version_number
                                ? "Compare"
                                : "Select"}
                            </button>
                            {version.version_number !== latestVersion && (
                              <button
                                onClick={() =>
                                  handleRollback(version.version_number)
                                }
                                disabled={
                                  rollingBack === version.version_number
                                }
                                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-2 border-error bg-error text-white hover:bg-error/90 disabled:opacity-50 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                              >
                                {rollingBack === version.version_number
                                  ? "..."
                                  : "Rollback"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {!loading && activeTab === "analytics" && (
          <PromptAnalytics analytics={[]} loading={false} />
        )}
      </div>

      {/* Content Viewer Modal */}
      {viewingContent && (
        <div className="fixed inset-0 z-100000 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/25 backdrop-blur-sm"
            onClick={() => setViewingContent(null)}
          />
          <div className="relative w-full max-w-3xl">
            <button
              onClick={() => setViewingContent(null)}
              className="absolute -top-2 -right-2 z-10 p-2 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:bg-black/5"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-white bg-black px-3 py-1.5 inline-block border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                {promptName} v{viewingContent.version}
              </h3>
            </div>
            <PromptContentViewer
              isOpen={true}
              onClose={() => setViewingContent(null)}
              promptName={promptName}
              versionNumber={viewingContent.version}
              content={viewingContent.content}
              metadata={{
                description: `Version ${viewingContent.version} of ${promptName}`,
              }}
            />
          </div>
        </div>
      )}

      {/* Diff Viewer Modal */}
      {diffState && (
        <div className="fixed inset-0 z-100000 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/25 backdrop-blur-sm"
            onClick={() => setDiffState(null)}
          />
          <div className="relative w-full max-w-5xl">
            <button
              onClick={() => setDiffState(null)}
              className="absolute -top-2 -right-2 z-10 p-2 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:bg-black/5"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-white bg-black px-3 py-1.5 inline-block border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                {`/* Comparing v${diffState.oldVersion} → v${diffState.newVersion} */`}
              </h3>
            </div>
            <PromptDiffViewer
              isOpen={true}
              onClose={() => setDiffState(null)}
              promptName={promptName}
              version1={diffState.oldVersion}
              version2={diffState.newVersion}
              diff={createDiff(diffState.oldContent, diffState.newContent)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
