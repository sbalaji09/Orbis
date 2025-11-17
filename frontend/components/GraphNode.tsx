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
  if (duration < 1) return `${(duration * 1000).toFixed(0)}ms`;
  return `${duration.toFixed(2)}s`;
}

function formatCost(cost: number | null): string {
  if (cost === null) return "N/A";
  return `$${cost.toFixed(4)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString();
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

  const statusBadgeColors = {
    success: "bg-green-500/90",
    failed: "bg-red-500/90",
    running: "bg-blue-500/90",
    pending: "bg-yellow-500/90",
    cancelled: "bg-gray-500/90",
  };

  const statusBadgeColor =
    statusBadgeColors[span.status as keyof typeof statusBadgeColors] ||
    "bg-babyblue";

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
          className={`flex items-center gap-3 w-56 min-h-16 rounded-lg border border-foreground/10 bg-white shadow-sm px-3 py-2 text-left
            focus:outline-none
            ${
              isDragging
                ? "cursor-grabbing scale-105 shadow-lg"
                : "cursor-grab hover:scale-[1.02] hover:shadow-lg"
            }
            transition-all duration-150 ease-in-out`}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* Left icon / avatar */}
          {/* <div
            className={`flex items-center justify-center shrink-0 w-10 h-10 rounded-full text-white font-semibold ${statusBadgeColor}`}
          >
            {span.llm_model
              ? span.llm_model.split("-")[0].charAt(0).toUpperCase()
              : span.name
              ? span.name.charAt(0).toUpperCase()
              : "?"}
          </div> */}

          {/* Title + subtitle */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {span.name}
              </span>
              {/* <span className="text-xs text-foreground/50 truncate">
                #{span.span_id}
              </span> */}
            </div>
            <div className="mt-1 text-xs text-foreground/60 flex items-center gap-2">
              {span.llm_model && (
                <span className="truncate">{span.llm_model}</span>
              )}
              <span className="truncate">{formatDuration(span.duration)}</span>
            </div>
          </div>

          {/* Status badge */}
          <div className="shrink-0">
            <span
              className={`px-2 py-1 rounded-md text-xs font-semibold text-white ${statusBadgeColor}`}
            >
              {span.status}
            </span>
          </div>
        </button>

        {/* Tooltip (slimmer) */}
        {showTooltip && !isDragging && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg pointer-events-none z-50">
            <div className="flex items-center gap-2">
              <span className="font-medium">#{span.span_id}</span>
              <span
                className={`${statusBadgeColor} rounded-full px-2 py-0.5 text-[10px] font-medium text-white`}
              >
                {span.status}
              </span>
            </div>
            <div className="mt-1 flex gap-3 text-gray-300">
              <span>{formatDuration(span.duration)}</span>
              {span.cost && <span>{formatCost(span.cost)}</span>}
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
                <DialogPanel className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border border-gray-200 bg-white text-sm text-foreground shadow-xl">
                  {/* Header with gradient background like dashboard */}
                  <div className="sticky top-0 z-10 px-5 py-3 bg-linear-to-br from-babyblue/10 to-babyblue/5 border-b border-foreground/10 backdrop-blur-sm bg-white/95">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <DialogTitle className="text-base font-semibold text-foreground">
                          Span #{span.span_id}
                        </DialogTitle>
                        {span.llm_model && (
                          <p className="text-xs text-foreground/60 mt-0.5 truncate">
                            {span.llm_model}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold text-white shrink-0 ${statusBadgeColor}`}
                        >
                          {span.status || "unknown"}
                        </span>
                        <button
                          onClick={() => setIsModalOpen(false)}
                          className="p-1 rounded-lg hover:bg-foreground/10 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 text-foreground/60"
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
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Timing Information */}
                    <div>
                      <h4 className="font-semibold text-foreground text-sm mb-2">
                        Timing & Cost
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-start gap-2">
                          <svg
                            className="w-4 h-4 text-foreground/60 shrink-0 mt-0.5"
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
                          <div className="min-w-0">
                            <p className="text-foreground/60">Duration</p>
                            <p className="text-foreground font-semibold">
                              {formatDuration(span.duration)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg
                            className="w-4 h-4 text-foreground/60 shrink-0 mt-0.5"
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
                          <div className="min-w-0">
                            <p className="text-foreground/60">Cost</p>
                            <p className="text-foreground font-semibold">
                              {formatCost(span.cost)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-foreground/50 mt-2 pt-2 border-t border-foreground/10 space-y-0.5">
                        <p className="truncate">
                          Start: {formatDate(span.start_time)}
                        </p>
                        <p className="truncate">
                          End: {formatDate(span.end_time)}
                        </p>
                      </div>
                    </div>

                    {/* Token Information */}
                    {(span.prompt_tokens || span.completion_tokens) && (
                      <div>
                        <h4 className="font-semibold text-foreground text-sm mb-2">
                          Tokens
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex items-start gap-2">
                            <svg
                              className="w-4 h-4 text-foreground/60 shrink-0 mt-0.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
                            </svg>
                            <div className="min-w-0">
                              <p className="text-foreground/60">Prompt</p>
                              <p className="text-foreground font-semibold font-mono">
                                {span.prompt_tokens || 0}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <svg
                              className="w-4 h-4 text-foreground/60 shrink-0 mt-0.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
                            </svg>
                            <div className="min-w-0">
                              <p className="text-foreground/60">Completion</p>
                              <p className="text-foreground font-semibold font-mono">
                                {span.completion_tokens || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Input Preview */}
                    {span.input_preview && (
                      <div>
                        <h4 className="font-semibold text-foreground text-sm mb-2">
                          Input
                        </h4>
                        <p className="text-xs text-foreground/70 bg-babyblue/10 p-2.5 rounded border border-foreground/10 line-clamp-4 wrap-break-word">
                          {span.input_preview}
                        </p>
                        {span.input_blob_url && (
                          <a
                            href={span.input_blob_url}
                            className="inline-flex items-center gap-1 mt-1.5 text-xs text-mustard hover:underline font-medium transition"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View full input
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Output Preview */}
                    {span.output_preview && (
                      <div>
                        <h4 className="font-semibold text-foreground text-sm mb-2">
                          Output
                        </h4>
                        <p className="text-xs text-foreground/70 bg-babyblue/10 p-2.5 rounded border border-foreground/10 line-clamp-4 wrap-break-word">
                          {span.output_preview}
                        </p>
                        {span.output_blob_url && (
                          <a
                            href={span.output_blob_url}
                            className="inline-flex items-center gap-1 mt-1.5 text-xs text-mustard hover:underline font-medium transition"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View full output
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Error Message */}
                    {span.error_message && (
                      <div className="rounded bg-red-50 p-2.5 border border-red-200">
                        <h4 className="font-semibold text-red-700 text-sm mb-1.5">
                          Error
                        </h4>
                        <p className="text-xs text-red-600 wrap-break-word">
                          {span.error_message}
                        </p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="pt-3 border-t border-foreground/10">
                      <div className="text-xs text-foreground/50 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="shrink-0">Trace ID:</span>
                          <span className="font-mono text-foreground/70 bg-foreground/5 px-1.5 py-0.5 rounded">
                            {span.trace_id}
                          </span>
                        </div>
                        {span.parent_span_ids &&
                          span.parent_span_ids.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="shrink-0">Parent Spans:</span>
                              <span className="font-mono text-foreground/70 bg-foreground/5 px-1.5 py-0.5 rounded">
                                {span.parent_span_ids.join(", ")}
                              </span>
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
