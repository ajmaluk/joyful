import { useCallback, useRef, useEffect } from 'react';
import { JoyfulAgentV2 as JoyfulAgent, type AgentObserver } from '@/lib/agent/JoyfulAgentV2';
import { browserSandbox } from '@/lib/sandbox/BrowserSandbox';
import { useJoyfulStore, type AgentMessage, type ConsoleMessage } from '@/store/joyfulStore';
import type { TaskTodo } from '@/engine/types';
import { joyfulProviderConfig } from '@/services/joyfulProvider';
import { agentEventBus } from '@/lib/agent/eventBus';

let agentInstance: JoyfulAgent | null = null;

function getAgent(): JoyfulAgent {
  if (!agentInstance) {
    const baseUrl = joyfulProviderConfig.invokeUrl.replace('/chat/completions', '');
    agentInstance = new JoyfulAgent({
      apiKey: joyfulProviderConfig.apiKey,
      model: joyfulProviderConfig.model,
      baseUrl,
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
              type: 'text',
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
            type: 'tool_call',
            content: `Using tool: ${name}`,
            timestamp: Date.now(),
            metadata: { toolCall: { name, input } },
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
            agentEventBus.emit({ type: 'compile:started' });
            store.setPreviewVisible(true);
            await browserSandbox.init();
            const compileStart = performance.now();
            const result = await browserSandbox.compile(entryPoint);
            if (result.success && result.code) {
              await browserSandbox.updatePreview(result.code);
              store.setCompileErrors([]);
              agentEventBus.emit({ type: 'compile:succeeded', durationMs: Math.round(performance.now() - compileStart) });
              return { success: true, tool: 'compile', data: 'Preview updated successfully' };
            }
            // Parse file paths from error messages
            const errors = result.errors.map(e => {
              const match = e.match(/(?:\/|^)([^\s:]+\.\w+):(\d+):(\d+)/);
              return {
                file: match ? match[1] : '',
                line: match ? parseInt(match[2], 10) : 0,
                column: match ? parseInt(match[3], 10) : 0,
                message: e,
              };
            });
            store.setCompileErrors(errors);
            agentEventBus.emit({ type: 'compile:failed', errors });
            return {
              success: false,
              tool: 'compile',
              error: `Compile errors:\n${result.errors.join('\n')}`,
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            agentEventBus.emit({ type: 'compile:failed', errors: [{ file: '', line: 0, column: 0, message: msg }] });
            return { success: false, tool: 'compile', error: msg };
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
        const error = 'No API key configured. Set VITE_NV_API_KEY in your environment.';
        store.setAgentError(error);
        store.setAgentUIStatus('failed');
        agentEventBus.emit({ type: 'agent:failed', error });
        return;
      }

      const agent = getAgent();
      agent.setObserver(buildObserver());

      const userMsg: AgentMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        type: 'text',
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
        store.setAgentUIStatus('failed');
        agentEventBus.emit({ type: 'agent:failed', error: msg });
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
    store.resetAgentUI();
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
