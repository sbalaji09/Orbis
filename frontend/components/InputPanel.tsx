import { useEffect, useMemo, useState } from "react";
import { ModelConfig } from "@/app/dashboard/playground/PlaygroundClient";
import { ModelLogo } from "@/components/ModelLogo";
import {
  CatalogProvider,
  MODEL_CATALOG,
  ProviderModelPricing,
} from "@/lib/model-catalog";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";

interface InputPanelProps {
  inputPrompt: string;
  setInputPrompt: (prompt: string) => void;
  onGenerate: (selectedModels: ModelConfig[]) => void;
  onRunReport?: (selectedModels: ModelConfig[]) => void;
  isGenerating: boolean;
  availableModels: ModelConfig[];
  providerAvailability?: Record<string, boolean>;
  onSelectionChange?: (selectedModels: ModelConfig[]) => void;
  onCustomModelsChange?: (customModels: ModelConfig[]) => void;
  restoreToken?: number;
  initialSelectedModels?: ModelConfig[];
  initialCustomModels?: ModelConfig[];
}

export function InputPanel({
  inputPrompt,
  setInputPrompt,
  onGenerate,
  onRunReport,
  isGenerating,
  availableModels,
  providerAvailability,
  onSelectionChange,
  onCustomModelsChange,
  restoreToken,
  initialSelectedModels,
  initialCustomModels,
}: InputPanelProps) {
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>([]);
  const [customModels, setCustomModels] = useState<ModelConfig[]>([]);
  const [catalogProvider, setCatalogProvider] =
    useState<CatalogProvider>("OpenAI");
  const [catalogModelName, setCatalogModelName] = useState<string>(() => {
    const first = Object.keys(MODEL_CATALOG.OpenAI)[0];
    return first ?? "gpt-4o";
  });

  const catalogModelsForProvider: Array<{
    name: string;
    pricing: ProviderModelPricing;
  }> = useMemo(() => {
    const entries = Object.entries(MODEL_CATALOG[catalogProvider]).map(
      ([name, pricing]) => ({ name, pricing })
    );
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }, [catalogProvider]);

  useEffect(() => {
    onSelectionChange?.(selectedModels);
  }, [onSelectionChange, selectedModels]);

  useEffect(() => {
    onCustomModelsChange?.(customModels);
  }, [customModels, onCustomModelsChange]);

  useEffect(() => {
    if (!restoreToken) return;
    setCustomModels(Array.isArray(initialCustomModels) ? initialCustomModels : []);
    setSelectedModels(
      Array.isArray(initialSelectedModels) ? initialSelectedModels.slice(0, 4) : []
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreToken]);

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

  const addCatalogModel = () => {
    const modelName = catalogModelName.trim();
    if (!modelName) return;
    const provider = catalogProvider;
    const pricing = MODEL_CATALOG[provider]?.[modelName];
    if (!pricing) return;

    const costPerInputToken = pricing.input / 1_000_000;
    const costPerOutputToken = pricing.output / 1_000_000;
    const id = `custom:${provider}:${modelName}`.replace(/\s+/g, "_");

    const model: ModelConfig = {
      id,
      name: modelName,
      provider,
      costPerInputToken,
      costPerOutputToken,
      color: "#000000",
    };

    setCustomModels((prev) => {
      if (prev.some((m) => m.id === id)) return prev;
      return [model, ...prev].slice(0, 40);
    });

    setSelectedModels((prev) => {
      if (prev.some((m) => m.id === id)) return prev;
      if (prev.length >= 4) return prev;
      return [model, ...prev];
    });
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
              const providerOk =
                providerAvailability?.[model.provider] ?? true;
              const isDisabledByLimit = !isSelected && selectedModels.length >= 4;
              const isDisabled = !providerOk || isDisabledByLimit;

              return (
                <button
                  key={model.id}
                  onClick={() => !isDisabled && toggleModel(model)}
                  disabled={isDisabled && !isSelected}
                  title={
                    !providerOk
                      ? `Connect ${model.provider} API key to use this model`
                      : undefined
                  }
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
                      {!providerOk && (
                        <p className="text-[10px] text-black/40 font-mono mt-1">
                          {`// Connect key to enable`}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* More Models (provider catalog) */}
        <div>
          <label className="text-xs text-black/60 uppercase tracking-wide block mb-2">
            Add More Models (pick provider + model)
          </label>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="min-w-[220px]">
              <span className="text-[10px] text-black/60 uppercase tracking-wide block mb-1">
                Provider
              </span>
              <Listbox
                value={catalogProvider}
                onChange={(next) => {
                  setCatalogProvider(next);
                  const first = Object.keys(MODEL_CATALOG[next] ?? {})[0];
                  if (first) setCatalogModelName(first);
                }}
              >
                <div className="relative">
                  <ListboxButton
                    id="playground-provider-listbox-button"
                    className="w-full px-3 py-2 pr-10 border-2 border-black bg-white text-xs font-medium shadow-[3px_3px_0_rgba(0,0,0,0.15)] hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-babyblue/50"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <ModelLogo provider={catalogProvider} size={18} />
                      <span className="truncate">{catalogProvider}</span>
                    </span>
                    <svg
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </ListboxButton>

                  <ListboxOptions
                    id="playground-provider-listbox-options"
                    className="absolute mt-2 w-full max-h-64 overflow-auto border-2 border-black bg-white shadow-[6px_6px_0_rgba(0,0,0,0.25)] z-[100000] focus:outline-none"
                  >
                    {(Object.keys(MODEL_CATALOG) as CatalogProvider[]).map(
                      (p) => (
                        <ListboxOption
                          key={p}
                          value={p}
                          className={({ active }) =>
                            `cursor-pointer select-none px-3 py-2 border-b border-black/10 last:border-b-0 ${
                              active ? "bg-babyblue/10" : "bg-white"
                            }`
                          }
                        >
                          {({ selected }) => (
                            <div className="flex items-center gap-2 min-w-0">
                              <ModelLogo provider={p} size={18} />
                              <p className="text-xs font-semibold truncate">
                                {p}
                              </p>
                              {selected && (
                                <span className="ml-auto w-5 h-5 bg-black text-mustard border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_rgba(0,0,0,0.15)]">
                                  <svg
                                    className="w-3 h-3"
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
                                </span>
                              )}
                            </div>
                          )}
                        </ListboxOption>
                      )
                    )}
                  </ListboxOptions>
                </div>
              </Listbox>
            </div>

            <div className="min-w-[360px] flex-1">
              <span className="text-[10px] text-black/60 uppercase tracking-wide block mb-1">
                Model
              </span>
              <Listbox value={catalogModelName} onChange={setCatalogModelName}>
                <div className="relative">
                  <ListboxButton
                    id="playground-model-listbox-button"
                    className="w-full px-3 py-2 pr-10 border-2 border-black bg-white text-xs font-medium shadow-[3px_3px_0_rgba(0,0,0,0.15)] hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-babyblue/50"
                  >
                    <span className="truncate font-mono">{catalogModelName}</span>
                    <svg
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </ListboxButton>

                  <ListboxOptions
                    id="playground-model-listbox-options"
                    className="absolute mt-2 w-full max-h-64 overflow-auto border-2 border-black bg-white shadow-[6px_6px_0_rgba(0,0,0,0.25)] z-[100000] focus:outline-none"
                  >
                    {catalogModelsForProvider.map((m) => (
                      <ListboxOption
                        key={m.name}
                        value={m.name}
                        className={({ active }) =>
                          `cursor-pointer select-none px-3 py-2 border-b border-black/10 last:border-b-0 ${
                            active ? "bg-babyblue/10" : "bg-white"
                          }`
                        }
                      >
                        {({ selected }) => (
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold font-mono truncate">
                                {m.name}
                              </p>
                              <p className="text-[10px] text-black/40 font-mono truncate">
                                {`$${m.pricing.input.toFixed(2)}/$${m.pricing.output.toFixed(2)} per 1M`}
                              </p>
                            </div>
                            {selected && (
                              <span className="w-5 h-5 bg-black text-mustard border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_rgba(0,0,0,0.15)]">
                                <svg
                                  className="w-3 h-3"
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
                              </span>
                            )}
                          </div>
                        )}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </div>
              </Listbox>
            </div>

            <button
              onClick={addCatalogModel}
              disabled={!catalogModelName.trim()}
              className="px-4 py-2 text-xs font-medium border-2 border-black bg-mustard text-black hover:bg-mustard/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[3px_3px_0_rgba(0,0,0,0.2)]"
            >
              Add
            </button>
          </div>

          {customModels.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {customModels.map((model) => {
                const isSelected = selectedModels.some((m) => m.id === model.id);
                const providerOk = providerAvailability?.[model.provider] ?? true;
                const isDisabledByLimit = !isSelected && selectedModels.length >= 4;
                const isDisabled = !providerOk || isDisabledByLimit;

                return (
                  <button
                    key={model.id}
                    onClick={() => !isDisabled && toggleModel(model)}
                    disabled={isDisabled && !isSelected}
                    title={
                      !providerOk
                        ? `Connect ${model.provider} API key to use this model`
                        : undefined
                    }
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
                          <span className="text-sm font-semibold truncate">
                            {model.name}
                          </span>
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
                          ${(model.costPerInputToken * 1000000).toFixed(2)}/${(
                            model.costPerOutputToken * 1000000
                          ).toFixed(2)}{" "}
                          per 1M
                        </p>
                        {!providerOk && (
                          <p className="text-[10px] text-black/40 font-mono mt-1">
                            {`// Connect key to enable`}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
