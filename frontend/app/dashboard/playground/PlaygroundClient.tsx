"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ModelComparison } from "@/components/ModelComparison";
import { InputPanel } from "@/components/InputPanel";
import { CodeExportModal } from "@/components/CodeExportModal";
import { TraceLoaderModal } from "@/components/TraceLoaderModal";
import { Guardrails } from "@/components/OutputCard";
import { ModelLogo } from "@/components/ModelLogo";
import { RegressionReport } from "@/components/RegressionReport";
import { ProviderKeysPanel } from "@/components/ProviderKeysPanel";

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

type SavedBaseline = {
  id: string;
  name: string;
  createdAt: number;
  prompt: string;
  outputs: ModelOutput[];
};

type ActiveBaseline = SavedBaseline & { source: "saved" | "trace" };

const BASELINES_STORAGE_KEY = "orbis.playground.baselines.v1";
const RUN_HISTORY_STORAGE_KEY = "orbis.playground.runHistory.v1";
const PLAYGROUND_STATE_STORAGE_KEY = "orbis.playground.state.v1";
const RUN_HISTORY_LIMIT = 10;

type PlaygroundRun = {
  id: string;
  createdAt: number;
  name: string;
  prompt: string;
  outputs: ModelOutput[];
};

type RemoteBaseline = {
  id: string;
  name: string;
  prompt: string;
  outputs: ModelOutput[];
  createdAt: string;
  updatedAt: string;
};

type RemoteRun = {
  id: string;
  name: string;
  prompt: string;
  outputs: ModelOutput[];
  createdAt: string;
  updatedAt: string;
};

type RemotePlaygroundState = {
  inputPrompt?: string;
  outputs?: ModelOutput[];
  previousOutputs?: ModelOutput[] | null;
  baseline?: ActiveBaseline | null;
  guardrailsDraft?: Partial<{
    requireJson: boolean;
    mustContain: string;
    maxLatencySec: string;
    maxTotalCost: string;
  }>;
  compareRunAId?: string | null;
  compareRunBId?: string | null;
  compareLabel?: string | null;
  inputPanel?: {
    selectedModelIds?: string[];
    customModels?: ModelConfig[];
  };
};

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
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    costPerInputToken: 0.0000025,
    costPerOutputToken: 0.00001,
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
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
    costPerInputToken: 0.0000001, // $0.10/M
    costPerOutputToken: 0.0000004, // $0.40/M
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
    id: "claude-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    costPerInputToken: 0.000003, // $3.00/M
    costPerOutputToken: 0.000015, // $15.00/M
    color: "#ff6b00",
  },
];

