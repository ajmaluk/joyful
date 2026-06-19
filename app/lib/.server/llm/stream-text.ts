import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { DEFAULT_MODEL_NAME as DEFAULT_MODEL, NVIDIA_MODEL_NAME, getModel } from '~/lib/.server/llm/model';
import { MAX_TOKENS } from './constants';
import { getSystemPrompt } from './prompts';

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

/**
 * Streams text from the AI model.
 * Supports multi-provider model selection via the `model` query parameter.
 */
export async function streamText(messages: Messages, env: Env, options?: StreamingOptions & { model?: string }) {
  // Model can be specified in options (from client), or via env var, or use default
  const modelName = options?.model || env.MODEL_NAME || DEFAULT_MODEL;

  // Strip the model from options so it doesn't get passed to _streamText
  const { model: _model, ...streamOptions } = options || {};

  try {
    return await _streamText({
      model: getModel(modelName, env) as any,
      system: getSystemPrompt(),
      maxTokens: MAX_TOKENS,
      messages: convertToCoreMessages(messages as any),
      ...streamOptions,
    });
  } catch (error) {
    console.error(`streamText failed with model ${modelName}:`, error);

    // If it fails and we are using the primary LLM7 model, fallback to NVIDIA
    if (modelName === DEFAULT_MODEL) {
      console.log(`Attempting fallback to NVIDIA model: ${NVIDIA_MODEL_NAME}`);
      try {
        return await _streamText({
          model: getModel(NVIDIA_MODEL_NAME, env) as any,
          system: getSystemPrompt(),
          maxTokens: MAX_TOKENS,
          messages: convertToCoreMessages(messages as any),
          ...streamOptions,
        });
      } catch (fallbackError) {
        console.error('NVIDIA fallback model also failed:', fallbackError);
        throw fallbackError;
      }
    }

    throw error;
  }
}

/**
 * Estimates the number of tokens in a text string.
 * Used for context management and compaction decisions.
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Checks if the conversation history exceeds reasonable context limits
 * and should be compacted.
 */
export function shouldCompact(messages: Messages, maxContextTokens = 6000): boolean {
  let totalTokens = 0;

  // Count system prompt (approximate)
  totalTokens += estimateTokens(getSystemPrompt());

  // Count all messages
  for (const msg of messages) {
    totalTokens += estimateTokens(msg.content);
  }

  return totalTokens > maxContextTokens;
}

/**
 * Constructs a summarization prompt for the LLM.
 * This is kept separate so it can be tested independently.
 */
export function buildSummarizationPrompt(olderMessages: Messages): string {
  const conversationText = olderMessages
    .map((msg) => {
      const prefix = msg.role === 'user' ? 'User' : 'Assistant';
      return `${prefix}: ${msg.content}`;
    })
    .join('\n\n');

  return `You are a conversation summarizer. Your task is to summarize the following conversation exchange, preserving all important context, decisions, code patterns, requirements, and user preferences.

Guidelines:
- Be concise but comprehensive — capture every key decision and requirement
- Preserve technical details like file paths, component names, and API endpoints
- Note any user preferences or constraints mentioned
- Output ONLY the summary text, no preamble or commentary
- Keep the summary under 400 words

<conversation_to_summarize>
${conversationText}
</conversation_to_summarize>`;
}

/**
 * Uses the LLM to intelligently summarize older conversation messages.
 * Falls back to the synchronous truncation-based compaction if the LLM call fails.
 */
export async function summarizeConversation(olderMessages: Messages, env: Env, modelName?: string): Promise<Message> {
  const prompt = buildSummarizationPrompt(olderMessages);
  const activeModelName = modelName || env.MODEL_NAME || DEFAULT_MODEL;

  try {
    /*
     * Call the LLM using the same model the user is chatting with
     * We use _streamText directly with low maxTokens since this is a summary
     */
    const { text } = await _streamText({
      model: getModel(activeModelName, env) as any,
      maxTokens: 1024,
      messages: convertToCoreMessages([{ role: 'user', content: prompt }] as any),
    });

    const summary = (await text).trim();

    return {
      role: 'user',
      content: `[Summary of earlier conversation:\n${summary}\n]`,
    };
  } catch (error) {
    console.error(`LLM summarization failed with model ${activeModelName}:`, error);

    if (activeModelName === DEFAULT_MODEL) {
      console.log(`Attempting summarization fallback with NVIDIA model: ${NVIDIA_MODEL_NAME}`);
      try {
        const { text } = await _streamText({
          model: getModel(NVIDIA_MODEL_NAME, env) as any,
          maxTokens: 1024,
          messages: convertToCoreMessages([{ role: 'user', content: prompt }] as any),
        });

        const summary = (await text).trim();

        return {
          role: 'user',
          content: `[Summary of earlier conversation:\n${summary}\n]`,
        };
      } catch (fallbackError) {
        console.error('NVIDIA fallback summarization also failed:', fallbackError);
      }
    }

    return compactOlderMessages(olderMessages);
  }
}

/**
 * Synchronous fallback: truncates older messages to 200 chars each.
 * Used when LLM summarization is unavailable or fails.
 */
export function compactOlderMessages(olderMessages: Messages): Message {
  const summaryParts: string[] = [];

  for (const msg of olderMessages) {
    const prefix = msg.role === 'user' ? 'User' : 'Assistant';
    const content = msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content;
    summaryParts.push(`[${prefix}: ${content}]`);
  }

  return {
    role: 'user',
    content: `[Earlier conversation summary:\n${summaryParts.join('\n')}\n]`,
  };
}

/**
 * Compacts conversation history by first attempting LLM summarization,
 * then falling back to truncation. Preserves the most recent messages in full detail.
 *
 * summarizeConversation already has its own fallback to compactOlderMessages,
 * so this function simply delegates to it.
 */
export async function compactMessages(
  messages: Messages,
  env: Env,
  keepRecent = 4,
  modelName?: string,
): Promise<Messages> {
  if (messages.length <= keepRecent + 1) {
    return messages;
  }

  const recentMessages = messages.slice(-keepRecent);
  const olderMessages = messages.slice(0, -keepRecent);

  const summaryMessage = await summarizeConversation(olderMessages, env, modelName);

  return [summaryMessage, ...recentMessages];
}
