import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PromptDiffViewerProps {
  oldContent: string;
  newContent: string;
  oldVersion: number;
  newVersion: number;
}

export default function PromptDiffViewer({
  oldContent,
  newContent,
  oldVersion,
  newVersion,
}: PromptDiffViewerProps) {
  const linesOld = oldContent.split('\n');
  const linesNew = newContent.split('\n');
  const maxLines = Math.max(linesOld.length, linesNew.length);

  const diff = computeLineDiff(linesOld, linesNew);

  return (
    <div className="w-full max-w-6xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-2 border-b border-gray-200 bg-gray-50">
        <div className="p-4 border-r border-gray-200">
          <span className="text-sm font-medium text-gray-900">Version {oldVersion}</span>
        </div>
        <div className="p-4">
          <span className="text-sm font-medium text-gray-900">Version {newVersion}</span>
        </div>
      </div>

      {/* Side-by-side diff */}
      <div className="grid grid-cols-2 max-h-96 overflow-y-auto">
        <div className="border-r border-gray-200">
          {diff.map((change, idx) => (
            <div
              key={idx}
              className={`flex px-4 py-2 text-xs leading-5 border-b border-gray-50 ${
                change.type === 'added' 
                  ? 'bg-green-50 text-green-800 border-green-100'
                  : change.type === 'removed'
                  ? 'bg-red-50 text-red-800 border-red-100 line-through'
                  : 'text-gray-900'
              }`}
            >
              <span className="w-8 text-right text-gray-500 pr-2">{change.lineNumOld || ''}</span>
              <span>{change.content || ''}</span>
            </div>
          ))}
        </div>
        
        <div>
          {diff.map((change, idx) => (
            <div
              key={idx}
              className={`flex px-4 py-2 text-xs leading-5 border-b border-gray-50 ${
                change.type === 'added' 
                  ? 'bg-green-50 text-green-800 border-green-100'
                  : change.type === 'removed'
                  ? 'bg-red-50 text-red-800 border-red-100 line-through opacity-60'
                  : 'text-gray-900'
              }`}
            >
              <span className="w-8 text-right text-gray-500 pr-2">{change.lineNumNew || ''}</span>
              <span>{change.content || ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Simple line-by-line diff algorithm
function computeLineDiff(oldLines: string[], newLines: string[]) {
  const diff: {
    type: 'unchanged' | 'added' | 'removed';
    content: string;
    lineNumOld?: number;
    lineNumNew?: number;
  }[] = [];

  let i = 0, j = 0;
  let oldLineNum = 1, newLineNum = 1;

  while (i < oldLines.length || j < newLines.length) {
    const oldLine = oldLines[i];
    const newLine = newLines[j];

    if (i < oldLines.length && j < newLines.length && oldLine === newLine) {
      diff.push({ type: 'unchanged', content: oldLine, lineNumOld: oldLineNum++, lineNumNew: newLineNum++ });
      i++; j++;
    } else if (i < oldLines.length && oldLine !== newLines[j]) {
      diff.push({ type: 'removed', content: oldLine, lineNumOld: oldLineNum++ });
      i++;
    } else if (j < newLines.length) {
      diff.push({ type: 'added', content: newLine, lineNumNew: newLineNum++ });
      j++;
    }
  }

  return diff;
}
