"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Span } from "@/lib/types";
import { useState, useEffect } from "react";
import { dummySpans } from "@/lib/dummy";

// Dummy span data for demonstration - showing a complex DAG structure

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

export function GraphNode({
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
                <p className="text-foreground font-semibold">
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

interface NodePosition {
  x: number;
  y: number;
  span: Span;
}

interface Edge {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

// Calculate positions for a DAG layout
function calculateDAGLayout(spans: Span[]): NodePosition[] {
  const spanMap = new Map(spans.map((span) => [span.span_id, span]));
  const positions: NodePosition[] = [];
  const levels = new Map<number, number>();

  // Calculate depth level for each node
  function getLevel(spanId: number): number {
    if (levels.has(spanId)) return levels.get(spanId)!;

    const span = spanMap.get(spanId);
    if (!span || !span.parent_span_ids || span.parent_span_ids.length === 0) {
      levels.set(spanId, 0);
      return 0;
    }

    const maxParentLevel = Math.max(
      ...span.parent_span_ids.map((parentId) => getLevel(parentId))
    );
    const level = maxParentLevel + 1;
    levels.set(spanId, level);
    return level;
  }

  // Calculate levels for all spans
  spans.forEach((span) => getLevel(span.span_id));

  // Group spans by level
  const levelGroups = new Map<number, Span[]>();
  spans.forEach((span) => {
    const level = levels.get(span.span_id)!;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(span);
  });

  // Position nodes
  const horizontalSpacing = 200;
  const verticalSpacing = 180;
  const startX = 100;
  const startY = 100;

  levelGroups.forEach((spansInLevel, level) => {
    const levelWidth = (spansInLevel.length - 1) * horizontalSpacing;
    const levelStartX = startX - levelWidth / 2;

    spansInLevel.forEach((span, idx) => {
      positions.push({
        x: levelStartX + idx * horizontalSpacing,
        y: startY + level * verticalSpacing,
        span,
      });
    });
  });

  return positions;
}

// Calculate edges based on parent-child relationships
function calculateEdges(positions: NodePosition[]): Edge[] {
  const edges: Edge[] = [];
  const positionMap = new Map(
    positions.map((pos) => [pos.span.span_id, { x: pos.x, y: pos.y }])
  );

  positions.forEach((pos) => {
    if (pos.span.parent_span_ids && pos.span.parent_span_ids.length > 0) {
      pos.span.parent_span_ids.forEach((parentId) => {
        const parentPos = positionMap.get(parentId);
        if (parentPos) {
          edges.push({
            from: parentPos,
            to: { x: pos.x, y: pos.y },
          });
        }
      });
    }
  });

  return edges;
}

// Arrow marker component for SVG - clean professional style
function ArrowMarker() {
  return (
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="5"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,10 L9,5 z" fill="#0c0f0a" opacity="0.7" />
      </marker>
    </defs>
  );
}

// Edge component to draw connections between spans
function Edge({ from, to }: Edge) {
  // Offset to account for node radius
  const nodeRadius = 40;

  // Calculate angle and adjust start/end points
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);

  const fromX = from.x + Math.cos(angle) * nodeRadius;
  const fromY = from.y + Math.sin(angle) * nodeRadius;
  const toX = to.x - Math.cos(angle) * (nodeRadius + 8);
  const toY = to.y - Math.sin(angle) * (nodeRadius + 8);

  // Create a smooth curved path using cubic Bezier
  const distance = Math.sqrt(dx * dx + dy * dy);
  const controlPointOffset = Math.min(distance * 0.2, 50);

  // Control points for smooth curve
  const cp1x = fromX + dx * 0.25;
  const cp1y = fromY + controlPointOffset;
  const cp2x = toX - dx * 0.25;
  const cp2y = toY - controlPointOffset;

  const path = `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`;

  return (
    <g>
      {/* Main edge with subtle styling */}
      <path
        d={path}
        stroke="#0c0f0a"
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </g>
  );
}

// Demo component showing multiple spans in a DAG layout
export default function GraphNodeDemo() {
  const initialPositions = calculateDAGLayout(dummySpans);

  // Calculate container dimensions based on node positions
  const allX = initialPositions.map((p) => p.x);
  const allY = initialPositions.map((p) => p.y);
  const minX = Math.min(...allX) - 150;
  const maxX = Math.max(...allX) + 150;
  const minY = Math.min(...allY) - 100;
  const maxY = Math.max(...allY) + 100;
  const containerWidth = maxX - minX;
  const containerHeight = maxY - minY;

  // Normalize initial positions to start from (0, 0)
  const initialNormalizedPositions = initialPositions.map((pos) => ({
    ...pos,
    x: pos.x - minX,
    y: pos.y - minY,
  }));

  // State to track absolute positions (committed after drag ends)
  const [nodePositions, setNodePositions] = useState<
    Map<number, { x: number; y: number }>
  >(
    () =>
      new Map(
        initialNormalizedPositions.map((pos) => [
          pos.span.span_id,
          { x: pos.x, y: pos.y },
        ])
      )
  );

  // Temporary drag state (during active drag)
  const [activeDrag, setActiveDrag] = useState<{
    spanId: number;
    deltaX: number;
    deltaY: number;
  } | null>(null);

  // Calculate current positions
  const currentPositions = initialNormalizedPositions.map((pos) => {
    const committed = nodePositions.get(pos.span.span_id);
    const baseX = committed?.x ?? pos.x;
    const baseY = committed?.y ?? pos.y;

    // Apply temporary drag offset if this node is being dragged
    if (activeDrag && activeDrag.spanId === pos.span.span_id) {
      return {
        ...pos,
        x: baseX + activeDrag.deltaX,
        y: baseY + activeDrag.deltaY,
      };
    }

    return {
      ...pos,
      x: baseX,
      y: baseY,
    };
  });

  // Handle drag events
  const handleDrag = (
    spanId: number,
    deltaX: number,
    deltaY: number,
    commit: boolean
  ) => {
    if (commit) {
      // Commit the position change
      const currentPos = nodePositions.get(spanId);
      const initialPos = initialNormalizedPositions.find(
        (p) => p.span.span_id === spanId
      );
      if (initialPos) {
        const baseX = currentPos?.x ?? initialPos.x;
        const baseY = currentPos?.y ?? initialPos.y;
        setNodePositions((prev) => {
          const newMap = new Map(prev);
          newMap.set(spanId, { x: baseX + deltaX, y: baseY + deltaY });
          return newMap;
        });
      }
      setActiveDrag(null);
    } else {
      // Update temporary drag state
      setActiveDrag({ spanId, deltaX, deltaY });
    }
  };

  // Calculate edges based on current positions
  const currentEdges = calculateEdges(currentPositions);

  // Track viewport dimensions for client-side only
  const [viewportSize, setViewportSize] = useState({
    width: containerWidth,
    height: containerHeight,
  });

  useEffect(() => {
    // Update viewport size on mount and resize
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial size
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate canvas dimensions
  const canvasWidth = Math.max(containerWidth, viewportSize.width);
  const canvasHeight = Math.max(containerHeight, viewportSize.height);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(to right, #0c0f0a08 1px, transparent 1px),
          linear-gradient(to bottom, #0c0f0a08 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
        backgroundColor: "#f8f9fa",
      }}
    >
      <div
        className="relative w-full h-full"
        style={{
          width: canvasWidth > 0 ? `${canvasWidth}px` : "100%",
          height: canvasHeight > 0 ? `${canvasHeight}px` : "100%",
        }}
      >
        {/* SVG for edges - covers entire canvas */}
        <svg
          width="100%"
          height="100%"
          className="absolute top-0 left-0"
          style={{ pointerEvents: "none" }}
        >
          <ArrowMarker />
          {currentEdges.map((edge, idx) => (
            <Edge key={idx} {...edge} />
          ))}
        </svg>

        {/* Nodes positioned absolutely within the container */}
        {currentPositions.map((pos) => (
          <div
            key={pos.span.span_id}
            className="absolute"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transform: "translate(-50%, -50%)",
              transition:
                activeDrag?.spanId === pos.span.span_id
                  ? "none"
                  : "all 0.15s ease-out",
            }}
          >
            <GraphNode
              span={pos.span}
              x={0}
              y={0}
              onDrag={handleDrag}
              isDragging={activeDrag?.spanId === pos.span.span_id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
