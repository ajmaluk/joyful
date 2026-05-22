import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { executeInSandbox as runSandboxCommand } from '@/services/clientSandbox';
import type { PreviewIssue, ProjectFile } from '@/types';

export interface SandboxLogEntry {
  id: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
  path?: string;
  line?: number;
  column?: number;
}

export interface SandboxNetworkEntry {
  id: string;
  url: string;
  method: string;
  type: 'fetch' | 'xhr';
  status?: number;
  statusText?: string;
  duration?: number;
  size?: number;
  contentType?: string;
  error?: string;
  startTime: number;
  pending: boolean;
}

export interface SandboxMetrics {
  domNodes: number;
  heapMB: number;
  loadMs: number;
}

export interface InspectorSelection {
  tag: string;
  id: string;
  classes: string[];
  selector: string;
  width: number;
  height: number;
  x: number;
  y: number;
  display: string;
  position: string;
  fontSize: string;
  color: string;
  backgroundColor: string;
}

function parseIssueLocation(message: string, files: ProjectFile[]) {
  const direct = message.match(/\b([A-Za-z0-9_./-]+\.(?:jsx|tsx|js|ts|css|html|json)):(\d+)(?::(\d+))?/);
  if (direct) {
    return {
      path: direct[1].replace(/^\/+/, ''),
      line: Number(direct[2]),
      column: direct[3] ? Number(direct[3]) : undefined,
    };
  }

  const lower = message.toLowerCase();
  const likelyFile = files.find(file => lower.includes(file.path.toLowerCase())) ||
    files.find(file => file.path === 'src/App.jsx' || file.path === 'src/App.tsx') ||
    files.find(file => file.path === 'index.html');

  return likelyFile ? { path: likelyFile.path, line: undefined, column: undefined } : {};
}

function buildIssueFromLog(log: SandboxLogEntry, files: ProjectFile[]): PreviewIssue | null {
  if (log.level !== 'error' && log.level !== 'warn') return null;
  const location = log.path ? { path: log.path, line: log.line, column: log.column } : parseIssueLocation(log.message, files);
  return {
    id: `issue_${log.id}`,
    severity: log.level === 'error' ? 'error' : 'warning',
    message: log.message,
    source: 'console',
    path: location.path,
    line: location.line,
    column: location.column,
    timestamp: log.timestamp,
  };
}

export function useSandboxMessages(iframeRef: React.RefObject<HTMLIFrameElement | null>, files: ProjectFile[] = []) {
  const [logs, setLogs] = useState<SandboxLogEntry[]>([]);
  const [network, setNetwork] = useState<SandboxNetworkEntry[]>([]);
  const [metrics, setMetrics] = useState<SandboxMetrics>({ domNodes: 0, heapMB: 0, loadMs: 0 });
  const [inspectorSelection, setInspectorSelection] = useState<InspectorSelection | null>(null);
  const [inspectorEnabled, setInspectorEnabled] = useState(false);
  const pendingRequests = useRef<Map<string, SandboxNetworkEntry>>(new Map());
  const filesRef = useRef(files);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin && event.origin !== null) return;
      const msg = event.data;
      if (!msg || !msg.__joyfulSandbox) return;

      switch (msg.type) {
        case 'console':
          setLogs(prev => {
            const currentFiles = filesRef.current;
            const location = parseIssueLocation(msg.data.message, currentFiles);
            const next = [...prev, {
              id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              level: msg.data.level,
              message: msg.data.message,
              timestamp: msg.timestamp,
              path: location.path,
              line: location.line,
              column: location.column,
            }];
            return next.length > 500 ? next.slice(-500) : next;
          });
          break;

        case 'network-start':
          pendingRequests.current.set(msg.data.id, {
            id: msg.data.id,
            url: msg.data.url,
            method: msg.data.method,
            type: msg.data.type,
            startTime: msg.data.startTime,
            pending: true,
          });
          setNetwork(prev => [...prev, {
            id: msg.data.id,
            url: msg.data.url,
            method: msg.data.method,
            type: msg.data.type,
            startTime: msg.data.startTime,
            pending: true,
          }]);
          break;

        case 'network-end': {
          const entry: SandboxNetworkEntry = {
            id: msg.data.id,
            url: msg.data.url,
            method: msg.data.method,
            type: msg.data.type,
            status: msg.data.status,
            statusText: msg.data.statusText,
            duration: msg.data.duration,
            size: msg.data.size,
            contentType: msg.data.contentType,
            error: msg.data.error,
            startTime: msg.data.startTime || 0,
            pending: false,
          };
          pendingRequests.current.delete(msg.data.id);
          setNetwork(prev => {
            const idx = prev.findIndex(r => r.id === msg.data.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = entry;
              return next;
            }
            return [...prev, entry];
          });
          break;
        }

        case 'metrics':
          setMetrics(msg.data);
          break;

        case 'inspector-select':
          setInspectorSelection(msg.data);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const sendToIframe = useCallback((type: string, data: unknown) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ __joyfulSandbox: true, type, data }, iframe.src.startsWith('blob:') ? window.location.origin : '*');
  }, [iframeRef]);

  const toggleInspector = useCallback((enabled: boolean) => {
    setInspectorEnabled(enabled);
    sendToIframe('toggle-inspector', { enabled });
    if (!enabled) setInspectorSelection(null);
  }, [sendToIframe]);

  const requestMetrics = useCallback(() => {
    sendToIframe('request-metrics', null);
  }, [sendToIframe]);

  const clearLogs = useCallback(() => setLogs([]), []);
  const clearNetwork = useCallback(() => {
    setNetwork([]);
    pendingRequests.current.clear();
  }, []);
  const clearInspectorSelection = useCallback(() => setInspectorSelection(null), []);

  const executeInSandbox = useCallback(async (command: string): Promise<void> => {
    try {
      const events = await runSandboxCommand(command);
      const newLogs: SandboxLogEntry[] = [];
      for (const event of events) {
        const logEntry: SandboxLogEntry = {
          id: `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          level: event.type === 'stderr' || event.type === 'error' ? 'error' : event.type === 'exit' ? 'info' : 'log',
          message: typeof event.data === 'string' ? event.data : `exit code: ${(event.data as { code: number }).code}`,
          timestamp: event.timestamp,
        };
        newLogs.push(logEntry);
      }
      setLogs(prev => {
        const next = [...prev, ...newLogs];
        return next.length > 1000 ? next.slice(-1000) : next;
      });
    } catch (error) {
      const errorLog: SandboxLogEntry = {
        id: `sandbox_error_${Date.now()}`,
        level: 'error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
      setLogs(prev => [...prev, errorLog]);
    }
  }, []);

  return {
    logs,
    network,
    metrics,
    issues: useMemo(
      () => logs.map(log => buildIssueFromLog(log, files)).filter(Boolean) as PreviewIssue[],
      [logs, files],
    ),
    inspectorSelection,
    inspectorEnabled,
    toggleInspector,
    requestMetrics,
    clearLogs,
    clearNetwork,
    clearInspectorSelection,
    executeInSandbox,
    sendToIframe,
  };
}
