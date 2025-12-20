import { useState } from "react";
import { ModelConfig } from "@/app/dashboard/playground/PlaygroundClient";
import { ModelLogo } from "@/components/ModelLogo";

interface InputPanelProps {
  inputPrompt: string;
  setInputPrompt: (prompt: string) => void;
  onGenerate: (selectedModels: ModelConfig[]) => void;
  onRunReport?: (selectedModels: ModelConfig[]) => void;
  isGenerating: boolean;
  availableModels: ModelConfig[];
}

export function InputPanel({
  inputPrompt,
  setInputPrompt,
  onGenerate,
  onRunReport,
  isGenerating,
  availableModels,
}: InputPanelProps) {
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>([]);

  const toggleModel = (model: ModelConfig) => {
    setSelectedModels((prev) => {
      const exists = prev.find((m) => m.id === model.id);
      if (exists) {
        return prev.filter((m) => m.id !== model.id);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, model];
    });
  };

  const handleGenerate = () => {
    if (selectedModels.length === 0) return;
    onGenerate(selectedModels);
  };

  const handleRunReport = () => {
    if (selectedModels.length === 0) return;
    onRunReport?.(selectedModels);
  };

  return (
    <div className="border-2 border-black bg-card shadow-[4px_4px_0_rgba(0,0,0,0.15)] mb-6">
      <div className="px-6 py-4 bg-mustard/10 border-b-2 border-black">
        <h2 className="text-base font-semibold tracking-tight">Input Prompt</h2>
        <p className="text-xs text-black/60 mt-1 font-mono">
          {`// Enter your prompt and select up to 4 models to compare`}
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* Prompt Input */}
        <div>
          <label className="text-xs text-black/60 uppercase tracking-wide block mb-2">
            Your Prompt
          </label>
          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={6}
            className="w-full px-4 py-3 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-babyblue/50 resize-none"
          />
        </div>

        {/* Model Selection */}
        <div>
          <label className="text-xs text-black/60 uppercase tracking-wide block mb-2">
            Select Models to Compare (max 4)
          </label>
          <div className="grid grid-cols-3 gap-3">
            {availableModels.map((model) => {
              const isSelected = selectedModels.some((m) => m.id === model.id);
              const isDisabled = !isSelected && selectedModels.length >= 4;

              return (
                <button
                  key={model.id}
                  onClick={() => !isDisabled && toggleModel(model)}
                  disabled={isDisabled && !isSelected}
                  className={`p-3 border-2 transition-all ${
                    isSelected
                      ? "border-babyblue bg-babyblue/10 shadow-[3px_3px_0_rgba(91,95,255,0.3)]"
                      : isDisabled
                      ? "border-black/10 bg-black/5 opacity-40 cursor-not-allowed"
                      : "border-black/30 bg-white hover:border-black hover:shadow-[3px_3px_0_rgba(0,0,0,0.15)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ModelLogo provider={model.provider} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold truncate">{model.name}</span>
                        {isSelected && (
                          <div className="w-4 h-4 bg-babyblue border border-black flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-black/50 font-mono">
                        ${(model.costPerInputToken * 1000000).toFixed(2)}/${(model.costPerOutputToken * 1000000).toFixed(2)} per 1M
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-black/40">
            {selectedModels.length === 0 ? (
              "Select at least one model"
            ) : (
              <>
                <span className="font-semibold text-black">
                  {selectedModels.length}
                </span>{" "}
                model{selectedModels.length > 1 ? "s" : ""} selected
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            {onRunReport && (
              <button
                onClick={handleRunReport}
                disabled={
                  isGenerating || !inputPrompt.trim() || selectedModels.length === 0
                }
                className="px-5 py-3 bg-babyblue text-white border-2 border-black font-medium hover:bg-babyblue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Running...
                  </span>
                ) : (
                  "Run Report"
                )}
              </button>
            )}

            <button
              onClick={handleGenerate}
              disabled={
                isGenerating || !inputPrompt.trim() || selectedModels.length === 0
              }
              className="px-6 py-3 bg-black text-mustard border-2 border-black font-medium hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-mustard border-t-transparent" />
                  Generating...
                </span>
              ) : (
                "Generate & Compare"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
