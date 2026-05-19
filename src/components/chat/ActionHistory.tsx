import { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, FilePlus, FileEdit, Trash2, Clock } from 'lucide-react';
import type { Action } from '@/components/chat/actionHistoryUtils';

interface ActionHistoryProps {
  actions: Action[];
  onActionClick?: (action: Action) => void;
}

function getActionIcon(type: string) {
  switch (type) {
    case 'create': return <FilePlus className="h-3.5 w-3.5 text-green-500" />;
    case 'modify': return <FileEdit className="h-3.5 w-3.5 text-blue-500" />;
    case 'delete': return <Trash2 className="h-3.5 w-3.5 text-red-500" />;
    default: return <FileCode className="h-3.5 w-3.5 text-gray-500" />;
  }
}

function getActionColor(type: string) {
  switch (type) {
    case 'create': return 'border-green-500/30 bg-green-500/5';
    case 'modify': return 'border-blue-500/30 bg-blue-500/5';
    case 'delete': return 'border-red-500/30 bg-red-500/5';
    default: return 'border-gray-300 bg-gray-50';
  }
}

export function ActionHistory({ actions, onActionClick }: ActionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (actions.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide w-full"
      >
        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Clock className="h-3 w-3" />
        <span>Action History ({actions.length})</span>
      </button>

      {isExpanded && (
        <div className="relative pl-4">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />

          <div className="space-y-2">
            {actions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => onActionClick?.(action)}
                className={`relative flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition-all duration-200 hover:shadow-sm ${getActionColor(action.type)}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="absolute -left-4 top-3.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-gray-400 z-10" />

                <div className="flex-shrink-0 mt-0.5">
                  {getActionIcon(action.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">{action.description}</p>
                  <p className="text-[10px] text-gray-500 truncate">{action.path}</p>
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0">
                  {new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
