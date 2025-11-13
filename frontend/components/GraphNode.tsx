"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
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
    spanId: number,
    deltaX: number,
    deltaY: number,
    commit: boolean
  ) => void;
  isDragging?: boolean;
}

export default function GraphNode({
  span,
  x = 0,
  y = 0,
  onDrag,
  isDragging,
}: DraggableGraphNodeProps) {
  const statusColors = {
    completed: "bg-green-500 data-hover:bg-green-600",
    failed: "bg-red-500 data-hover:bg-red-600",
    running: "bg-blue-500 data-hover:bg-blue-600",
    pending: "bg-yellow-500 data-hover:bg-yellow-600",
    cancelled: "bg-gray-500 data-hover:bg-gray-600",
  };

  const statusBadgeColors = {
    completed: "bg-green-500/90",
    failed: "bg-red-500/90",
    running: "bg-blue-500/90",
    pending: "bg-yellow-500/90",
    cancelled: "bg-gray-500/90",
  };

  const statusColor =
    statusColors[span.status as keyof typeof statusColors] ||
    "bg-babyblue data-hover:bg-mustard";

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

    const handleMouseMove = (moveEvent: MouseEvent) => {
      currentDeltaX = moveEvent.clientX - startX;
      currentDeltaY = moveEvent.clientY - startY;
      onDrag(span.span_id, currentDeltaX, currentDeltaY, false);
    };

    const handleMouseUp = () => {
      // Commit the final position
      onDrag(span.span_id, currentDeltaX, currentDeltaY, true);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <Popover className="relative inline-block">
      <PopoverButton
        className={`w-16 h-16 rounded-full ${statusColor} border-3 border-foreground/20 shadow-md 
          focus:outline-none data-focus:outline-2 data-focus:outline-mustard
          ${
            isDragging
              ? "cursor-grabbing scale-105 shadow-xl"
              : "cursor-grab data-hover:scale-105 data-hover:shadow-xl"
          } 
          transition-all duration-200 ease-in-out`}
        style={{ transform: `translate(${x}px, ${y}px)` }}
        onMouseDown={handleMouseDown}
      >
        <span className="text-sm font-bold text-white select-none">
          {span.span_id}
        </span>
      </PopoverButton>

      <PopoverPanel
        transition
        anchor="bottom"
        className="z-50 w-[400px] divide-y divide-foreground/10 rounded-xl bg-white/95 backdrop-blur-sm text-sm shadow-2xl 
          border border-foreground/20 transition duration-200 ease-in-out 
          [--anchor-gap:--spacing(3)] data-closed:-translate-y-1 data-closed:opacity-0"
      >
        <div className="p-4">
          {/* Header */}
          <div className="pb-3">
            <h3 className="text-lg font-bold text-foreground">
              Span #{span.span_id}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${statusBadgeColor}`}
              >
                {span.status || "unknown"}
              </span>
              {span.llm_model && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-mustard/20 text-foreground">
                  {span.llm_model}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Timing Information */}
          <div className="rounded-lg transition data-hover:bg-foreground/5 p-3">
            <h4 className="font-semibold text-foreground/80 text-xs uppercase tracking-wide mb-2">
              Timing
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-foreground/60 font-medium text-xs">
                  Duration
                </p>
                <p className="text-foreground font-semibold font-sans">
                  {formatDuration(span.duration)}
                </p>
              </div>
              <div>
                <p className="text-foreground/60 font-medium text-xs">Cost</p>
                <p className="text-foreground font-semibold">
                  {formatCost(span.cost)}
                </p>
              </div>
            </div>
            <div className="text-xs text-foreground/50 mt-2 space-y-0.5">
              <p>Start: {formatDate(span.start_time)}</p>
              <p>End: {formatDate(span.end_time)}</p>
            </div>
          </div>

          {/* Token Information */}
          {(span.prompt_tokens || span.completion_tokens) && (
            <div className="rounded-lg transition data-hover:bg-foreground/5 p-3">
              <h4 className="font-semibold text-foreground/80 text-xs uppercase tracking-wide mb-2">
                Tokens
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-foreground/60 font-medium text-xs">
                    Prompt
                  </p>
                  <p className="text-foreground font-semibold">
                    {span.prompt_tokens || 0}
                  </p>
                </div>
                <div>
                  <p className="text-foreground/60 font-medium text-xs">
                    Completion
                  </p>
                  <p className="text-foreground font-semibold">
                    {span.completion_tokens || 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          {/* Input Preview */}
          {span.input_preview && (
            <div className="rounded-lg transition data-hover:bg-foreground/5 p-3 mb-3">
              <h4 className="font-semibold text-foreground/80 text-xs uppercase tracking-wide mb-2">
                Input
              </h4>
              <p className="text-sm text-foreground/70 bg-babyblue/20 p-3 rounded-lg italic line-clamp-3">
                &ldquo;{span.input_preview}&rdquo;
              </p>
              {span.input_blob_url && (
                <a
                  href={span.input_blob_url}
                  className="block mt-2 text-xs text-mustard data-hover:underline font-medium transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View full input →
                </a>
              )}
            </div>
          )}

          {/* Output Preview */}
          {span.output_preview && (
            <div className="rounded-lg transition data-hover:bg-foreground/5 p-3">
              <h4 className="font-semibold text-foreground/80 text-xs uppercase tracking-wide mb-2">
                Output
              </h4>
              <p className="text-sm text-foreground/70 bg-babyblue/20 p-3 rounded-lg italic line-clamp-3">
                &ldquo;{span.output_preview}&rdquo;
              </p>
              {span.output_blob_url && (
                <a
                  href={span.output_blob_url}
                  className="block mt-2 text-xs text-mustard data-hover:underline font-medium transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View full output →
                </a>
              )}
            </div>
          )}

          {/* Error Message */}
          {span.error_message && (
            <div className="rounded-lg bg-red-50/50 p-3 border border-red-200/50">
              <h4 className="font-semibold text-red-600 text-xs uppercase tracking-wide mb-2">
                Error
              </h4>
              <p className="text-sm text-red-700">{span.error_message}</p>
            </div>
          )}
        </div>

        <div className="p-4">
          {/* Metadata */}
          <div className="text-xs text-foreground/50 space-y-1">
            <p>
              Trace ID:{" "}
              <span className="font-mono text-foreground/70">
                {span.trace_id}
              </span>
            </p>
            {span.parent_span_ids && span.parent_span_ids.length > 0 && (
              <p>
                Parent Spans:{" "}
                <span className="font-mono text-foreground/70">
                  {span.parent_span_ids.join(", ")}
                </span>
              </p>
            )}
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  );
}
