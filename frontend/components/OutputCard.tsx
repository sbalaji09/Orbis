import { ModelOutput } from "@/app/dashboard/playground/PlaygroundClient";
import { ModelLogo } from "./ModelLogo";
import ReactMarkdown from "react-markdown";

interface OutputCardProps {
  output: ModelOutput;
  compareTo?: ModelOutput | null;
  showDiff?: boolean;
  guardrails?: Guardrails;
  isCheapest: boolean;
  isFastest: boolean;
  isMostEfficient: boolean;
}

type DiffLine = { type: "equal" | "add" | "remove"; value: string };

export interface Guardrails {
  requireJson?: boolean;
  mustContain?: string | string[];
  maxLatencySec?: number;
  maxTotalCost?: number;
}

function formatDelta(
  delta: number,
  options: { unit?: string; digits?: number } = {}
): { text: string; direction: "up" | "down" | "flat" } {
  const unit = options.unit ?? "";
  const digits = options.digits ?? 0;
  const abs = Math.abs(delta);
  const rounded = digits > 0 ? abs.toFixed(digits) : Math.round(abs).toString();
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "±";
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return { text: `${sign}${rounded}${unit}`, direction };
}

function buildLineDiff(before: string, after: string): DiffLine[] | null {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");

  const maxLines = 400;
  if (beforeLines.length > maxLines || afterLines.length > maxLines) return null;

  const n = beforeLines.length;
  const m = afterLines.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (beforeLines[i - 1] === afterLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      diff.push({ type: "equal", value: beforeLines[i - 1] });
      i--;
      j--;
      continue;
    }
    if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.push({ type: "add", value: afterLines[j - 1] });
      j--;
      continue;
    }
    if (i > 0) {
      diff.push({ type: "remove", value: beforeLines[i - 1] });
      i--;
    }
  }

  diff.reverse();
  return diff;
}

