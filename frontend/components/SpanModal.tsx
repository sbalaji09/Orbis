"use client";

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Fragment } from "react";
import { Span } from "@/lib/types";

interface SpanModalProps {
  span: Span;
  isOpen: boolean;
  onClose: () => void;
}

function formatDuration(duration: number | null): string {
  if (duration === null) return "N/A";
  if (duration < 1) return `${duration.toFixed(2)}ms`;
  if (duration < 1000) return `${duration.toFixed(0)}ms`;
  return `${(duration / 1000).toFixed(3)}s`;
}

function formatCost(cost: number | null): string {
  if (cost === null) return "N/A";
  return `$${cost.toFixed(4)}`;
}

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return new Date(date.toString() + "Z").toLocaleString();
}

// Skeleton component for loading states
function Skeleton({
  width = "w-20",
  height = "h-4",
}: {
  width?: string;
  height?: string;
}) {
  return (
    <div className={`${width} ${height} bg-gray-200 animate-pulse rounded`} />
  );
}

export default function SpanModal({ span, isOpen, onClose }: SpanModalProps) {
  const statusConfig = {
    success: { bg: "bg-emerald-50", text: "text-success", dot: "bg-success" },
    failed: { bg: "bg-red-50", text: "text-error", dot: "bg-error" },
    running: { bg: "bg-sky-50", text: "text-babyblue", dot: "bg-babyblue" },
    pending: { bg: "bg-amber-50", text: "text-warning", dot: "bg-warning" },
    cancelled: { bg: "bg-gray-50", text: "text-muted", dot: "bg-muted" },
  };

  const status = statusConfig[span.status as keyof typeof statusConfig] || {
    bg: "bg-gray-50",
    text: "text-muted",
    dot: "bg-muted",
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        onClose={onClose}
        className="fixed inset-0"
        style={{ zIndex: 99999 }}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
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
              <DialogPanel className="w-full max-w-2xl max-h-[90vh] overflow-hidden border-2 border-black bg-white text-sm shadow-[8px_8px_0_rgba(0,0,0,0.2)] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border bg-linear-to-r from-babyblue/5 to-transparent">
                  <div className="min-w-0 flex-1 space-y-1">
                    <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <span>{span.name || "Span Details"}</span>
                    </DialogTitle>
                    {span.llm_model !== null && (
                      <p className="text-xs text-muted font-medium">
                        {span.llm_model}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${status.bg}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                      <span className={`text-xs font-semibold ${status.text}`}>
                        {span.status || "unknown"}
                      </span>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
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
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                  {/* Prompt Versioning Information */}
                  {(span.prompt_id ||
                    span.prompt_version ||
                    span.prompt_hash) && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
                        {`/* Prompt Version */`}
                      </h4>
                      <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                        <div className="space-y-2 text-xs">
                          {span.prompt_id && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-black/60 uppercase tracking-wide text-[10px] w-14 shrink-0">
                                ID
                              </span>
                              <span className="font-mono text-foreground">
                                {span.prompt_id}
                              </span>
                            </div>
                          )}

                          {span.prompt_version && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-black/60 uppercase tracking-wide text-[10px] w-14 shrink-0">
                                Ver
                              </span>
                              <span className="font-mono text-foreground">
                                {span.prompt_version}
                              </span>
                            </div>
                          )}

                          {span.prompt_hash && (
                            <div className="flex items-start gap-2 pt-2 border-t-2 border-black/10">
                              <span className="font-medium text-black/60 uppercase tracking-wide text-[10px] w-14 shrink-0">
                                Hash
                              </span>
                              <span className="font-mono text-muted break-all text-[10px] leading-relaxed">
                                {span.prompt_hash}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timing Information */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
                      {`/* Performance */`}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1 p-3 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                        <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                          Duration
                        </span>
                        <span className="text-lg font-mono">
                          {span.duration !== null ? (
                            formatDuration(span.duration)
                          ) : (
                            <Skeleton width="w-16" height="h-6" />
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 p-3 bg-mustard/10 border-2 border-mustard shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                        <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                          Cost
                        </span>
                        <span className="text-lg text-mustard font-mono">
                          {span.cost !== null ? (
                            formatCost(span.cost)
                          ) : (
                            <Skeleton width="w-16" height="h-6" />
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-black/60 space-y-1 pt-2 border-t-2 border-black/10">
                      <div className="flex items-center gap-2">
                        <span className="font-medium w-14">{`// Start`}</span>
                        <span className="font-mono">
                          {formatDate(span.start_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium w-14">{`// End`}</span>
                        <span className="font-mono">
                          {span.end_time ? (
                            formatDate(span.end_time)
                          ) : (
                            <Skeleton width="w-32" height="h-4" />
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Streaming Metrics */}
                  {span.is_streaming && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
                        {`/* Streaming Metrics */`}
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 p-3 bg-success/10 border-2 border-success shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                          <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                            Time to First Token
                          </span>
                          <span className="text-lg font-mono text-success">
                            {span.time_to_first_token !== null ? (
                              `${span.time_to_first_token.toFixed(0)}ms`
                            ) : (
                              <Skeleton width="w-16" height="h-6" />
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 p-3 bg-babyblue/10 border-2 border-babyblue shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                          <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                            Tokens Per Second
                          </span>
                          <span className="text-lg font-mono text-babyblue">
                            {span.tokens_per_second !== null ? (
                              `${span.tokens_per_second.toFixed(1)} tok/s`
                            ) : (
                              <Skeleton width="w-16" height="h-6" />
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Token Information */}
                  {(span.prompt_tokens !== null ||
                    span.completion_tokens !== null) && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
                        {`/* Token Usage */`}
                      </h4>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 p-3 bg-white border-2 border-black">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                              Prompt
                            </span>
                            <span className="text-base font-mono">
                              {span.prompt_tokens !== null ? (
                                span.prompt_tokens.toLocaleString()
                              ) : (
                                <Skeleton width="w-12" height="h-5" />
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="text-black/60 text-sm">+</div>
                        <div className="flex-1 flex items-center gap-2 p-3 bg-white border-2 border-black">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                              Completion
                            </span>
                            <span className="text-base font-mono">
                              {span.completion_tokens !== null ? (
                                span.completion_tokens.toLocaleString()
                              ) : (
                                <Skeleton width="w-12" height="h-5" />
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="text-muted text-sm">=</div>
                        <div className="flex-1 flex items-center gap-2 p-3 bg-babyblue/10 border-2 border-babyblue/50">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
                              Total
                            </span>
                            <span className="text-base text-foreground font-mono">
                              {span.prompt_tokens !== null &&
                              span.completion_tokens !== null ? (
                                (
                                  span.prompt_tokens + span.completion_tokens
                                ).toLocaleString()
                              ) : (
                                <Skeleton width="w-12" height="h-5" />
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Input Preview */}
                  {span.input_preview !== null && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">
                        Input
                      </h4>
                      <div className="p-4 rounded-lg bg-background border border-border">
                        <p className="text-xs text-foreground/80 leading-relaxed line-clamp-6 whitespace-pre-wrap wrap-break-word font-mono">
                          {span.input_preview}
                        </p>
                      </div>
                      {span.input_blob_url !== null && (
                        <a
                          href={span.input_blob_url}
                          className="inline-flex items-center gap-1.5 text-xs text-babyblue hover:text-foreground font-medium transition group"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span>View complete input</span>
                          <svg
                            className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Output Preview */}
                  {span.output_preview !== null && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">
                        Output
                      </h4>
                      <div className="p-4 rounded-lg bg-background border border-border">
                        <p className="text-xs text-foreground/80 leading-relaxed line-clamp-6 whitespace-pre-wrap wrap-break-word font-mono">
                          {span.output_preview}
                        </p>
                      </div>
                      {span.output_blob_url !== null && (
                        <a
                          href={span.output_blob_url}
                          className="inline-flex items-center gap-1.5 text-xs text-babyblue hover:text-foreground font-medium transition group"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span>View complete output</span>
                          <svg
                            className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {span.error_message !== null && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-error uppercase tracking-wide">
                        Error
                      </h4>
                      <div className="p-4 rounded-lg bg-red-50 border border-error/30">
                        <p className="text-xs text-error/90 leading-relaxed wrap-break-word font-mono">
                          {span.error_message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
