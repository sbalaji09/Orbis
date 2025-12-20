import { ModelOutput } from "@/app/dashboard/playground/PlaygroundClient";
import { ModelLogo } from "./ModelLogo";
import ReactMarkdown from "react-markdown";

interface OutputCardProps {
  output: ModelOutput;
  isCheapest: boolean;
  isFastest: boolean;
  isMostEfficient: boolean;
}

export function OutputCard({
  output,
  isCheapest,
  isFastest,
  isMostEfficient,
}: OutputCardProps) {
  const badges = [];
  if (output.cached) badges.push({ label: "Cached", color: "bg-accent-teal" });
  if (isCheapest) badges.push({ label: "Cheapest", color: "bg-green" });
  if (isFastest) badges.push({ label: "Fastest", color: "bg-babyblue" });
  if (isMostEfficient) badges.push({ label: "Efficient", color: "bg-mustard" });

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
          {badges.length > 0 && (
            <div className="flex gap-1">
              {badges.map((badge) => (
                <span
                  key={badge.label}
                  className={`px-1.5 py-0.5 ${badge.color} text-white text-[8px] font-bold uppercase tracking-wide border border-black`}
                >
                  {badge.label}
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
          </div>
          <div className="text-center">
            <p className="text-[9px] text-black/40 uppercase">Cost</p>
            <p className="text-xs font-semibold font-mono">
              ${output.totalCost.toFixed(6)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-black/40 uppercase">Time</p>
            <p className="text-xs font-semibold font-mono">
              {output.latency.toFixed(2)}s
            </p>
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
          <div className="text-xs prose prose-sm max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-pre:bg-black/5 prose-pre:border-2 prose-pre:border-black/10 prose-code:text-xs prose-ul:my-2 prose-ol:my-2">
            <ReactMarkdown>{output.output}</ReactMarkdown>
          </div>
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
