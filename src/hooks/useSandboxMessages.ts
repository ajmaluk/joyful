import { useState, useEffect, useCallback, useRef } from 'react';

export interface SandboxLogEntry {
  id: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
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

export function useSandboxMessages(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const [logs, setLogs] = useState<SandboxLogEntry[]>([]);
  const [network, setNetwork] = useState<SandboxNetworkEntry[]>([]);
  const [metrics, setMetrics] = useState<SandboxMetrics>({ domNodes: 0, heapMB: 0, loadMs: 0 });
  const [inspectorSelection, setInspectorSelection] = useState<InspectorSelection | null>(null);
  const [inspectorEnabled, setInspectorEnabled] = useState(false);
  const pendingRequests = useRef<Map<string, SandboxNetworkEntry>>(new Map());

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || !msg.__joyfulSandbox) return;

      switch (msg.type) {
        case 'console':
          setLogs(prev => {
            const next = [...prev, {
              id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              level: msg.data.level,
              message: msg.data.message,
              timestamp: msg.timestamp,
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
    iframe.contentWindow.postMessage({ __joyfulSandbox: true, type, data }, '*');
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

  const subscribeRunLogs = useCallback((runId: string) => {
    if (!runId) return () => {};
    const base = (import.meta.env.VITE_SANDBOX_SERVER_URL as string) || '';
    const url = base ? `${base.replace(/\/$/, '')}/sandbox/stream/${runId}` : `/sandbox/stream/${runId}`;
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'stdout' || msg.type === 'stderr') {
          setLogs(prev => {
            const entry: SandboxLogEntry = {
              id: `run_${runId}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
              level: msg.type === 'stderr' ? 'error' : 'info',
              message: String(msg.data).replace(/\n$/, ''),
              timestamp: Date.now(),
            };
            const next = [...prev, entry];
            return next.length > 1000 ? next.slice(-1000) : next;
          });
        }
        if (msg.type === 'exit') {
          setLogs(prev => [...prev, { id: `run_${runId}_exit`, level: 'info', message: `process exited (${msg.data.code})`, timestamp: Date.now() }]);
          es.close();
        }
      } catch (e) {
        // ignore parse errors
      }
    };
    es.onerror = () => { try { es.close(); } catch (e) {} };
    return () => { try { es.close(); } catch (e) {} };
  }, []);

  return {
    logs,
    network,
    metrics,
    inspectorSelection,
    inspectorEnabled,
    toggleInspector,
    requestMetrics,
    clearLogs,
    clearNetwork,
    subscribeRunLogs,
    sendToIframe,
  };
}
