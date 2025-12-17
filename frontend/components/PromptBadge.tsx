import React from "react";

interface PromptBadgeProps {
  promptId: string | null;
  promptVersion: string | number;
  onClick?: () => void;
}

export default function PromptBadge({
  promptId,
  promptVersion,
  onClick,
}: PromptBadgeProps) {
  if (!promptId) return null;

  // Ensure version is always displayed as vX.Y format
  const formatVersion = (version: string | number): string => {
    const versionStr = String(version);
    // If it already starts with 'v', return as is
    if (versionStr.startsWith("v")) return versionStr;
    // Otherwise, add 'v' prefix
    return `v${versionStr}`;
  };

  const displayVersion = formatVersion(promptVersion);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono font-medium bg-babyblue/10 text-babyblue border-2 border-babyblue/30 shadow-[2px_2px_0_rgba(0,0,0,0.1)] ${
        onClick ? "cursor-pointer hover:bg-babyblue/20" : ""
      }`}
      title={`Prompt ${promptId} ${displayVersion}`}
      onClick={onClick}
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="truncate max-w-20">{promptId}</span>
      <span className="text-babyblue/60">{displayVersion}</span>
    </span>
  );
}