export default function App() {
  const [inputPrompt, setInputPrompt] = useState("");
  const [outputs, setOutputs] = useState<ModelOutput[]>([]);
  const [previousOutputs, setPreviousOutputs] = useState<ModelOutput[] | null>(
    null
  );
  const [baseline, setBaseline] = useState<ActiveBaseline | null>(null);
  const [savedBaselines, setSavedBaselines] = useState<SavedBaseline[]>([]);
  const [baselineNameDraft, setBaselineNameDraft] = useState("");
  const [runHistory, setRunHistory] = useState<PlaygroundRun[]>([]);
  const [compareRunAId, setCompareRunAId] = useState<string | null>(null);
  const [compareRunBId, setCompareRunBId] = useState<string | null>(null);
  const [compareLabel, setCompareLabel] = useState<string | null>(null);
  const [runRenameDrafts, setRunRenameDrafts] = useState<Record<string, string>>(
    {}
  );
  const [showRegressionReport, setShowRegressionReport] = useState(false);
  const [lastSelectedModels, setLastSelectedModels] = useState<ModelConfig[]>(
    []
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCodeExport, setShowCodeExport] = useState(false);
  const [showTraceLoader, setShowTraceLoader] = useState(false);
  const [guardrailsDraft, setGuardrailsDraft] = useState({
    requireJson: false,
    mustContain: "",
    maxLatencySec: "",
    maxTotalCost: "",
  });
  const [providerAvailability, setProviderAvailability] = useState<
    Record<string, boolean>
  >({});
  const [selectedModelsDraft, setSelectedModelsDraft] = useState<ModelConfig[]>(
    []
  );
  const [remoteSyncEnabled, setRemoteSyncEnabled] = useState(false);
  const [restoreToken, setRestoreToken] = useState(0);
  const [restoredInputPanel, setRestoredInputPanel] = useState<{
    selectedModelIds: string[];
    customModels: ModelConfig[];
  } | null>(null);
  const [customModelsDraft, setCustomModelsDraft] = useState<ModelConfig[]>([]);

  const inputPanelInitial = useMemo(() => {
    const selectedIds = restoredInputPanel?.selectedModelIds ?? [];
    const custom = restoredInputPanel?.customModels ?? [];
    const byId = new Map<string, ModelConfig>([
      ...AVAILABLE_MODELS.map((m) => [m.id, m] as const),
      ...custom.map((m) => [m.id, m] as const),
    ]);
    const selectedModels = selectedIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, 4) as ModelConfig[];

    return {
      selectedModels,
      customModels: custom,
    };
  }, [restoredInputPanel]);

  const providerKeysRef = useRef<HTMLDivElement | null>(null);
  const inputPanelRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const providerLabels = useMemo(() => {
    return Array.from(new Set(AVAILABLE_MODELS.map((m) => m.provider)));
  }, []);

  const connectedProvidersCount = providerLabels.filter(
    (p) => providerAvailability[p]
  ).length;

  const guardrails: Guardrails = useMemo(
    () => ({
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
    }),
    [guardrailsDraft]
  );

  const skipPersistBaselinesRef = useRef(true);
  const skipPersistRunHistoryRef = useRef(true);
  const skipPersistPlaygroundStateRef = useRef(true);
  const skipRemoteStatePersistRef = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BASELINES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setSavedBaselines(
        parsed
          .filter((b) => b && typeof b.id === "string" && Array.isArray(b.outputs))
          .slice(0, 50)
      );
    } catch {}
  }, []);

  useEffect(() => {
    if (skipPersistBaselinesRef.current) {
      skipPersistBaselinesRef.current = false;
      return;
    }
    try {
      localStorage.setItem(
        BASELINES_STORAGE_KEY,
        JSON.stringify(savedBaselines.slice(0, 50))
      );
    } catch {}
  }, [savedBaselines]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RUN_HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setRunHistory(
        parsed
          .filter((r) => r && typeof r.id === "string" && Array.isArray(r.outputs))
          .slice(0, RUN_HISTORY_LIMIT)
      );
    } catch {}
  }, []);

  useEffect(() => {
    if (skipPersistRunHistoryRef.current) {
      skipPersistRunHistoryRef.current = false;
      return;
    }
    try {
      localStorage.setItem(
        RUN_HISTORY_STORAGE_KEY,
        JSON.stringify(runHistory.slice(0, RUN_HISTORY_LIMIT))
      );
    } catch {}
  }, [runHistory]);

  useEffect(() => {
    let cancelled = false;

    const loadRemote = async () => {
      try {
        const [stateRes, baselinesRes, runsRes] = await Promise.all([
          fetch("/api/playground/state"),
          fetch("/api/playground/baselines"),
          fetch(`/api/playground/runs?limit=${RUN_HISTORY_LIMIT}`),
        ]);

        if (cancelled) return;

        if (stateRes.status === 401 || baselinesRes.status === 401 || runsRes.status === 401) {
          setRemoteSyncEnabled(false);
          return;
        }

        setRemoteSyncEnabled(
          stateRes.ok && baselinesRes.ok && runsRes.ok
        );

        if (baselinesRes.ok) {
          const data = (await baselinesRes.json()) as { baselines?: RemoteBaseline[] };
          const remote = (data.baselines ?? [])
            .map((b) => ({
              id: b.id,
              name: b.name,
              createdAt: Date.parse(b.createdAt),
              prompt: b.prompt,
              outputs: (Array.isArray(b.outputs) ? b.outputs : []) as ModelOutput[],
            }))
            .filter((b) => Number.isFinite(b.createdAt))
            .slice(0, 50);

          setSavedBaselines((local) => {
            const seen = new Set(remote.map((b) => b.id));
            const merged = [...remote, ...local.filter((b) => !seen.has(b.id))];
            return merged.slice(0, 50);
          });
        }

        if (runsRes.ok) {
          const data = (await runsRes.json()) as { runs?: RemoteRun[] };
          const remote = (data.runs ?? [])
            .map((r) => ({
              id: r.id,
              name: r.name,
              createdAt: Date.parse(r.createdAt),
              prompt: r.prompt,
              outputs: (Array.isArray(r.outputs) ? r.outputs : []) as ModelOutput[],
            }))
            .filter((r) => Number.isFinite(r.createdAt))
            .slice(0, RUN_HISTORY_LIMIT);

          setRunHistory((local) => {
            const seen = new Set(remote.map((r) => r.id));
            const merged = [...remote, ...local.filter((r) => !seen.has(r.id))];
            return merged.slice(0, RUN_HISTORY_LIMIT);
          });
        }

        if (stateRes.ok) {
          const data = (await stateRes.json()) as { state?: RemotePlaygroundState | null };
          const state = data.state;
          if (state && typeof state === "object") {
            skipRemoteStatePersistRef.current = true;

            if (typeof state.inputPrompt === "string") setInputPrompt(state.inputPrompt);
            if (Array.isArray(state.outputs)) setOutputs(state.outputs);
            if (Array.isArray(state.previousOutputs) || state.previousOutputs === null) {
              setPreviousOutputs(state.previousOutputs ?? null);
            }
            if (state.baseline === null) setBaseline(null);
            if (state.baseline && typeof state.baseline === "object") {
              setBaseline(state.baseline);
            }
            if (state.guardrailsDraft && typeof state.guardrailsDraft === "object") {
              setGuardrailsDraft((prev) => ({ ...prev, ...state.guardrailsDraft }));
            }
            if (typeof state.compareRunAId === "string" || state.compareRunAId === null) {
              setCompareRunAId(state.compareRunAId ?? null);
            }
            if (typeof state.compareRunBId === "string" || state.compareRunBId === null) {
              setCompareRunBId(state.compareRunBId ?? null);
            }
            if (typeof state.compareLabel === "string" || state.compareLabel === null) {
              setCompareLabel(state.compareLabel ?? null);
            }

            const selectedModelIds = Array.isArray(state.inputPanel?.selectedModelIds)
              ? state.inputPanel!.selectedModelIds!.filter((v) => typeof v === "string")
              : [];
            const customModels = Array.isArray(state.inputPanel?.customModels)
              ? state.inputPanel!.customModels!.filter((m: any) => m && typeof m.id === "string")
              : [];
            setRestoredInputPanel({ selectedModelIds, customModels });
            setCustomModelsDraft(customModels as ModelConfig[]);
            setRestoreToken((t) => t + 1);
          }
        }
      } catch {
        setRemoteSyncEnabled(false);
      }
    };

    loadRemote();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!remoteSyncEnabled) return;
    if (skipRemoteStatePersistRef.current) {
      skipRemoteStatePersistRef.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      fetch("/api/playground/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: {
            inputPrompt,
            outputs,
            previousOutputs,
            baseline,
            guardrailsDraft,
            compareRunAId,
            compareRunBId,
            compareLabel,
            inputPanel: {
              selectedModelIds: selectedModelsDraft.map((m) => m.id),
              customModels: customModelsDraft,
            },
          } satisfies RemotePlaygroundState,
        }),
      }).catch(() => {});
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    remoteSyncEnabled,
    inputPrompt,
    outputs,
    previousOutputs,
    baseline,
    guardrailsDraft,
    compareRunAId,
    compareRunBId,
    compareLabel,
    selectedModelsDraft,
    customModelsDraft,
  ]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLAYGROUND_STATE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || !parsed) return;
      if (typeof parsed.inputPrompt === "string") setInputPrompt(parsed.inputPrompt);
      if (Array.isArray(parsed.outputs)) setOutputs(parsed.outputs);
      if (Array.isArray(parsed.previousOutputs)) setPreviousOutputs(parsed.previousOutputs);
      if (parsed.baseline && typeof parsed.baseline === "object") setBaseline(parsed.baseline);
      if (parsed.guardrailsDraft && typeof parsed.guardrailsDraft === "object") {
        setGuardrailsDraft((prev) => ({ ...prev, ...parsed.guardrailsDraft }));
      }
      if (typeof parsed.compareRunAId === "string" || parsed.compareRunAId === null) {
        setCompareRunAId(parsed.compareRunAId);
      }
      if (typeof parsed.compareRunBId === "string" || parsed.compareRunBId === null) {
        setCompareRunBId(parsed.compareRunBId);
      }
      if (typeof parsed.compareLabel === "string" || parsed.compareLabel === null) {
        setCompareLabel(parsed.compareLabel);
      }
      if (parsed.inputPanel && typeof parsed.inputPanel === "object") {
        const selectedModelIds = Array.isArray(parsed.inputPanel.selectedModelIds)
          ? parsed.inputPanel.selectedModelIds.filter((v: any) => typeof v === "string")
          : [];
        const customModels = Array.isArray(parsed.inputPanel.customModels)
          ? parsed.inputPanel.customModels.filter((m: any) => m && typeof m.id === "string")
          : [];
        setRestoredInputPanel({ selectedModelIds, customModels });
        setCustomModelsDraft(customModels);
        setRestoreToken((t) => t + 1);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Prevent the initial empty render from overwriting saved session state.
    if (skipPersistPlaygroundStateRef.current) {
      skipPersistPlaygroundStateRef.current = false;
      return;
    }
    try {
      localStorage.setItem(
        PLAYGROUND_STATE_STORAGE_KEY,
        JSON.stringify({
          inputPrompt,
          outputs,
          previousOutputs,
          baseline,
          guardrailsDraft,
          compareRunAId,
          compareRunBId,
          compareLabel,
          inputPanel: {
            selectedModelIds: selectedModelsDraft.map((m) => m.id),
            customModels: customModelsDraft,
          },
        })
      );
    } catch {}
  }, [
    inputPrompt,
    outputs,
    previousOutputs,
    baseline,
    guardrailsDraft,
    compareRunAId,
    compareRunBId,
    compareLabel,
    selectedModelsDraft,
    customModelsDraft,
  ]);

  const handleGenerate = async (
    selectedModels: ModelConfig[],
    options: { preserveReport?: boolean } = {}
  ) => {
    if (!inputPrompt.trim() || selectedModels.length === 0) return;

    setIsGenerating(true);
    if (!baseline && outputs.length > 0) setPreviousOutputs(outputs);
    setLastSelectedModels(selectedModels);
    setCompareLabel(null);
    setCompareRunAId(null);
    setCompareRunBId(null);
    if (!options.preserveReport) setShowRegressionReport(false);

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
          customModels: (() => {
            const entries = selectedModels
              .filter((m) => m.id.startsWith("custom:"))
              .map((m) => [
                m.id,
                {
                  provider:
                    m.provider === "Google"
                      ? "gemini"
                      : m.provider === "OpenAI"
                      ? "openai"
                      : m.provider === "xAI"
                      ? "xai"
                      : m.provider === "Groq"
                      ? "groq"
                  : m.provider === "Mistral AI"
                      ? "mistral"
                      : m.provider === "Anthropic"
                      ? "anthropic"
                      : "openai",
                  modelName: m.name,
                  costPerInputToken: m.costPerInputToken,
                  costPerOutputToken: m.costPerOutputToken,
                },
              ] as const);
            return entries.length ? Object.fromEntries(entries) : undefined;
          })(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate responses' }));
        throw new Error(errorData.error || 'Failed to generate responses');
      }

      const data = await response.json();
      const nextOutputs = data.outputs || [];
      setOutputs(nextOutputs);

      const promptSnippet = inputPrompt
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 36);
      const modelsLabel = selectedModels.map((m) => m.name).join(" + ");
      const runName = `${promptSnippet || "Run"} · ${modelsLabel || "models"}`;

      const run: PlaygroundRun = {
        id: createBaselineId(),
        createdAt: Date.now(),
        name: runName,
        prompt: inputPrompt,
        outputs: nextOutputs,
      };
      setRunHistory((prev) => [run, ...prev].slice(0, RUN_HISTORY_LIMIT));

      if (remoteSyncEnabled) {
        fetch("/api/playground/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: run.id,
            name: run.name,
            prompt: run.prompt,
            outputs: run.outputs,
          }),
        }).catch(() => {});
      }
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

  const handleRunReport = async (selectedModels: ModelConfig[]) => {
    setShowRegressionReport(true);
    await handleGenerate(selectedModels, { preserveReport: true });
  };

  const handleProviderStatus = (
    providers: Array<{ label: string; available?: boolean }>
  ) => {
    const next: Record<string, boolean> = {};
    for (const p of providers) {
      if (typeof p.available === "boolean") next[p.label] = p.available;
      if (p.label.startsWith("Google") && typeof p.available === "boolean") {
        next["Google"] = p.available;
      }
      if (
        p.label.startsWith("Anthropic") &&
        typeof p.available === "boolean"
      ) {
        next["Anthropic"] = p.available;
      }
    }
    setProviderAvailability(next);
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
    if (m.includes("gpt")) return "gpt-4o";
    if (m.includes("gemini")) return "gemini-2.5-flash-lite";
    if (m.includes("claude")) return "claude-sonnet";
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

      setInputPrompt(data.prompt ?? "");
      const traceBaseline: ActiveBaseline = {
        id: traceId,
        name: `Trace ${traceId}`,
        createdAt: Date.now(),
        prompt: data.prompt ?? "",
        outputs: [baselineOutput],
        source: "trace",
      };
      setBaseline(traceBaseline);
      setOutputs(traceBaseline.outputs);
      setShowTraceLoader(false);
    } catch (e) {
      console.error("Error replaying trace:", e);
      setShowTraceLoader(false);
    }
  };

  const createBaselineId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `b_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const saveCurrentRunAsBaseline = () => {
    if (!inputPrompt.trim() || outputs.length === 0) return;
    const name =
      baselineNameDraft.trim() || `Baseline · ${new Date().toLocaleString()}`;
    const newBaseline: SavedBaseline = {
      id: createBaselineId(),
      name,
      createdAt: Date.now(),
      prompt: inputPrompt,
      outputs,
    };
    setSavedBaselines((prev) => [newBaseline, ...prev].slice(0, 50));
    setBaselineNameDraft("");

    if (remoteSyncEnabled) {
      fetch("/api/playground/baselines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newBaseline.id,
          name: newBaseline.name,
          prompt: newBaseline.prompt,
          outputs: newBaseline.outputs,
        }),
      }).catch(() => {});
    }
  };

  const loadSavedBaseline = (b: SavedBaseline) => {
    setBaseline({ ...b, source: "saved" });
    setInputPrompt(b.prompt);
    setOutputs(b.outputs);
    setShowTraceLoader(false);
  };

  const deleteSavedBaseline = (baselineId: string) => {
    setSavedBaselines((prev) => prev.filter((b) => b.id !== baselineId));
    if (baseline?.source === "saved" && baseline.id === baselineId) {
      setBaseline(null);
    }

    if (remoteSyncEnabled) {
      fetch("/api/playground/baselines", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: baselineId }),
      }).catch(() => {});
    }
  };

  const compareRuns = () => {
    if (!compareRunAId || !compareRunBId) return;
    const runA = runHistory.find((r) => r.id === compareRunAId);
    const runB = runHistory.find((r) => r.id === compareRunBId);
    if (!runA || !runB) return;

    setBaseline(null);
    setPreviousOutputs(runA.outputs);
    setOutputs(runB.outputs);
    setInputPrompt(runB.prompt);
    setCompareLabel(`${runB.name} vs ${runA.name}`);
  };

  const loadRun = (runId: string) => {
    const run = runHistory.find((r) => r.id === runId);
    if (!run) return;
    setBaseline(null);
    setPreviousOutputs(null);
    setOutputs(run.outputs);
    setInputPrompt(run.prompt);
    setCompareLabel(null);
  };

  const deleteRun = (runId: string) => {
    setRunHistory((prev) => prev.filter((r) => r.id !== runId));
    if (compareRunAId === runId) setCompareRunAId(null);
    if (compareRunBId === runId) setCompareRunBId(null);
    setRunRenameDrafts((prev) => {
      const next = { ...prev };
      delete next[runId];
      return next;
    });

    if (remoteSyncEnabled) {
      fetch("/api/playground/runs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: runId }),
      }).catch(() => {});
    }
  };

  const startRenamingRun = (run: PlaygroundRun) => {
    setRunRenameDrafts((prev) => ({
      ...prev,
      [run.id]: prev[run.id] ?? run.name,
    }));
  };

  const cancelRenamingRun = (runId: string) => {
    setRunRenameDrafts((prev) => {
      const next = { ...prev };
      delete next[runId];
      return next;
    });
  };

  const saveRunName = (runId: string) => {
    const nextName = (runRenameDrafts[runId] ?? "").trim();
    if (!nextName) return;
    const run = runHistory.find((r) => r.id === runId);
    if (!run) return;
    setRunHistory((prev) => prev.map((r) => (r.id === runId ? { ...r, name: nextName } : r)));
    cancelRenamingRun(runId);

    if (remoteSyncEnabled) {
      fetch("/api/playground/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: run.id,
          name: nextName,
          prompt: run.prompt,
          outputs: run.outputs,
        }),
      }).catch(() => {});
    }
  };

  const scrollTo = (ref: { current: HTMLElement | null }) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

        {/* Quick Start */}
        <div className="mb-6 border-2 border-black bg-card shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
          <div className="px-6 py-4 bg-black/5 border-b-2 border-black">
            <h2 className="text-base font-semibold tracking-tight">Quick Start</h2>
            <p className="text-xs text-black/60 mt-1 font-mono">
              {`// Connect a key → pick models → generate → save baselines`}
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border-2 border-black bg-white shadow-[3px_3px_0_rgba(0,0,0,0.12)]">
                <p className="text-[10px] text-black/50 uppercase tracking-wide">
                  Step 1
                </p>
                <p className="text-sm font-semibold mt-1">Connect provider keys</p>
                <p className="text-[10px] text-black/60 font-mono mt-1">
                  {`// ${connectedProvidersCount}/${providerLabels.length} connected`}
                </p>
                <button
                  onClick={() => scrollTo(providerKeysRef)}
                  className="mt-3 px-3 py-2 text-xs font-medium border-2 border-black bg-mustard text-black hover:bg-mustard/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                >
                  Open keys
                </button>
              </div>

              <div className="p-4 border-2 border-black bg-white shadow-[3px_3px_0_rgba(0,0,0,0.12)]">
                <p className="text-[10px] text-black/50 uppercase tracking-wide">
                  Step 2
                </p>
                <p className="text-sm font-semibold mt-1">Pick models + prompt</p>
                <p className="text-[10px] text-black/60 font-mono mt-1">
                  {`// ${selectedModelsDraft.length}/4 selected · ${
                    inputPrompt.trim() ? "prompt ready" : "add a prompt"
                  }`}
                </p>
                <button
                  onClick={() => scrollTo(inputPanelRef)}
                  className="mt-3 px-3 py-2 text-xs font-medium border-2 border-black bg-white hover:bg-black/5 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                >
                  Jump to input
                </button>
              </div>

              <div className="p-4 border-2 border-black bg-white shadow-[3px_3px_0_rgba(0,0,0,0.12)]">
                <p className="text-[10px] text-black/50 uppercase tracking-wide">
                  Step 3
                </p>
                <p className="text-sm font-semibold mt-1">Generate + compare</p>
                <p className="text-[10px] text-black/60 font-mono mt-1">
                  {`// ${outputs.length ? "results ready" : "run once to see results"}`}
                </p>
                <button
                  onClick={() => scrollTo(resultsRef)}
                  className="mt-3 px-3 py-2 text-xs font-medium border-2 border-black bg-babyblue text-white hover:bg-babyblue/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                >
                  View results
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Keys */}
        <div ref={providerKeysRef} id="provider-keys" className="scroll-mt-24">
          <ProviderKeysPanel onStatus={handleProviderStatus} />
        </div>

        {/* Input Panel */}
        <div ref={inputPanelRef} id="prompt" className="scroll-mt-24">
          <InputPanel
            inputPrompt={inputPrompt}
            setInputPrompt={setInputPrompt}
            onGenerate={handleGenerate}
            onRunReport={handleRunReport}
            isGenerating={isGenerating}
            availableModels={AVAILABLE_MODELS}
            providerAvailability={providerAvailability}
            onSelectionChange={setSelectedModelsDraft}
            onCustomModelsChange={setCustomModelsDraft}
            restoreToken={restoreToken}
            initialSelectedModels={inputPanelInitial.selectedModels}
            initialCustomModels={inputPanelInitial.customModels}
          />
        </div>

        {/* Checks */}
        <div className="mb-6 border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
          <div className="px-6 py-4 bg-black/5 border-b-2 border-black">
            <h2 className="text-base font-semibold tracking-tight">
              Checks (optional)
            </h2>
            <p className="text-xs text-black/60 mt-1 font-mono">
              {`// Only affects badges + the report (does not change generation)`}
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

        <div ref={resultsRef} id="results" className="scroll-mt-24" />

        {/* Baseline Banner */}
        {baseline && (
          <div className="mb-6 border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
            <div className="px-6 py-3 bg-black/5 border-b-2 border-black flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Baseline Loaded
                </p>
                <p className="text-[10px] text-black/60 font-mono mt-1">
                  {`// ${baseline.source === "trace" ? "Trace" : "Saved"} · ${baseline.name}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setBaseline(null);
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

        {/* Regression Report */}
        {showRegressionReport && outputs.length > 0 && (
          <div className="mb-6">
            <RegressionReport
              outputs={outputs}
              guardrails={guardrails}
              compareToOutputs={(baseline?.outputs ?? previousOutputs) ?? null}
              compareToLabel={baseline ? "baseline" : compareLabel ?? "previous run"}
            />
          </div>
        )}

        {/* Model Comparison */}
        {outputs.length > 0 && (
          <ModelComparison
            outputs={outputs}
            inputPrompt={inputPrompt}
            previousOutputs={(baseline?.outputs ?? previousOutputs) ?? undefined}
            guardrails={guardrails}
            compareToLabel={baseline ? "baseline" : compareLabel ?? undefined}
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

        {/* Baseline Library */}
        <div className="mt-6 mb-6 border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
          <div className="px-6 py-4 bg-babyblue/10 border-b-2 border-black">
            <h2 className="text-base font-semibold tracking-tight">
              Baseline Library
            </h2>
            <p className="text-xs text-black/60 mt-1 font-mono">
              {`// Save an approved run, then replay to catch regressions`}
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-end gap-3">
              <label className="flex-1">
                <span className="text-[10px] text-black/60 uppercase tracking-wide">
                  Baseline name
                </span>
                <input
                  value={baselineNameDraft}
                  onChange={(e) => setBaselineNameDraft(e.target.value)}
                  placeholder="e.g. Octocat plan v1"
                  className="mt-1 w-full px-3 py-2 border-2 border-black font-mono text-xs focus:outline-none focus:ring-2 focus:ring-babyblue/50"
                />
              </label>
              <button
                onClick={saveCurrentRunAsBaseline}
                disabled={!inputPrompt.trim() || outputs.length === 0}
                className="px-4 py-2 text-xs font-medium border-2 border-black bg-mustard text-black hover:bg-mustard/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[3px_3px_0_rgba(0,0,0,0.2)]"
              >
                Save Current Run
              </button>
            </div>

            {savedBaselines.length === 0 ? (
              <p className="text-xs text-black/40 font-mono">
                {`// No saved baselines yet. Run once, then click "Save Current Run".`}
              </p>
            ) : (
              <div className="border-2 border-black/10 max-h-[220px] overflow-auto">
                {savedBaselines.map((b) => (
                  <div
                    key={b.id}
                    className="px-4 py-3 border-b border-black/10 last:border-b-0 flex items-center justify-between gap-4 bg-white"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{b.name}</p>
                      <p className="text-[10px] text-black/40 font-mono truncate">
                        {`${new Date(b.createdAt).toLocaleString()} · ${b.outputs.length} model${
                          b.outputs.length === 1 ? "" : "s"
                        }`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => loadSavedBaseline(b)}
                        className="px-3 py-2 text-xs font-medium border-2 border-black bg-white hover:bg-black/5 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteSavedBaseline(b.id)}
                        className="px-3 py-2 text-xs font-medium border-2 border-black bg-black text-mustard hover:bg-black/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Run History */}
        <div className="mb-6 border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
          <div className="px-6 py-4 bg-green/10 border-b-2 border-black flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Run History
              </h2>
              <p className="text-xs text-black/60 mt-1 font-mono">
                {`// Pick any two runs to diff A/B`}
              </p>
            </div>
            <button
              onClick={() => {
                setCompareRunAId(null);
                setCompareRunBId(null);
                setCompareLabel(null);
              }}
              className="px-3 py-2 text-xs font-medium border-2 border-black bg-white hover:bg-black/5 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
            >
              Clear A/B
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] text-black/50 font-mono">
            {compareLabel
                  ? `// Comparing: ${compareLabel}`
                  : compareRunAId || compareRunBId
                  ? "// Select both A and B, then Compare"
                  : `// Last ${RUN_HISTORY_LIMIT} runs`}
              </p>
              <button
                onClick={() => {
                  setRunHistory([]);
                  if (remoteSyncEnabled) {
                    fetch("/api/playground/runs?all=1", { method: "DELETE" }).catch(() => {});
                  }
                }}
                disabled={runHistory.length === 0}
                className="px-3 py-2 text-xs font-medium border-2 border-black bg-black text-mustard hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
              >
                Clear History
              </button>
            </div>

            {runHistory.length === 0 ? (
              <p className="text-xs text-black/40 font-mono">
                {`// No runs yet. Click Generate to create one.`}
              </p>
            ) : (
              <div className="border-2 border-black/10 max-h-[260px] overflow-auto">
                {runHistory.map((run) => {
                  const isA = compareRunAId === run.id;
                  const isB = compareRunBId === run.id;
                  const isRenaming = Object.prototype.hasOwnProperty.call(
                    runRenameDrafts,
                    run.id
                  );
                  const draft = runRenameDrafts[run.id] ?? run.name;
                  return (
                    <div
                      key={run.id}
                      className="px-4 py-3 border-b border-black/10 last:border-b-0 flex items-center justify-between gap-4 bg-white"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {(isA || isB) && (
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border border-black text-white ${
                                isA ? "bg-mustard" : "bg-babyblue"
                              }`}
                            >
                              {isA ? "A" : "B"}
                            </span>
                          )}
                          {isRenaming ? (
                            <input
                              value={draft}
                              onChange={(e) =>
                                setRunRenameDrafts((prev) => ({
                                  ...prev,
                                  [run.id]: e.target.value,
                                }))
                              }
                              className="px-2 py-1 border-2 border-black font-mono text-xs w-[420px] max-w-full focus:outline-none focus:ring-2 focus:ring-babyblue/50"
                            />
                          ) : (
                            <p className="text-sm font-semibold truncate">
                              {run.name}
                            </p>
                          )}
                        </div>
                        <p className="text-[10px] text-black/40 font-mono truncate">
                          {`${new Date(run.createdAt).toLocaleString()} · ${run.outputs.length} model${
                            run.outputs.length === 1 ? "" : "s"
                          }`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setCompareRunAId(run.id)}
                          className="px-2.5 py-2 text-xs font-medium border-2 border-black bg-white hover:bg-black/5 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                        >
                          Set A
                        </button>
                        <button
                          onClick={() => setCompareRunBId(run.id)}
                          className="px-2.5 py-2 text-xs font-medium border-2 border-black bg-white hover:bg-black/5 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                        >
                          Set B
                        </button>
                        {isRenaming ? (
                          <>
                            <button
                              onClick={() => saveRunName(run.id)}
                              className="px-2.5 py-2 text-xs font-medium border-2 border-black bg-babyblue text-white hover:bg-babyblue/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => cancelRenamingRun(run.id)}
                              className="px-2.5 py-2 text-xs font-medium border-2 border-black bg-white hover:bg-black/5 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startRenamingRun(run)}
                            className="px-2.5 py-2 text-xs font-medium border-2 border-black bg-white hover:bg-black/5 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                          >
                            Rename
                          </button>
                        )}
                        <button
                          onClick={() => loadRun(run.id)}
                          className="px-2.5 py-2 text-xs font-medium border-2 border-black bg-mustard text-black hover:bg-mustard/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteRun(run.id)}
                          className="px-2.5 py-2 text-xs font-medium border-2 border-black bg-black text-mustard hover:bg-black/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-[10px] text-black/50 font-mono">
                {compareRunAId && compareRunBId
                  ? "// Click Compare to set B as current and A as baseline"
                  : "// Set both A and B to compare"}
              </p>
              <button
                onClick={compareRuns}
                disabled={!compareRunAId || !compareRunBId}
                className="px-4 py-2 text-xs font-medium border-2 border-black bg-babyblue text-white hover:bg-babyblue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[3px_3px_0_rgba(0,0,0,0.2)]"
              >
                Compare A/B
              </button>
            </div>
          </div>
        </div>
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
