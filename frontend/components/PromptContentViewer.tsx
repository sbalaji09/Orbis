import React, { useState } from 'react';
import { Copy, ClipboardCheck } from 'lucide-react';

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
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Metadata */}
      {metadata && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
          {metadata.author && (
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <span className="font-medium text-gray-900 mr-2">Author:</span>
              {metadata.author}
            </div>
          )}
          {metadata.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{metadata.description}</p>
          )}
          {metadata.created_at && (
            <p className="text-xs text-gray-500 mt-2">
              Created: {new Date(metadata.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Scrollable Content + Copy Button */}
      <div className="p-6 max-h-96 overflow-y-auto">
        <div className="relative">
          <pre className="bg-gray-50 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap">
            <e>{content}</code>
          </pre>
          <button
            onClick={copyToClipboard}
            className="absolute top-3 right-3 p-2 rounded-lg bg-white border hover:bg-gray-50 transition-all shadow-sm flex items-center gap-1"
            title="Copy to clipboard"
          >
            {copied ? (
              <ClipboardCheck className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
