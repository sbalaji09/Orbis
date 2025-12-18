"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  duration: string;
  color: string;
}

interface Edge {
  from: string;
  to: string;
}

export function AnimatedDAG() {
  const [visibleNodes, setVisibleNodes] = useState<string[]>([]);
  const [visibleEdges, setVisibleEdges] = useState<Edge[]>([]);
  const animationRef = useRef<number | undefined>(undefined);

  // Vertical layout with better spacing
  const nodes: Node[] = [
    {
      id: "agent",
      x: 325,
      y: 20,
      label: "complex_agent",
      duration: "145ms",
      color: "#5B5FFF",
    },
    {
      id: "fetch",
      x: 0,
      y: 180,
      label: "data_fetch",
      duration: "3ms",
      color: "#10B981",
    },
    {
      id: "process",
      x: 325,
      y: 180,
      label: "process_data",
      duration: "38ms",
      color: "#e8c302",
    },
    {
      id: "generate",
      x: 650,
      y: 180,
      label: "generate_response",
      duration: "2ms",
      color: "#D1437C",
    },
    {
      id: "clean",
      x: 325,
      y: 340,
      label: "clean_data",
      duration: "2ms",
      color: "#10B981",
    },
  ];

  useEffect(() => {
    const runAnimation = () => {
      // Reset
      setVisibleNodes([]);
      setVisibleEdges([]);

      // Animation sequence: top first, then middle left-to-right, then bottom
      const animationSequence = [
        { nodeId: "agent", delay: 0 }, // Top box first
        { nodeId: "fetch", delay: 500 }, // Middle left
        { nodeId: "process", delay: 1000 }, // Middle center
        { nodeId: "generate", delay: 1500 }, // Middle right
        { nodeId: "clean", delay: 2000 }, // Bottom last
      ];

      // Animate nodes in sequence
      animationSequence.forEach(({ nodeId, delay }) => {
        setTimeout(() => {
          setVisibleNodes((prev) => [...prev, nodeId]);
        }, delay);
      });

      // Animate edges appearing after their target nodes
      const edgeSequence = [
        { edge: { from: "agent", to: "fetch" }, delay: 700 }, // After fetch appears
        { edge: { from: "agent", to: "process" }, delay: 1200 }, // After process appears
        { edge: { from: "agent", to: "generate" }, delay: 1700 }, // After generate appears
        { edge: { from: "process", to: "clean" }, delay: 2200 }, // After clean appears
      ];

      edgeSequence.forEach(({ edge, delay }) => {
        setTimeout(() => {
          setVisibleEdges((prev) => [...prev, edge]);
        }, delay);
      });

      // Schedule next animation cycle
      animationRef.current = window.setTimeout(
        runAnimation,
        4500 // Total animation time + pause
      );
    };

    runAnimation();

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  const getNodePosition = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const getNodeCenter = (nodeId: string) => {
    const pos = getNodePosition(nodeId);
    return { x: pos.x + 140, y: pos.y + 40 };
  };

  return (
    <div className="relative w-full h-[450px] flex items-center justify-center mx-auto">
      {/* Container for the entire DAG - centered */}
      <div
        className="relative mx-auto"
        style={{ width: "900px", height: "350px" }}
      >
        {/* SVG for edges */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Black arrow - smaller and better positioned */}
            <marker
              id="arrowhead-black"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="2.5"
              orient="auto"
            >
              <polygon points="0 0, 6 2.5, 0 5" fill="#000000" />
            </marker>
          </defs>

          {/* Draw edges with curves */}
          <AnimatePresence>
            {visibleEdges.map((edge, index) => {
              const fromCenter = getNodeCenter(edge.from);
              const toCenter = getNodeCenter(edge.to);

              // Calculate curve control point for more organic look
              const midX = (fromCenter.x + toCenter.x) / 2;
              const midY = (fromCenter.y + toCenter.y) / 2;
              const controlY = midY - Math.abs(fromCenter.x - toCenter.x) * 0.2;

              // Stop the path before reaching the box to show arrow clearly
              const pathD = `M ${fromCenter.x} ${fromCenter.y + 35} Q ${midX} ${
                controlY + 35
              } ${toCenter.x} ${toCenter.y - 45}`;

              return (
                <motion.g key={`edge-${edge.from}-${edge.to}-${index}`}>
                  <motion.path
                    d={pathD}
                    stroke="#000000"
                    strokeWidth="2.5"
                    fill="none"
                    markerEnd="url(#arrowhead-black)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  />
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>

        {/* Draw nodes */}
        <AnimatePresence>
          {nodes.map((node) => {
            const isVisible = visibleNodes.includes(node.id);
            if (!isVisible) return null;

            return (
              <motion.div
                key={node.id}
                className="absolute"
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                }}
                initial={{ scale: 0, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
              >
                <motion.div
                  className="relative bg-[#F5F3F0] border-2 border-black p-5"
                  style={{
                    width: "280px",
                    boxShadow: "4px 4px 0 rgba(0,0,0,0.15)",
                  }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "6px 6px 0 rgba(0,0,0,0.25)",
                    y: -4,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 20,
                  }}
                >
                  {/* Top terminal bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-6 border-b-2 border-black flex items-center px-2 gap-1"
                    style={{ backgroundColor: node.color }}
                  >
                    <div className="w-2 h-2 rounded-full bg-black/20"></div>
                    <div className="w-2 h-2 rounded-full bg-black/20"></div>
                    <div className="w-2 h-2 rounded-full bg-black/20"></div>
                  </div>

                  <div className="relative pt-6">
                    {/* Node label with function call style */}
                    <div className="mb-2 text-center whitespace-nowrap px-2">
                      <span className="text-black/40">func </span>
                      {node.label}
                      <span className="text-black/40">()</span>
                    </div>

                    {/* Duration and status row */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="text-black/40">{`// ${node.duration}`}</div>

                      {/* Status indicator */}
                      <motion.div
                        className="flex items-center gap-1.5 px-2 py-0.5 bg-black text-white border border-black"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.3,
                          type: "spring",
                          stiffness: 500,
                          damping: 15,
                        }}
                      >
                        <motion.div
                          className="w-1.5 h-1.5 bg-success"
                          animate={{
                            opacity: [1, 0.5, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        OK
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