export function OutputCard({
  output,
  compareTo = null,
  showDiff = false,
  guardrails,
  isCheapest,
  isFastest,
  isMostEfficient,
}: OutputCardProps) {
  const badges = [];
  if (output.cached) badges.push({ label: "Cached", color: "bg-accent-teal" });
  if (isCheapest) badges.push({ label: "Cheapest", color: "bg-green" });
  if (isFastest) badges.push({ label: "Fastest", color: "bg-babyblue" });
  if (isMostEfficient) badges.push({ label: "Efficient", color: "bg-mustard" });

  const metricsDelta = compareTo
    ? {
        tokens:
          output.inputTokens +
          output.outputTokens -
          (compareTo.inputTokens + compareTo.outputTokens),
        cost: output.totalCost - compareTo.totalCost,
        latency: output.latency - compareTo.latency,
      }
    : null;

  const guardrailBadges: Array<{ label: string; pass: boolean }> = [];
  if (!output.error && guardrails) {
    if (guardrails.requireJson) {
      let pass = false;
      try {
        JSON.parse(output.output);
        pass = true;
      } catch {}
      guardrailBadges.push({ label: "JSON", pass });
    }
    const mustContainValues = Array.isArray(guardrails.mustContain)
      ? guardrails.mustContain
      : guardrails.mustContain
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    if (mustContainValues?.length) {
      const missing = mustContainValues.filter((s) => !output.output.includes(s));
      guardrailBadges.push({
        label: "Contains",
        pass: missing.length === 0,
      });
    }
    if (typeof guardrails.maxLatencySec === "number") {
      guardrailBadges.push({
        label: "Latency",
        pass: output.latency <= guardrails.maxLatencySec,
      });
    }
    if (typeof guardrails.maxTotalCost === "number") {
      guardrailBadges.push({
        label: "Cost",
        pass: output.totalCost <= guardrails.maxTotalCost,
      });
    }
  }

  return (
    <div className="border-2 border-black bg-white shadow-[3px_3px_0_rgba(0,0,0,0.1)] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b-2 border-black bg-black/5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <ModelLogo provider={output.model.provider} size={24} />
            <div>
              <h3 className="font-semibold">{output.model.name}</h3>
              <p className="text-[10px] text-black/40 font-mono">
                {output.model.provider}
              </p>
            </div>
          </div>
          {(badges.length > 0 || guardrailBadges.length > 0) && (
            <div className="flex gap-1 flex-wrap justify-end">
              {badges.map((badge) => (
                <span
                  key={badge.label}
                  className={`px-1.5 py-0.5 ${badge.color} text-white text-[8px] font-bold uppercase tracking-wide border border-black`}
                >
                  {badge.label}
                </span>
              ))}
              {guardrailBadges.map((b) => (
                <span
                  key={b.label}
                  className={`px-1.5 py-0.5 ${
                    b.pass ? "bg-green" : "bg-red-500"
                  } text-white text-[8px] font-bold uppercase tracking-wide border border-black`}
                  title={b.pass ? "Guardrail passed" : "Guardrail failed"}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="text-center">
            <p className="text-[9px] text-black/40 uppercase">Tokens</p>
            <p className="text-xs font-semibold font-mono">
              {(output.inputTokens + output.outputTokens).toLocaleString()}
            </p>
            {metricsDelta && (
              <p
                className={`text-[9px] font-mono ${
                  formatDelta(metricsDelta.tokens).direction === "up"
                    ? "text-error"
                    : formatDelta(metricsDelta.tokens).direction === "down"
                    ? "text-green"
                    : "text-black/40"
                }`}
                title="Delta vs compare-to"
              >
                {formatDelta(metricsDelta.tokens).text}
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-[9px] text-black/40 uppercase">Cost</p>
            <p className="text-xs font-semibold font-mono">
              ${output.totalCost.toFixed(6)}
            </p>
            {metricsDelta && (
              <p
                className={`text-[9px] font-mono ${
                  formatDelta(metricsDelta.cost, { digits: 6 }).direction === "up"
                    ? "text-error"
                    : formatDelta(metricsDelta.cost, { digits: 6 }).direction ===
                      "down"
                    ? "text-green"
                    : "text-black/40"
                }`}
                title="Delta vs compare-to"
              >
                ${formatDelta(metricsDelta.cost, { digits: 6 }).text.replace("±", "+")}
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-[9px] text-black/40 uppercase">Time</p>
            <p className="text-xs font-semibold font-mono">
              {output.latency.toFixed(2)}s
            </p>
            {metricsDelta && (
              <p
                className={`text-[9px] font-mono ${
                  formatDelta(metricsDelta.latency, { unit: "s", digits: 2 })
                    .direction === "up"
                    ? "text-error"
                    : formatDelta(metricsDelta.latency, { unit: "s", digits: 2 })
                        .direction === "down"
                    ? "text-green"
                    : "text-black/40"
                }`}
                title="Delta vs compare-to"
              >
                {formatDelta(metricsDelta.latency, { unit: "s", digits: 2 }).text.replace("±", "+")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="p-4 flex-1 overflow-y-auto">
        {output.error ? (
          <div className="border-2 border-red-500 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-xs font-semibold text-red-700 mb-1">
                  Error generating response
                </p>
                <p className="text-xs font-mono text-red-600">
                  {output.error}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {showDiff ? (
              compareTo ? (
                compareTo.error ? (
                  <div className="border-2 border-black/10 bg-black/2 p-3">
                    <p className="text-xs text-black/60 font-mono">
                      Previous run for this model had an error.
                    </p>
                  </div>
                ) : (
                (() => {
                  const diff = buildLineDiff(compareTo.output, output.output);
                  if (!diff) {
                    return (
                      <div className="border-2 border-black/10 bg-black/2 p-3">
                        <p className="text-xs text-black/60 font-mono">
                          Diff view is disabled for large outputs (over 400 lines).
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="border-2 border-black/10 bg-white">
                      <div className="px-3 py-2 border-b border-black/10 bg-black/2 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-black/60">
                          Diff vs Previous Run
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-black/40">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 bg-green/20 border border-black/10" />
                            added
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-500/10 border border-black/10" />
                            removed
                          </span>
                        </div>
                      </div>

                      <div className="p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                        {diff.map((line, idx) => (
                          <div
                            key={idx}
                            className={`flex gap-2 px-2 py-0.5 ${
                              line.type === "add"
                                ? "bg-green/10"
                                : line.type === "remove"
                                ? "bg-red-500/10"
                                : ""
                            }`}
                          >
                            <span
                              className={`w-3 flex-shrink-0 ${
                                line.type === "add"
                                  ? "text-green"
                                  : line.type === "remove"
                                  ? "text-error"
                                  : "text-black/20"
                              }`}
                            >
                              {line.type === "add"
                                ? "+"
                                : line.type === "remove"
                                ? "-"
                                : " "}
                            </span>
                            <span>{line.value || " "}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
                )
              ) : (
                <div className="border-2 border-black/10 bg-black/2 p-3">
                  <p className="text-xs text-black/60 font-mono">
                    No previous output available for this model.
                  </p>
                </div>
              )
            ) : (
              <div className="text-xs prose prose-sm max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-pre:bg-black/5 prose-pre:text-black prose-pre:border-2 prose-pre:border-black/10 prose-code:text-xs prose-code:text-black prose-ul:my-2 prose-ol:my-2">
                <ReactMarkdown>{output.output}</ReactMarkdown>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer - Detailed Stats */}
      <div className="px-4 py-3 border-t-2 border-black bg-black/2">
        <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
          <div>
            <span className="text-black/40">Input tokens:</span>
            <span className="ml-1 font-semibold">
              {output.inputTokens.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-black/40">Output tokens:</span>
            <span className="ml-1 font-semibold">
              {output.outputTokens.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-black/40">Input cost:</span>
            <span className="ml-1 font-semibold">
              ${(output.inputTokens * output.model.costPerInputToken).toFixed(6)}
            </span>
          </div>
          <div>
            <span className="text-black/40">Output cost:</span>
            <span className="ml-1 font-semibold">
              ${(output.outputTokens * output.model.costPerOutputToken).toFixed(6)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
