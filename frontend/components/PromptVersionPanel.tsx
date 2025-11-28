import React, { useState, useEffect } from 'react';
import PromptBadge from './PromptBadge';

interface Version {
  prompt_version_id: string;
  version_number: number;
  created_at: string;
  content_preview: string;
  is_active: boolean;
}

interface PromptVersionPanelProps {
  promptId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onView: (version: number) => void;
  onCompare: (version1: number, version2: number) => void;
  onRollback: (version: number) => void;
}

export default function PromptVersionPanel({
  promptId,
  isOpen,
  onClose,
  onView,
  onCompare,
  onRollback,
}: PromptVersionPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && promptId) {
      setLoading(true);
      // Replace with your actual fetch function
      fetchPromptVersions(promptId)
        .then(setVersions)
        .finally(() => setLoading(false));
    }
  }, [isOpen, promptId]);

  if (!isOpen || !promptId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative ml-64 h-full w-96 bg-white shadow-2xl">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Prompt Versions
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {versions.length} versions available
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          )}

          {/* Versions List */}
          {!loading && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {versions.map((version) => (
                <div
                  key={version.prompt_version_id}
                  className={`p-4 rounded-lg border transition-all ${
                    selectedVersion === version.version_number
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <PromptBadge
                      promptId={promptId}
                      promptVersion={version.version_number}
                      onClick={() => setSelectedVersion(version.version_number)}
                    />
                    <span className="text-xs text-gray-500">
                      {new Date(version.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {version.content_preview}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onView(version.version_number)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => selectedVersion && onCompare(selectedVersion, version.version_number)}
                      disabled={!selectedVersion}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Compare
                    </button>
                    <button
                      onClick={() => onRollback(version.version_number)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors ml-auto"
                    >
                      Rollback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Placeholder - replace with your actual API call
async function fetchPromptVersions(promptId: string): Promise<Version[]> {
  // const response = await fetch(`${API_BASE_URL}/prompts/${promptId}/versions`);
  // return response.json();
  return [];
}
