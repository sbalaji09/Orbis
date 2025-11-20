"use client";

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Fragment, useState } from "react";
import { Span } from "@/lib/types";

interface GraphNodeProps {
  span: Span;
  x?: number;
  y?: number;
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

function formatDate(date: Date): string {
  return new Date(date.toString() + "Z").toLocaleString();
}

interface DraggableGraphNodeProps extends GraphNodeProps {
  onDrag?: (
    spanId: string,
    deltaX: number,
    deltaY: number,
    commit: boolean
  ) => void;
  isDragging?: boolean;
}

export default function GraphNode({
  span,
  onDrag,
  isDragging,
}: DraggableGraphNodeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

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

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onDrag) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    let currentDeltaX = 0;
    let currentDeltaY = 0;
    let hasMoved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      currentDeltaX = moveEvent.clientX - startX;
      currentDeltaY = moveEvent.clientY - startY;
      if (Math.abs(currentDeltaX) > 3 || Math.abs(currentDeltaY) > 3) {
        hasMoved = true;
      }
      onDrag(span.span_id, currentDeltaX, currentDeltaY, false);
    };

    const handleMouseUp = () => {
      // Commit the final position
      onDrag(span.span_id, currentDeltaX, currentDeltaY, true);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // If didn't move much, open modal
      if (!hasMoved) {
        setIsModalOpen(true);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <>
      <div className="relative inline-block">
        <button
          className={`group relative w-[200px] rounded-lg border bg-card text-left overflow-hidden
            focus:outline-none focus:ring-2 focus:ring-babyblue/30 focus:ring-offset-2
            ${
              isDragging
                ? "cursor-grabbing shadow-xl border-slate/40 scale-[1.02]"
                : "cursor-grab hover:border-slate/30 hover:shadow-lg hover:-translate-y-px border-border shadow-sm"
            }
            transition-all duration-300 ease-in-out`}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* Status accent stripe */}
          <div className={`h-0.5 ${status.dot} transition-all duration-300`} />

          {/* Content */}
          <div className="p-3">
            {/* Header: Name + Status */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-xs font-semibold text-foreground leading-tight truncate flex-1 transition-colors duration-200">
                {span.name}
              </h3>
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${status.bg} shrink-0 transition-transform duration-200`}
              >
                <div className={`w-1 h-1 rounded-full ${status.dot}`} />
                <span
                  className={`text-[8px] font-bold uppercase tracking-wide ${status.text}`}
                >
                  {span.status}
                </span>
              </div>
            </div>

            {/* Model - only show if exists */}
            {span.llm_model && (
              <div className="text-[9px] text-slate/80 font-medium mb-2 truncate">
                {span.llm_model}
              </div>
            )}

            {/* Metrics - clean inline layout */}
            <div className="flex items-center gap-3 text-[9px] pt-2 border-t border-border/60">
              <div className="flex items-center gap-1 text-slate">
                <svg
                  className="w-3 h-3 opacity-50 transition-opacity duration-200 group-hover:opacity-70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-mono font-semibold">
                  {formatDuration(span.duration)}
                </span>
              </div>

              {span.cost !== null && (
                <div className="flex items-center gap-1 text-mustard ml-auto">
                  <svg
                    className="w-3 h-3 opacity-70 transition-opacity duration-200 group-hover:opacity-90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-mono font-semibold">
                    {formatCost(span.cost)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Tooltip */}
        {showTooltip && !isDragging && (
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-foreground/95 px-2.5 py-1.5 shadow-lg pointer-events-none z-50">
            <div className="flex items-center gap-1.5 text-[9px] text-white/90 font-mono">
              <span className="opacity-60">ID</span>
              <span className="font-semibold">{span.span_id}</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Transition show={isModalOpen} as={Fragment}>
        <Dialog onClose={() => setIsModalOpen(false)} className="relative z-50">
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
                <DialogPanel className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card text-sm text-foreground shadow-2xl flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border bg-linear-to-r from-babyblue/5 to-transparent">
                    <div className="min-w-0 flex-1 space-y-1">
                      <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <span>Span Details</span>
                        <span className="text-sm font-mono text-muted">
                          #{span.span_id}
                        </span>
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
                        <span
                          className={`text-xs font-semibold ${status.text}`}
                        >
                          {span.status || "unknown"}
                        </span>
                      </div>
                      <button
                        onClick={() => setIsModalOpen(false)}
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
                    {/* Timing Information */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">
                        Performance
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 p-3 rounded-lg bg-babyblue/5 border border-babyblue/20">
                          <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
                            Duration
                          </span>
                          <span className="text-lg text-foreground font-mono">
                            {formatDuration(span.duration)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 p-3 rounded-lg bg-mustard/5 border border-mustard/20">
                          <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
                            Cost
                          </span>
                          <span className="text-lg text-mustard font-mono">
                            {formatCost(span.cost)}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-muted space-y-1 pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          <span className="font-medium w-12">Start</span>
                          <span className="font-mono">
                            {formatDate(span.start_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium w-12">End</span>
                          <span className="font-mono">
                            {formatDate(span.end_time)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Token Information */}
                    {(span.prompt_tokens !== null ||
                      span.completion_tokens !== null) && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">
                          Token Usage
                        </h4>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-background">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
                                Prompt
                              </span>
                              <span className="text-base text-foreground font-mono">
                                {span.prompt_tokens?.toLocaleString() || 0}
                              </span>
                            </div>
                          </div>
                          <div className="text-muted text-sm">+</div>
                          <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-background">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
                                Completion
                              </span>
                              <span className="text-base text-foreground font-mono">
                                {span.completion_tokens?.toLocaleString() || 0}
                              </span>
                            </div>
                          </div>
                          <div className="text-muted text-sm">=</div>
                          <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-babyblue/10 border border-babyblue/20">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
                                Total
                              </span>
                              <span className="text-base text-foreground font-mono">
                                {(
                                  (span.prompt_tokens || 0) +
                                  (span.completion_tokens || 0)
                                ).toLocaleString()}
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

                    {/* Metadata */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">
                        Metadata
                      </h4>
                      <div className="space-y-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-muted font-medium w-24 shrink-0">
                            Trace ID
                          </span>
                          <code className="flex-1 px-2 py-1 rounded bg-background border border-border font-mono text-foreground">
                            {span.trace_id}
                          </code>
                        </div>
                        {span.parent_span_ids !== null &&
                          span.parent_span_ids.length > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-muted font-medium w-24 shrink-0">
                                Parent Spans
                              </span>
                              <code className="flex-1 px-2 py-1 rounded bg-background border border-border font-mono text-foreground">
                                {span.parent_span_ids.join(", ")}
                              </code>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
