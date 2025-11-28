import React, { useState } from 'react';

interface PromptContentViewerProps {
  content: string;
  metadata?: {
    author?: string;
    description?: string;
    created_at?: string;
  };
  className?: string;
}

export default function PromptContentViewer({
  content,
  metadata,
  className = '',
}: PromptContentViewerProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] ${className}`}>
      {/* Metadata Header */}
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
      <div className="p-6 max-h-96 overflow-y-auto">
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
    </div>
  );
}
