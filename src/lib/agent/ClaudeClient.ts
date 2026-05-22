import type { ToolDefinition } from './tools';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ClaudeResponse {
  text: string;
  toolCalls: ToolCall[];
  usage?: { inputTokens: number; outputTokens: number };
}

export class ClaudeClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
  }

  async sendMessage(
    systemPrompt: string,
    messages: Message[],
    tools?: ToolDefinition[],
    onStreamToken?: (token: string) => void,
  ): Promise<ClaudeResponse> {
    if (!this.apiKey) {
      return this.fallbackResponse('No API key configured. Please add your Anthropic API key in Settings.');
    }

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 8192,
      system: systemPrompt,
      messages,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      }));
      body.tool_choice = { type: 'auto' };
    }

    if (onStreamToken) {
      body.stream = true;
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
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
        throw new Error(`Claude API error (${response.status}): ${errorMsg}`);
      }

      if (onStreamToken) {
        return this.handleStream(response, onStreamToken);
      }

      const data = await response.json();
      return this.parseResponse(data);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return this.fallbackResponse('Network error: Unable to reach the Claude API. Check your internet connection and API endpoint.');
      }
      return this.fallbackResponse(`API error: ${message}`);
    }
  }

  private async handleStream(
    response: Response,
    onToken: (token: string) => void,
  ): Promise<ClaudeResponse> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let text = '';
    const toolCalls: ToolCall[] = [];
    const toolInputBuffers = new Map<string, string>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
            text += data.delta.text;
            onToken(data.delta.text);
          }

          if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
            const tc: ToolCall = {
              id: data.content_block.id,
              name: data.content_block.name,
              input: {},
            };
            toolCalls.push(tc);
          }

          if (data.type === 'content_block_delta' && data.delta?.type === 'input_json_delta') {
            if (toolCalls.length > 0) {
              const last = toolCalls[toolCalls.length - 1];
              const buf = toolInputBuffers.get(last.id) || '';
              toolInputBuffers.set(last.id, buf + data.delta.partial_json);
            }
          }

          if (data.type === 'content_block_stop' && toolCalls.length > 0) {
            for (const tc of toolCalls) {
              const buf = toolInputBuffers.get(tc.id);
              if (buf) {
                try {
                  tc.input = JSON.parse(buf);
                } catch {
                  tc.input = {};
                }
                toolInputBuffers.delete(tc.id);
              }
            }
          }
        } catch {
          // parse error, skip
        }
      }
    }

    return { text, toolCalls };
  }

  private parseResponse(data: Record<string, unknown>): ClaudeResponse {
    const content = data.content as Array<Record<string, unknown>> || [];
    let text = '';
    const toolCalls: ToolCall[] = [];

    for (const block of content) {
      if (block.type === 'text') {
        text += block.text || '';
      }
      if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id as string,
          name: block.name as string,
          input: block.input as Record<string, unknown>,
        });
      }
    }

    const usage = data.usage as Record<string, number> | undefined;

    return {
      text,
      toolCalls,
      usage: usage
        ? { inputTokens: usage.input_tokens || 0, outputTokens: usage.output_tokens || 0 }
        : undefined,
    };
  }

  private fallbackResponse(errorMsg: string): ClaudeResponse {
    return {
      text: '',
      toolCalls: [{
        id: 'fallback',
        name: 'write_message',
        input: { message: errorMsg },
      }],
    };
  }
}

export function createClaudeClient(apiKey: string, model?: string): ClaudeClient {
  return new ClaudeClient({ apiKey, model });
}
