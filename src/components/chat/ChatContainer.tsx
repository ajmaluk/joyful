import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Trash2, Bug, ChevronRight, Square, Play, RotateCcw,
  Clock, FileCode2, Target, ListTodo, Pause,
} from 'lucide-react';
import { useJoyfulStore, checkInterruptedRun } from '@/store/joyfulStore';
import { agentEventBus } from '@/lib/agent/eventBus';
import { AgentStatusBar } from './AgentStatusBar';
import { MessageList } from './MessageList';
import { ChangedFilesCard } from './ChangedFilesCard';
import { DeveloperDetails } from './DeveloperDetails';
import { TodoPanel } from '../TodoPanel/TodoPanel';
import { ChangedFilesPanel } from '../ChangedFiles/ChangedFilesPanel';
import { TodoAccordion } from './TodoAccordion';
import { PromptInput } from './PromptInput';
import { StorageStatus } from '../StorageStatus/StorageStatus';
import { exportProjectAsZip } from '@/services/fileSystem';
import { virtualFS } from '@/lib/vfs/VirtualFileSystem';

interface ChatContainerProps {
  onOpenFile?: (path: string) => void;
  onCloseSidebar?: () => void;
  onSendMessage?: (prompt: string) => void;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function ChatContainer({ onOpenFile, onCloseSidebar, onSendMessage }: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'changes' | 'storage'>('chat');
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [interruptedState, setInterruptedState] = useState<ReturnType<typeof checkInterruptedRun>['state'] | null>(null);
  const [storageStats, setStorageStats] = useState({
    backend: 'IndexedDB' as const,
    projectSize: 0,
    files: 0,
    lastSaved: Date.now(),
    persistence: false,
  });

  const {
    currentProject,
    agentMessages,
    agentUI,
    agentTodos,
    agentFileChanges,
    agentPlan,
    resetAgentUI,
    clearAgentMessages,
    setAgentRunning,
    setCurrentTool,
    setElapsedMs,
    toggleDeveloperMode,
    pauseRun,
    resumeRun,
    restoreAgentState,
    discardSavedAgentState,
  } = useJoyfulStore();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [agentMessages, scrollToBottom, activeTab]);

  // Load storage stats dynamically from VFS and navigator.storage
  const loadStorageStats = useCallback(async () => {
    try {
      await virtualFS.init();
      const allFiles = await virtualFS.getAllFiles();
      let size = 0;
      let count = 0;
      const latestSave = Date.now();
      
      for (const f of allFiles) {
        if (f.path.includes('.')) {
          size += f.content.length;
          count++;
        }
      }

      let persisted = false;
      if (navigator.storage && navigator.storage.persisted) {
        persisted = await navigator.storage.persisted();
      }

      setStorageStats({
        backend: 'IndexedDB',
        projectSize: size,
        files: count,
        lastSaved: latestSave,
        persistence: persisted,
      });
    } catch (err) {
      console.error('Error loading storage stats:', err);
    }
  }, []);

  // Check for interrupted runs on mount
  useEffect(() => {
    const { hasInterrupted, state } = checkInterruptedRun();
    if (hasInterrupted && state) {
      setInterruptedState(state);
      setShowResumeDialog(true);
    }
  }, []);

  // Poll storage status on mount and when changes occur
  useEffect(() => {
    loadStorageStats();
  }, [loadStorageStats, agentFileChanges]);

  // Elapsed timer
  useEffect(() => {
    if (!agentUI.isRunning || agentUI.isPaused) return;
    const startTime = Date.now() - agentUI.elapsedMs;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentUI.isRunning, agentUI.isPaused, agentUI.elapsedMs]);

  const handleStop = useCallback(() => {
    agentEventBus.emit({ type: 'agent:cancelled' });
    setAgentRunning(false);
    setCurrentTool(null);
    discardSavedAgentState();
  }, [setAgentRunning, setCurrentTool, discardSavedAgentState]);

  const handlePause = useCallback(() => {
    pauseRun();
  }, [pauseRun]);

  const handleResume = useCallback(() => {
    resumeRun();
    // Re-emit status to resume agent loop
    agentEventBus.emit({ type: 'agent:status', status: agentUI.status, message: 'Resuming...' });
  }, [resumeRun, agentUI.status]);

  const handleClear = useCallback(() => {
    clearAgentMessages();
    resetAgentUI();
    agentEventBus.clear();
  }, [clearAgentMessages, resetAgentUI]);

  const handleRetry = useCallback(() => {
    if (agentUI.currentGoal) {
      resetAgentUI();
      agentEventBus.emit({ type: 'agent:start', runId: crypto.randomUUID(), userRequest: agentUI.currentGoal });
    }
  }, [agentUI.currentGoal, resetAgentUI]);

