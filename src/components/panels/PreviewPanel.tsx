import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Home, RotateCcw, ExternalLink, Smartphone, Tablet, Monitor, ShieldCheck, PlayCircle, Terminal, Network, Activity, ChevronDown, ChevronUp, MousePointer2, Columns, Smartphone as SmartphoneFrame, Wrench } from 'lucide-react';
import type { PreviewIssue, ProjectFile } from '@/types';
import { generatePreview } from '@/services/fileSystem';
import { SANDBOX_BRIDGE_SCRIPT } from '@/utils/sandboxBridge';
import { useSandboxMessages } from '@/hooks/useSandboxMessages';
import { ConsolePanel } from '@/components/sandbox/ConsolePanel';
import { NetworkPanel } from '@/components/sandbox/NetworkPanel';
import { PerformanceMetrics } from '@/components/sandbox/PerformanceMetrics';

interface PreviewPanelProps {
  files: ProjectFile[];
  projectId?: string;
  onRequestFix?: (prompt: string) => void;
  onUseSelection?: (context: string) => void;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type BottomTab = 'console' | 'network' | 'performance';
type ViewMode = 'single' | 'split';

const BOTTOM_HEIGHT = 200;

const PREVIEW_ROUTE_PREFIX = 'joyful_preview_route_';

function buildFixPrompt(issues: PreviewIssue[], files: ProjectFile[]) {
  const topIssues = issues.slice(0, 6);
  const mentionedPaths = Array.from(new Set(topIssues.map(issue => issue.path).filter(Boolean))) as string[];
  const fallbackPaths = files
    .filter(file => /^src\/App\.(jsx|tsx)$/i.test(file.path) || file.path === 'index.html' || file.path.endsWith('.css'))
    .slice(0, 4)
    .map(file => file.path);
  const paths = mentionedPaths.length > 0 ? mentionedPaths : fallbackPaths;

  return `Fix the preview/runtime issues below. Prefer targeted patch operations for small edits instead of rewriting entire files. Read the broken files again, identify the root cause, and return only the minimal create/modify/delete or patch operations needed.

Issues:
${topIssues.map((issue, index) => `${index + 1}. ${issue.severity.toUpperCase()}${issue.path ? ` in ${issue.path}${issue.line ? `:${issue.line}` : ''}${issue.column ? `:${issue.column}` : ''}` : ''}: ${issue.message}`).join('\n')}

Likely files to inspect:
${paths.length > 0 ? paths.map(path => `- ${path}`).join('\n') : '- No specific file detected; inspect the preview entry and recent changes.'}

After fixing, run browser-safe validation such as npm run build or npm run lint when package scripts exist.`;
}

function buildSelectionPrompt(selection: NonNullable<ReturnType<typeof useSandboxMessages>['inspectorSelection']>) {
  return `Selected preview element:
selector: ${selection.selector}
element: <${selection.tag}>${selection.id ? ` #${selection.id}` : ''}${selection.classes.length ? ` .${selection.classes.slice(0, 4).join('.')}` : ''}
box: ${selection.width} x ${selection.height} at ${selection.x}, ${selection.y}
styles: display=${selection.display}; position=${selection.position}; font-size=${selection.fontSize}; color=${selection.color}; background=${selection.backgroundColor}

Use this selected element as the target for my next change.`;
}

export function PreviewPanel({ files, projectId, onRequestFix, onUseSelection }: PreviewPanelProps) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [srcDoc, setSrcDoc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('console');
  const [showDeviceFrame, setShowDeviceFrame] = useState(false);
  const [currentPath, setCurrentPath] = useState(() => {
    if (!projectId) return '/';
    try {
      return localStorage.getItem(`${PREVIEW_ROUTE_PREFIX}${projectId}`) || '/';
    } catch {
      return '/';
    }
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeRefSplit = useRef<HTMLIFrameElement>(null);

  const {
    logs,
    network,
    metrics,
    issues,
    inspectorSelection,
    inspectorEnabled,
    toggleInspector,
    requestMetrics,
    clearLogs,
    clearNetwork,
    clearInspectorSelection,
    sendToIframe,
  } = useSandboxMessages(iframeRef, files);

  const pageOptions = useMemo(() => {
    const routes = new Set<string>(['/']);

    for (const file of files) {
      if (file.type === 'html' && file.path !== 'index.html') {
        routes.add(`/${file.path.replace(/\.html$/i, '').replace(/^\/+/, '')}`);
      }

      const contentRoutes = file.content.match(/(?:path\s*[:=]|to=|href=|data-preview-path=)["']\/[A-Za-z0-9_/-]*["']/g) || [];
      for (const match of contentRoutes) {
        const route = match.match(/["'](\/[A-Za-z0-9_/-]*)["']/)?.[1];
        if (route && !route.includes('//') && route !== '#') routes.add(route.replace(/\/+$/, '') || '/');
      }
    }

    return Array.from(routes).sort((a, b) => a.localeCompare(b));
  }, [files]);

  useEffect(() => {
    if (!pageOptions.includes(currentPath)) {
      setCurrentPath('/');
    }
  }, [currentPath, pageOptions]);

  useEffect(() => {
    if (!projectId) return;
    try {
      localStorage.setItem(`${PREVIEW_ROUTE_PREFIX}${projectId}`, currentPath);
    } catch {
      // ignore persistence failures
    }
  }, [currentPath, projectId]);

  useEffect(() => {
    if (logs.length > 0 || network.length > 0 || inspectorEnabled) {
      setBottomOpen(true);
    }
  }, [inspectorEnabled, logs.length, network.length]);

  const refreshPreview = useCallback(() => {
    setIsLoading(true);
    clearLogs();
    clearNetwork();
    clearInspectorSelection();
    const html = generatePreview(files, currentPath);
    const bridgeHtml = html.includes('</body>')
      ? html.replace('</body>', `${SANDBOX_BRIDGE_SCRIPT}</body>`)
      : html + SANDBOX_BRIDGE_SCRIPT;
    setSrcDoc(bridgeHtml);
    setTimeout(() => {
      setIsLoading(false);
      requestMetrics();
    }, 300);
  }, [clearInspectorSelection, clearLogs, clearNetwork, currentPath, files, requestMetrics]);

  const refreshPreviewRef = useRef(refreshPreview);

  useEffect(() => {
    refreshPreviewRef.current = refreshPreview;
  }, [refreshPreview]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshPreviewRef.current();
    }, 500);
    return () => clearTimeout(timer);
  }, [files]);

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
          sandbox="allow-scripts allow-forms allow-same-origin"
          className={`w-full bg-white ${showDeviceFrame && !isDesktopDevice ? 'rounded-lg' : ''}`}
          style={{ height: showDeviceFrame && !isDesktopDevice ? frame.height : '100%' }}
          title={isSplit ? 'Preview Split' : 'Preview'}
          onLoad={() => {
            setIsLoading(false);
            requestMetrics();
            if (inspectorEnabled && !isSplit) {
              sendToIframe('toggle-inspector', { enabled: true });
            }
          }}
        />
      </div>
    );
  };

  const tabConfig: { tab: BottomTab; icon: typeof Terminal; label: string; badge?: number }[] = [
    { tab: 'console', icon: Terminal, label: 'Console', badge: logs.filter(l => l.level === 'error').length || undefined },
    { tab: 'network', icon: Network, label: 'Network', badge: network.filter(r => r.pending).length || undefined },
    { tab: 'performance', icon: Activity, label: 'Perf' },
  ];
  const actionableIssues = issues.filter(issue => issue.severity === 'error');

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-l border-border bg-background">
      {/* Browser chrome — polished */}
      <div className="flex h-12 items-center justify-between border-b border-border bg-card px-3 shadow-sm">
        <div className="flex items-center gap-1">
          <button
            onClick={refreshPreview}
            className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:shadow-sm"
            title="Home"
            aria-label="Home"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={refreshPreview}
            className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:shadow-sm"
            title="Refresh preview"
            aria-label="Refresh preview"
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
            <select
              value={currentPath}
              onChange={(event) => setCurrentPath(event.target.value)}
              className="min-w-0 flex-1 appearance-none bg-transparent font-mono text-xs text-muted-foreground outline-none"
              title="Preview route"
              aria-label="Preview route"
            >
              {pageOptions.map((path) => (
                <option key={path} value={path}>{path}</option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
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
            aria-label="Desktop preview"
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
            aria-label="Tablet preview"
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
            aria-label="Mobile preview"
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
            aria-label="Single view"
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
            aria-label="Split view"
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
          aria-label="Toggle device frame"
        >
          <SmartphoneFrame className="w-3.5 h-3.5" />
        </button>

        <button
          className="ml-1.5 rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:shadow-sm"
          title="Open preview in new tab"
          aria-label="Open preview in new tab"
          onClick={() => {
            const html = generatePreview(files, currentPath);
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
              {onUseSelection && (
                <button
                  type="button"
                  onClick={() => onUseSelection(buildSelectionPrompt(inspectorSelection))}
                  className="ml-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Use in chat
                </button>
              )}
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

      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-1.5 text-[10px] text-muted-foreground">
        <span className="rounded-full border border-border bg-background px-2 py-0.5 font-mono">{currentPath}</span>
        <span className="rounded-full border border-border bg-background px-2 py-0.5">Console {logs.length}</span>
        <span className="rounded-full border border-border bg-background px-2 py-0.5">Errors {logs.filter(log => log.level === 'error').length}</span>
        <span className="rounded-full border border-border bg-background px-2 py-0.5">Network {network.length}</span>
        <span className="rounded-full border border-border bg-background px-2 py-0.5">Pending {network.filter(request => request.pending).length}</span>
        <button
          type="button"
          onClick={() => setBottomOpen(true)}
          className="ml-auto rounded-full border border-border bg-background px-2 py-0.5 font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          Open DevTools
        </button>
        {onRequestFix && actionableIssues.length > 0 && (
          <button
            type="button"
            onClick={() => onRequestFix(buildFixPrompt(actionableIssues, files))}
            className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 font-semibold text-red-600 transition-colors hover:bg-red-500/15 dark:text-red-300"
            title="Send these preview errors to Joyful AI"
          >
            <Wrench className="mr-1 inline h-3 w-3" />
            Fix {actionableIssues.length}
          </button>
        )}
      </div>

      {onRequestFix && actionableIssues.length > 0 && (
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-200">
          <AlertSummary issues={actionableIssues} />
          <button
            type="button"
            onClick={() => onRequestFix(buildFixPrompt(actionableIssues, files))}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            <Wrench className="h-3.5 w-3.5" />
            Fix in chat
          </button>
        </div>
      )}

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

function AlertSummary({ issues }: { issues: PreviewIssue[] }) {
  const first = issues[0];
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold">
        Preview found {issues.length} runtime issue{issues.length > 1 ? 's' : ''}
        {first.path ? ` in ${first.path}${first.line ? `:${first.line}` : ''}` : ''}
      </p>
      <p className="truncate opacity-80">{first.message}</p>
    </div>
  );
}
