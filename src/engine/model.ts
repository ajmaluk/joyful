import type { ModelConfig, AgentResponse, ParsedTask, AgentMode, FileOperation } from './types';

// ── Model API Abstraction ──────────────────────────────────────────

export interface ModelRequest {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  tools?: ModelTool[];
  config: ModelConfig;
}

export interface ModelTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ModelResult {
  content: string;
  toolCalls?: ModelToolCall[];
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  finishReason: 'stop' | 'tool_use' | 'max_tokens' | 'error';
  error?: string;
}

export interface ModelToolCall {
  name: string;
  arguments: Record<string, unknown>;
  id: string;
}

// ── Provider Interface ─────────────────────────────────────────────

export interface ModelProvider {
  name: string;
  complete(request: ModelRequest): Promise<ModelResult>;
  completeStream?(request: ModelRequest): AsyncGenerator<ModelStreamChunk>;
}

export interface ModelStreamChunk {
  type: 'text' | 'tool_use' | 'error' | 'done';
  content?: string;
  toolCall?: ModelToolCall;
  error?: string;
}

// ── Provider Registry ──────────────────────────────────────────────

const providers = new Map<string, ModelProvider>();

export function registerProvider(provider: ModelProvider): void {
  providers.set(provider.name, provider);
}

export function getProvider(name: string): ModelProvider | undefined {
  return providers.get(name);
}

export function getAvailableProviders(): string[] {
  return Array.from(providers.keys());
}

// ── OpenAI-Compatible Provider ─────────────────────────────────────

export interface OpenAIClient {
  chat: {
    completions: {
      create(params: Record<string, unknown>): Promise<{
        choices: { message: { content: string | null; tool_calls?: unknown[] }; finish_reason: string }[];
        usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      }>;
    };
  };
}

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export function createOpenAICompatibleProvider(
  name: string,
  config: OpenAICompatibleConfig,
): ModelProvider {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  const modelName = config.model || 'gpt-4o';

  return {
    name,
    async complete(request: ModelRequest): Promise<ModelResult> {
      try {
        const body = buildOpenAIBody(request, modelName);
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: '',
            finishReason: 'error',
            error: `API error ${response.status}: ${errorText}`,
          };
        }

        const data = await response.json();
        const choice = data.choices?.[0];

        if (!choice) {
          return { content: '', finishReason: 'error', error: 'No response choices returned' };
        }

        return {
          content: choice.message?.content || '',
          finishReason: mapFinishReason(choice.finish_reason),
          usage: data.usage
            ? {
                inputTokens: data.usage.prompt_tokens,
                outputTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              }
            : undefined,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: '', finishReason: 'error', error: message };
      }
    },
  };
}

function buildOpenAIBody(
  request: ModelRequest,
  model: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: request.system },
      ...request.messages.map(m => ({ role: m.role, content: m.content })),
    ],
    max_tokens: request.config.maxTokens,
    temperature: request.config.temperature,
  };

  if (request.tools && request.tools.length > 0) {
    body.tools = request.tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
    body.tool_choice = 'auto';
  }

  return body;
}

function mapFinishReason(finishReason: string): ModelResult['finishReason'] {
  switch (finishReason) {
    case 'stop': return 'stop';
    case 'tool_calls': return 'tool_use';
    case 'length': return 'max_tokens';
    default: return 'error';
  }
}

// ── No-Op Provider (dev/testing) ───────────────────────────────────

export function createNoOpProvider(response?: string): ModelProvider {
  return {
    name: 'noop',
    async complete(_request: ModelRequest): Promise<ModelResult> {
      await new Promise(r => setTimeout(r, 100));
      return {
        content: response || '(no-op response)',
        finishReason: 'stop',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      };
    },
  };
}

// ── Parse Model Response ───────────────────────────────────────────

export function parseAgentResponse(rawContent: string): AgentResponse {
  const response: AgentResponse = {
    message: rawContent,
    actions: [],
    tasks: [],
    mode: 'builder',
  };

  // Extract file operations from JSON code blocks
  const jsonBlocks = extractJsonBlocks(rawContent);
  for (const block of jsonBlocks) {
    if (block.operations && Array.isArray(block.operations)) {
      response.actions.push(...block.operations as FileOperation[]);
    }
    if (block.tasks && Array.isArray(block.tasks)) {
      response.tasks.push(...block.tasks as ParsedTask[]);
    }
    if (block.mode && typeof block.mode === 'string') {
      const mode = block.mode as AgentMode;
      if (['architect', 'builder', 'debugger', 'explorer', 'reviewer', 'memory'].includes(mode)) {
        response.mode = mode;
      }
    }
    if (block.thinking && typeof block.thinking === 'string') {
      response.thinking = block.thinking;
    }
  }

  // If no structured actions found but user asked for file edits,
  // treat as unstructured message
  if (response.actions.length === 0) {
    response.mode = 'explorer';
  }

  return response;
}

function extractJsonBlocks(text: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  const regex = /```(?:json)?\s*\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (typeof parsed === 'object' && parsed !== null) {
        blocks.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not valid JSON, skip
    }
  }

  return blocks;
}
