"use client";

import { useState, useEffect } from "react";
import { AlertSettings, fetchAlertSettings, updateAlertSettings } from "@/lib/cost-api-client";

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSettingsUpdated?: () => void;
}

const MULTIPLIER_OPTIONS = [
  { value: 2, label: "2x (sensitive)" },
  { value: 3, label: "3x (balanced)" },
  { value: 5, label: "5x (relaxed)" },
  { value: 10, label: "10x (very relaxed)" },
];

const DEFAULT_ALERT_SETTINGS = {
  daily_cost_threshold: 10,
  daily_spike_multiplier: 3,

  budget_alerts_enabled: false,
  monthly_budget_usd: null as number | null,
  monthly_budget_alert_percent: 90,

  error_rate_alerts_enabled: false,
  error_rate_threshold_pct: 5,
  error_rate_window_minutes: 60,
  error_rate_min_traces: 20,

  latency_alerts_enabled: false,
  latency_p95_threshold_seconds: 2,
  latency_window_minutes: 60,
  latency_min_spans: 50,

  prompt_regression_alerts_enabled: false,
  prompt_regression_window_hours: 24,
  prompt_regression_error_rate_increase_pp: 2,
  prompt_regression_latency_increase_seconds: 0.5,
  prompt_regression_min_traces: 20,
};

