import React, { Fragment } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import PromptBadge from './PromptBadge';

interface PromptDiffViewerProps {
  isOpen: boolean;
  onClose: () => void;
  promptName: string;
  version1: number;
  version2: number;
  diff: string;
}

export default function PromptDiffViewer({
  isOpen,
  onClose,
  promptName,
  version1,
  version2,
  diff,
}: PromptDiffViewerProps) {
  // Parse diff string - assuming unified diff format or simple line-by-line
  const lines = typeof diff === 'string' ? diff.split('\n') : [];

  const parsedDiff = lines.map((line, idx) => {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      return { type: 'added' as const, content: line.substring(1), lineNum: idx + 1 };
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      return { type: 'removed' as const, content: line.substring(1), lineNum: idx + 1 };
    } else if (line.startsWith('@@')) {
      return { type: 'header' as const, content: line, lineNum: idx + 1 };
    } else {
      return { type: 'unchanged' as const, content: line, lineNum: idx + 1 };
    }
  });

  const addedCount = parsedDiff.filter(d => d.type === 'added').length;
  const removedCount = parsedDiff.filter(d => d.type === 'removed').length;
  const unchangedCount = parsedDiff.filter(d => d.type === 'unchanged').length;

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
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
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
              <DialogPanel className="w-full max-w-4xl max-h-[80vh] overflow-hidden border-2 border-black bg-white shadow-[8px_8px_0_rgba(0,0,0,0.2)] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b-2 border-black bg-linear-to-r from-babyblue/5 to-transparent">
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-lg font-semibold text-foreground">
                      Compare Versions
                    </DialogTitle>
                    <div className="mt-2 flex items-center gap-2">
                      <PromptBadge promptId={promptName} promptVersion={`v${version1}`} />
                      <svg className="w-4 h-4 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <PromptBadge promptId={promptName} promptVersion={`v${version2}`} />
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-foreground/5 transition-colors"
                  >
                    <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Diff content */}
                <div className="flex-1 overflow-y-auto">
                  {parsedDiff.map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex px-4 py-1 text-xs leading-5 border-b border-black/5 font-mono ${
                        line.type === 'added'
                          ? 'bg-success/10 text-success'
                          : line.type === 'removed'
                            ? 'bg-error/10 text-error'
                            : line.type === 'header'
                              ? 'bg-babyblue/10 text-babyblue font-semibold'
                              : 'text-foreground/80'
                      }`}
                    >
                      <span className="w-8 text-right text-black/30 pr-3 select-none shrink-0">
                        {line.lineNum}
                      </span>
                      <span className="w-4 text-center shrink-0">
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                      </span>
                      <span className={line.type === 'removed' ? 'line-through' : ''}>
                        {line.content || '\u00A0'}
                      </span>
                    </div>
                  ))}

                  {parsedDiff.length === 0 && (
                    <div className="px-6 py-12 text-center text-muted text-sm">
                      No differences found between these versions.
                    </div>
                  )}
                </div>

                {/* Summary footer */}
                <div className="px-4 py-3 border-t-2 border-black/10 bg-background flex items-center gap-4 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-success"></div>
                    <span className="text-success font-semibold">
                      +{addedCount} added
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-error"></div>
                    <span className="text-error font-semibold">
                      -{removedCount} removed
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-black/40">
                    <div className="w-2 h-2 bg-black/20"></div>
                    <span>{unchangedCount} unchanged</span>
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
