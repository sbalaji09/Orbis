"use client";
import { useState, useEffect } from "react";
import { Span } from "@/lib/types";
import GraphNode from "@/components/GraphNode";

function calculateDAGLayout(spans: Span[]): NodePosition[] {
  const spanMap = new Map(spans.map((span) => [span.span_id, span]));
  const positions: NodePosition[] = [];
  const levels = new Map<string, number>();

  // Calculate depth level for each node
  function getLevel(spanId: string): number {
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
      {/* Sleek triangular arrowhead */}
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="10"
        refX="8"
        refY="5"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <polygon points="0,0 0,10 10,5" fill="#1a1d1a" stroke="none" />
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
  // Node dimensions: min-w-32 to max-w-44 (128-176px) x h-10 (40px)
  const nodeWidth = 152; // Average width for ellipse calculation
  const nodeHeight = 40;
  const gap = 12; // Gap from node edge (increased to prevent arrowhead overlap)

  // Calculate angle between node centers
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);

  // Calculate intersection with ellipse for FROM node
  // Using ellipse equation: (x/a)^2 + (y/b)^2 = 1
  const a = nodeWidth / 2; // semi-major axis (width)
  const b = nodeHeight / 2; // semi-minor axis (height)

  // Parametric form: x = a*cos(θ), y = b*sin(θ)
  // But we need to scale to get the radius at this angle
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Distance from center to ellipse edge at this angle
  const fromRadius =
    (a * b) / Math.sqrt(Math.pow(b * cos, 2) + Math.pow(a * sin, 2));
  const toRadius =
    (a * b) / Math.sqrt(Math.pow(b * cos, 2) + Math.pow(a * sin, 2));

  // Apply gap and calculate edge points
  // For the TO node, add extra gap to account for arrowhead size
  const arrowheadSize = 8;
  const fromX = from.x + cos * (fromRadius + gap);
  const fromY = from.y + sin * (fromRadius + gap);
  const toX = to.x - cos * (toRadius + gap + arrowheadSize);
  const toY = to.y - sin * (toRadius + gap + arrowheadSize);

  // Straight line path
  const path = `M ${fromX} ${fromY} L ${toX} ${toY}`;

  return (
    <g>
      {/* Clean arrow line */}
      <path
        d={path}
        stroke="#2a2d2a"
        strokeWidth="1.5"
        fill="none"
        markerEnd="url(#arrowhead)"
        strokeLinecap="butt"
      />
    </g>
  );
}

export default function TraceGraphClient({ spans }: { spans: Span[] }) {
  const initialPositions = calculateDAGLayout(spans);

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
    Map<string, { x: number; y: number }>
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
    spanId: string;
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
    spanId: string,
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
      className="w-full h-full relative overflow-auto"
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
        className="relative"
        style={{
          width: canvasWidth > 0 ? `${canvasWidth}px` : "100%",
          height: canvasHeight > 0 ? `${canvasHeight}px` : "100%",
          minWidth: "100%",
          minHeight: "100%",
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
