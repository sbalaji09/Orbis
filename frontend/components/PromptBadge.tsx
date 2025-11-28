import React from 'react';

interface PromptBadgeProps {
  promptId: string | null;
  promptVersion: number;
  onClick: () => void;
}

export default function PromptBadge({ 
    promptId, 
    promptVersion, 
    onClick 
}: PromptBadgeProps) {
    if (!promptId) return null;

    return (
        <button
            onClick={onClick}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200 hover:border-gray-300 transition-colors duration-200 whitespace-nowrap"
            title={`Prompt ${promptId} v${promptVersion}`}
        >
            {promptId} v{promptVersion}
        </button>
    );
}
