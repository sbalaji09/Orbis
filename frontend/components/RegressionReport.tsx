import { ModelOutput } from "@/app/dashboard/playground/PlaygroundClient";
import { Guardrails } from "@/components/OutputCard";
import { useMemo } from "react";
import { safeIsJson } from "@/lib/json-guardrail";

function parseMustContain(mustContain?: Guardrails["mustContain"]): string[] {
  if (!mustContain) return [];
  if (Array.isArray(mustContain)) return mustContain.filter(Boolean);
  return mustContain
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function fmtDelta(delta: number, digits: number, unit = ""): string {
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "±";
  const value = Math.abs(delta).toFixed(digits);
  return `${sign}${value}${unit}`;
}

function statusPill(pass: boolean, label: string) {
  return (
    <span
      className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wide border border-black ${
        pass ? "bg-green text-white" : "bg-red-500 text-white"
      }`}
      title={pass ? "Pass" : "Fail"}
    >
      {label}
    </span>
  );
}

export function RegressionReport({
  outputs,
  guardrails,
  compareToOutputs,
  compareToLabel = "baseline",
}: {
  outputs: ModelOutput[];
  guardrails?: Guardrails;
  compareToOutputs?: ModelOutput[] | null;
  compareToLabel?: string;
}) {
  const compareToByModelId = useMemo(() => {
    if (!compareToOutputs || compareToOutputs.length === 0) return null;
    return new Map(compareToOutputs.map((o) => [o.model.id, o]));
  }, [compareToOutputs]);

  const enabled = useMemo(() => {
    const mustContain = parseMustContain(guardrails?.mustContain);
    return {
      json: !!guardrails?.requireJson,
      contains: mustContain.length > 0,
      latency: typeof guardrails?.maxLatencySec === "number",
      cost: typeof guardrails?.maxTotalCost === "number",
      mustContain,
    };
  }, [guardrails]);

  if (
    !enabled.json &&
    !enabled.contains &&
    !enabled.latency &&
    !enabled.cost &&
    !compareToByModelId
  ) {
    return null;
  }

  return (
    <div className="border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
      <div className="px-6 py-4 bg-mustard/10 border-b-2 border-black">
        <h2 className="text-base font-semibold tracking-tight">
          Regression Report
        </h2>
        <p className="text-xs text-black/60 mt-1 font-mono">
          {`// Guardrail pass/fail + metric deltas`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-black bg-black/5">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                Model
              </th>
              {enabled.json && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  JSON
                </th>
              )}
              {enabled.contains && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Contains
                </th>
              )}
              {enabled.latency && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Latency
                </th>
              )}
              {enabled.cost && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Cost
                </th>
              )}
              {compareToByModelId && (
                <>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                    Diff Tokens
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                    Diff Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                    Diff Time
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {outputs.map((out, idx) => {
              const compareTo = compareToByModelId?.get(out.model.id) ?? null;
              const jsonPass = enabled.json ? safeIsJson(out.output) : true;
              const containsPass = enabled.contains
                ? enabled.mustContain.every((s) => out.output.includes(s))
                : true;
              const latencyPass = enabled.latency
                ? out.latency <= (guardrails!.maxLatencySec as number)
                : true;
              const costPass = enabled.cost
                ? out.totalCost <= (guardrails!.maxTotalCost as number)
                : true;

              const tokensNow = out.inputTokens + out.outputTokens;
              const tokensPrev = compareTo
                ? compareTo.inputTokens + compareTo.outputTokens
                : 0;

              const tokensDelta = compareTo ? tokensNow - tokensPrev : 0;
              const costDelta = compareTo ? out.totalCost - compareTo.totalCost : 0;
              const timeDelta = compareTo ? out.latency - compareTo.latency : 0;

              return (
                <tr
                  key={out.model.id}
                  className={`border-b border-black/10 ${
                    idx % 2 === 0 ? "bg-white" : "bg-black/2"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-sm">{out.model.name}</p>
                      <p className="text-[10px] text-black/40 font-mono">
                        {out.model.provider}
                      </p>
                      {compareToByModelId && (
                        <p className="text-[10px] text-black/40 font-mono">
                          {`vs ${compareToLabel}`}
                        </p>
                      )}
                    </div>
                  </td>
                  {enabled.json && (
                    <td className="px-4 py-3">{statusPill(jsonPass, jsonPass ? "PASS" : "FAIL")}</td>
                  )}
                  {enabled.contains && (
                    <td className="px-4 py-3">
                      {statusPill(containsPass, containsPass ? "PASS" : "FAIL")}
                    </td>
                  )}
                  {enabled.latency && (
                    <td className="px-4 py-3">
                      {statusPill(latencyPass, latencyPass ? "PASS" : "FAIL")}
                      <span className="ml-2 text-[10px] text-black/40 font-mono">
                        {out.latency.toFixed(2)}s / {(guardrails!.maxLatencySec as number).toFixed(2)}s
                      </span>
                    </td>
                  )}
                  {enabled.cost && (
                    <td className="px-4 py-3">
                      {statusPill(costPass, costPass ? "PASS" : "FAIL")}
                      <span className="ml-2 text-[10px] text-black/40 font-mono">
                        ${out.totalCost.toFixed(6)} / ${(guardrails!.maxTotalCost as number).toFixed(6)}
                      </span>
                    </td>
                  )}
                  {compareToByModelId && (
                    <>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {compareTo ? tokensDelta.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {compareTo ? fmtDelta(costDelta, 6) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {compareTo ? fmtDelta(timeDelta, 2, "s") : "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
