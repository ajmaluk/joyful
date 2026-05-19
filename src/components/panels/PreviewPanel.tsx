import { useState, useEffect, useRef, useCallback } from 'react';
import { Home, RotateCcw, ExternalLink, Smartphone, Tablet, Monitor, ShieldCheck, PlayCircle, Terminal, Network, Activity, ChevronDown, ChevronUp, MousePointer2 } from 'lucide-react';
import type { ProjectFile } from '@/types';
import { generatePreview } from '@/services/fileSystem';
import { SANDBOX_BRIDGE_SCRIPT } from '@/utils/sandboxBridge';
import { useSandboxMessages } from '@/hooks/useSandboxMessages';
import { ConsolePanel } from '@/components/sandbox/ConsolePanel';
import { NetworkPanel } from '@/components/sandbox/NetworkPanel';
import { PerformanceMetrics } from '@/components/sandbox/PerformanceMetrics';

interface PreviewPanelProps {
  files: ProjectFile[];
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type BottomTab = 'console' | 'network' | 'performance';

const BOTTOM_HEIGHT = 200;

export function PreviewPanel({ files }: PreviewPanelProps) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [srcDoc, setSrcDoc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('console');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const {
    logs,
    network,
    metrics,
    inspectorSelection,
    inspectorEnabled,
    toggleInspector,
    requestMetrics,
    clearLogs,
    clearNetwork,
  } = useSandboxMessages(iframeRef);

  const refreshPreview = useCallback(() => {
    setIsLoading(true);
    const html = generatePreview(files);
    const bridgeHtml = html.includes('</body>')
      ? html.replace('</body>', `${SANDBOX_BRIDGE_SCRIPT}</body>`)
      : html + SANDBOX_BRIDGE_SCRIPT;
    setSrcDoc(bridgeHtml);
    setTimeout(() => {
      setIsLoading(false);
      requestMetrics();
    }, 300);
  }, [files, requestMetrics]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshPreview();
    }, 500);
    return () => clearTimeout(timer);
  }, [files, refreshPreview]);

  const deviceWidths: Record<DeviceMode, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px',
  };

  const tabConfig: { tab: BottomTab; icon: typeof Terminal; label: string; badge?: number }[] = [
    { tab: 'console', icon: Terminal, label: 'Console', badge: logs.filter(l => l.level === 'error').length || undefined },
    { tab: 'network', icon: Network, label: 'Network', badge: network.filter(r => r.pending).length || undefined },
    { tab: 'performance', icon: Activity, label: 'Perf' },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-l border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Browser chrome — polished */}
      <div className="flex h-12 items-center justify-between border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50 px-3 shadow-sm">
        <div className="flex items-center gap-1">
          <button
            onClick={refreshPreview}
            className="rounded-lg p-1.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 hover:shadow-sm"
            title="Home"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={refreshPreview}
            className="rounded-lg p-1.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 hover:shadow-sm"
            title="Refresh preview"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address bar — realistic */}
        <div className="flex-1 mx-3 min-w-0">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-inner shadow-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#66D28E] shadow-sm shadow-green-200" />
              <span className="text-[10px] font-medium text-gray-400">HTTPS</span>
            </div>
            <div className="h-3 w-px bg-gray-200" />
            <span className="truncate text-xs text-gray-600 font-mono">localhost:preview</span>
            <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 sm:flex">
              <ShieldCheck className="h-3 w-3" />
              Safe preview
            </span>
          </div>
        </div>

        {/* Device toggle — button group */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            onClick={() => setDevice('desktop')}
            className={`rounded-md px-2 py-1.5 transition-all ${
              device === 'desktop'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Desktop preview"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`rounded-md px-2 py-1.5 transition-all ${
              device === 'tablet'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Tablet preview"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`rounded-md px-2 py-1.5 transition-all ${
              device === 'mobile'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Mobile preview"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          className="ml-1.5 rounded-lg p-1.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 hover:shadow-sm"
          title="Open preview in new tab"
          onClick={() => {
            const html = generatePreview(files);
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
          }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inspector bar — polished */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0 transition-all duration-200 ${
        inspectorEnabled
          ? 'border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-indigo-50'
          : 'border-gray-100 bg-white'
      }`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleInspector(!inspectorEnabled)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              inspectorEnabled
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200 hover:bg-indigo-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-gray-200'
            }`}
            title={inspectorEnabled ? 'Disable inspector' : 'Enable element inspector'}
          >
            <MousePointer2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Inspect</span>
          </button>
          {inspectorEnabled && inspectorSelection && (
            <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs shadow-sm">
              <span className="font-bold text-indigo-700 font-mono">&lt;{inspectorSelection.tag}&gt;</span>
              {inspectorSelection.id && (
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-700">#{inspectorSelection.id}</span>
              )}
              {inspectorSelection.classes.length > 0 && (
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-700">
                  .{inspectorSelection.classes[0]}
                </span>
              )}
              <div className="h-3 w-px bg-indigo-200" />
              <span className="text-indigo-500 tabular-nums font-medium">{inspectorSelection.width} x {inspectorSelection.height}</span>
            </div>
          )}
          {inspectorEnabled && !inspectorSelection && (
            <div className="flex items-center gap-1.5 text-[10px] text-indigo-500">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Click an element in the preview...
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
          {metrics.domNodes > 0 && (
            <span className="rounded-md bg-gray-100 px-2 py-0.5">{metrics.domNodes} nodes</span>
          )}
          {metrics.heapMB > 0 && (
            <span className="rounded-md bg-gray-100 px-2 py-0.5">{metrics.heapMB} MB</span>
          )}
        </div>
      </div>

      {/* Preview iframe — polished */}
      <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 p-4" style={{ flex: bottomOpen ? `1 1 calc(100% - ${BOTTOM_HEIGHT}px)` : '1 1 100%' }}>
        {files.length === 0 ? (
          <div className="flex w-full max-w-[460px] flex-col justify-center">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xl shadow-gray-200/50">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-500 shadow-sm">
                  <Monitor className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Ready for preview</p>
                  <p className="text-[11px] text-gray-500">Your generated site will render here.</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                <div className="flex h-7 items-center gap-1.5 border-b border-gray-100 bg-white px-3">
                  <span className="h-2 w-2 rounded-full bg-red-300 animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-yellow-300 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="h-2 w-2 rounded-full bg-green-300 animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/5 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="h-20 rounded-lg bg-gray-200 animate-pulse" style={{ animationDelay: '0.1s' }} />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-11 rounded-lg bg-gray-200 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="h-11 rounded-lg bg-gray-200 animate-pulse" style={{ animationDelay: '0.3s' }} />
                    <div className="h-11 rounded-lg bg-gray-200 animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] font-medium text-emerald-700">
                <PlayCircle className="h-4 w-4 text-emerald-500" />
                Local iframe sandbox — no paid runner needed
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`relative min-h-full overflow-hidden rounded-xl border bg-white transition-all duration-300 ${
              isLoading
                ? 'border-gray-200 shadow-lg shadow-gray-200/30'
                : 'border-gray-200 shadow-2xl shadow-gray-300/40'
            }`}
            style={{ width: deviceWidths[device], maxWidth: '100%' }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-gray-500 font-medium">Loading preview...</span>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-forms"
              className="w-full h-full bg-white"
              title="Preview"
            />
          </div>
        )}
      </div>

      {/* DevTools bottom panel — Chrome DevTools style */}
      {bottomOpen && (
        <div className="border-t border-gray-200 bg-white flex-shrink-0 shadow-lg shadow-gray-200/50" style={{ height: BOTTOM_HEIGHT }}>
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-2 flex-shrink-0">
              <div className="flex items-center">
                {tabConfig.map(tc => {
                  const Icon = tc.icon;
                  return (
                    <button
                      key={tc.tab}
                      onClick={() => setBottomTab(tc.tab)}
                      className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                        bottomTab === tc.tab
                          ? 'text-indigo-600 bg-white'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tc.label}
                      {tc.badge != null && tc.badge > 0 && (
                        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                          {tc.badge}
                        </span>
                      )}
                      {bottomTab === tc.tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setBottomOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Close panel"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {bottomTab === 'console' && <ConsolePanel logs={logs} onClear={clearLogs} />}
              {bottomTab === 'network' && <NetworkPanel requests={network} onClear={clearNetwork} />}
              {bottomTab === 'performance' && <PerformanceMetrics metrics={metrics} onRequestMetrics={requestMetrics} />}
            </div>
          </div>
        </div>
      )}

      {/* DevTools toggle — polished toolbar */}
      {!bottomOpen && (
        <div className="flex items-center justify-center border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white py-1.5 flex-shrink-0">
          <button
            onClick={() => setBottomOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:shadow-md hover:text-gray-800 transition-all"
          >
            <ChevronUp className="h-3 w-3" />
            <span>DevTools</span>
            {logs.filter(l => l.level === 'error').length > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                {logs.filter(l => l.level === 'error').length}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
