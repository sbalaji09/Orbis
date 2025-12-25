import { Fragment } from "react";
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import ReactMarkdown from "react-markdown";

interface ExplainTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  traceId: string;
  explanation: string | null;
  isLoading: boolean;
  error: string | null;
}

export function ExplainTraceModal({
  isOpen,
  onClose,
  traceId,
  explanation,
  isLoading,
  error,
}: ExplainTraceModalProps) {
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
                    <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-babyblue"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                      </svg>
                      Trace Explanation
                    </DialogTitle>
                    <p className="text-xs text-black/60 font-mono mt-1">
                      {`// AI-generated analysis of trace ${traceId.slice(0, 8)}...`}
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-babyblue border-t-transparent mb-4" />
                      <p className="text-sm text-black/60 font-mono">
                        Analyzing trace execution...
                      </p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm text-red-600 mb-2 font-medium">
                        Failed to generate explanation
                      </p>
                      <p className="text-xs text-black/40">{error}</p>
                    </div>
                  ) : explanation ? (
                    <div className="prose prose-sm prose-neutral max-w-none">
                      <ReactMarkdown
                        components={{
                          h2: ({ children }) => (
                            <h2 className="text-base font-bold mt-6 mb-3 pb-2 border-b-2 border-black/10 first:mt-0">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-sm font-bold mt-4 mb-2">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-sm text-black/80 leading-relaxed mb-3">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-5 text-sm text-black/80 space-y-1.5 mb-3">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-5 text-sm text-black/80 space-y-1.5 mb-3">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-sm pl-1">{children}</li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-black">
                              {children}
                            </strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic text-black/70">{children}</em>
                          ),
                          code: ({ children }) => (
                            <code className="px-1.5 py-0.5 bg-black/5 border border-black/10 text-xs font-mono rounded">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="p-3 bg-black/5 border-2 border-black/10 overflow-x-auto text-xs font-mono mb-3 rounded">
                              {children}
                            </pre>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-babyblue/50 pl-4 italic text-black/60 my-3">
                              {children}
                            </blockquote>
                          ),
                          hr: () => (
                            <hr className="border-t-2 border-black/10 my-4" />
                          ),
                        }}
                      >
                        {explanation}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-sm text-black/40">No explanation available</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t-2 border-black bg-background flex items-center justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium border-2 border-black bg-white hover:bg-black/5 transition-colors shadow-[3px_3px_0_rgba(0,0,0,0.2)]"
                  >
                    Close
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
