"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { PROVIDERS, ProviderKeyProvider } from "@/lib/provider-keys";
import { ModelLogo } from "@/components/ModelLogo";

type ProviderStatus = {
  provider: ProviderKeyProvider;
  label: string;
  connected: boolean;
  available?: boolean;
  updatedAt: string | null;
};

export function ProviderKeysPanel({
  onStatus,
}: {
  onStatus?: (providers: ProviderStatus[]) => void;
}) {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderKeyProvider>("openai");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedLabel = useMemo(() => {
    return (
      providers.find((p) => p.provider === selectedProvider)?.label ??
      PROVIDERS.find((p) => p.id === selectedProvider)?.label ??
      selectedProvider
    );
  }, [providers, selectedProvider]);

  const fetchStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/provider-keys");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const next = data.providers || [];
      setProviders(next);
      onStatus?.(next);
    } catch (e) {
      setError("Failed to load provider key status");
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const openConnect = (provider: ProviderKeyProvider) => {
    setSelectedProvider(provider);
    setApiKeyDraft("");
    setModalOpen(true);
  };

  const saveKey = async () => {
    const apiKey = apiKeyDraft.trim();
    if (!apiKey) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/provider-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, apiKey }),
      });
      if (!res.ok) throw new Error(await res.text());
      setModalOpen(false);
      await fetchStatus();
    } catch (e) {
      setError("Failed to save key (check server logs/env)");
    } finally {
      setIsSaving(false);
    }
  };

  const disconnect = async (provider: ProviderKeyProvider) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/provider-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchStatus();
    } catch (e) {
      setError("Failed to remove key");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mb-6 border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
      <div className="px-6 py-4 bg-black/5 border-b-2 border-black">
        <h2 className="text-base font-semibold tracking-tight">Provider Keys</h2>
        <p className="text-xs text-black/60 mt-1 font-mono">
          {`// Connect your own keys to enable specific providers`}
        </p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 border-2 border-red-500 bg-red-50 p-3">
            <p className="text-xs font-mono text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-babyblue border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {(providers.length > 0
              ? providers
              : PROVIDERS.map((p) => ({
                  provider: p.id,
                  label: p.label,
                  connected: false,
                  updatedAt: null,
                }))
            ).map((p) => (
              <div
                key={p.provider}
                className="p-3 border-2 border-black/20 bg-white shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <ModelLogo
                      provider={p.label.startsWith("Google") ? "Google" : p.label}
                      size={22}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.label}</p>
                      <p className="text-[10px] text-black/40 font-mono truncate">
                        {p.connected ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {p.connected ? (
                    <button
                      onClick={() => disconnect(p.provider)}
                      disabled={isSaving}
                      className="px-2.5 py-2 text-xs font-medium border-2 border-black bg-black text-mustard hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => openConnect(p.provider)}
                      className="px-2.5 py-2 text-xs font-medium border-2 border-black bg-mustard text-black hover:bg-mustard/90 transition-colors"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Transition show={modalOpen} as={Fragment}>
        <Dialog onClose={() => setModalOpen(false)} className="fixed inset-0" style={{ zIndex: 99999 }}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-xl border-2 border-black bg-white shadow-[8px_8px_0_rgba(0,0,0,0.3)]">
                  <div className="px-6 py-4 bg-mustard/10 border-b-2 border-black flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-lg font-semibold">
                        Connect {selectedLabel}
                      </DialogTitle>
                      <p className="text-xs text-black/60 font-mono mt-1">
                        {`// encrypted server-side`}
                      </p>
                    </div>
                    <button
                      onClick={() => setModalOpen(false)}
                      className="p-1.5 hover:bg-black/5 transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-muted"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="p-6 space-y-3">
                    <label className="block">
                      <span className="text-[10px] text-black/60 uppercase tracking-wide">
                        API key
                      </span>
                      <input
                        value={apiKeyDraft}
                        onChange={(e) => setApiKeyDraft(e.target.value)}
                        placeholder="Paste your key here"
                        type="password"
                        className="mt-1 w-full px-3 py-2 border-2 border-black font-mono text-xs focus:outline-none focus:ring-2 focus:ring-babyblue/50"
                      />
                    </label>
                    <p className="text-[10px] text-black/50 font-mono">
                      {`// Keys are never stored in localStorage; they’re encrypted on the server before saving to Supabase.`}
                    </p>
                  </div>

                  <div className="px-6 py-4 border-t-2 border-black bg-background flex items-center justify-between">
                    <button
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium border-2 border-black/30 bg-white hover:border-black transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveKey}
                      disabled={isSaving || !apiKeyDraft.trim()}
                      className="px-4 py-2 text-sm font-medium border-2 border-black bg-babyblue text-white hover:bg-babyblue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[3px_3px_0_rgba(0,0,0,0.2)]"
                    >
                      {isSaving ? "Saving..." : "Save Key"}
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
