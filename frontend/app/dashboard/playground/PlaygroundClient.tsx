"use client";

import { useState } from "react";
import { ModelComparison } from "@/components/ModelComparison";
import { InputPanel } from "@/components/InputPanel";
import { CodeExportModal } from "@/components/CodeExportModal";
import { TraceLoaderModal } from "@/components/TraceLoaderModal";
import { Guardrails } from "@/components/OutputCard";
import { ModelLogo } from "@/components/ModelLogo";

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  costPerInputToken: number;
  costPerOutputToken: number;
  color: string;
}

export interface ModelOutput {
  model: ModelConfig;
  output: string;
  inputTokens: number;
  outputTokens: number;
  latency: number;
  totalCost: number;
  timestamp: number;
  error?: string;
  cached?: boolean;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "grok-4-1",
    name: "Grok 4.1 Fast",
    provider: "xAI",
    costPerInputToken: 0.0000002,
    costPerOutputToken: 0.0000005,
    color: "#e91e8c",
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    costPerInputToken: 0.000005,
    costPerOutputToken: 0.000015,
    color: "#5b5fff",
  },
  {
    id: "groq-llama",
    name: "Llama 3.3 70B",
    provider: "Groq",
    costPerInputToken: 0.00000059,
    costPerOutputToken: 0.00000079,
    color: "#e8c302",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    costPerInputToken: 0.00000125, // $1.25/M
    costPerOutputToken: 0.00001,    // $10/M
    color: "#4285f4",
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral AI",
    costPerInputToken: 0.0000005,
    costPerOutputToken: 0.0000015,
    color: "#ff7b54",
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    costPerInputToken: 0.00000028,
    costPerOutputToken: 0.00000042,
    color: "#14b8a6",
  },
];

