import { useRef, useEffect, useMemo, useState } from 'react';
import { Trash2, Network, CheckCircle, XCircle, Clock, Loader2, Search } from 'lucide-react';
import type { SandboxNetworkEntry } from '@/hooks/useSandboxMessages';

interface NetworkPanelProps {
  requests: SandboxNetworkEntry[];
  onClear: () => void;
}

const methodColors: Record<string, string> = {
  GET: 'text-green-600 bg-green-50',
  POST: 'text-blue-600 bg-blue-50',
  PUT: 'text-orange-600 bg-orange-50',
  DELETE: 'text-red-600 bg-red-50',
  PATCH: 'text-purple-600 bg-purple-50',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function NetworkPanel({ requests, onClear }: NetworkPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [requests, autoScroll]);

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesType = filterType ? request.type === filterType : true;
      const matchesQuery = lowered ? `${request.url} ${request.method} ${request.statusText || ''}`.toLowerCase().includes(lowered) : true;
      return matchesType && matchesQuery;
    });
  }, [requests, filterType, query]);
  const pendingCount = requests.filter(r => r.pending).length;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Network className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Network</span>
          <span className="text-[10px] text-gray-400">{requests.length} requests</span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <label className="relative mr-1 hidden items-center sm:flex">
            <Search className="absolute left-1.5 h-3 w-3 text-gray-400" />
            <input
              name="network-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search requests"
              className="w-36 rounded border border-gray-200 bg-white py-1 pl-5 pr-2 text-[10px] outline-none placeholder:text-gray-300 focus:border-indigo-300"
            />
          </label>
          {['fetch', 'xhr'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase transition-colors ${
                filterType === type ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {type}
            </button>
          ))}
          <div className="w-px h-3 bg-gray-200 mx-1" />
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`rounded p-1 transition-colors ${autoScroll ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}
            title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
          >
            <Clock className="h-3 w-3" />
          </button>
          <button onClick={onClear} className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50" title="Clear network">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-gray-100 text-[10px] font-medium text-gray-400 uppercase tracking-wider flex-shrink-0">
        <span className="w-12">Method</span>
        <span className="flex-1 min-w-0">URL</span>
        <span className="w-12 text-right">Status</span>
        <span className="w-16 text-right">Size</span>
        <span className="w-16 text-right">Time</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs">
            {query ? `No requests matching "${query}"` : filterType ? `No ${filterType} requests` : 'No network requests yet'}
          </div>
        ) : (
          filtered.map(req => (
            <div key={req.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 hover:bg-gray-50">
              <span className={`w-12 rounded px-1 py-0.5 text-[10px] font-bold text-center ${methodColors[req.method] || 'text-gray-600 bg-gray-50'}`}>
                {req.method}
              </span>
              <span className="flex-1 min-w-0 truncate text-gray-800" title={req.url}>
                {req.url || '(no url)'}
              </span>
              <span className="w-12 text-right flex items-center justify-end gap-1">
                {req.pending ? (
                  <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                ) : req.status && req.status >= 200 && req.status < 400 ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span className={req.pending ? 'text-blue-500' : req.status && req.status >= 200 && req.status < 400 ? 'text-green-600' : 'text-red-500'}>
                  {req.pending ? '...' : req.status || 'ERR'}
                </span>
              </span>
              <span className="w-16 text-right text-gray-500">
                {req.size != null && !req.pending ? formatSize(req.size) : '-'}
              </span>
              <span className="w-16 text-right text-gray-500">
                {req.duration != null && !req.pending ? formatDuration(req.duration) : '-'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
