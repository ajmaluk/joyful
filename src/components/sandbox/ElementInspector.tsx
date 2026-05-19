import { MousePointer2, X } from 'lucide-react';
import type { InspectorSelection } from '@/hooks/useSandboxMessages';

interface ElementInspectorProps {
  selection: InspectorSelection | null;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function ElementInspector({ selection, enabled, onToggle }: ElementInspectorProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onToggle(!enabled)}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
          enabled
            ? 'bg-indigo-500 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
        title={enabled ? 'Disable inspector' : 'Enable element inspector'}
      >
        <MousePointer2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Inspect</span>
      </button>

      {enabled && selection && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-indigo-700">&lt;{selection.tag}&gt;</span>
            {selection.id && (
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-mono text-indigo-600">#{selection.id}</span>
            )}
            {selection.classes.length > 0 && (
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-mono text-indigo-600">
                .{selection.classes[0]}
              </span>
            )}
          </div>
          <div className="w-px h-3 bg-indigo-200" />
          <span className="text-indigo-500 tabular-nums">{selection.width} x {selection.height}</span>
          <div className="w-px h-3 bg-indigo-200" />
          <span className="text-indigo-400 text-[10px]">{selection.display}</span>
          <button
            onClick={() => onToggle(false)}
            className="ml-1 rounded p-0.5 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {enabled && !selection && (
        <span className="text-[10px] text-indigo-500 animate-pulse">Click an element in the preview...</span>
      )}
    </div>
  );
}
