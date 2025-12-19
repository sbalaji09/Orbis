import { useState, Fragment } from "react";
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

interface TraceLoaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (prompt: string) => void;
}

// Mock trace data
const MOCK_TRACES = [
  {
    id: "trace-001",
    timestamp: "2024-12-19T10:30:00Z",
    prompt: "Explain the concept of neural networks in simple terms for a beginner",
    model: "gpt-4",
    status: "success",
  },
  {
    id: "trace-002",
    timestamp: "2024-12-19T09:15:00Z",
    prompt: "Write a Python function that calculates the Fibonacci sequence up to n terms",
    model: "grok-4-1",
    status: "success",
  },
  {
    id: "trace-003",
    timestamp: "2024-12-19T08:45:00Z",
    prompt: "What are the key differences between React and Vue.js? Provide a comparison table.",
    model: "deepseek-v3",
    status: "success",
  },
  {
    id: "trace-004",
    timestamp: "2024-12-18T16:20:00Z",
    prompt: "Create a SQL query to find the top 10 customers by total purchase amount in the last 90 days",
    model: "mistral-large",
    status: "success",
  },
  {
    id: "trace-005",
    timestamp: "2024-12-18T14:10:00Z",
    prompt: "Explain quantum computing and its potential applications in cryptography",
    model: "gpt-5",
    status: "success",
  },
];

export function TraceLoaderModal({ isOpen, onClose, onLoad }: TraceLoaderModalProps) {
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);

  const handleLoad = () => {
    const trace = MOCK_TRACES.find((t) => t.id === selectedTrace);
    if (trace) {
      onLoad(trace.prompt);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="fixed inset-0" style={{ zIndex: 99999 }}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
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
              <DialogPanel className="w-full max-w-3xl max-h-[80vh] overflow-hidden border-2 border-black bg-white shadow-[8px_8px_0_rgba(0,0,0,0.3)] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 bg-babyblue/10 border-b-2 border-black flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-lg font-semibold">
                      Load from Recent Traces
                    </DialogTitle>
                    <p className="text-xs text-black/60 font-mono mt-1">
                      {`// Select a trace to load its prompt into the playground`}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-black/5 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-muted"
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

                {/* Traces List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  {MOCK_TRACES.map((trace) => (
                    <button
                      key={trace.id}
                      onClick={() => setSelectedTrace(trace.id)}
                      className={`w-full text-left p-4 border-2 transition-all ${
                        selectedTrace === trace.id
                          ? "border-babyblue bg-babyblue/5 shadow-[4px_4px_0_rgba(91,95,255,0.2)]"
                          : "border-black/20 bg-white hover:border-black/40 shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-success/10 text-success text-[9px] font-bold uppercase tracking-wide border border-success">
                            {trace.status}
                          </span>
                          <span className="text-[10px] text-black/40 font-mono">
                            {trace.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-black/5 text-black text-[9px] font-mono border border-black/20">
                            {trace.model}
                          </span>
                          <span className="text-[10px] text-black/40">
                            {formatTimestamp(trace.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-mono text-black/80 leading-relaxed">
                        {trace.prompt}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t-2 border-black bg-background flex items-center justify-between">
                  <p className="text-[10px] text-black/40">
                    {selectedTrace
                      ? "Click Load to use this prompt"
                      : "Select a trace to continue"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium border-2 border-black/30 bg-white hover:border-black transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLoad}
                      disabled={!selectedTrace}
                      className="px-4 py-2 text-sm font-medium border-2 border-black bg-babyblue text-white hover:bg-babyblue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[3px_3px_0_rgba(0,0,0,0.2)]"
                    >
                      Load Prompt
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}