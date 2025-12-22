import React from "react";

interface VersionChangeIndicatorProps {
  semantic_version?: string;
  previous_semantic_version?: string;
}

/**
 * Shows visual indicators for version changes
 * - Major version changes (1.0 -> 2.0): Red "MAJOR" badge
 * - Minor version changes (1.0 -> 1.1): Blue "MINOR" badge
 */
export default function VersionChangeIndicator({
  semantic_version,
  previous_semantic_version,
}: VersionChangeIndicatorProps) {
  if (!semantic_version || !previous_semantic_version) {
    return null;
  }

  const parseVersion = (ver: string): [number, number] => {
    const parts = ver.split(".").map(Number);
    return [parts[0] || 0, parts[1] || 0];
  };

  const [currentMajor, currentMinor] = parseVersion(semantic_version);
  const [prevMajor, prevMinor] = parseVersion(previous_semantic_version);

  // Determine change type
  let changeType: "major" | "minor" | null = null;
  if (currentMajor > prevMajor) {
    changeType = "major";
  } else if (currentMinor > prevMinor) {
    changeType = "minor";
  }

  if (!changeType) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {changeType === "major" ? (
        <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-error text-white shadow-[1px_1px_0_rgba(0,0,0,0.2)]">
          Major
        </span>
      ) : (
        <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide bg-babyblue text-white shadow-[1px_1px_0_rgba(0,0,0,0.2)]">
          Minor
        </span>
      )}
      <span className="text-[10px] text-black/40">
        {previous_semantic_version} → {semantic_version}
      </span>
    </div>
  );
}
