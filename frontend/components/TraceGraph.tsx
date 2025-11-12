"use client";
import { useState, useEffect } from "react";
import { dummySpans } from "@/lib/dummy";
import { Span } from "@/lib/types";
import GraphNode from "@/components/GraphNode";

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

interface NodePosition {
  x: number;
  y: number;
  span: Span;
}

interface Edge {
  from: { x: number; y: number };
  to: { x: number; y: number };
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

export default function TraceGraph(props: { traceId: number }) {
  const initialPositions = calculateDAGLayout(
    dummySpans.filter((span) => span.trace_id === props.traceId)
  );

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
