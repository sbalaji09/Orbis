"use client";

import { useState } from "react";
import { ModelComparison } from "@/components/ModelComparison";
import { InputPanel } from "@/components/InputPanel";
import { CodeExportModal } from "@/components/CodeExportModal";
import { TraceLoaderModal } from "@/components/TraceLoaderModal";

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
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "grok-4-1",
    name: "Grok 4.1",
    provider: "xAI",
    costPerInputToken: 0.000002,
    costPerOutputToken: 0.000008,
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
    name: "Llama 3.1",
    provider: "Groq",
    costPerInputToken: 0.0000005,
    costPerOutputToken: 0.0000008,
    color: "#e8c302",
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral AI",
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000009,
    color: "#ff7b54",
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    costPerInputToken: 0.0000003,
    costPerOutputToken: 0.0000006,
    color: "#14b8a6",
  },
];

export default function App() {
  const [inputPrompt, setInputPrompt] = useState("");
  const [outputs, setOutputs] = useState<ModelOutput[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCodeExport, setShowCodeExport] = useState(false);
  const [showTraceLoader, setShowTraceLoader] = useState(false);

  const handleGenerate = async (selectedModels: ModelConfig[]) => {
    if (!inputPrompt.trim() || selectedModels.length === 0) return;

    setIsGenerating(true);

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
                  className="px-2 py-1 border border-black/20 bg-white text-[10px] font-mono"
                >
                  <span className="font-semibold">{model.name}</span>
                  <span className="text-black/40 ml-1">
                    ({model.provider})
                  </span>
                </div>
              ))}
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
          <ModelComparison outputs={outputs} inputPrompt={inputPrompt} />
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
      />

      <TraceLoaderModal
        isOpen={showTraceLoader}
        onClose={() => setShowTraceLoader(false)}
        onLoad={handleLoadFromTrace}
      />
    </div>
  );
}
