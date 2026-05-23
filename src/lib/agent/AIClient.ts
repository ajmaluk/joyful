import type { ToolDefinition } from './tools';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AIClientResponse {
  text: string;
  toolCalls: ToolCall[];
  provider?: string;
  fallbackUsed?: boolean;
  usage?: { inputTokens: number; outputTokens: number };
}

function openAiToolFromDef(t: ToolDefinition): Record<string, unknown> {
  return {
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  };
}

export class AIClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private lastCallTime = 0;
  private readonly minInterval = 50;
  private timeoutMs: number;
  private usage: { inputTokens: number; outputTokens: number } = { inputTokens: 0, outputTokens: 0 };
  public cachedComponents: string[] = [];

  constructor(config: { apiKey: string; model?: string; baseUrl?: string; timeoutMs?: number }) {
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'qwen/qwen3-coder-480b-a35b-instruct';
    this.baseUrl = (config.baseUrl || '/api/ai').replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs || 60_000;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallTime;
    if (elapsed < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - elapsed));
    }
    this.lastCallTime = Date.now();
  }

  async sendMessage(
    systemPrompt: string,
    messages: Message[],
    tools?: ToolDefinition[],
    onStreamToken?: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<AIClientResponse> {
    const openAiMessages: Record<string, unknown>[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    ];

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 8192,
      messages: openAiMessages,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(openAiToolFromDef);
      body.tool_choice = 'auto';
    }

    try {
      await this.throttle();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Combine provided signal with timeout if not already set
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(new DOMException('AI request timed out', 'TimeoutError')), this.timeoutMs);

      // Link external signal if provided
      if (signal) {
        signal.addEventListener('abort', () => abortController.abort(signal.reason), { once: true });
      }

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorBody = '';
          try { errorBody = await response.text(); } catch { errorBody = 'Unknown error'; }
          let errorMsg = '';
          try {
            const err = JSON.parse(errorBody);
            errorMsg = err.error?.message || err.error?.type || response.statusText;
          } catch {
            errorMsg = errorBody || response.statusText;
          }
          throw new Error(`AI API error (${response.status}): ${errorMsg}`);
        }

        const provider = response.headers.get('X-Joyful-Provider') || undefined;
        const fallbackUsed = response.headers.get('X-Joyful-Fallback-Used') === 'true';

        if (onStreamToken) {
          const streamResult = await this.handleStream(response, onStreamToken);
          return { ...streamResult, provider, fallbackUsed };
        }

        const data = await response.json();
        return { ...this.parseResponse(data), provider, fallbackUsed };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(message.includes('Failed to fetch') || message.includes('NetworkError')
        ? 'Network error: Unable to reach the AI API.'
        : `API error: ${message}`);
    }
  }

  private async handleStream(
    response: Response,
    onToken: (token: string) => void,
  ): Promise<AIClientResponse> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    let fullContent = '';
    let buffer = '';
    const toolCalls: ToolCall[] = [];
    const toolInputBuffers = new Map<number, string>();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              fullContent += delta.content;
              onToken(delta.content);
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index ?? toolCalls.length;
                if (!toolCalls[index]) {
                  toolCalls[index] = { id: '', name: tc.function?.name || '', input: {} as Record<string, unknown> };
                  toolInputBuffers.set(index, tc.function?.arguments || '');
                } else {
                  if (tc.function?.name) toolCalls[index].name += tc.function.name;
                  const existing = toolInputBuffers.get(index) || '';
                  toolInputBuffers.set(index, existing + (tc.function?.arguments || ''));
                }
              }
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Parse accumulated tool call inputs as JSON
    for (const [index, bufferContent] of toolInputBuffers) {
      try {
        toolCalls[index].input = JSON.parse(bufferContent) as Record<string, unknown>;
      } catch {
        toolCalls[index].input = {};
      }
    }

    return {
      text: fullContent,
      toolCalls,
    };
  }

  private parseResponse(data: Record<string, unknown>): AIClientResponse {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const choice = (data.choices as any[])?.[0];
    const text: string = choice?.message?.content || choice?.delta?.content || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawToolCalls: any[] = choice?.message?.tool_calls || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolCalls: ToolCall[] = rawToolCalls.map((tc: any) => ({
      id: tc.id || '',
      name: tc.function?.name || '',
      input: (() => {
        try {
          return JSON.parse(tc.function?.arguments || '{}');
        } catch {
          return {};
        }
      })(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usage = (data as any).usage;
    if (usage) {
      this.usage = {
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
      };
    }

    return { text, toolCalls, usage: this.usage };
  }

  getUsage(): { inputTokens: number; outputTokens: number } {
    return { ...this.usage };
  }

  async sendMessageJSON(
    systemPrompt: string,
    messages: Message[],
    onStreamToken?: (token: string) => void,
    signal?: AbortSignal,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ text: string; operations: any[]; needsMoreContext: boolean; contextRequests: string[] }> {
    const jsonInstruction = `\n\nYou must respond in strict JSON format only. No markdown, no code fences, no explanatory text — just valid JSON.

The JSON must have this structure:
{
  "message": "Your explanation or response text",
  "operations": [
    { "tool": "tool_name", "input": { "param1": "value1" } }
  ],
  "needsMoreContext": false,
  "contextRequests": []
}

If you need more information before proceeding, set needsMoreContext to true and list what you need in contextRequests.`;

    const enhancedSystemPrompt = systemPrompt + jsonInstruction;

    try {
      const response = await this.sendMessage(enhancedSystemPrompt, messages, undefined, onStreamToken, signal);
      const raw = response.text;
      const parsed = AIClient.repairJSON(raw);

      if (parsed && typeof parsed === 'object') {
        return {
          text: (typeof parsed.message === 'string' ? parsed.message : raw),
          operations: Array.isArray(parsed.operations) ? parsed.operations : [],
          needsMoreContext: !!parsed.needsMoreContext,
          contextRequests: Array.isArray(parsed.contextRequests) ? parsed.contextRequests : [],
        };
      }

      return {
        text: raw,
        operations: response.toolCalls.map(tc => ({
          tool: tc.name,
          input: tc.input,
        })),
        needsMoreContext: false,
        contextRequests: [],
      };
    } catch (err) {
      // Propagate abort/timeout errors so the orchestrator stops processing
      if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      return {
        text: '',
        operations: [],
        needsMoreContext: false,
        contextRequests: [message],
      };
    }
  }

  static repairJSON(text: string): Record<string, unknown> | null {
    if (!text || typeof text !== 'string') return null;

    // If it's already valid JSON, return it
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      // Continue to repair
    }

    try {
      // Wrap top-level keys that might not be quoted
      const step1 = text
        .replace(/(\{|,)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix single quotes to double quotes
        .replace(/(?<=[:,[])\s*'(?:[^'\\]|\\.)*?'\s*(?=[:,\]])/g, match => match.replace(/'/g, '"'))
        .replace(/(?<!")\b(true|false|null)\b(?!")/g, '"$1"');

      try {
        return JSON.parse(step1) as Record<string, unknown>;
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }
}
