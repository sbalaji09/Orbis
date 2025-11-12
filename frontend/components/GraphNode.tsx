"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Span } from "@/lib/types";
import { useState } from "react";

// Dummy span data for demonstration - showing a complex DAG structure
const dummySpans: Span[] = [
  {
    span_id: 1,
    trace_id: 101,
    parent_span_ids: null,
    start_time: new Date("2025-11-11T10:00:00"),
    end_time: new Date("2025-11-11T10:00:02"),
    duration: 2.0,
    input_preview:
      "Analyze user query: What are the best practices for building scalable web applications?",
    input_blob_url: "https://storage.example.com/inputs/span-1",
    output_preview:
      "Query identified as technical question. Breaking down into subtasks: architecture patterns, database design, caching strategies...",
    output_blob_url: "https://storage.example.com/outputs/span-1",
    llm_model: "gpt-4-turbo",
    prompt_tokens: 150,
    completion_tokens: 75,
    cost: 0.0045,
    status: "completed",
    error_message: null,
  },
  {
    span_id: 2,
    trace_id: 101,
    parent_span_ids: [1],
    start_time: new Date("2025-11-11T10:00:03"),
    end_time: new Date("2025-11-11T10:00:05"),
    duration: 1.8,
    input_preview:
      "Research architecture patterns for scalable applications...",
    input_blob_url: "https://storage.example.com/inputs/span-2",
    output_preview:
      "Found patterns: Microservices, Event-driven architecture, CQRS, Serverless...",
    output_blob_url: "https://storage.example.com/outputs/span-2",
    llm_model: "gpt-3.5-turbo",
    prompt_tokens: 120,
    completion_tokens: 90,
    cost: 0.0021,
    status: "completed",
    error_message: null,
  },
  {
    span_id: 3,
    trace_id: 101,
    parent_span_ids: [1],
    start_time: new Date("2025-11-11T10:00:03"),
    end_time: new Date("2025-11-11T10:00:04"),
    duration: 1.2,
    input_preview: "Research database design best practices for scalability...",
    input_blob_url: "https://storage.example.com/inputs/span-3",
    output_preview:
      "Key strategies: Sharding, Read replicas, Connection pooling, Indexing optimization...",
    output_blob_url: "https://storage.example.com/outputs/span-3",
    llm_model: "gpt-4-turbo",
    prompt_tokens: 110,
    completion_tokens: 85,
    cost: 0.0038,
    status: "completed",
    error_message: null,
  },
  {
    span_id: 4,
    trace_id: 101,
    parent_span_ids: [2, 3],
    start_time: new Date("2025-11-11T10:00:06"),
    end_time: new Date("2025-11-11T10:00:08"),
    duration: 2.1,
    input_preview:
      "Synthesize findings from architecture and database research into cohesive recommendations...",
    input_blob_url: "https://storage.example.com/inputs/span-4",
    output_preview:
      "Recommended approach: Start with microservices architecture, use PostgreSQL with read replicas, implement Redis caching...",
    output_blob_url: "https://storage.example.com/outputs/span-4",
    llm_model: "gpt-4-turbo",
    prompt_tokens: 280,
    completion_tokens: 150,
    cost: 0.0092,
    status: "completed",
    error_message: null,
  },
  {
    span_id: 5,
    trace_id: 101,
    parent_span_ids: [1],
    start_time: new Date("2025-11-11T10:00:03"),
    end_time: new Date("2025-11-11T10:00:04"),
    duration: 1.0,
    input_preview: "Find relevant code examples and documentation...",
    input_blob_url: "https://storage.example.com/inputs/span-5",
    output_preview:
      "Retrieved examples from GitHub and official documentation sources...",
    output_blob_url: "https://storage.example.com/outputs/span-5",
    llm_model: "gpt-3.5-turbo",
    prompt_tokens: 90,
    completion_tokens: 60,
    cost: 0.0015,
    status: "completed",
    error_message: null,
  },
  {
    span_id: 6,
    trace_id: 101,
    parent_span_ids: [4, 5],
    start_time: new Date("2025-11-11T10:00:09"),
    end_time: new Date("2025-11-11T10:00:11"),
    duration: 2.5,
    input_preview:
      "Generate final response with recommendations and code examples...",
    input_blob_url: "https://storage.example.com/inputs/span-6",
    output_preview:
      "Here are the best practices for building scalable web applications: 1. Architecture: Use microservices...",
    output_blob_url: "https://storage.example.com/outputs/span-6",
    llm_model: "gpt-4-turbo",
    prompt_tokens: 420,
    completion_tokens: 300,
    cost: 0.0156,
    status: "completed",
    error_message: null,
  },
];

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
    completed: "bg-green-500 hover:bg-green-600",
    failed: "bg-red-500 hover:bg-red-600",
    running: "bg-blue-500 hover:bg-blue-600",
    pending: "bg-yellow-500 hover:bg-yellow-600",
    cancelled: "bg-gray-500 hover:bg-gray-600",
  };

  const statusColor =
    statusColors[span.status as keyof typeof statusColors] ||
    "bg-babyblue hover:bg-mustard";

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
        className={`w-16 h-16 rounded-full ${statusColor} border-4 border-foreground shadow-lg 
          focus:outline-none focus:ring-4 focus:ring-mustard/50
          ${
            isDragging
              ? "cursor-grabbing scale-105 shadow-xl"
              : "cursor-grab hover:scale-105 hover:shadow-xl"
          } 
          transition-transform duration-150 ease-out`}
        style={{ transform: `translate(${x}px, ${y}px)` }}
        onMouseDown={handleMouseDown}
      >
        <span className="text-xs font-bold text-white select-none">
          {span.span_id}
        </span>
      </PopoverButton>

      <PopoverPanel
        anchor="bottom"
        className="z-10 mt-2 w-96 rounded-xl bg-background border-2 border-foreground shadow-2xl"
      >
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="border-b-2 border-foreground pb-3">
            <h3 className="text-xl font-bold text-foreground">
              Span #{span.span_id}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                  statusColor.split(" ")[0]
                }`}
              >
                {span.status || "unknown"}
              </span>
              {span.llm_model && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-babyblue text-foreground">
                  {span.llm_model}
                </span>
              )}
            </div>
          </div>

          {/* Timing Information */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">
              Timing
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600 font-medium">Duration</p>
                <p className="text-foreground font-semibold">
                  {formatDuration(span.duration)}
                </p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">Cost</p>
                <p className="text-foreground font-semibold">
                  {formatCost(span.cost)}
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-600">
              <p>Start: {formatDate(span.start_time)}</p>
              <p>End: {formatDate(span.end_time)}</p>
            </div>
          </div>

          {/* Token Information */}
          {(span.prompt_tokens || span.completion_tokens) && (
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">
                Tokens
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Prompt</p>
                  <p className="text-foreground font-semibold">
                    {span.prompt_tokens || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Completion</p>
                  <p className="text-foreground font-semibold">
                    {span.completion_tokens || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Input Preview */}
          {span.input_preview && (
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">
                Input
              </h4>
              <p className="text-sm text-gray-700 bg-babyblue/30 p-3 rounded-lg italic line-clamp-3">
                &ldquo;{span.input_preview}&rdquo;
              </p>
              {span.input_blob_url && (
                <a
                  href={span.input_blob_url}
                  className="text-xs text-mustard hover:underline font-medium"
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
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">
                Output
              </h4>
              <p className="text-sm text-gray-700 bg-babyblue/30 p-3 rounded-lg italic line-clamp-3">
                &ldquo;{span.output_preview}&rdquo;
              </p>
              {span.output_blob_url && (
                <a
                  href={span.output_blob_url}
                  className="text-xs text-mustard hover:underline font-medium"
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
            <div className="space-y-2">
              <h4 className="font-semibold text-red-600 text-sm uppercase tracking-wide">
                Error
              </h4>
              <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                {span.error_message}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-3 border-t border-gray-300 text-xs text-gray-600">
            <p>Trace ID: {span.trace_id}</p>
            {span.parent_span_ids && span.parent_span_ids.length > 0 && (
              <p>Parent Spans: {span.parent_span_ids.join(", ")}</p>
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

  return (
    <div className="p-8 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-foreground">
        Span Graph Visualization (DAG)
      </h1>
      <div className="relative bg-linear-to-br from-white to-babyblue/10 rounded-xl shadow-lg p-8 border-2 border-foreground overflow-hidden">
        <div
          className="relative"
          style={{
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
            margin: "0 auto",
          }}
        >
          {/* SVG for edges - matches the exact container dimensions */}
          <svg
            width={containerWidth}
            height={containerHeight}
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

      <div className="mt-8 p-4 bg-babyblue/30 rounded-lg border border-foreground">
        <h2 className="font-bold text-foreground mb-2">Legend</h2>
        <div className="text-sm text-foreground space-y-1">
          <p>• Arrows show the flow from parent spans to child spans</p>
          <p>
            • Nodes are arranged in levels based on their depth in the call
            graph
          </p>
          <p>• Click any node to see detailed span information</p>
          <p className="text-mustard font-semibold">
            • Drag nodes to rearrange the graph
          </p>
        </div>
      </div>
    </div>
  );
}
