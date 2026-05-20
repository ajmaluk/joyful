import { useState, useEffect, useRef, useCallback } from 'react';
import { Home, RotateCcw, ExternalLink, Smartphone, Tablet, Monitor, ShieldCheck, PlayCircle, Terminal, Network, Activity, ChevronDown, ChevronUp, MousePointer2, Columns, Smartphone as SmartphoneFrame } from 'lucide-react';
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
type ViewMode = 'single' | 'split';

const BOTTOM_HEIGHT = 200;

export function PreviewPanel({ files }: PreviewPanelProps) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [srcDoc, setSrcDoc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('console');
  const [showDeviceFrame, setShowDeviceFrame] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeRefSplit = useRef<HTMLIFrameElement>(null);

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

  const deviceFrames: Record<DeviceMode, { width: string; height: string; label: string }> = {
    desktop: { width: '100%', height: '100%', label: 'Desktop' },
    tablet: { width: '768px', height: '1024px', label: 'Tablet' },
    mobile: { width: '390px', height: '844px', label: 'Mobile' },
  };

  const renderPreview = (iframeRef: React.RefObject<HTMLIFrameElement | null>, isSplit = false) => {
    const frame = deviceFrames[device];
    const isDesktopDevice = device === 'desktop';

    return (
      <div
        className={`relative overflow-hidden rounded-xl border bg-white transition-all duration-300 ${
          showDeviceFrame && !isDesktopDevice
            ? 'border-gray-300 shadow-2xl shadow-gray-400/50'
            : isLoading
              ? 'border-gray-200 shadow-lg shadow-gray-200/30'
              : 'border-gray-200 shadow-2xl shadow-gray-300/40'
        } ${showDeviceFrame && !isDesktopDevice ? 'p-3 bg-gray-100' : ''}`}
        style={{
          width: showDeviceFrame && !isDesktopDevice ? 'auto' : frame.width,
          height: showDeviceFrame && !isDesktopDevice ? 'auto' : frame.height,
          maxWidth: '100%',
        }}
      >
        {showDeviceFrame && !isDesktopDevice && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            <span className="text-[10px] font-medium text-gray-500">{frame.label} · {frame.width === '100%' ? 'full' : frame.width}</span>
          </div>
        )}
        {isLoading && !isSplit && (
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
          className={`w-full bg-white ${showDeviceFrame && !isDesktopDevice ? 'rounded-lg' : ''}`}
          style={{ height: showDeviceFrame && !isDesktopDevice ? frame.height : '100%' }}
          title={isSplit ? 'Preview Split' : 'Preview'}
        />
      </div>
    );
  };

  const tabConfig: { tab: BottomTab; icon: typeof Terminal; label: string; badge?: number }[] = [
    { tab: 'console', icon: Terminal, label: 'Console', badge: logs.filter(l => l.level === 'error').length || undefined },
    { tab: 'network', icon: Network, label: 'Network', badge: network.filter(r => r.pending).length || undefined },
    { tab: 'performance', icon: Activity, label: 'Perf' },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-l border-border bg-background">
      {/* Browser chrome — polished */}
      <div className="flex h-12 items-center justify-between border-b border-border bg-card px-3 shadow-sm">
        <div className="flex items-center gap-1">
          <button
            onClick={refreshPreview}
            className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:shadow-sm"
            title="Home"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={refreshPreview}
            className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:shadow-sm"
            title="Refresh preview"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address bar — realistic */}
        <div className="flex-1 mx-3 min-w-0">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 shadow-inner">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#66D28E] shadow-sm shadow-green-200" />
              <span className="text-[10px] font-medium text-muted-foreground">HTTPS</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <span className="truncate font-mono text-xs text-muted-foreground">localhost:preview</span>
            <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 sm:flex dark:text-emerald-300">
              <ShieldCheck className="h-3 w-3" />
              Safe preview
            </span>
          </div>
        </div>

        {/* Device toggle — button group */}
        <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
          <button
            onClick={() => setDevice('desktop')}
            className={`rounded-md px-2 py-1.5 transition-all ${
              device === 'desktop'
                ? 'border border-border bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title="Desktop preview"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`rounded-md px-2 py-1.5 transition-all ${
              device === 'tablet'
                ? 'border border-border bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title="Tablet preview"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`rounded-md px-2 py-1.5 transition-all ${
              device === 'mobile'
                ? 'border border-border bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title="Mobile preview"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center rounded-lg border border-border bg-background p-0.5 ml-1">
          <button
            onClick={() => setViewMode('single')}
            className={`rounded-md px-2 py-1.5 transition-all ${
              viewMode === 'single'
                ? 'border border-border bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title="Single view"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`rounded-md px-2 py-1.5 transition-all ${
              viewMode === 'split'
                ? 'border border-border bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title="Split view"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Device frame toggle */}
        <button
          onClick={() => setShowDeviceFrame(!showDeviceFrame)}
          className={`ml-1.5 rounded-lg p-1.5 transition-all ${
            showDeviceFrame
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          title="Toggle device frame"
        >
          <SmartphoneFrame className="w-3.5 h-3.5" />
        </button>

        <button
          className="ml-1.5 rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:shadow-sm"
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
          ? 'border-primary/30 bg-primary/10'
          : 'border-border bg-card'
      }`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleInspector(!inspectorEnabled)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              inspectorEnabled
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/15 hover:bg-primary/90'
                : 'border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title={inspectorEnabled ? 'Disable inspector' : 'Enable element inspector'}
          >
            <MousePointer2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Inspect</span>
          </button>
          {inspectorEnabled && inspectorSelection && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-background px-3 py-1.5 text-xs shadow-sm">
              <span className="font-mono font-bold text-primary">&lt;{inspectorSelection.tag}&gt;</span>
              {inspectorSelection.id && (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">#{inspectorSelection.id}</span>
              )}
              {inspectorSelection.classes.length > 0 && (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  .{inspectorSelection.classes[0]}
                </span>
              )}
              <div className="h-3 w-px bg-border" />
              <span className="font-medium tabular-nums text-primary">{inspectorSelection.width} x {inspectorSelection.height}</span>
            </div>
          )}
          {inspectorEnabled && !inspectorSelection && (
            <div className="flex items-center gap-1.5 text-[10px] text-primary">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Click an element in the preview...
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          {metrics.domNodes > 0 && (
            <span className="rounded-md bg-background px-2 py-0.5">{metrics.domNodes} nodes</span>
          )}
          {metrics.heapMB > 0 && (
            <span className="rounded-md bg-background px-2 py-0.5">{metrics.heapMB} MB</span>
          )}
        </div>
      </div>

      {/* Preview iframe — polished */}
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-muted/25 p-4" style={{ flex: bottomOpen ? `1 1 calc(100% - ${BOTTOM_HEIGHT}px)` : '1 1 100%' }}>
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
          <div className={`flex w-full h-full gap-4 ${viewMode === 'split' ? 'flex-col lg:flex-row' : 'justify-center'}`}>
            {renderPreview(iframeRef)}
            {viewMode === 'split' && (
              <div className="flex-1 min-h-0 overflow-auto">
                {renderPreview(iframeRefSplit, true)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DevTools bottom panel — Chrome DevTools style */}
      {bottomOpen && (
        <div className="flex-shrink-0 border-t border-border bg-card shadow-lg shadow-black/10" style={{ height: BOTTOM_HEIGHT }}>
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-card px-2">
              <div className="flex items-center">
                {tabConfig.map(tc => {
                  const Icon = tc.icon;
                  return (
                    <button
                      key={tc.tab}
                      onClick={() => setBottomTab(tc.tab)}
                      className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                        bottomTab === tc.tab
                          ? 'bg-background text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
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
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setBottomOpen(false)}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
        <div className="flex flex-shrink-0 items-center justify-center border-t border-border bg-card py-1.5">
          <button
            onClick={() => setBottomOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:text-foreground hover:shadow-md"
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
