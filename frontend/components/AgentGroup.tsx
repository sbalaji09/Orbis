"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Agent, Trace } from "@/lib/types";
import { TraceRow } from "./TraceRow";

interface AgentGroupProps {
  agent: Agent;
  traces: Trace[];
  defaultOpen?: boolean;
}

export function AgentGroup({ agent, traces, defaultOpen = true }: AgentGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [traces]);

  return (
    <div className="border-2 border-black overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.15)] bg-background">
      {/* Agent Header - Clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 bg-mustard/10 border-b-2 border-black cursor-pointer hover:bg-mustard/20 transition-colors duration-200"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ease-out ${
                  isOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
              <h2 className="text-base font-semibold tracking-tight">
                {agent.agent_name}
              </h2>
            </div>
            {agent.description && (
              <p className="text-xs text-black/60 mt-1 ml-6">
                {`// ${agent.description}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs shrink-0">
            <div className="px-2.5 py-1 bg-black text-mustard border border-black">
              <span>Traces:</span>{" "}
              <span className="font-mono font-semibold">
                {traces.length}
              </span>
            </div>
            <div className="px-2.5 py-1 bg-white border-2 border-black">
              <span className="text-black/60">ID:</span>{" "}
              <span className="font-mono text-[10px] text-black/40">
                {agent.agent_id.slice(0, 8)}...
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Traces List - Collapsible */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: isOpen ? height : 0,
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div ref={contentRef}>
          {traces.length === 0 ? (
            <div className="px-5 py-8 text-center text-black/60 text-sm">
              {`// No traces found for this agent`}
            </div>
          ) : (
            traces.map((trace) => (
              <TraceRow key={trace.trace_id} trace={trace} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