export function AlertSettingsModal({
  isOpen,
  onClose,
  token,
  onSettingsUpdated
}: AlertSettingsModalProps) {
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toNumberOrNull = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  const toNumberOrFallback = (value: string, fallback: number): number => {
    const n = toNumberOrNull(value);
    return n == null ? fallback : n;
  };

  const toIntOrFallback = (value: string, fallback: number): number => {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  // Form state
  const [dailyCostThreshold, setDailyCostThreshold] = useState<string>("10");
  const [dailySpikeMultiplier, setDailySpikeMultiplier] = useState<number>(3);

  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(false);
  const [monthlyBudgetUsd, setMonthlyBudgetUsd] = useState<string>("");
  const [monthlyBudgetAlertPercent, setMonthlyBudgetAlertPercent] = useState<string>("90");

  const [errorRateAlertsEnabled, setErrorRateAlertsEnabled] = useState(false);
  const [errorRateThresholdPct, setErrorRateThresholdPct] = useState<string>("5");
  const [errorRateWindowMinutes, setErrorRateWindowMinutes] = useState<string>("60");
  const [errorRateMinTraces, setErrorRateMinTraces] = useState<string>("20");

  const [latencyAlertsEnabled, setLatencyAlertsEnabled] = useState(false);
  const [latencyP95ThresholdSeconds, setLatencyP95ThresholdSeconds] = useState<string>("2");
  const [latencyWindowMinutes, setLatencyWindowMinutes] = useState<string>("60");
  const [latencyMinSpans, setLatencyMinSpans] = useState<string>("50");

  const [promptRegressionAlertsEnabled, setPromptRegressionAlertsEnabled] = useState(false);
  const [promptRegressionWindowHours, setPromptRegressionWindowHours] = useState<string>("24");
  const [promptRegressionErrorRateIncreasePp, setPromptRegressionErrorRateIncreasePp] = useState<string>("2");
  const [promptRegressionLatencyIncreaseSeconds, setPromptRegressionLatencyIncreaseSeconds] = useState<string>("0.5");
  const [promptRegressionMinTraces, setPromptRegressionMinTraces] = useState<string>("20");

  // Fetch current settings when modal opens
  useEffect(() => {
    if (isOpen && token) {
      setIsLoading(true);
      setError(null);

      fetchAlertSettings(token)
        .then((data) => {
          if (data) {
            setSettings(data);
            setDailyCostThreshold(String(data.daily_cost_threshold));
            setDailySpikeMultiplier(data.daily_spike_multiplier);

            setBudgetAlertsEnabled(Boolean(data.budget_alerts_enabled));
            setMonthlyBudgetUsd(
              data.monthly_budget_usd == null ? "" : String(data.monthly_budget_usd)
            );
            setMonthlyBudgetAlertPercent(
              typeof data.monthly_budget_alert_percent === "number"
                ? String(data.monthly_budget_alert_percent)
                : String(DEFAULT_ALERT_SETTINGS.monthly_budget_alert_percent)
            );

            setErrorRateAlertsEnabled(Boolean(data.error_rate_alerts_enabled));
            setErrorRateThresholdPct(
              typeof data.error_rate_threshold_pct === "number"
                ? String(data.error_rate_threshold_pct)
                : String(DEFAULT_ALERT_SETTINGS.error_rate_threshold_pct)
            );
            setErrorRateWindowMinutes(
              typeof data.error_rate_window_minutes === "number"
                ? String(data.error_rate_window_minutes)
                : String(DEFAULT_ALERT_SETTINGS.error_rate_window_minutes)
            );
            setErrorRateMinTraces(
              typeof data.error_rate_min_traces === "number"
                ? String(data.error_rate_min_traces)
                : String(DEFAULT_ALERT_SETTINGS.error_rate_min_traces)
            );

            setLatencyAlertsEnabled(Boolean(data.latency_alerts_enabled));
            setLatencyP95ThresholdSeconds(
              typeof data.latency_p95_threshold_seconds === "number"
                ? String(data.latency_p95_threshold_seconds)
                : String(DEFAULT_ALERT_SETTINGS.latency_p95_threshold_seconds)
            );
            setLatencyWindowMinutes(
              typeof data.latency_window_minutes === "number"
                ? String(data.latency_window_minutes)
                : String(DEFAULT_ALERT_SETTINGS.latency_window_minutes)
            );
            setLatencyMinSpans(
              typeof data.latency_min_spans === "number"
                ? String(data.latency_min_spans)
                : String(DEFAULT_ALERT_SETTINGS.latency_min_spans)
            );

            setPromptRegressionAlertsEnabled(Boolean(data.prompt_regression_alerts_enabled));
            setPromptRegressionWindowHours(
              typeof data.prompt_regression_window_hours === "number"
                ? String(data.prompt_regression_window_hours)
                : String(DEFAULT_ALERT_SETTINGS.prompt_regression_window_hours)
            );
            setPromptRegressionErrorRateIncreasePp(
              typeof data.prompt_regression_error_rate_increase_pp === "number"
                ? String(data.prompt_regression_error_rate_increase_pp)
                : String(DEFAULT_ALERT_SETTINGS.prompt_regression_error_rate_increase_pp)
            );
            setPromptRegressionLatencyIncreaseSeconds(
              typeof data.prompt_regression_latency_increase_seconds === "number"
                ? String(data.prompt_regression_latency_increase_seconds)
                : String(DEFAULT_ALERT_SETTINGS.prompt_regression_latency_increase_seconds)
            );
            setPromptRegressionMinTraces(
              typeof data.prompt_regression_min_traces === "number"
                ? String(data.prompt_regression_min_traces)
                : String(DEFAULT_ALERT_SETTINGS.prompt_regression_min_traces)
            );
          }
        })
        .catch((e) => {
          setError("Failed to load settings");
          console.error(e);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, token]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const dailyCostThresholdNum = toNumberOrNull(dailyCostThreshold);
      if (dailyCostThresholdNum == null || dailyCostThresholdNum <= 0) {
        setError("Daily cost threshold must be a number greater than 0.");
        return;
      }

      const monthlyBudgetUsdNum = toNumberOrNull(monthlyBudgetUsd);
      if (budgetAlertsEnabled && (monthlyBudgetUsdNum == null || monthlyBudgetUsdNum <= 0)) {
        setError("Monthly budget must be a number greater than 0.");
        return;
      }

      const monthlyBudgetAlertPercentNum = toNumberOrFallback(
        monthlyBudgetAlertPercent,
        DEFAULT_ALERT_SETTINGS.monthly_budget_alert_percent
      );

      const errorRateThresholdPctNum = toNumberOrFallback(
        errorRateThresholdPct,
        DEFAULT_ALERT_SETTINGS.error_rate_threshold_pct
      );
      const errorRateWindowMinutesNum = toIntOrFallback(
        errorRateWindowMinutes,
        DEFAULT_ALERT_SETTINGS.error_rate_window_minutes
      );
      const errorRateMinTracesNum = toIntOrFallback(
        errorRateMinTraces,
        DEFAULT_ALERT_SETTINGS.error_rate_min_traces
      );

      const latencyP95ThresholdSecondsNum = toNumberOrFallback(
        latencyP95ThresholdSeconds,
        DEFAULT_ALERT_SETTINGS.latency_p95_threshold_seconds
      );
      const latencyWindowMinutesNum = toIntOrFallback(
        latencyWindowMinutes,
        DEFAULT_ALERT_SETTINGS.latency_window_minutes
      );
      const latencyMinSpansNum = toIntOrFallback(
        latencyMinSpans,
        DEFAULT_ALERT_SETTINGS.latency_min_spans
      );

      const promptRegressionWindowHoursNum = toIntOrFallback(
        promptRegressionWindowHours,
        DEFAULT_ALERT_SETTINGS.prompt_regression_window_hours
      );
      const promptRegressionErrorRateIncreasePpNum = toNumberOrFallback(
        promptRegressionErrorRateIncreasePp,
        DEFAULT_ALERT_SETTINGS.prompt_regression_error_rate_increase_pp
      );
      const promptRegressionLatencyIncreaseSecondsNum = toNumberOrFallback(
        promptRegressionLatencyIncreaseSeconds,
        DEFAULT_ALERT_SETTINGS.prompt_regression_latency_increase_seconds
      );
      const promptRegressionMinTracesNum = toIntOrFallback(
        promptRegressionMinTraces,
        DEFAULT_ALERT_SETTINGS.prompt_regression_min_traces
      );

      const updated = await updateAlertSettings(
        {
          daily_cost_threshold: dailyCostThresholdNum,
          daily_spike_multiplier: dailySpikeMultiplier,
          budget_alerts_enabled: budgetAlertsEnabled,
          monthly_budget_usd: budgetAlertsEnabled ? monthlyBudgetUsdNum : null,
          monthly_budget_alert_percent: monthlyBudgetAlertPercentNum,

          error_rate_alerts_enabled: errorRateAlertsEnabled,
          error_rate_threshold_pct: errorRateThresholdPctNum,
          error_rate_window_minutes: errorRateWindowMinutesNum,
          error_rate_min_traces: errorRateMinTracesNum,

          latency_alerts_enabled: latencyAlertsEnabled,
          latency_p95_threshold_seconds: latencyP95ThresholdSecondsNum,
          latency_window_minutes: latencyWindowMinutesNum,
          latency_min_spans: latencyMinSpansNum,

          prompt_regression_alerts_enabled: promptRegressionAlertsEnabled,
          prompt_regression_window_hours: promptRegressionWindowHoursNum,
          prompt_regression_error_rate_increase_pp: promptRegressionErrorRateIncreasePpNum,
          prompt_regression_latency_increase_seconds: promptRegressionLatencyIncreaseSecondsNum,
          prompt_regression_min_traces: promptRegressionMinTracesNum,
        },
        token
      );

      if (updated) {
        setSettings(updated);
        onSettingsUpdated?.();
        onClose();
      } else {
        setError("Failed to save settings");
      }
    } catch (e) {
      setError("Failed to save settings");
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setError(null);

    setDailyCostThreshold(String(DEFAULT_ALERT_SETTINGS.daily_cost_threshold));
    setDailySpikeMultiplier(DEFAULT_ALERT_SETTINGS.daily_spike_multiplier);

    setBudgetAlertsEnabled(DEFAULT_ALERT_SETTINGS.budget_alerts_enabled);
    setMonthlyBudgetUsd("");
    setMonthlyBudgetAlertPercent(String(DEFAULT_ALERT_SETTINGS.monthly_budget_alert_percent));

    setErrorRateAlertsEnabled(DEFAULT_ALERT_SETTINGS.error_rate_alerts_enabled);
    setErrorRateThresholdPct(String(DEFAULT_ALERT_SETTINGS.error_rate_threshold_pct));
    setErrorRateWindowMinutes(String(DEFAULT_ALERT_SETTINGS.error_rate_window_minutes));
    setErrorRateMinTraces(String(DEFAULT_ALERT_SETTINGS.error_rate_min_traces));

    setLatencyAlertsEnabled(DEFAULT_ALERT_SETTINGS.latency_alerts_enabled);
    setLatencyP95ThresholdSeconds(String(DEFAULT_ALERT_SETTINGS.latency_p95_threshold_seconds));
    setLatencyWindowMinutes(String(DEFAULT_ALERT_SETTINGS.latency_window_minutes));
    setLatencyMinSpans(String(DEFAULT_ALERT_SETTINGS.latency_min_spans));

    setPromptRegressionAlertsEnabled(DEFAULT_ALERT_SETTINGS.prompt_regression_alerts_enabled);
    setPromptRegressionWindowHours(String(DEFAULT_ALERT_SETTINGS.prompt_regression_window_hours));
    setPromptRegressionErrorRateIncreasePp(String(DEFAULT_ALERT_SETTINGS.prompt_regression_error_rate_increase_pp));
    setPromptRegressionLatencyIncreaseSeconds(String(DEFAULT_ALERT_SETTINGS.prompt_regression_latency_increase_seconds));
    setPromptRegressionMinTraces(String(DEFAULT_ALERT_SETTINGS.prompt_regression_min_traces));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto py-6 sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white border-2 border-black shadow-[8px_8px_0_rgba(0,0,0,0.2)] w-full max-w-md mx-4 max-h-[calc(100vh-3rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black shrink-0">
          <h2 className="text-lg font-semibold">
            <span className="text-black/40">{`// `}</span>Alert Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 scrollbar-block">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-black/60" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="p-3 bg-error/10 border-2 border-error text-error text-sm">
                  {error}
                </div>
              )}

              {/* Daily Cost Threshold */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Daily Cost Threshold
                </label>
                <p className="text-xs text-black/60 mb-3">
                  Alert when daily spending exceeds this amount
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-mono">$</span>
                  <input
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.01"
                    value={dailyCostThreshold}
                    onChange={(e) => setDailyCostThreshold(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[1, 5, 10, 25, 50].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setDailyCostThreshold(String(preset))}
                      className={`px-2 py-1 text-xs font-mono border-2 border-black transition-colors ${
                        toNumberOrFallback(dailyCostThreshold, -1) === preset
                          ? "bg-babyblue text-white"
                          : "bg-white hover:bg-black/5"
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Spike Multiplier */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Spike Detection Sensitivity
                </label>
                <p className="text-xs text-black/60 mb-3">
                  Alert when daily cost is this many times your average
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {MULTIPLIER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDailySpikeMultiplier(option.value)}
                      className={`px-3 py-2 text-sm font-medium border-2 border-black transition-colors ${
                        dailySpikeMultiplier === option.value
                          ? "bg-babyblue text-white"
                          : "bg-white hover:bg-black/5"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Alerts */}
              <div className="border-t-2 border-black/10 pt-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <label className="block text-sm font-medium">
                      Budget Alerts
                    </label>
                    <p className="text-xs text-black/60 mt-1">
                      Alert when month-to-date spend approaches your budget
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={budgetAlertsEnabled}
                      onChange={(e) => setBudgetAlertsEnabled(e.target.checked)}
                      className="h-4 w-4 border-2 border-black"
                    />
                    Enabled
                  </label>
                </div>

                {budgetAlertsEnabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black/70">
                        Monthly budget (USD)
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-mono">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={monthlyBudgetUsd}
                          onChange={(e) => {
                            setMonthlyBudgetUsd(e.target.value);
                          }}
                          className="flex-1 px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                          placeholder="e.g. 500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1 text-black/70">
                        Alert at (% of budget)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={monthlyBudgetAlertPercent}
                          onChange={(e) => setMonthlyBudgetAlertPercent(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                        />
                        <span className="text-sm font-mono text-black/70">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Rate Alerts */}
              <div className="border-t-2 border-black/10 pt-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <label className="block text-sm font-medium">
                      Error Rate Alerts
                    </label>
                    <p className="text-xs text-black/60 mt-1">
                      Alert when trace error rate exceeds a threshold
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={errorRateAlertsEnabled}
                      onChange={(e) => setErrorRateAlertsEnabled(e.target.checked)}
                      className="h-4 w-4 border-2 border-black"
                    />
                    Enabled
                  </label>
                </div>

                {errorRateAlertsEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1 text-black/70">
                        Threshold (%)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={errorRateThresholdPct}
                          onChange={(e) => setErrorRateThresholdPct(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                        />
                        <span className="text-sm font-mono text-black/70">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black/70">
                        Window (minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="1440"
                        step="5"
                        value={errorRateWindowMinutes}
                        onChange={(e) => setErrorRateWindowMinutes(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black/70">
                        Min traces
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={errorRateMinTraces}
                        onChange={(e) => setErrorRateMinTraces(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Latency Alerts */}
              <div className="border-t-2 border-black/10 pt-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <label className="block text-sm font-medium">
                      Latency Alerts
                    </label>
                    <p className="text-xs text-black/60 mt-1">
                      Alert when p95 latency crosses a threshold
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={latencyAlertsEnabled}
                      onChange={(e) => setLatencyAlertsEnabled(e.target.checked)}
                      className="h-4 w-4 border-2 border-black"
                    />
                    Enabled
                  </label>
                </div>

                {latencyAlertsEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1 text-black/70">
                        p95 threshold (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={latencyP95ThresholdSeconds}
                        onChange={(e) => setLatencyP95ThresholdSeconds(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black/70">
                        Window (minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="1440"
                        step="5"
                        value={latencyWindowMinutes}
                        onChange={(e) => setLatencyWindowMinutes(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black/70">
                        Min spans
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={latencyMinSpans}
                        onChange={(e) => setLatencyMinSpans(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Prompt Regression Alerts */}
              <div className="border-t-2 border-black/10 pt-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <label className="block text-sm font-medium">
                      Prompt Regression Alerts
                    </label>
                    <p className="text-xs text-black/60 mt-1">
                      Alert when the newest prompt version regresses vs the previous version
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={promptRegressionAlertsEnabled}
                      onChange={(e) => setPromptRegressionAlertsEnabled(e.target.checked)}
                      className="h-4 w-4 border-2 border-black"
                    />
                    Enabled
                  </label>
                </div>

                {promptRegressionAlertsEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black/70">
                        Window (hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="336"
                        step="1"
                        value={promptRegressionWindowHours}
                        onChange={(e) => setPromptRegressionWindowHours(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black/70">
                        Min traces / version
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={promptRegressionMinTraces}
                        onChange={(e) => setPromptRegressionMinTraces(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1 text-black/70">
                        Error rate increase (percentage points)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={promptRegressionErrorRateIncreasePp}
                        onChange={(e) => setPromptRegressionErrorRateIncreasePp(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1 text-black/70">
                        p95 latency increase (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={promptRegressionLatencyIncreaseSeconds}
                        onChange={(e) => setPromptRegressionLatencyIncreaseSeconds(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="p-4 bg-black/5 border-2 border-black/20">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-black/60 mb-2">
                  Alert Preview
                </h4>
                <p className="text-sm">
                  You&apos;ll be alerted if:
                </p>
                <ul className="text-sm text-black/80 mt-2 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-mustard">&#9679;</span>
                    <span>
                      Daily cost exceeds{" "}
                      <strong className="font-mono">
                        ${toNumberOrFallback(dailyCostThreshold, 0).toFixed(2)}
                      </strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-mustard">&#9679;</span>
                    <span>Daily cost is <strong>{dailySpikeMultiplier}x</strong> your 14-day average</span>
                  </li>
                  {budgetAlertsEnabled && toNumberOrFallback(monthlyBudgetUsd, 0) > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-mustard">&#9679;</span>
                      <span>
                        Month-to-date spend reaches{" "}
                        <strong className="font-mono">
                          {toNumberOrFallback(monthlyBudgetAlertPercent, 0).toFixed(0)}%
                        </strong>{" "}
                        of{" "}
                        <strong className="font-mono">
                          ${toNumberOrFallback(monthlyBudgetUsd, 0).toFixed(2)}
                        </strong>
                      </span>
                    </li>
                  )}
                  {errorRateAlertsEnabled && (
                    <li className="flex items-start gap-2">
                      <span className="text-mustard">&#9679;</span>
                      <span>
                        Error rate exceeds{" "}
                        <strong className="font-mono">
                          {toNumberOrFallback(errorRateThresholdPct, 0).toFixed(2)}%
                        </strong>{" "}
                        over <strong className="font-mono">{toIntOrFallback(errorRateWindowMinutes, 0)}m</strong>
                      </span>
                    </li>
                  )}
                  {latencyAlertsEnabled && (
                    <li className="flex items-start gap-2">
                      <span className="text-mustard">&#9679;</span>
                      <span>
                        p95 latency exceeds{" "}
                        <strong className="font-mono">
                          {toNumberOrFallback(latencyP95ThresholdSeconds, 0).toFixed(2)}s
                        </strong>{" "}
                        over <strong className="font-mono">{toIntOrFallback(latencyWindowMinutes, 0)}m</strong>
                      </span>
                    </li>
                  )}
                  {promptRegressionAlertsEnabled && (
                    <li className="flex items-start gap-2">
                      <span className="text-mustard">&#9679;</span>
                      <span>
                        Prompt version error rate increases by{" "}
                        <strong className="font-mono">
                          {toNumberOrFallback(promptRegressionErrorRateIncreasePp, 0).toFixed(2)}pp
                        </strong>{" "}
                        or p95 latency by{" "}
                        <strong className="font-mono">
                          {toNumberOrFallback(promptRegressionLatencyIncreaseSeconds, 0).toFixed(2)}s
                        </strong>
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t-2 border-black bg-black/5 shrink-0">
          <button
            onClick={handleResetDefaults}
            disabled={isLoading || isSaving}
            className="mr-auto px-4 py-2 text-sm font-medium border-2 border-black bg-white hover:bg-black/5 transition-colors disabled:opacity-50"
            title="Reset alert thresholds to recommended defaults"
          >
            Reset Defaults
          </button>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium border-2 border-black bg-white hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="px-4 py-2 text-sm font-medium border-2 border-black bg-babyblue text-white hover:bg-babyblue/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertSettingsModal;
