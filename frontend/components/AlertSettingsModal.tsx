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

  // Form state
  const [dailyCostThreshold, setDailyCostThreshold] = useState<number>(10);
  const [dailySpikeMultiplier, setDailySpikeMultiplier] = useState<number>(3);

  // Fetch current settings when modal opens
  useEffect(() => {
    if (isOpen && token) {
      setIsLoading(true);
      setError(null);

      fetchAlertSettings(token)
        .then((data) => {
          if (data) {
            setSettings(data);
            setDailyCostThreshold(data.daily_cost_threshold);
            setDailySpikeMultiplier(data.daily_spike_multiplier);
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
      const updated = await updateAlertSettings(
        {
          daily_cost_threshold: dailyCostThreshold,
          daily_spike_multiplier: dailySpikeMultiplier,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white border-2 border-black shadow-[8px_8px_0_rgba(0,0,0,0.2)] w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black">
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
        <div className="p-6">
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
                    onChange={(e) => setDailyCostThreshold(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 text-sm font-mono border-2 border-black focus:outline-none focus:ring-2 focus:ring-babyblue"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[1, 5, 10, 25, 50].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setDailyCostThreshold(preset)}
                      className={`px-2 py-1 text-xs font-mono border-2 border-black transition-colors ${
                        dailyCostThreshold === preset
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
                    <span>Daily cost exceeds <strong className="font-mono">${dailyCostThreshold.toFixed(2)}</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-mustard">&#9679;</span>
                    <span>Daily cost is <strong>{dailySpikeMultiplier}x</strong> your 14-day average</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t-2 border-black bg-black/5">
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