  const handleResumeInterrupted = useCallback(() => {
    if (interruptedState) {
      restoreAgentState(interruptedState);
      setShowResumeDialog(false);
      setInterruptedState(null);
    }
  }, [interruptedState, restoreAgentState]);

  const handleDiscardInterrupted = useCallback(() => {
    discardSavedAgentState();
    setShowResumeDialog(false);
    setInterruptedState(null);
  }, [discardSavedAgentState]);

  const handleExport = useCallback(async () => {
    try {
      await virtualFS.init();
      const allFiles = await virtualFS.getAllFiles();
      const files = allFiles.map((f) => ({
        id: f.path,
        path: f.path.startsWith('/') ? f.path.slice(1) : f.path, // relative path for zip
        content: f.content,
        type: 'other' as const,
        isModified: false,
      }));

      await exportProjectAsZip({
        name: currentProject?.name || 'joyful-project',
        files,
      });
    } catch (err) {
      console.error('Failed to export project ZIP:', err);
    }
  }, [currentProject]);

  const activeTodo = agentTodos.find((t) => t.status === 'in_progress');

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-x-hidden bg-background">
      {/* Status bar */}
      <AgentStatusBar
        status={agentUI.status}
        mode={agentUI.mode}
        currentGoal={agentUI.currentGoal}
        currentTodo={activeTodo?.title || null}
        currentFile={agentUI.currentFile}
        isRunning={agentUI.isRunning}
        isPaused={agentUI.isPaused}
        elapsedMs={agentUI.elapsedMs}
        onStop={handleStop}
        onPause={handlePause}
        onResume={handleResume}
        onRetry={handleRetry}
      />

