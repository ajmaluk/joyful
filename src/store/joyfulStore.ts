import { create } from 'zustand';
import type { AgentMode, TaskTodo } from '@/engine/types';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: { name: string; input: unknown }[];
  toolResults?: { name: string; result: unknown }[];
}

export interface ConsoleMessage {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export interface CompileError {
  file: string;
  line: number;
  column: number;
  message: string;
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
  addToolCall: (msgId: string, call: { name: string; input: unknown }) => void;
  setTodos: (todos: TaskTodo[]) => void;
  clearAgentMessages: () => void;

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

  // Agent
  agent: {
    running: false,
    mode: 'builder',
    iteration: 0,
    currentTool: null,
    error: null,
  },
  agentMessages: [],
  todos: [],
  setAgentRunning: (running) => set((s) => ({ agent: { ...s.agent, running } })),
  setAgentMode: (mode) => set((s) => ({ agent: { ...s.agent, mode } })),
  setAgentIteration: (iteration) => set((s) => ({ agent: { ...s.agent, iteration } })),
  setCurrentTool: (currentTool) => set((s) => ({ agent: { ...s.agent, currentTool } })),
  setAgentError: (error) => set((s) => ({ agent: { ...s.agent, error } })),
  addAgentMessage: (msg) => set((state) => ({
    agentMessages: [...state.agentMessages, msg],
  })),
  updateLastAssistantMessage: (content) => set((state) => {
    const messages = [...state.agentMessages];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        messages[i] = { ...messages[i], content: messages[i].content + content };
        break;
      }
    }
    return { agentMessages: messages };
  }),
  addToolCall: (msgId, call) => set((state) => ({
    agentMessages: state.agentMessages.map(m =>
      m.id === msgId
        ? { ...m, toolCalls: [...(m.toolCalls || []), call] }
        : m
    ),
  })),
  setTodos: (todos) => set({ todos }),
  clearAgentMessages: () => set({ agentMessages: [] }),

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
