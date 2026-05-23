import { useCallback, useRef, useEffect } from 'react';
import { JoyfulAgentV2 as JoyfulAgent, type AgentObserver } from '@/lib/agent/JoyfulAgentV2';
import { browserSandbox } from '@/lib/sandbox/BrowserSandbox';
import { useJoyfulStore, type ConsoleMessage } from '@/store/joyfulStore';
import { joyfulProviderConfig } from '@/services/joyfulProvider';
import { agentEventBus } from '@/lib/agent/eventBus';
import { uniqueId } from '@/utils/ids';

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
  const unsubConsoleRef = useRef<(() => void) | null>(null);

  // Subscribe to browser sandbox console messages
  useEffect(() => {
    unsubConsoleRef.current = browserSandbox.onConsole((capture) => {
      const msg: ConsoleMessage = {
        id: uniqueId('console'),
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
    (): AgentObserver => ({
      onStatusChange: (status, message) => {
        agentEventBus.emit({ type: 'agent:status', status: status as 'thinking' | 'planning' | 'building' | 'debugging' | 'completed' | 'failed' | 'idle' | 'scanning' | 'understanding' | 'reviewing' | 'exploring' | 'saving', message });
      },

      onError: (error) => {
        agentEventBus.emit({ type: 'agent:failed', error });
      },

      onCompileRequest: async (entryPoint) => {
        try {
          await browserSandbox.init();
          const result = await browserSandbox.compileAndPreview(entryPoint);
          if (result.success) {
            return {
              success: true,
              tool: 'compileAndPreview',
              data: 'Preview updated successfully',
              summary: 'Preview compiled and updated',
            };
          }
          return {
            success: false,
            tool: 'compileAndPreview',
            error: `Compile errors:\n${result.errors.join('\n')}`,
            summary: `Compile failed with ${result.errors.length} error(s)`,
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false, tool: 'compileAndPreview', error: msg, summary: msg };
        }
      },
    }),
    [],
  );

  const runAgent = useCallback(
    async (prompt: string) => {
      abortRef.current = false;

      if (!joyfulProviderConfig.enabled) {
        const error = 'No AI provider configured. Check Joyful provider settings.';
        agentEventBus.emit({ type: 'agent:failed', error });
        return;
      }

      const agent = getAgent();
      agent.setObserver(buildObserver());

      try {
        await agent.runTask(prompt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        agentEventBus.emit({ type: 'agent:failed', error: msg });
      }
    },
    [buildObserver],
  );

  const abortAgent = useCallback(() => {
    abortRef.current = true;
    getAgent().cancelTask();
  }, []);

  const resetAgent = useCallback(() => {
    agentInstance = null;
    abortRef.current = false;
    agentEventBus.clear();
    store.resetAgentUI();
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
    todos: store.agentTodos,
    consoleMessages: store.consoleMessages,
    compileErrors: store.compileErrors,
  };
}

// Re-export for convenience
export type { ConsoleMessage } from '@/store/joyfulStore';
