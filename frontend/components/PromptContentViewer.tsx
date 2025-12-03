import React, { useState, Fragment } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import PromptBadge from './PromptBadge';

interface PromptContentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  promptName: string;
  versionNumber: number;
  content: string;
  metadata?: {
    author?: string;
    description?: string;
    created_at?: string;
  };
}

export default function PromptContentViewer({
  isOpen,
  onClose,
  promptName,
  versionNumber,
  content,
  metadata,
}: PromptContentViewerProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <DialogPanel className="w-full max-w-2xl max-h-[80vh] overflow-hidden border-2 border-black bg-white shadow-[8px_8px_0_rgba(0,0,0,0.2)] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b-2 border-black bg-linear-to-r from-babyblue/5 to-transparent">
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-lg font-semibold text-foreground">
                      Prompt Content
                    </DialogTitle>
                    <div className="mt-2">
                      <PromptBadge promptId={promptName} promptVersion={versionNumber} />
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

                {/* Metadata */}
                {metadata && (
                  <div className="px-6 py-4 border-b-2 border-black/10 bg-background">
                    <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-2">
                      {`/* Metadata */`}
                    </h4>
                    {metadata.author && (
                      <div className="flex items-center text-[11px] text-black/60 mb-1">
                        <span className="font-medium w-20">{`// Author`}</span>
                        <span className="font-mono">{metadata.author}</span>
                      </div>
                    )}
                    {metadata.description && (
                      <div className="flex items-start text-[11px] text-black/60 mb-1">
                        <span className="font-medium w-20 shrink-0">{`// Desc`}</span>
                        <span className="line-clamp-2">{metadata.description}</span>
                      </div>
                    )}
                    {metadata.created_at && (
                      <div className="flex items-center text-[11px] text-black/60">
                        <span className="font-medium w-20">{`// Created`}</span>
                        <span className="font-mono">{new Date(metadata.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="relative">
                    <pre className="bg-background p-4 border-2 border-black/10 text-xs font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed">
                      <code>{content}</code>
                    </pre>
                    <button
                      onClick={copyToClipboard}
                      className={`absolute top-3 right-3 p-2 border-2 border-black transition-all shadow-[2px_2px_0_rgba(0,0,0,0.1)] hover:shadow-[3px_3px_0_rgba(0,0,0,0.15)] ${
                        copied ? 'bg-success text-white border-success' : 'bg-white hover:bg-mustard/10'
                      }`}
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
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