      {/* Toolbar & Controls */}
      <div className="flex items-center justify-between border-b border-border/60 px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Workspace</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleDeveloperMode}
            className={`rounded-md p-1.5 transition-colors ${
              agentUI.developerMode
                ? 'bg-sky-500/10 text-sky-400'
                : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground'
            }`}
            title={agentUI.developerMode ? 'Disable developer mode' : 'Enable developer mode'}
          >
            <Bug className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleClear}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            title="Clear chat & reset"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {onCloseSidebar && (
            <button
              onClick={onCloseSidebar}
              className="rounded-md border border-border bg-white/[0.03] p-1.5 text-muted-foreground transition-colors hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-foreground"
              title="Close sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Premium Glassmorphic Tab Bar Switcher */}
      <div className="border-b border-border/60 bg-white/[0.01] p-1.5 backdrop-blur-md">
        <div className="grid w-full grid-cols-4 gap-1 rounded-lg bg-black/25 p-0.5">
          {(['chat', 'tasks', 'changes', 'storage'] as const).map((tab) => {
            const isActive = activeTab === tab;
            let label = '';
            let count: number | string | null = null;
            
            if (tab === 'chat') {
              label = 'Chat';
              count = agentMessages.length > 0 ? agentMessages.length : null;
            } else if (tab === 'tasks') {
              label = 'Tasks';
              const completedCount = agentTodos.filter((t) => t.status === 'completed').length;
              count = agentTodos.length > 0 ? `${completedCount}/${agentTodos.length}` : null;
            } else if (tab === 'changes') {
              label = 'Changes';
              count = agentFileChanges.length > 0 ? agentFileChanges.length : null;
            } else if (tab === 'storage') {
              label = 'Storage';
            }

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex flex-col items-center justify-center rounded-md py-1.5 text-[10px] font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-white/[0.08] text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.2)]'
                    : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground'
                }`}
              >
                <span className="capitalize">{label}</span>
                {count !== null && (
                  <span className={`absolute -top-1.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[8px] font-bold text-primary ring-1 ring-primary/30 backdrop-blur-sm`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interrupted Run Resume Dialog */}
      {showResumeDialog && interruptedState && (
        <div className="mx-3 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
              <RotateCcw className="h-4 w-4 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-amber-200">Interrupted Task Found</h4>
              <p className="mt-1 text-xs text-amber-300/80">
                Previous task was interrupted: &ldquo;{interruptedState.userRequest}&rdquo;
              </p>
              <p className="mt-0.5 text-[10px] text-amber-400/60">
                {interruptedState.todos.filter(t => t.status === 'completed').length}/{interruptedState.todos.length} tasks completed
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleResumeInterrupted}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
                >
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </button>
                <button
                  onClick={handleDiscardInterrupted}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.1] hover:text-foreground"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Task Card - Always visible while agent is running */}
      {(agentUI.isRunning || agentUI.isPaused) && (
        <div className="mx-3 mt-3">
          <div className={`rounded-xl border p-3 transition-all ${
            agentUI.isPaused
              ? 'border-amber-500/20 bg-amber-500/[0.03]'
              : 'border-sky-500/20 bg-sky-500/[0.03]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Active Task
              </div>
              <div className="flex items-center gap-1">
                {agentUI.isPaused ? (
                  <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-400">
                    <Pause className="h-2.5 w-2.5" />
                    Paused
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Running
                  </span>
                )}
              </div>
            </div>

            {agentUI.currentGoal && (
              <p className="mb-2 truncate text-xs font-medium text-foreground">
                {agentUI.currentGoal}
              </p>
            )}

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              {agentUI.currentTodoId && (() => {
                const currentTodo = agentTodos.find(t => t.id === agentUI.currentTodoId);
                return currentTodo ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                    <ListTodo className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{currentTodo.title}</span>
                  </div>
                ) : null;
              })()}
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileCode2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate font-mono text-[9px]">
                  {agentUI.currentFile || 'No file selected'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>{formatElapsed(agentUI.elapsedMs)}</span>
              </div>
            </div>

            {agentTodos.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500"
                      style={{
                        width: `${Math.round(
                          (agentTodos.filter(t => t.status === 'completed').length / agentTodos.length) * 100
                        )}%`
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {agentTodos.filter(t => t.status === 'completed').length}/{agentTodos.length}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-2 flex items-center gap-2">
              {agentUI.isRunning && !agentUI.isPaused && (
                <>
                  <button
                    onClick={handlePause}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                  >
                    <Pause className="h-3 w-3" />
                    Pause
                  </button>
                  <button
                    onClick={handleStop}
                    className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    <Square className="h-3 w-3" />
                    Stop
                  </button>
                </>
              )}
              {agentUI.isPaused && (
                <button
                  onClick={handleResume}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                >
                  <Play className="h-3 w-3" />
                  Resume
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Panel Viewports */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'chat' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
            <MessageList
              messages={agentMessages}
              onOpenFile={onOpenFile}
              onRetry={handleRetry}
              isGenerating={agentUI.isRunning}
            />

            {/* Active plan card */}
            {agentPlan.length > 0 && agentUI.isRunning && (
              <div className="mt-4">
                <div className="rounded-xl border border-border bg-card/50 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    Active Plan
                  </div>
                  <div className="space-y-1">
                    {agentPlan.map((step) => (
                      <div key={step.id} className="flex items-start gap-2 text-xs">
                        <div className={`mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                          step.status === 'completed' ? 'bg-emerald-400' :
                          step.status === 'in_progress' ? 'bg-sky-400 animate-pulse' :
                          step.status === 'failed' ? 'bg-red-400' :
                          'bg-muted-foreground/40'
                        }`} />
                        <span className={`${step.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {step.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

                  {/* Active file changes */}
            {agentFileChanges.length > 0 && agentUI.isRunning && (
              <div className="mt-4">
                <ChangedFilesCard changes={agentFileChanges} onOpenFile={onOpenFile} />
              </div>
            )}

            {/* Developer details */}
            {agentUI.developerMode && (
              <div className="mt-4">
                <DeveloperDetails
                  open={true}
                  tokenEstimate={undefined}
                  contextFiles={undefined}
                  memoryRecords={agentTodos.length}
                  repoMapEntries={agentPlan.length}
                  storageUsage={undefined}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto min-h-0">
            <TodoPanel
              todos={agentTodos}
              currentTodoId={agentUI.currentTodoId}
            />
          </div>
        )}

        {activeTab === 'changes' && (
          <div className="flex-1 overflow-y-auto min-h-0">
            <ChangedFilesPanel
              changes={agentFileChanges}
              onOpenFile={onOpenFile}
            />
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <StorageStatus
              backend={storageStats.backend}
              projectSize={storageStats.projectSize}
              files={storageStats.files}
              lastSaved={storageStats.lastSaved}
              persistence={storageStats.persistence}
              onExport={handleExport}
            />
          </div>
        )}
      </div>

      {/* Todo accordion - above input */}
      {(agentTodos.length > 0 || agentUI.isRunning) && (
        <TodoAccordion
          todos={agentTodos}
          currentTodoId={agentUI.currentTodoId}
          currentFile={agentUI.currentFile}
          elapsedMs={agentUI.elapsedMs}
          isRunning={agentUI.isRunning}
          isPaused={agentUI.isPaused}
        />
      )}

      {/* Prompt input */}
      {onSendMessage && (
        <PromptInput
          onSend={(content) => onSendMessage(content)}
          disabled={agentUI.isRunning}
          isGenerating={agentUI.isRunning}
          onCancel={() => {
            agentEventBus.emit({ type: 'agent:cancelled' });
            setAgentRunning(false);
            setCurrentTool(null);
            discardSavedAgentState();
          }}
        />
      )}
    </div>
  );
}

