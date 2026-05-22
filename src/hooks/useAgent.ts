import { useCallback, useRef, useEffect } from 'react';
import { JoyfulAgent, type AgentObserver } from '@/lib/agent/JoyfulAgent';
import { browserSandbox } from '@/lib/sandbox/BrowserSandbox';
import { useJoyfulStore, type AgentMessage, type ConsoleMessage } from '@/store/joyfulStore';
import type { TaskTodo } from '@/engine/types';
import { joyfulProviderConfig } from '@/services/joyfulProvider';

let agentInstance: JoyfulAgent | null = null;

function getAgent(): JoyfulAgent {
  if (!agentInstance) {
    const isNV = joyfulProviderConfig.enabled;
    agentInstance = new JoyfulAgent({
      apiKey: joyfulProviderConfig.apiKey,
      model: joyfulProviderConfig.model,
      baseUrl: isNV ? joyfulProviderConfig.invokeUrl.replace('/chat/completions', '') : undefined,
    });
  }
  return agentInstance;
}

export function useAgent(projectId?: string | null) {
  const store = useJoyfulStore();
  const abortRef = useRef(false);
  const messageCountRef = useRef(0);
  const unsubConsoleRef = useRef<(() => void) | null>(null);

  // Subscribe to browser sandbox console messages
  useEffect(() => {
    unsubConsoleRef.current = browserSandbox.onConsole((capture) => {
      const msg: ConsoleMessage = {
        id: `console_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        level: capture.level,
        message: capture.message + (capture.count ? ` (repeated ${capture.count}x)` : ''),
        timestamp: Date.now(),
      };
      store.addConsoleMessage(msg);
    });
    return () => {
      unsubConsoleRef.current?.();
    };
  }, [store]);

  // Sync project ID to agent for storage scoping
  useEffect(() => {
    const agent = getAgent();
    if (projectId && agent.getProjectId() !== projectId) {
      agent.setProjectId(projectId);
      agent.loadProjectState(projectId).catch(() => {});
    }
  }, [projectId]);

  const buildObserver = useCallback(
    (): AgentObserver => {
      let currentMessageId: string | null = null;

      return {
        onToken: (token: string) => {
          if (abortRef.current) return;
          if (!currentMessageId) {
            currentMessageId = `msg_${Date.now()}_${messageCountRef.current++}`;
            const msg: AgentMessage = {
              id: currentMessageId,
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
            };
            store.addAgentMessage(msg);
          }
          store.updateLastAssistantMessage(token);
          store.setCurrentTool('writing');
        },

        onToolCall: (name: string, input: unknown) => {
          if (abortRef.current) return;
          const msg: AgentMessage = {
            id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            role: 'tool',
            content: `Using tool: ${name}`,
            timestamp: Date.now(),
            toolCalls: [{ name, input }],
          };
          store.addAgentMessage(msg);
          store.setCurrentTool(name);
        },

        onToolResult: () => {
          if (abortRef.current) return;
          store.setCurrentTool(null);
        },

        onTodoUpdate: (todos) => {
          if (abortRef.current) return;
          store.setTodos(
            todos.map(t => ({
              id: t.id,
              content: t.task,
              status: t.status as TaskTodo['status'],
              priority: 'medium' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })),
          );
        },

        onStatusChange: (status) => {
          store.setAgentRunning(status === 'running');
          store.setAgentIteration(
            status === 'running' ? store.agent.iteration + 1 : store.agent.iteration,
          );
        },

        onError: (message) => {
          store.setAgentError(message);
        },

        onCompileRequest: async (entryPoint) => {
          try {
            store.setPreviewVisible(true);
            await browserSandbox.init();
            const result = await browserSandbox.compile(entryPoint);
            if (result.success && result.code) {
              await browserSandbox.updatePreview(result.code);
              store.setCompileErrors([]);
              return { success: true, data: 'Preview updated successfully' };
            }
            store.setCompileErrors(
              result.errors.map(e => ({
                file: '',
                line: 0,
                column: 0,
                message: e,
              })),
            );
            return {
              success: false,
              error: `Compile errors:\n${result.errors.join('\n')}`,
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
          }
        },
      };
    },
    [store],
  );

  const runAgent = useCallback(
    async (prompt: string) => {
      abortRef.current = false;

      if (!joyfulProviderConfig.apiKey) {
        store.setAgentError('No API key configured. Set VITE_NV_API_KEY in your environment.');
        return;
      }

      const agent = getAgent();
      agent.setObserver(buildObserver());

      const userMsg: AgentMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
      };
      store.addAgentMessage(userMsg);
      store.setAgentRunning(true);
      store.setAgentError(null);

      try {
        await agent.runTask(prompt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        store.setAgentError(msg);
      } finally {
        store.setAgentRunning(false);
        store.setCurrentTool(null);
      }
    },
    [store, buildObserver],
  );

  const abortAgent = useCallback(() => {
    abortRef.current = true;
    store.setAgentRunning(false);
    store.setCurrentTool(null);
  }, [store]);

  const resetAgent = useCallback(() => {
    agentInstance = null;
    abortRef.current = false;
    store.clearAgentMessages();
    store.setTodos([]);
    store.setAgentError(null);
    store.setAgentRunning(false);
  }, [store]);

  const setPreviewIframe = useCallback((iframe: HTMLIFrameElement | null) => {
    browserSandbox.setIframe(iframe);
  }, []);

  return {
    runAgent,
    abortAgent,
    resetAgent,
    setPreviewIframe,
    agent: store.agent,
    messages: store.agentMessages,
    todos: store.todos,
    consoleMessages: store.consoleMessages,
    compileErrors: store.compileErrors,
  };
}

// Re-export for convenience
export type { ConsoleMessage } from '@/store/joyfulStore';
