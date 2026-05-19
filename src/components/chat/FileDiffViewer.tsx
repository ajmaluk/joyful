import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, X, FileCode, FileText, FileJson } from 'lucide-react';
import type { FileDiff } from '@/components/chat/fileDiffUtils';

interface FileDiffViewerProps {
  diffs: FileDiff[];
  onApply?: (path: string) => void;
  onDiscard?: (path: string) => void;
}

function getFileIcon(path: string) {
  if (path.endsWith('.html')) return <FileCode className="h-3.5 w-3.5 text-orange-500" />;
  if (path.endsWith('.css')) return <FileCode className="h-3.5 w-3.5 text-blue-500" />;
  if (path.endsWith('.js') || path.endsWith('.ts')) return <FileCode className="h-3.5 w-3.5 text-yellow-500" />;
  if (path.endsWith('.json')) return <FileJson className="h-3.5 w-3.5 text-green-500" />;
  return <FileText className="h-3.5 w-3.5 text-gray-500" />;
}

function getActionBadge(action: string) {
  const styles: Record<string, string> = {
    create: 'bg-green-500/20 text-green-400 border-green-500/30',
    modify: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    delete: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${styles[action] || ''}`}>
      {action.charAt(0).toUpperCase() + action.slice(1)}
    </span>
  );
}

export function FileDiffViewer({ diffs, onApply, onDiscard }: FileDiffViewerProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set(diffs.map(d => d.path)));

  const toggleFile = (path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (diffs.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Changes</p>
      {diffs.map((diff) => {
        const isExpanded = expandedFiles.has(diff.path);
        const addedCount = diff.lines.filter(l => l.type === 'added').length;
        const removedCount = diff.lines.filter(l => l.type === 'removed').length;

        return (
          <div key={diff.path} className="rounded-lg border border-gray-300 bg-white overflow-hidden">
            <button
              onClick={() => toggleFile(diff.path)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
              )}
              {getFileIcon(diff.path)}
              <span className="flex-1 text-xs font-medium text-gray-900 truncate">{diff.path}</span>
              {getActionBadge(diff.action)}
              <span className="flex items-center gap-1 text-[10px]">
                {addedCount > 0 && <span className="text-green-500">+{addedCount}</span>}
                {removedCount > 0 && <span className="text-red-500">-{removedCount}</span>}
              </span>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                  <pre className="text-[11px] leading-5 font-mono">
                    {diff.lines.map((line, idx) => (
                      <div
                        key={idx}
                        className={`flex ${
                          line.type === 'added'
                            ? 'bg-green-500/10'
                            : line.type === 'removed'
                            ? 'bg-red-500/10'
                            : ''
                        }`}
                      >
                        <span className="w-8 flex-shrink-0 px-2 text-right text-gray-500 select-none">
                          {line.lineNum}
                        </span>
                        <span className={`w-4 flex-shrink-0 text-center select-none ${
                          line.type === 'added' ? 'text-green-500' : line.type === 'removed' ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                        </span>
                        <span className="flex-1 px-2 whitespace-pre overflow-hidden text-gray-800">
                          {line.content}
                        </span>
                      </div>
                    ))}
                  </pre>
                </div>

                {(onApply || onDiscard) && (
                  <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-3 py-2">
                    {onDiscard && (
                      <button
                        onClick={() => onDiscard(diff.path)}
                        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <X className="h-3 w-3" /> Discard
                      </button>
                    )}
                    {onApply && (
                      <button
                        onClick={() => onApply(diff.path)}
                        className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-indigo-700 transition-colors"
                      >
                        <Check className="h-3 w-3" /> Apply
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
