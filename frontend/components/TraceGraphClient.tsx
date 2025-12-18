"use client";
import { useCallback, useMemo, useEffect } from "react";
import useSWR from "swr";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeTypes,
  BackgroundVariant,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Span } from "@/lib/types";
import GraphNode from "@/components/GraphNode";
import { useAuth } from "@/hooks/useAuth";

interface NodePosition {
  x: number;
  y: number;
  span: Span;
}

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

  // Position nodes with spacing for clean layout
  const horizontalSpacing = 280;
  const verticalSpacing = 200;

  levelGroups.forEach((spansInLevel, level) => {
    const levelWidth = (spansInLevel.length - 1) * horizontalSpacing;
    const levelStartX = -levelWidth / 2;

    spansInLevel.forEach((span, idx) => {
      positions.push({
        x: levelStartX + idx * horizontalSpacing,
        y: level * verticalSpacing,
        span,
      });
    });
  });

  return positions;
}

// Custom node wrapper component with handles for edge connections
function CustomNode({
  data,
}: {
  data: {
    span: Span;
    onPromptClick?: (promptName: string) => void;
  };
}) {
  return (
    <>
      {/* Handle for incoming edges (top) - invisible but functional */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "transparent",
          border: "none",
          width: 1,
          height: 1,
          minWidth: 1,
          minHeight: 1,
        }}
      />
      {/* GraphNode component - wrapped in div to allow dragging */}
      <div>
        <GraphNode span={data.span} x={0} y={0} />
      </div>
      {/* Handle for outgoing edges (bottom) - invisible but functional */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "transparent",
          border: "none",
          width: 1,
          height: 1,
          minWidth: 1,
          minHeight: 1,
        }}
      />
    </>
  );
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export default function TraceGraphClient({
  spans: initialSpans,
}: {
  spans: Span[];
}) {
  // Get trace_id from first span
  const traceId = initialSpans.length > 0 ? initialSpans[0].trace_id : null;
  const { session } = useAuth();

  // Fetch spans with SWR for real-time updates (polls every 2 seconds)
  const { data: fetchedSpans } = useSWR(
    traceId && session?.access_token ? `/traces/${traceId}/spans` : null,
    async (url) => {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${url}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch spans");
      }
      const data = await response.json();
      return data.spans as Span[];
    },
    {
      refreshInterval: 2000,
      fallbackData: initialSpans,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      keepPreviousData: true,
    }
  );

  const spans = fetchedSpans || initialSpans;
  const spanIds = spans.map((s) => s.span_id).join(",");

  // Calculate layout when spans change
  const initialLayout = useMemo(
    () => calculateDAGLayout(spans),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spanIds, spans]
  );

  // Convert to React Flow nodes
  const initialNodes: Node[] = useMemo(
    () =>
      initialLayout.map((pos) => ({
        id: pos.span.span_id,
        type: "custom",
        position: { x: pos.x, y: pos.y },
        data: { span: pos.span },
        draggable: true,
      })),
    [initialLayout]
  );

  // Convert to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    initialLayout.forEach((pos) => {
      if (pos.span.parent_span_ids && pos.span.parent_span_ids.length > 0) {
        pos.span.parent_span_ids.forEach((parentId) => {
          edges.push({
            id: `${parentId}-${pos.span.span_id}`,
            source: parentId,
            target: pos.span.span_id,
            type: "smoothstep",
            animated: false,
            style: {
              stroke: "#000000",
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: "#000000",
            },
          });
        });
      }
    });
    return edges;
  }, [initialLayout]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when spans change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onInit = useCallback(() => {
    // React Flow will handle fitView automatically
  }, []);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        key={spanIds}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        elementsSelectable={false}
        nodesDraggable={true}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        selectNodesOnDrag={false}
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1,
          minZoom: 0.25,
        }}
        minZoom={0.25}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        onInit={onInit}
        proOptions={{ hideAttribution: true }}
        panOnDrag={true}
        panOnScroll={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={25}
          color="#e0e0e0"
          style={{ backgroundColor: "#f8f9fa" }}
        />
        <Controls
          style={{
            border: "2px solid #000000",
            boxShadow: "4px 4px 0 rgba(0,0,0,0.2)",
          }}
          showInteractive={false}
        />
        <MiniMap
          style={{
            border: "2px solid #000000",
            boxShadow: "4px 4px 0 rgba(0,0,0,0.2)",
          }}
          nodeColor={(node) => {
            const span = node.data.span as Span;
            if (span.status === "failed") return "#ef4444";
            if (span.status === "success") return "#10b981";
            return "#5B5FFF";
          }}
          maskColor="rgba(0, 0, 0, 0.05)"
        />
      </ReactFlow>
    </div>
  );
}
