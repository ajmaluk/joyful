import { useRef, useEffect, useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Terminal, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { SandboxLogEntry } from '@/hooks/useSandboxMessages';

interface ConsolePanelProps {
  logs: SandboxLogEntry[];
  onClear: () => void;
}

const levelConfig: Record<string, { icon: typeof Terminal; color: string; bg: string }> = {
  log: { icon: Terminal, color: 'text-gray-500', bg: 'bg-transparent' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/5' },
  warn: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/5' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/5' },
};

export function ConsolePanel({ logs, onClear }: ConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filtered = filter ? logs.filter(l => l.level === filter) : logs;
  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Console</span>
          <span className="text-[10px] text-gray-400">{logs.length} entries</span>
          {errorCount > 0 && (
            <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600">{errorCount} errors</span>
          )}
          {warnCount > 0 && (
            <span className="rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-600">{warnCount} warnings</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {['log', 'info', 'warn', 'error'].map(level => (
            <button
              key={level}
              onClick={() => setFilter(filter === level ? null : level)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                filter === level ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {level}
            </button>
          ))}
          <div className="w-px h-3 bg-gray-200 mx-1" />
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`rounded p-1 transition-colors ${autoScroll ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}
            title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
          >
            {autoScroll ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
          <button onClick={onClear} className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50" title="Clear console">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs">
            {filter ? `No ${filter} entries` : 'No console output yet'}
          </div>
        ) : (
          filtered.map(entry => {
            const config = levelConfig[entry.level] || levelConfig.log;
            const Icon = config.icon;
            return (
              <div key={entry.id} className={`flex items-start gap-2 px-3 py-1.5 border-b border-gray-100 ${config.bg} hover:bg-gray-50`}>
                <Icon className={`h-3 w-3 mt-0.5 flex-shrink-0 ${config.color}`} />
                <span className="text-[10px] text-gray-400 flex-shrink-0 w-14 tabular-nums">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-gray-800 whitespace-pre-wrap break-all min-w-0 flex-1">{entry.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
