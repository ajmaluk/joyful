import { create } from 'zustand';
import type { AgentMode, TaskTodo } from '@/engine/types';
import { agentEventBus, type AgentStatus, type Todo, type FileChange, type ToolActivity, type AgentPlanStep, type CompileError, type FinalSummary } from '@/lib/agent/eventBus';
import { storageManager } from '@/engine/storage';
import { uniqueId } from '@/utils/ids';

// ── Persistence ──────────────────────────────────────────────
const SAVED_STATE_KEY = 'joyful_agent_saved_state';

export interface SavedAgentState {
  runId: string;
  userRequest: string;
  status: AgentStatus;
  mode: AgentMode;
  createdAt: number;
  todos: Todo[];
  fileChanges: FileChange[];
  toolActivities: ToolActivity[];
  plan: AgentPlanStep[];
  compileErrors: CompileError[];
  messages: AgentMessage[];
  currentTodoId: string | null;
  currentFile: string | null;
  elapsedMs: number;
}

function saveAgentStateToStorage(state: SavedAgentState): void {
  try {
    localStorage.setItem(SAVED_STATE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable
  }
}

function getSavedAgentState(): SavedAgentState | null {
  try {
    const raw = localStorage.getItem(SAVED_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSavedAgentState(): void {
  try {
    localStorage.removeItem(SAVED_STATE_KEY);
  } catch {
    // ignore
  }
}

export function checkInterruptedRun(): { hasInterrupted: boolean; state?: SavedAgentState } {
  const state = getSavedAgentState();
  if (state && (state.status !== 'completed' && state.status !== 'failed' && state.status !== 'cancelled' && state.status !== 'idle')) {
    return { hasInterrupted: true, state };
  }
  return { hasInterrupted: false };
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'error';
  type:
    | 'text'
    | 'thinking'
    | 'plan'
    | 'todo_update'
    | 'tool_call'
    | 'tool_result'
    | 'file_change'
    | 'compile_result'
    | 'debug_result'
    | 'memory_update'
    | 'final_summary'
    | 'warning';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ConsoleMessage {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export interface OpenFile {
  path: string;
  modified: boolean;
}

export interface AgentState {
  running: boolean;
  mode: AgentMode;
  iteration: number;
  currentTool: string | null;
  error: string | null;
}

export interface ProjectInfo {
  name: string;
  description: string;
  framework: string;
  entryPoint: string;
  createdAt: number;
}

export interface AgentUIState {
  status: AgentStatus;
  mode: AgentMode;
  currentRunId: string | null;
  currentGoal: string | null;
  currentTodoId: string | null;
  currentFile: string | null;
  elapsedMs: number;
  isRunning: boolean;
  isPaused: boolean;
  developerMode: boolean;
}

interface JoyfulStore {
  // Project
  currentProject: ProjectInfo | null;
  setCurrentProject: (project: ProjectInfo | null) => void;

  // Files
  openFiles: OpenFile[];
  activeFilePath: string | null;
  setActiveFile: (path: string | null) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  markFileModified: (path: string, modified: boolean) => void;

  // Agent
  agent: AgentState;
  agentMessages: AgentMessage[];
  todos: TaskTodo[];
  setAgentRunning: (running: boolean) => void;
  setAgentMode: (mode: AgentMode) => void;
  setAgentIteration: (iteration: number) => void;
  setCurrentTool: (tool: string | null) => void;
  setAgentError: (error: string | null) => void;
  addAgentMessage: (msg: AgentMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setTodos: (todos: TaskTodo[]) => void;
  clearAgentMessages: () => void;

  // Agent UI
  agentUI: AgentUIState;
  agentTodos: Todo[];
  agentFileChanges: FileChange[];
  agentToolActivities: ToolActivity[];
  agentPlan: AgentPlanStep[];
  agentCompileErrors: CompileError[];
  agentFinalSummary: FinalSummary | null;

  setAgentUIStatus: (status: AgentStatus) => void;
  setAgentUIMode: (mode: AgentMode) => void;
  setCurrentRunId: (runId: string | null) => void;
  setCurrentGoal: (goal: string | null) => void;
  setCurrentTodoId: (todoId: string | null) => void;
  setCurrentFile: (file: string | null) => void;
  setElapsedMs: (ms: number) => void;
  setIsPaused: (paused: boolean) => void;
  toggleDeveloperMode: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  restoreAgentState: (state: SavedAgentState) => void;
  discardSavedAgentState: () => void;

  setAgentTodos: (todos: Todo[]) => void;
  updateAgentTodo: (todoId: string, updates: Partial<Todo>) => void;
  addFileChange: (change: FileChange) => void;
  addToolActivity: (activity: ToolActivity) => void;
  updateToolActivity: (activityId: string, updates: Partial<ToolActivity>) => void;
  setAgentPlan: (plan: AgentPlanStep[]) => void;
  updateAgentPlanStep: (stepId: string, updates: Partial<AgentPlanStep>) => void;
  setAgentCompileErrors: (errors: CompileError[]) => void;
  addAgentCompileError: (error: CompileError) => void;
  setAgentFinalSummary: (summary: FinalSummary | null) => void;
  updateChatMessage: (id: string, updates: Partial<ChatMessage>) => void;
  resetAgentUI: () => void;

  // Preview
  previewVisible: boolean;
  previewUrl: string | null;
  setPreviewVisible: (visible: boolean) => void;
  setPreviewUrl: (url: string | null) => void;

  // Console
  consoleMessages: ConsoleMessage[];
  addConsoleMessage: (msg: ConsoleMessage) => void;
  clearConsole: () => void;

  // Compile errors
  compileErrors: CompileError[];
  setCompileErrors: (errors: CompileError[]) => void;

  // Layout
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const defaultAgentUI: AgentUIState = {
  status: 'idle',
  mode: 'builder',
  currentRunId: null,
  currentGoal: null,
  currentTodoId: null,
  currentFile: null,
  elapsedMs: 0,
  isRunning: false,
  isPaused: false,
  developerMode: false,
};

export type ChatMessage = AgentMessage;

export const useJoyfulStore = create<JoyfulStore>()((set) => ({
  // Project
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  // Files
  openFiles: [],
  activeFilePath: null,
  setActiveFile: (path) => set({ activeFilePath: path }),
  openFile: (path) => set((state) => {
    const existing = state.openFiles.find(f => f.path === path);
    if (existing) {
      return { activeFilePath: path };
    }
    return {
      openFiles: [...state.openFiles, { path, modified: false }],
      activeFilePath: path,
    };
  }),
  closeFile: (path) => set((state) => {
    const remaining = state.openFiles.filter(f => f.path !== path);
    const wasActive = state.activeFilePath === path;
    return {
      openFiles: remaining,
      activeFilePath: wasActive
        ? (remaining[remaining.length - 1]?.path ?? null)
        : state.activeFilePath,
    };
  }),
  markFileModified: (path, modified) => set((state) => ({
    openFiles: state.openFiles.map(f =>
      f.path === path ? { ...f, modified } : f
    ),
  })),

  // Agent State
  agent: {
    running: false,
    mode: 'builder',
    iteration: 0,
    currentTool: null,
    error: null,
    status: 'idle',
    currentGoal: null,
    currentFile: null,
    elapsedMs: 0,
    currentRunId: null,
    currentTodoId: null,
  },
  agentMessages: [],
  todos: [],
  changedFiles: [],
  agentErrors: [],
  toolActivities: [],
  developerMode: false,
  isPaused: false,

  // Agent UI State
  agentUI: defaultAgentUI,
  agentTodos: [],
  agentFileChanges: [],
  agentToolActivities: [],
  agentPlan: [],
  agentCompileErrors: [],
  agentFinalSummary: null,

  setAgentRunning: (running) => set((s) => ({ agent: { ...s.agent, running } })),
  setAgentMode: (mode) => set((s) => ({ agent: { ...s.agent, mode } })),
  setAgentIteration: (iteration) => set((s) => ({ agent: { ...s.agent, iteration } })),
  setCurrentTool: (currentTool) => set((s) => ({ agent: { ...s.agent, currentTool } })),
  setAgentError: (error) => set((s) => ({ agent: { ...s.agent, error } })),
  setTodos: (todos) => set({ todos }),
  addAgentMessage: (msg) => set((state) => ({
    agentMessages: [...state.agentMessages, msg],
  })),
  updateLastAssistantMessage: (content) => set((state) => {
    const messages = [...state.agentMessages];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].type === 'text') {
        messages[i] = { ...messages[i], content: messages[i].content + content };
        break;
      }
    }
    return { agentMessages: messages };
  }),
  clearAgentMessages: () => set({ agentMessages: [] }),

  setAgentUIStatus: (status) => set((s) => ({ agentUI: { ...s.agentUI, status, isRunning: status !== 'idle' && status !== 'completed' && status !== 'failed' && status !== 'cancelled' } })),
  setAgentUIMode: (mode) => set((s) => ({ agentUI: { ...s.agentUI, mode } })),
  setCurrentRunId: (currentRunId) => set((s) => ({ agentUI: { ...s.agentUI, currentRunId } })),
  setCurrentGoal: (currentGoal) => set((s) => ({ agentUI: { ...s.agentUI, currentGoal } })),
  setCurrentTodoId: (currentTodoId) => set((s) => ({ agentUI: { ...s.agentUI, currentTodoId } })),
  setCurrentFile: (currentFile) => set((s) => ({ agentUI: { ...s.agentUI, currentFile } })),
  setElapsedMs: (elapsedMs) => set((s) => ({ agentUI: { ...s.agentUI, elapsedMs } })),
  setIsPaused: (isPaused) => set((s) => ({ agentUI: { ...s.agentUI, isPaused } })),
  toggleDeveloperMode: () => set((s) => ({ agentUI: { ...s.agentUI, developerMode: !s.agentUI.developerMode } })),
  pauseRun: () => set((s) => {
    const newState = { agentUI: { ...s.agentUI, isPaused: true } };
    const saved = getSavedAgentState();
    if (saved) {
      saved.status = s.agentUI.status;
      saved.currentFile = s.agentUI.currentFile;
      saved.currentTodoId = s.agentUI.currentTodoId;
      saved.elapsedMs = s.agentUI.elapsedMs;
      saved.fileChanges = s.agentFileChanges;
      saved.toolActivities = s.agentToolActivities;
      saved.plan = s.agentPlan;
      saved.compileErrors = s.agentCompileErrors;
      saved.messages = s.agentMessages;
      saveAgentStateToStorage(saved);
    }
    return newState;
  }),
  resumeRun: () => set((s) => {
    const saved = getSavedAgentState();
    if (saved) {
      saved.status = s.agentUI.status;
      saveAgentStateToStorage(saved);
    }
    return { agentUI: { ...s.agentUI, isPaused: false } };
  }),
  restoreAgentState: (state: SavedAgentState) => set({
    agentUI: {
      status: state.status,
      mode: state.mode,
      currentRunId: state.runId,
      currentGoal: state.userRequest,
      currentTodoId: state.currentTodoId,
      currentFile: state.currentFile,
      elapsedMs: state.elapsedMs,
      isRunning: true,
      isPaused: false,
      developerMode: false,
    },
    agentTodos: state.todos,
    agentFileChanges: state.fileChanges,
    agentToolActivities: state.toolActivities,
    agentPlan: state.plan,
    agentCompileErrors: state.compileErrors,
    agentMessages: state.messages,
    agentFinalSummary: null,
  }),
  discardSavedAgentState: () => {
    clearSavedAgentState();
  },

  setAgentTodos: (agentTodos: Todo[]) => {
    set({ agentTodos });
    const saved = getSavedAgentState();
    if (saved) {
      saved.todos = agentTodos;
      saveAgentStateToStorage(saved);
    }
  },
  updateAgentTodo: (todoId: string, updates: Partial<Todo>) => set((state) => {
    const updated = state.agentTodos.map(t => t.id === todoId ? { ...t, ...updates } : t);
    const saved = getSavedAgentState();
    if (saved) {
      saved.todos = updated;
      saveAgentStateToStorage(saved);
    }
    return { agentTodos: updated };
  }),
  addFileChange: (change: FileChange) => set((state) => {
    const fileChanges = [...state.agentFileChanges, change];
    const saved = getSavedAgentState();
    if (saved) {
      saved.fileChanges = fileChanges;
      saveAgentStateToStorage(saved);
    }
    return { agentFileChanges: fileChanges };
  }),
  addToolActivity: (activity: ToolActivity) => set((state) => {
    const toolActivities = [...state.agentToolActivities, activity];
    const saved = getSavedAgentState();
    if (saved) {
      saved.toolActivities = toolActivities;
      saveAgentStateToStorage(saved);
    }
    return { agentToolActivities: toolActivities, agent: { ...state.agent, currentTool: activity.tool } };
  }),
  updateToolActivity: (activityId: string, updates: Partial<ToolActivity>) => set((state) => ({
    agentToolActivities: state.agentToolActivities.map(a =>
      a.id === activityId ? { ...a, ...updates } : a
    ),
  })),
  setAgentPlan: (agentPlan: AgentPlanStep[]) => set({ agentPlan }),
  updateAgentPlanStep: (stepId: string, updates: Partial<AgentPlanStep>) => set((state) => ({
    agentPlan: state.agentPlan.map(s => s.id === stepId ? { ...s, ...updates } : s),
  })),
  setAgentCompileErrors: (agentCompileErrors: CompileError[]) => set({ agentCompileErrors }),
  addAgentCompileError: (error: CompileError) => set((state) => ({
    agentCompileErrors: [...state.agentCompileErrors, error],
  })),
  setAgentFinalSummary: (agentFinalSummary: FinalSummary | null) => set({ agentFinalSummary }),
  updateChatMessage: (id, updates) => set((state) => ({
    agentMessages: state.agentMessages.map(m => m.id === id ? { ...m, ...updates } : m),
  })),
  resetAgentUI: () => {
    clearSavedAgentState();
    set({
      agentUI: { ...defaultAgentUI },
      agentTodos: [],
      agentFileChanges: [],
      agentToolActivities: [],
      agentPlan: [],
      agentCompileErrors: [],
      agentFinalSummary: null,
    });
  },

  // Preview
  previewVisible: true,
  previewUrl: null,
  setPreviewVisible: (previewVisible) => set({ previewVisible }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),

  // Console
  consoleMessages: [],
  addConsoleMessage: (msg) => set((state) => ({
    consoleMessages: [...state.consoleMessages.slice(-499), msg],
  })),
  clearConsole: () => set({ consoleMessages: [] }),

  // Compile errors
  compileErrors: [],
  setCompileErrors: (compileErrors) => set({ compileErrors }),

  // Layout
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));

// Subscribe to StorageManager events for real-time store updates
storageManager.on('quota_exceeded', (quota) => {
  const q = quota as { usage: number; quota: number; percentage: number };
  useJoyfulStore.getState().addConsoleMessage({
    id: uniqueId('quota'),
    level: 'warn',
    message: `Storage quota at ${q.percentage.toFixed(0)}% (${(q.usage / 1024 / 1024).toFixed(1)}MB / ${(q.quota / 1024 / 1024).toFixed(1)}MB). Consider cleaning up old projects.`,
    timestamp: Date.now(),
  });
});

storageManager.on('settings_changed', (settings) => {
  // Store latest settings snapshot so panels can read synchronously
  try {
    localStorage.setItem('joyful_latest_settings', JSON.stringify(settings));
  } catch {
    // ignore
  }
});

storageManager.on('project_changed', (detail) => {
  const d = detail as { id: string; action: string };
  useJoyfulStore.getState().addConsoleMessage({
    id: uniqueId('project'),
    level: 'info',
    message: `Project ${d.action === 'save' ? 'updated' : 'deleted'}: ${d.id}`,
    timestamp: Date.now(),
  });
});

// Subscribe to agent event bus to update store state in real-time
agentEventBus.subscribe((event) => {
  const store = useJoyfulStore.getState();
  
  switch (event.type) {
    case 'agent:start': {
      const initialState = {
        agentUI: {
          status: 'understanding' as AgentStatus,
          mode: 'builder' as AgentMode,
          currentRunId: event.runId,
          currentGoal: event.userRequest,
          currentTodoId: null,
          currentFile: null,
          elapsedMs: 0,
          isRunning: true,
          isPaused: false,
          developerMode: store.agentUI.developerMode,
        },
        agentTodos: [] as Todo[],
        agentFileChanges: [] as FileChange[],
        agentToolActivities: [] as ToolActivity[],
        agentPlan: [] as AgentPlanStep[],
        agentCompileErrors: [] as CompileError[],
        agentFinalSummary: null,
        agentMessages: [
          {
            id: uniqueId('msg_start'),
            role: 'assistant' as const,
            type: 'thinking' as const,
            content: `Starting task: "${event.userRequest}"`,
            timestamp: Date.now(),
          }
        ] as AgentMessage[],
      };
      useJoyfulStore.setState(initialState);
      // Persist run state to allow resume after refresh
      saveAgentStateToStorage({
        runId: event.runId,
        userRequest: event.userRequest,
        status: 'understanding',
        mode: 'builder',
        createdAt: Date.now(),
        todos: [],
        fileChanges: [],
        toolActivities: [],
        plan: [],
        compileErrors: [],
        messages: initialState.agentMessages,
        currentTodoId: null,
        currentFile: null,
        elapsedMs: 0,
      });
      break;
    }
    
    case 'agent:status': {
      store.setAgentUIStatus(event.status);
      const lastMsg = store.agentMessages[store.agentMessages.length - 1];
      if (lastMsg && lastMsg.type === 'thinking') {
        store.updateChatMessage(lastMsg.id, {
          content: event.message,
        });
      } else {
        store.addAgentMessage({
          id: uniqueId('status'),
          role: 'system',
          type: 'thinking',
          content: event.message,
          timestamp: Date.now(),
        });
      }
      break;
    }

    case 'agent:thinking': {
      const lastMsg = store.agentMessages[store.agentMessages.length - 1];
      if (lastMsg && lastMsg.type === 'thinking') {
        store.updateChatMessage(lastMsg.id, { content: event.text });
      } else {
        store.addAgentMessage({
          id: uniqueId('thinking'),
          role: 'assistant',
          type: 'thinking',
          content: event.text,
          timestamp: Date.now(),
        });
      }
      break;
    }

    case 'agent:message': {
      store.addAgentMessage({
        id: uniqueId('msg'),
        role: 'assistant',
        type: 'text',
        content: event.text,
        timestamp: Date.now(),
      });
      break;
    }
    
    case 'agent:mode': {
      store.setAgentUIMode(event.mode);
      break;
    }
    
    case 'agent:plan_created': {
      store.setAgentPlan(event.plan);
      store.addAgentMessage({
        id: uniqueId('plan'),
        role: 'assistant',
        type: 'plan',
        content: 'Created implementation plan',
        timestamp: Date.now(),
        metadata: { steps: event.plan }
      });
      break;
    }
    
    case 'todo:created':
    case 'todo:updated': {
      store.setAgentTodos(event.todos);
      const activeTodo = event.todos.find(t => t.status === 'in_progress');
      if (activeTodo) {
        store.setCurrentTodoId(activeTodo.id);
        store.setAgentUIMode(activeTodo.mode);
      }
      
      const lastMsg = store.agentMessages[store.agentMessages.length - 1];
      if (lastMsg && lastMsg.type === 'todo_update') {
        store.updateChatMessage(lastMsg.id, {
          content: 'Tasks updated',
          timestamp: Date.now(),
          metadata: { todos: event.todos }
        });
      } else {
        store.addAgentMessage({
          id: uniqueId('todo'),
          role: 'assistant',
          type: 'todo_update',
          content: 'Tasks updated',
          timestamp: Date.now(),
          metadata: { todos: event.todos }
        });
      }
      break;
    }
    
    case 'tool:started': {
      const activity: ToolActivity = {
        id: uniqueId('act'),
        tool: event.tool,
        input: event.input,
        display: event.display,
        status: 'running',
        startedAt: Date.now(),
      };
      store.addToolActivity(activity);
      
      store.addAgentMessage({
        id: `tool_call_${activity.id}`,
        role: 'tool',
        type: 'tool_call',
        content: event.display,
        timestamp: Date.now(),
        metadata: { activity }
      });
      break;
    }
    
    case 'tool:completed': {
      const lastAct = [...store.agentToolActivities]
        .reverse()
        .find(a => a.tool === event.tool && a.status === 'running');
      if (lastAct) {
        const updatedActivity = {
          ...lastAct,
          status: 'success' as const,
          result: event.result,
          completedAt: Date.now(),
        };
        store.updateToolActivity(lastAct.id, {
          status: 'success',
          result: event.result,
          completedAt: Date.now(),
        });
        
        const existingMsgIndex = store.agentMessages.findIndex(m => m.id === `tool_call_${lastAct.id}`);
        if (existingMsgIndex !== -1) {
          const updatedMessages = [...store.agentMessages];
          updatedMessages[existingMsgIndex] = {
            ...updatedMessages[existingMsgIndex],
            type: 'tool_result',
            content: event.display,
            metadata: { activity: updatedActivity }
          };
          useJoyfulStore.setState({ agentMessages: updatedMessages });
        } else {
          store.addAgentMessage({
            id: `tool_res_${lastAct.id}`,
            role: 'tool',
            type: 'tool_result',
            content: event.display,
            timestamp: Date.now(),
            metadata: { activity: updatedActivity }
          });
        }
      }
      break;
    }
    
    case 'tool:failed': {
      const lastAct = [...store.agentToolActivities]
        .reverse()
        .find(a => a.tool === event.tool && a.status === 'running');
      if (lastAct) {
        const updatedActivity = {
          ...lastAct,
          status: 'failed' as const,
          error: event.error,
          completedAt: Date.now(),
        };
        store.updateToolActivity(lastAct.id, {
          status: 'failed',
          error: event.error,
          completedAt: Date.now(),
        });
        
        const existingMsgIndex = store.agentMessages.findIndex(m => m.id === `tool_call_${lastAct.id}`);
        if (existingMsgIndex !== -1) {
          const updatedMessages = [...store.agentMessages];
          updatedMessages[existingMsgIndex] = {
            ...updatedMessages[existingMsgIndex],
            type: 'tool_result',
            content: event.display,
            metadata: { activity: updatedActivity }
          };
          useJoyfulStore.setState({ agentMessages: updatedMessages });
        } else {
          store.addAgentMessage({
            id: `tool_err_${lastAct.id}`,
            role: 'error',
            type: 'tool_result',
            content: event.display,
            timestamp: Date.now(),
            metadata: { activity: updatedActivity }
          });
        }
      }
      break;
    }
    
    case 'file:read': {
      store.setCurrentFile(event.path);
      break;
    }

    case 'file:read_chunk': {
      store.setCurrentFile(event.path);
      store.addAgentMessage({
        id: uniqueId('chunk'),
        role: 'assistant',
        type: 'tool_call',
        content: `Reading file ${event.path} (lines ${event.startLine}-${event.endLine} of ${event.totalLines}). Reason: ${event.reason || 'analyzing content'}`,
        timestamp: Date.now(),
        metadata: {
          activity: {
            id: uniqueId('chunk_act'),
            tool: 'read_file_chunk',
            display: `Reading ${event.path} [L${event.startLine}-${event.endLine}]`,
            status: 'success',
            input: event,
            startedAt: Date.now(),
            completedAt: Date.now()
          }
        }
      });
      break;
    }
    
    case 'file:created': {
      const change: FileChange = {
        path: event.path,
        action: 'created',
        summary: `Created file: ${event.path} (${event.size || 0} bytes)`,
        timestamp: Date.now(),
        status: 'success',
      };
      store.addFileChange(change);
      store.setCurrentFile(event.path);
      
      store.addAgentMessage({
        id: uniqueId('file_cre'),
        role: 'assistant',
        type: 'file_change',
        content: JSON.stringify(change),
        timestamp: Date.now(),
        metadata: { path: event.path, action: 'created', size: event.size }
      });
      break;
    }
    
    case 'file:updated': {
      const change: FileChange = {
        path: event.path,
        action: 'updated',
        summary: event.summary || `Updated file: ${event.path}`,
        timestamp: Date.now(),
        status: 'success',
      };
      store.addFileChange(change);
      store.setCurrentFile(event.path);
      
      store.addAgentMessage({
        id: uniqueId('file_upd'),
        role: 'assistant',
        type: 'file_change',
        content: JSON.stringify(change),
        timestamp: Date.now(),
        metadata: { path: event.path, action: 'updated', summary: event.summary }
      });
      break;
    }
    
    case 'file:deleted': {
      const change: FileChange = {
        path: event.path,
        action: 'deleted',
        summary: `Deleted file: ${event.path}`,
        timestamp: Date.now(),
        status: 'success',
      };
      store.addFileChange(change);
      
      store.addAgentMessage({
        id: uniqueId('file_del'),
        role: 'assistant',
        type: 'file_change',
        content: JSON.stringify(change),
        timestamp: Date.now(),
        metadata: { path: event.path, action: 'deleted' }
      });
      break;
    }
    
    case 'file:renamed': {
      const change: FileChange = {
        path: event.newPath,
        oldPath: event.oldPath,
        action: 'renamed',
        summary: `Renamed file: ${event.oldPath} -> ${event.newPath}`,
        timestamp: Date.now(),
        status: 'success',
      };
      store.addFileChange(change);
      
      store.addAgentMessage({
        id: uniqueId('file_ren'),
        role: 'assistant',
        type: 'file_change',
        content: JSON.stringify(change),
        timestamp: Date.now(),
        metadata: { path: event.newPath, oldPath: event.oldPath, action: 'renamed' }
      });
      break;
    }
    
    case 'compile:started': {
      store.setAgentUIStatus('compiling');
      store.addAgentMessage({
        id: uniqueId('compile'),
        role: 'system',
        type: 'compile_result',
        content: 'Compiling project and running preview checks...',
        timestamp: Date.now(),
        metadata: { success: false, errors: [] }
      });
      break;
    }
    
    case 'compile:succeeded': {
      store.setAgentUIStatus('reviewing');
      store.setAgentCompileErrors([]);
      
      const lastMsg = store.agentMessages[store.agentMessages.length - 1];
      if (lastMsg && lastMsg.type === 'compile_result') {
        store.updateChatMessage(lastMsg.id, {
          content: `Preview compiled successfully in ${event.durationMs}ms`,
          metadata: { success: true, durationMs: event.durationMs, errors: [] },
        });
      }
      break;
    }
    
    case 'compile:failed': {
      store.setAgentUIStatus('debugging');
      store.setAgentCompileErrors(event.errors);
      
      const lastMsg = store.agentMessages[store.agentMessages.length - 1];
      if (lastMsg && lastMsg.type === 'compile_result') {
        store.updateChatMessage(lastMsg.id, {
          content: `Build failed: ${event.errors.length} error(s) found`,
          metadata: { success: false, errors: event.errors },
        });
      }
      break;
    }
    
    case 'debug:started': {
      store.setAgentUIStatus('debugging');
      event.errors.forEach((err) => {
        store.addAgentMessage({
          id: uniqueId(`debug_${err.file}_${err.line}`),
          role: 'system',
          type: 'debug_result',
          content: `Debugging error in ${err.file}:${err.line}`,
          timestamp: Date.now(),
          metadata: { isFixed: false, error: err, attempt: 1 }
        });
      });
      break;
    }
    
    case 'debug:attempt': {
      const error = event.error;
      const lastMsgIndex = store.agentMessages.findIndex(m =>
        m.type === 'debug_result' &&
        (m.metadata?.error as { file?: string })?.file === error.file &&
        (m.metadata?.error as { line?: number })?.line === error.line
      );
      if (lastMsgIndex !== -1) {
        const updatedMessages = [...store.agentMessages];
        updatedMessages[lastMsgIndex] = {
          ...updatedMessages[lastMsgIndex],
          metadata: {
            ...updatedMessages[lastMsgIndex].metadata,
            attempt: event.attempt,
            fixAction: event.action,
            isFixed: false,
            error: error
          }
        };
        useJoyfulStore.setState({ agentMessages: updatedMessages });
      }
      break;
    }
    
    case 'debug:fixed': {
      const lastMsgIndex = store.agentMessages.findIndex(m =>
        m.type === 'debug_result' &&
        (m.metadata?.error as { message?: string })?.message?.includes(event.errorId)
      );
      if (lastMsgIndex !== -1) {
        const updatedMessages = [...store.agentMessages];
        updatedMessages[lastMsgIndex] = {
          ...updatedMessages[lastMsgIndex],
          metadata: {
            ...updatedMessages[lastMsgIndex].metadata,
            isFixed: true
          }
        };
        useJoyfulStore.setState({ agentMessages: updatedMessages });
      } else {
        const lastActiveIndex = [...store.agentMessages].reverse().findIndex(m => m.type === 'debug_result' && !m.metadata?.isFixed);
        if (lastActiveIndex !== -1) {
          const actualIndex = store.agentMessages.length - 1 - lastActiveIndex;
          const updatedMessages = [...store.agentMessages];
          updatedMessages[actualIndex] = {
            ...updatedMessages[actualIndex],
            metadata: {
              ...updatedMessages[actualIndex].metadata,
              isFixed: true
            }
          };
          useJoyfulStore.setState({ agentMessages: updatedMessages });
        }
      }
      break;
    }
    
    case 'memory:saved': {
      store.addAgentMessage({
        id: uniqueId('mem'),
        role: 'assistant',
        type: 'memory_update',
        content: event.summary,
        timestamp: Date.now(),
      });
      break;
    }
    
    case 'agent:completed': {
      store.setAgentUIStatus('completed');
      store.setAgentFinalSummary(event.summary);
      clearSavedAgentState();
      
      store.addAgentMessage({
        id: uniqueId('final'),
        role: 'assistant',
        type: 'final_summary',
        content: event.summary.summary,
        timestamp: Date.now(),
        metadata: { summary: event.summary }
      });
      break;
    }
    
    case 'agent:failed': {
      store.setAgentUIStatus('failed');
      store.setAgentError(event.error);
      clearSavedAgentState();
      
      store.addAgentMessage({
        id: uniqueId('fail'),
        role: 'error',
        type: 'final_summary',
        content: event.error,
        timestamp: Date.now(),
        metadata: {
          summary: {
            summary: event.error,
            changedFiles: [],
            errors: 1,
            warnings: 0,
            durationMs: 0,
            previewStatus: 'failed',
          }
        }
      });
      break;
    }
    
    case 'agent:cancelled': {
      store.setAgentUIStatus('cancelled');
      clearSavedAgentState();
      
      store.addAgentMessage({
        id: uniqueId('cancel'),
        role: 'system',
        type: 'final_summary',
        content: 'Task cancelled by user.',
        timestamp: Date.now(),
        metadata: {
          summary: {
            summary: 'Task was cancelled',
            changedFiles: [],
            errors: 0,
            warnings: 0,
            durationMs: 0,
            previewStatus: 'not_run',
          }
        }
      });
      break;
    }

    case 'context:selected': {
      store.addAgentMessage({
        id: uniqueId('ctx'),
        role: 'assistant',
        type: 'tool_call',
        content: `Selected ${event.files.length} files${event.memoryUsed ? ' with memory context' : ''}${event.repoMapUsed ? ' with repo map' : ''}`,
        timestamp: Date.now(),
        metadata: {
          contextFiles: event.files,
          contextChunks: event.chunks,
          estimatedTokens: event.estimatedTokens
        }
      });
      break;
    }

    case 'memory:loaded': {
      store.addAgentMessage({
        id: uniqueId('mem_loaded'),
        role: 'system',
        type: 'memory_update',
        content: `Memory loaded: ${event.summary}`,
        timestamp: Date.now(),
      });
      break;
    }

    case 'reflection:saved': {
      store.addAgentMessage({
        id: uniqueId('refl'),
        role: 'system',
        type: 'memory_update',
        content: `Saved reflection: ${event.lesson}`,
        timestamp: Date.now(),
      });
      break;
    }

    case 'reflection:loaded': {
      break;
    }

    case 'skill:loaded': {
      if (event.skills.length > 0) {
        store.addAgentMessage({
          id: uniqueId('skill_loaded'),
          role: 'system',
          type: 'memory_update',
          content: `Loaded ${event.skills.length} relevant skill(s): ${event.skills.join(', ')}`,
          timestamp: Date.now(),
        });
      }
      break;
    }

    case 'skill:saved': {
      store.addAgentMessage({
        id: uniqueId('skill_saved'),
        role: 'system',
        type: 'memory_update',
        content: `Saved skill: ${event.skillName}`,
        timestamp: Date.now(),
      });
      break;
    }

    case 'snapshot:created': {
      store.addAgentMessage({
        id: uniqueId('snap'),
        role: 'system',
        type: 'memory_update',
        content: `Created snapshot: ${event.label}`,
        timestamp: Date.now(),
      });
      break;
    }

    case 'snapshot:restored': {
      store.addAgentMessage({
        id: uniqueId('snap_restore'),
        role: 'system',
        type: 'memory_update',
        content: `Restored snapshot: ${event.label}`,
        timestamp: Date.now(),
      });
      break;
    }

    case 'storage:updated': {
      break;
    }

    case 'repair:started': {
      store.setAgentUIMode('debugger');
      store.addAgentMessage({
        id: uniqueId('repair'),
        role: 'assistant',
        type: 'debug_result',
        content: `Starting auto-repair on ${event.errors.length} error(s)`,
        timestamp: Date.now(),
        metadata: { errors: event.errors }
      });
      break;
    }

    case 'repair:attempt': {
      store.addAgentMessage({
        id: uniqueId('repair_attempt'),
        role: 'assistant',
        type: 'debug_result',
        content: `Repair attempt ${event.attempt}: ${event.action}`,
        timestamp: Date.now(),
        metadata: { attempt: event.attempt, error: event.error }
      });
      break;
    }

    case 'repair:fixed': {
      store.addAgentMessage({
        id: uniqueId('repair_fixed'),
        role: 'system',
        type: 'debug_result',
        content: 'Auto-repair successful!',
        timestamp: Date.now(),
      });
      break;
    }

    case 'repair:failed': {
      store.addAgentMessage({
        id: uniqueId('repair_failed'),
        role: 'error',
        type: 'warning',
        content: `Auto-repair failed: ${event.remainingErrors} error(s) remaining. Manual intervention may be needed.`,
        timestamp: Date.now(),
      });
      break;
    }
  }
});
