import React from 'react';

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

  const diff = computeLineDiff(linesOld, linesNew);

  return (
    <div className="w-full bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-2 border-b-2 border-black bg-background">
        <div className="p-4 border-r-2 border-black/20">
          <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
            {`/* Version ${oldVersion} */`}
          </h4>
        </div>
        <div className="p-4">
          <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
            {`/* Version ${newVersion} */`}
          </h4>
        </div>
      </div>

      {/* Side-by-side diff */}
      <div className="grid grid-cols-2 max-h-96 overflow-y-auto">
        {/* Old version column */}
        <div className="border-r-2 border-black/20">
          {diff.map((change, idx) => (
            <div
              key={`old-${idx}`}
              className={`flex px-4 py-1.5 text-xs leading-5 border-b border-black/5 font-mono ${
                change.type === 'removed'
                  ? 'bg-error/10 text-error'
                  : change.type === 'added'
                  ? 'bg-transparent text-transparent'
                  : 'text-foreground/80'
              }`}
            >
              <span className="w-8 text-right text-black/30 pr-3 select-none shrink-0">
                {change.type !== 'added' ? change.lineNumOld : ''}
              </span>
              <span className={change.type === 'removed' ? 'line-through' : ''}>
                {change.type !== 'added' ? change.content : '\u00A0'}
              </span>
            </div>
          ))}
        </div>

        {/* New version column */}
        <div>
          {diff.map((change, idx) => (
            <div
              key={`new-${idx}`}
              className={`flex px-4 py-1.5 text-xs leading-5 border-b border-black/5 font-mono ${
                change.type === 'added'
                  ? 'bg-success/10 text-success'
                  : change.type === 'removed'
                  ? 'bg-transparent text-transparent'
                  : 'text-foreground/80'
              }`}
            >
              <span className="w-8 text-right text-black/30 pr-3 select-none shrink-0">
                {change.type !== 'removed' ? change.lineNumNew : ''}
              </span>
              <span>
                {change.type !== 'removed' ? change.content : '\u00A0'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary footer */}
      <div className="px-4 py-3 border-t-2 border-black/10 bg-background flex items-center gap-4 text-[10px] font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-success"></div>
          <span className="text-success font-semibold">
            +{diff.filter(d => d.type === 'added').length} added
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-error"></div>
          <span className="text-error font-semibold">
            -{diff.filter(d => d.type === 'removed').length} removed
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-black/40">
          <div className="w-2 h-2 bg-black/20"></div>
          <span>{diff.filter(d => d.type === 'unchanged').length} unchanged</span>
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
