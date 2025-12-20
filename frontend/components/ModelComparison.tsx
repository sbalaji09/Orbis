import { ModelOutput } from "@/app/dashboard/playground/PlaygroundClient";
import { OutputCard, Guardrails } from "@/components/OutputCard";
import { useMemo, useState } from "react";

interface ModelComparisonProps {
  outputs: ModelOutput[];
  inputPrompt: string;
  previousOutputs?: ModelOutput[];
  guardrails?: Guardrails;
}

export function ModelComparison({
  outputs,
  inputPrompt,
  previousOutputs,
  guardrails,
}: ModelComparisonProps) {
  const [diffMode, setDiffMode] = useState(false);

  const previousByModelId = useMemo(() => {
    if (!previousOutputs || previousOutputs.length === 0) return null;
    return new Map(previousOutputs.map((o) => [o.model.id, o]));
  }, [previousOutputs]);

  // Calculate cheapest
  const cheapestOutput = outputs.reduce((prev, current) =>
    current.totalCost < prev.totalCost ? current : prev
  );

  // Calculate fastest
  const fastestOutput = outputs.reduce((prev, current) =>
    current.latency < prev.latency ? current : prev
  );

  // Calculate most efficient (cost per output token)
  const mostEfficientOutput = outputs.reduce((prev, current) => {
    const prevEfficiency = prev.totalCost / prev.outputTokens;
    const currentEfficiency = current.totalCost / current.outputTokens;
    return currentEfficiency < prevEfficiency ? current : prev;
  });

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="border-2 border-black bg-card shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
        <div className="px-6 py-4 bg-green/10 border-b-2 border-black">
          <h2 className="text-base font-semibold tracking-tight">
            Comparison Results
          </h2>
          <p className="text-xs text-black/60 mt-1 font-mono">
            {`// Summary metrics across all models`}
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {/* Cheapest */}
            <div className="p-4 border-2 border-green bg-green/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-green border border-black flex items-center justify-center">
                  <span className="text-white text-xs">$</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Cheapest
                </span>
              </div>
              <p className="text-lg font-bold mb-1">{cheapestOutput.model.name}</p>
              <p className="text-xs text-black/60 font-mono">
                ${cheapestOutput.totalCost.toFixed(6)} total cost
              </p>
            </div>

            {/* Fastest */}
            <div className="p-4 border-2 border-babyblue bg-babyblue/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-babyblue border border-black flex items-center justify-center">
                  <span className="text-white text-base leading-none">⚡</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Fastest
                </span>
              </div>
              <p className="text-lg font-bold mb-1">{fastestOutput.model.name}</p>
              <p className="text-xs text-black/60 font-mono">
                {fastestOutput.latency.toFixed(2)}s latency
              </p>
            </div>

            {/* Most Efficient */}
            <div className="p-4 border-2 border-mustard bg-mustard/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-mustard border border-black flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 17l7-7 4 4 7-7" />
                    <path d="M15 7h6v6" />
                  </svg>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Most Efficient
                </span>
              </div>
              <p className="text-lg font-bold mb-1">{mostEfficientOutput.model.name}</p>
              <p className="text-xs text-black/60 font-mono">
                ${(mostEfficientOutput.totalCost / mostEfficientOutput.outputTokens * 1000).toFixed(4)}/1k tokens
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Outputs */}
      <div className="border-2 border-black bg-card shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
        <div className="px-6 py-4 bg-babyblue/10 border-b-2 border-black">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Model Outputs
              </h2>
              <p className="text-xs text-black/60 mt-1 font-mono">
                {`// Side-by-side comparison of responses`}
              </p>
            </div>

            <label
              className={`flex items-center gap-2 select-none ${
                previousByModelId
                  ? "cursor-pointer"
                  : "opacity-40 cursor-not-allowed"
              }`}
              title={
                previousByModelId
                  ? "Compare to previous run"
                  : "Run the playground twice to enable diff mode"
              }
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-black/70">
                Diff Mode
              </span>
              <button
                type="button"
                onClick={() => previousByModelId && setDiffMode((v) => !v)}
                aria-pressed={diffMode}
                disabled={!previousByModelId}
                className={`w-10 h-5 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)] transition-colors ${
                  diffMode ? "bg-black" : "bg-white"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-mustard border border-black transition-transform ${
                    diffMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              {!previousByModelId && (
                <span className="text-[10px] text-black/50 font-mono">
                  Run again to enable
                </span>
              )}
            </label>
          </div>
        </div>

        <div className={`grid gap-4 p-6 ${outputs.length === 1 ? 'grid-cols-1' : outputs.length === 2 ? 'grid-cols-2' : outputs.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {outputs.map((output) => (
            <OutputCard
              key={output.model.id}
              output={output}
              compareTo={previousByModelId?.get(output.model.id) ?? null}
              showDiff={diffMode}
              guardrails={guardrails}
              isCheapest={output.model.id === cheapestOutput.model.id}
              isFastest={output.model.id === fastestOutput.model.id}
              isMostEfficient={output.model.id === mostEfficientOutput.model.id}
            />
          ))}
        </div>
      </div>

      {/* Cost Comparison Table */}
      <div className="border-2 border-black bg-card shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
        <div className="px-6 py-4 bg-mustard/10 border-b-2 border-black">
          <h2 className="text-base font-semibold tracking-tight">
            Detailed Metrics
          </h2>
          <p className="text-xs text-black/60 mt-1 font-mono">
            {`// Token usage and cost breakdown`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-black bg-black/5">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Model
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  Input Tokens
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  Output Tokens
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  Total Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  Cost/Token
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  Latency
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  vs Cheapest
                </th>
              </tr>
            </thead>
            <tbody>
              {outputs.map((output, idx) => {
                const costPerToken = output.totalCost / (output.inputTokens + output.outputTokens);
                const costVsCheapest = ((output.totalCost / cheapestOutput.totalCost - 1) * 100);
                
                return (
                  <tr
                    key={output.model.id}
                    className={`border-b border-black/10 ${
                      idx % 2 === 0 ? "bg-white" : "bg-black/2"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-sm">{output.model.name}</p>
                        <p className="text-[10px] text-black/40 font-mono">
                          {output.model.provider}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {output.inputTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {output.outputTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                      ${output.totalCost.toFixed(6)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      ${costPerToken.toFixed(8)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {output.latency.toFixed(2)}s
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {costVsCheapest === 0 ? (
                        <span className="text-green font-semibold">✓ Cheapest</span>
                      ) : (
                        <span className="text-error">+{costVsCheapest.toFixed(1)}%</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