export default function App() {
  const [inputPrompt, setInputPrompt] = useState("");
  const [outputs, setOutputs] = useState<ModelOutput[]>([]);
  const [previousOutputs, setPreviousOutputs] = useState<ModelOutput[] | null>(
    null
  );
  const [lastSelectedModels, setLastSelectedModels] = useState<ModelConfig[]>(
    []
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCodeExport, setShowCodeExport] = useState(false);
  const [showTraceLoader, setShowTraceLoader] = useState(false);
  const [baselineTraceId, setBaselineTraceId] = useState<string | null>(null);
  const [baselineModelLabel, setBaselineModelLabel] = useState<string | null>(
    null
  );
  const [guardrailsDraft, setGuardrailsDraft] = useState({
    requireJson: false,
    mustContain: "",
    maxLatencySec: "",
    maxTotalCost: "",
  });

  const guardrails: Guardrails = {
    requireJson: guardrailsDraft.requireJson,
    mustContain: (() => {
      const values = guardrailsDraft.mustContain
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return values.length ? values : undefined;
    })(),
    maxLatencySec: (() => {
      const v = guardrailsDraft.maxLatencySec.trim();
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    })(),
    maxTotalCost: (() => {
      const v = guardrailsDraft.maxTotalCost.trim();
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    })(),
  };

  const handleGenerate = async (selectedModels: ModelConfig[]) => {
    if (!inputPrompt.trim() || selectedModels.length === 0) return;

    setIsGenerating(true);
    if (outputs.length > 0) setPreviousOutputs(outputs);
    setLastSelectedModels(selectedModels);

    try {
      // Call the API with selected models
      const response = await fetch('/api/playground/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: inputPrompt,
          models: selectedModels.map(m => m.id),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate responses' }));
        throw new Error(errorData.error || 'Failed to generate responses');
      }

      const data = await response.json();
      setOutputs(data.outputs || []);
    } catch (error) {
      console.error('Error generating outputs:', error);
      // Show error outputs for all selected models
      const errorOutputs: ModelOutput[] = selectedModels.map(model => ({
        model,
        output: '',
        inputTokens: 0,
        outputTokens: 0,
        latency: 0,
        totalCost: 0,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Failed to generate response',
      }));
      setOutputs(errorOutputs);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadFromTrace = (tracePrompt: string) => {
    setInputPrompt(tracePrompt);
    setShowTraceLoader(false);
  };

  const mapTraceModelToAvailableId = (traceModel: string | null): string | null => {
    if (!traceModel) return null;
    const m = traceModel.toLowerCase();
    if (m.includes("grok")) return "grok-4-1";
    if (m.includes("llama-3.3-70b")) return "groq-llama";
    if (m.includes("mistral-large")) return "mistral-large";
    if (m.includes("deepseek")) return "deepseek-v3";
    if (m.includes("gpt")) return "gpt-5";
    if (m.includes("gemini")) return "gemini-2.5-pro";
    return null;
  };

  const handleReplayFromTrace = async (traceId: string) => {
    try {
      const res = await fetch(`/api/playground/replay/${traceId}`);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(body || "Failed to load trace details");
      }
      const data = await res.json();

      const mappedId = mapTraceModelToAvailableId(data.model);
      const modelConfig =
        (mappedId && AVAILABLE_MODELS.find((m) => m.id === mappedId)) ||
        (data.provider &&
          AVAILABLE_MODELS.find((m) => m.provider === data.provider)) ||
        null;

      const baselineModel: ModelConfig = modelConfig ?? {
        id: mappedId ?? `trace:${traceId}`,
        name: data.model ?? "Model",
        provider: data.provider ?? "Unknown",
        costPerInputToken: 0,
        costPerOutputToken: 0,
        color: "#000000",
      };

      const baselineOutput: ModelOutput = {
        model: baselineModel,
        output: data.output ?? "",
        inputTokens: data.promptTokens ?? 0,
        outputTokens: data.completionTokens ?? 0,
        latency: data.latencySec ?? 0,
        totalCost: data.totalCost ?? 0,
        timestamp: Date.now(),
      };

      setBaselineTraceId(traceId);
      setBaselineModelLabel(
        `${baselineModel.name}${baselineModel.provider ? ` (${baselineModel.provider})` : ""}`
      );
      setInputPrompt(data.prompt ?? "");
      setPreviousOutputs([baselineOutput]);
      setOutputs([baselineOutput]);
      setShowTraceLoader(false);
    } catch (e) {
      console.error("Error replaying trace:", e);
      setShowTraceLoader(false);
    }
  };

    return (
    <div className="h-full w-full bg-background p-6">
        <div className="max-w-[1800px] mx-auto pb-12">
        {/* Header */}
        <div className="mb-6 border-2 border-black bg-card shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
          <div className="px-6 py-4 bg-babyblue/10 border-b-2 border-black">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Model Playground
                </h1>
                <p className="text-xs text-black/60 mt-1 font-mono">
                  {`// Compare outputs from cheap models side-by-side`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTraceLoader(true)}
                  className="px-3 py-2 text-xs font-medium border-2 border-black bg-white hover:bg-black/5 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                >
                  Load from Trace
                </button>
                <button
                  onClick={() => setShowTraceLoader(true)}
                  className="px-3 py-2 text-xs font-medium border-2 border-black bg-mustard text-black hover:bg-mustard/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                >
                  Replay Trace
                </button>
                <button
                  onClick={() => setShowCodeExport(true)}
                  disabled={!inputPrompt.trim()}
                  className="px-3 py-2 text-xs font-medium border-2 border-black bg-mustard text-black hover:bg-mustard/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                >
                  Export Code
                </button>
              </div>
            </div>
          </div>

          {/* Available Models Info */}
          <div className="px-6 py-3 bg-white border-b-2 border-black/10">
            <p className="text-[10px] text-black/40 uppercase tracking-wide mb-2">
              Available Models
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_MODELS.map((model) => (
                <div
                  key={model.id}
                  className="px-2 py-1 border border-black/20 bg-white text-[10px] font-mono flex items-center gap-2"
                >
                  <ModelLogo provider={model.provider} size={14} />
                  <div className="leading-tight">
                    <span className="font-semibold">{model.name}</span>
                    <span className="text-black/40 ml-1">({model.provider})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Baseline Banner */}
        {baselineTraceId && (
          <div className="mb-6 border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
            <div className="px-6 py-3 bg-black/5 border-b-2 border-black flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Replay Baseline Loaded
                </p>
                <p className="text-[10px] text-black/60 font-mono mt-1">
                  {`// Trace ${baselineTraceId} · ${baselineModelLabel ?? "baseline"}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setBaselineTraceId(null);
                  setBaselineModelLabel(null);
                  setPreviousOutputs(null);
                }}
                className="px-3 py-2 text-xs font-medium border-2 border-black bg-white hover:bg-black/5 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
              >
                Clear Baseline
              </button>
            </div>
            <div className="px-6 py-3 bg-white">
              <p className="text-[10px] text-black/50 font-mono">
                {`// Run Generate to replay; enable Diff Mode to compare against this baseline.`}
              </p>
            </div>
          </div>
        )}

        {/* Guardrails */}
        <div className="mb-6 border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
          <div className="px-6 py-4 bg-black/5 border-b-2 border-black">
            <h2 className="text-base font-semibold tracking-tight">
              Guardrails
            </h2>
            <p className="text-xs text-black/60 mt-1 font-mono">
              {`// Lightweight checks to catch regressions during replay`}
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-4">
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={guardrailsDraft.requireJson}
                  onChange={(e) =>
                    setGuardrailsDraft((p) => ({
                      ...p,
                      requireJson: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 border-2 border-black"
                />
                Require JSON output
              </label>

              <label className="block">
                <span className="text-[10px] text-black/60 uppercase tracking-wide">
                  Must contain (comma-separated)
                </span>
                <input
                  value={guardrailsDraft.mustContain}
                  onChange={(e) =>
                    setGuardrailsDraft((p) => ({ ...p, mustContain: e.target.value }))
                  }
                  placeholder="e.g. followers, repos, stars"
                  className="mt-1 w-full px-3 py-2 border-2 border-black font-mono text-xs focus:outline-none focus:ring-2 focus:ring-babyblue/50"
                />
              </label>

              <label className="block">
                <span className="text-[10px] text-black/60 uppercase tracking-wide">
                  Max latency (s)
                </span>
                <input
                  value={guardrailsDraft.maxLatencySec}
                  onChange={(e) =>
                    setGuardrailsDraft((p) => ({ ...p, maxLatencySec: e.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="e.g. 2.0"
                  className="mt-1 w-full px-3 py-2 border-2 border-black font-mono text-xs focus:outline-none focus:ring-2 focus:ring-babyblue/50"
                />
              </label>

              <label className="block">
                <span className="text-[10px] text-black/60 uppercase tracking-wide">
                  Max cost ($)
                </span>
                <input
                  value={guardrailsDraft.maxTotalCost}
                  onChange={(e) =>
                    setGuardrailsDraft((p) => ({ ...p, maxTotalCost: e.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="e.g. 0.01"
                  className="mt-1 w-full px-3 py-2 border-2 border-black font-mono text-xs focus:outline-none focus:ring-2 focus:ring-babyblue/50"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Input Panel */}
        <InputPanel
          inputPrompt={inputPrompt}
          setInputPrompt={setInputPrompt}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          availableModels={AVAILABLE_MODELS}
        />

        {/* Model Comparison */}
        {outputs.length > 0 && (
          <ModelComparison
            outputs={outputs}
            inputPrompt={inputPrompt}
            previousOutputs={previousOutputs ?? undefined}
            guardrails={guardrails}
          />
        )}

        {/* Empty State */}
        {outputs.length === 0 && !isGenerating && (
          <div className="mt-6 border-2 border-dashed border-black/20 bg-white/50 shadow-[4px_4px_0_rgba(0,0,0,0.05)] p-12 text-center">
            <p className="text-sm text-black/40">
              Enter a prompt and select models to start comparing outputs
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CodeExportModal
        isOpen={showCodeExport}
        onClose={() => setShowCodeExport(false)}
        prompt={inputPrompt}
        availableModels={AVAILABLE_MODELS}
        defaultModelId={
          outputs[0]?.model?.id ??
          lastSelectedModels[0]?.id ??
          AVAILABLE_MODELS[0]?.id
        }
      />

      <TraceLoaderModal
        isOpen={showTraceLoader}
        onClose={() => setShowTraceLoader(false)}
        onLoad={handleLoadFromTrace}
        onReplay={handleReplayFromTrace}
      />
    </div>
  );
}
