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

let _lastAICallTime = 0;

export class AIClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'qwen/qwen3-coder-480b-a35b-instruct';
    this.baseUrl = config.baseUrl || 'https://integrate.api.nvidia.com/v1';
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - _lastAICallTime;
    if (elapsed < 300) {
      await new Promise(r => setTimeout(r, 300 - elapsed));
    }
    _lastAICallTime = Date.now();
  }

  async sendMessage(
    systemPrompt: string,
    messages: Message[],
    tools?: ToolDefinition[],
    onStreamToken?: (token: string) => void,
  ): Promise<AIClientResponse> {
    if (!this.apiKey) {
      return this.fallbackResponse('No API key configured. Please add your NVidia NIM API key in Settings.');
    }

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

    if (onStreamToken) {
      body.stream = true;
    }

    try {
      await this.throttle();
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMsg: string;
        try {
          const err = JSON.parse(errorBody);
          errorMsg = err.error?.message || err.error?.type || response.statusText;
        } catch {
          errorMsg = errorBody || response.statusText;
        }
        throw new Error(`AI API error (${response.status}): ${errorMsg}`);
      }

      if (onStreamToken) {
        return this.handleStream(response, onStreamToken);
      }

      const data = await response.json();
      return this.parseResponse(data);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return this.fallbackResponse('Network error: Unable to reach the AI API. Check your internet connection and API endpoint.');
      }
      return this.fallbackResponse(`API error: ${message}`);
    }
  }

  private async handleStream(
    response: Response,
    onToken: (token: string) => void,
  ): Promise<AIClientResponse> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let text = '';
    const toolCalls: ToolCall[] = [];
    const toolInputBuffers = new Map<number, string>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;

        try {
          const data = JSON.parse(payload);
          const delta = data.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            text += delta.content;
            onToken(delta.content);
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (tc.function?.name) {
                toolCalls[idx] = {
                  id: tc.id || `call_${idx}`,
                  name: tc.function.name,
                  input: {},
                };
                toolInputBuffers.set(idx, '');
              }
              if (tc.function?.arguments) {
                const buf = toolInputBuffers.get(idx) || '';
                toolInputBuffers.set(idx, buf + tc.function.arguments);
              }
            }
          }
        } catch {
          // skip parse errors
        }
      }
    }

    // Finalize tool inputs from accumulated buffers
    for (const [idx, buf] of toolInputBuffers) {
      if (toolCalls[idx] && buf) {
        try {
          toolCalls[idx].input = JSON.parse(buf);
        } catch {
          toolCalls[idx].input = {};
        }
      }
    }

    return { text, toolCalls };
  }

  private parseResponse(data: Record<string, unknown>): AIClientResponse {
    const choice = (data.choices as Array<Record<string, unknown>>)?.[0];
    const message = choice?.message as Record<string, unknown> | undefined;

    let text = '';
    const toolCalls: ToolCall[] = [];

    if (message?.content) {
      text = message.content as string;
    }

    if (message?.tool_calls) {
      const calls = message.tool_calls as Array<Record<string, unknown>>;
      for (const tc of calls) {
        toolCalls.push({
          id: tc.id as string,
          name: (tc.function as Record<string, unknown>)?.name as string,
          input: JSON.parse((tc.function as Record<string, unknown>)?.arguments as string || '{}'),
        });
      }
    }

    const usage = data.usage as Record<string, number> | undefined;

    return {
      text,
      toolCalls,
      usage: usage
        ? { inputTokens: usage.prompt_tokens || 0, outputTokens: usage.completion_tokens || 0 }
        : undefined,
    };
  }

  private fallbackResponse(errorMsg: string): AIClientResponse {
    return {
      text: '',
      toolCalls: [{
        id: 'fallback',
        name: 'write_message',
        input: { message: errorMsg },
      }],
    };
  }

  async sendMessageJSON(
    systemPrompt: string,
    messages: Message[],
    onStreamToken?: (token: string) => void,
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
      const response = await this.sendMessage(enhancedSystemPrompt, messages, undefined, onStreamToken);
      const raw = response.text;
      const parsed = AIClient.repairJSON(raw);

      if (parsed && typeof parsed === 'object') {
        return {
          text: parsed.message || raw,
          operations: Array.isArray(parsed.operations) ? parsed.operations : [],
          needsMoreContext: !!parsed.needsMoreContext,
          contextRequests: Array.isArray(parsed.contextRequests) ? parsed.contextRequests : [],
        };
      }

      return {
        text: raw,
        operations: [],
        needsMoreContext: true,
        contextRequests: ['Failed to parse AI response as JSON. Please try again with a clearer response format.'],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        text: '',
        operations: [],
        needsMoreContext: true,
        contextRequests: [`API error: ${message}`],
      };
    }
  }

  static repairJSON(text: string): any | null {
    if (!text || typeof text !== 'string') return null;

    // Try direct parse
    try {
      return JSON.parse(text);
    } catch {
      // try alternatives
    }

    // Try extracting JSON from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        // continue
      }
    }

    // Try extracting {...} or [...] with regex
    const objectMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objectMatch) {
      const candidate = objectMatch[1];

      // Try fixing common issues
      const fixed = candidate
        // Fix unquoted keys
        .replace(/(\{|,)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix single quotes to double quotes
        .replace(/(?<=[:,\{\[])\s*'(?:[^'\\]|\\.)*?'\s*(?=[:,\}\]])/g, (match) => {
          return match.replace(/'/g, '"');
        })
        .replace(/(?<!")\b(true|false|null)\b(?!")/g, '"$1"');

      try {
        return JSON.parse(fixed);
      } catch {
        // continue
      }
    }

    return null;
}
}

export function createAIClient(apiKey: string, model?: string, baseUrl?: string): AIClient {
  return new AIClient({ apiKey, model, baseUrl });
}
