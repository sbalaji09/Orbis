"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWRSubscription from "swr/subscription";
import { Span } from "@/lib/types";
import PromptBadge from "./PromptBadge";
import { getSpanTypeConfig } from "@/lib/span-type-config";

interface GraphNodeProps {
  span: Span;
  x?: number;
  y?: number;
  onPromptClick?: (promptName: string) => void;
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

interface DraggableGraphNodeProps extends GraphNodeProps {
  onDrag?: (
    spanId: string,
    deltaX: number,
    deltaY: number,
    commit: boolean
  ) => void;
  isDragging?: boolean;
  onPromptClick?: (promptName: string) => void;
}

const getHeaderColor = (spanType: string | null) => {
  const config = getSpanTypeConfig(spanType);
  return config.color;
};

export default function GraphNode({
  span,
  onDrag,
  isDragging,
  onPromptClick,
}: DraggableGraphNodeProps) {
  const router = useRouter();
  const [showTooltip, setShowTooltip] = useState(false);
  console.log(span);
  // SSE streaming for spans that are actively streaming
  const { data: streamData } = useSWRSubscription(
    span.is_streaming ? `/spans/${span.span_id}/stream` : null,
    (key, { next }) => {
      const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";
      const apiUrl = `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      }${key}?user_id=${DEFAULT_USER_ID}`;
      const eventSource = new EventSource(apiUrl);

      eventSource.onmessage = (event) => {
        try {
          const updatedSpan = JSON.parse(event.data);
          next(null, updatedSpan);
        } catch (error) {
          console.error("Failed to parse streaming data:", error);
        }
      };

      eventSource.addEventListener("complete", () => {
        eventSource.close();
      });

      eventSource.addEventListener("error", () => {
        eventSource.close();
        next(new Error("Stream error"));
      });

      eventSource.onerror = () => {
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    }
  );

  // Use streamed data if available, otherwise use prop
  const currentSpan = streamData || span;

  const statusConfig = {
    success: { bg: "bg-emerald-50", text: "text-success", dot: "bg-success" },
    failed: { bg: "bg-red-50", text: "text-error", dot: "bg-error" },
    running: { bg: "bg-sky-50", text: "text-babyblue", dot: "bg-babyblue" },
    pending: { bg: "bg-amber-50", text: "text-warning", dot: "bg-warning" },
    cancelled: { bg: "bg-gray-50", text: "text-muted", dot: "bg-muted" },
  };

  const status = statusConfig[
    currentSpan.status as keyof typeof statusConfig
  ] || {
    bg: "bg-gray-50",
    text: "text-muted",
    dot: "bg-muted",
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If no onDrag (React Flow handles dragging), just open modal on click
    if (!onDrag) {
      e.stopPropagation();
      e.preventDefault();
      router.push(`/dashboard/span/${currentSpan.span_id}`);
      return;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only use mouse tracking if onDrag is provided (not in React Flow)
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

      // If didn't move much, navigate to span detail page
      if (!hasMoved) {
        router.push(`/dashboard/span/${currentSpan.span_id}`);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <>
      <div className="relative inline-block">
        {/* Streaming indicator - pulsing dot outside top-right corner */}
        {/* {currentSpan.is_streaming && (
          <div className="absolute -top-1.5 -right-1.5 z-50 pointer-events-none">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-success animate-ping opacity-75"></div>
            </div>
          </div>
        )} */}
        <div
          className={`group relative w-60 border-2 border-foreground bg-white text-left overflow-hidden
            focus:outline-none focus:ring-2 focus:ring-mustard focus:ring-offset-2
            ${
              isDragging
                ? "shadow-[8px_8px_0_rgba(0,0,0,0.2)] scale-[1.02]"
                : "hover:shadow-[6px_6px_0_rgba(0,0,0,0.2)] shadow-[4px_4px_0_rgba(0,0,0,0.15)]"
            }
            transition-all duration-300 ease-in-out cursor-pointer`}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick(e as any);
            }
          }}
        >
          {/* Terminal-style colored top bar - draggable handle (remove nodrag from this) */}
          <div
            className={`h-6 ${getHeaderColor(
              currentSpan.span_type
            )} border-b-2 border-black flex items-center px-2 gap-1 cursor-grab active:cursor-grabbing`}
          >
            <div className="w-2 h-2 rounded-full bg-white/30"></div>
            <div className="w-2 h-2 rounded-full bg-white/30"></div>
            <div className="w-2 h-2 rounded-full bg-white/30"></div>
          </div>

          {/* Content - prevent dragging on content area */}
          <div className="p-3 nodrag hover:cursor-pointer">
            {/* Header: Name + Status */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-xs font-semibold tracking-tight leading-tight truncate flex-1 transition-colors duration-200">
                {currentSpan.name}
              </h3>
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 border ${
                  status.bg
                } ${status.dot.replace(
                  "bg-",
                  "border-"
                )} shrink-0 transition-transform duration-200`}
              >
                <div className={`w-1 h-1 ${status.dot}`} />
                <span
                  className={`text-[8px] font-bold uppercase tracking-wide ${status.text}`}
                >
                  {currentSpan.status}
                </span>
              </div>
            </div>
            
            {/* Span Type Badge */}
            {(() => {
              const typeConfig = getSpanTypeConfig(currentSpan.span_type);
              return (
                <div className={`flex items-center gap-1 px-1.5 py-0.5 ${typeConfig.color} ${typeConfig.textColor} text-[8px] font-bold uppercase tracking-wide`}>
                  <span>{typeConfig.icon}</span>
                  <span>{typeConfig.label}</span>
                </div>
              );
            })()}

            {/* Model - only show if exists */}
            {currentSpan.llm_model && (
              <div className="text-[10px] text-black/60 font-medium mb-2 truncate">
                {`// ${currentSpan.llm_model}`}
              </div>
            )}

            {/* Prompt Badge - only show if prompt_name exists */}
            {currentSpan.prompt_name && (
              <div className="mb-2">
                <PromptBadge
                  promptId={currentSpan.prompt_name}
                  promptVersion={currentSpan.prompt_version || "v1.0"}
                />
              </div>
            )}

            {/* Metrics - clean inline layout */}
            {!currentSpan.is_streaming ? (
              <div className="flex items-center gap-3 text-[10px] pt-2 border-t-2 border-black/10">
                <div className="flex items-center gap-1 text-black/60">
                  <svg
                    className="w-3.5 h-3.5 opacity-50 transition-opacity duration-200 group-hover:opacity-70"
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
                    {formatDuration(currentSpan.duration)}
                  </span>
                </div>

                {currentSpan.cost !== null && (
                  <div className="flex items-center gap-1 text-mustard ml-auto">
                    <svg
                      className="w-3.5 h-3.5 opacity-70 transition-opacity duration-200 group-hover:opacity-90"
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
                      {formatCost(currentSpan.cost)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between text-[8px] pt-2 mt-2 border-t-2 border-success/20">
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-success border border-success/30 text-background">
                  <div className="w-1.5 h-1.5 rounded-full bg-background animate-pulse"></div>
                  <span className="uppercase font-bold tracking-wide">
                    streaming
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 text-black/60">
                    <span className="">TTFT:</span>
                    <span className="font-mono">
                      {currentSpan.time_to_first_token !== null ? (
                        `${currentSpan.time_to_first_token.toFixed(0)}ms`
                      ) : (
                        <Skeleton width="w-10" height="h-3" />
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-black/60">
                    <span className="font-mono">
                      {currentSpan.tokens_per_second !== null ? (
                        `${currentSpan.tokens_per_second.toFixed(1)} tok/s`
                      ) : (
                        <Skeleton width="w-12" height="h-3" />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tooltip */}
        {showTooltip && !isDragging && (
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap bg-black border-2 border-black px-2.5 py-1.5 shadow-[4px_4px_0_rgba(0,0,0,0.2)] pointer-events-none z-50">
            <div className="flex items-center gap-1.5 text-[9px] text-mustard font-mono">
              <span className="font-semibold">
                {currentSpan.name || "Unnamed Span"}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
