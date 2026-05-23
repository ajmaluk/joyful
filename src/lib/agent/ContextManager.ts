import type { Message } from '@/lib/agent/AIClient';

export class ContextManager {
  /**
   * Estimates the number of tokens in a list of messages.
   * Uses a standard approximation of 4 characters per token.
   */
  estimateTokens(messages: Message[]): number {
    let total = 0;
    for (const msg of messages) {
      total += Math.ceil((msg.content?.length || 0) / 4);
      // Overhead of 4 tokens per message
      total += 4;
    }
    return total;
  }

  /**
   * Compresses the message history when context utilization exceeds 150,000 tokens.
   * Summarizes the old turns programmatically while leaving the 20 most recent messages fully intact.
   */
  compressHistory(messages: Message[]): Message[] {
    const totalTokens = this.estimateTokens(messages);
    if (totalTokens <= 150000 || messages.length <= 20) {
      return messages;
    }

    // Keep the most recent 20 messages fully intact
    const intactCount = 20;
    const oldMessages = messages.slice(0, messages.length - intactCount);
    const recentMessages = messages.slice(messages.length - intactCount);

    // Summarize the old messages programmatically
    const summaries: string[] = [];
    let userTurnCount = 0;
    let assistantTurnCount = 0;

    for (const msg of oldMessages) {
      if (msg.role === 'user') {
        userTurnCount++;
        const text = msg.content || '';
        const snippet = text.length > 200 ? text.slice(0, 200) + '...' : text;
        summaries.push(`[User Turn ${userTurnCount}]: ${snippet}`);
      } else {
        assistantTurnCount++;
        const text = msg.content || '';
        // Look for tool calls or names in assistant message
        const toolCalls: string[] = [];
        const toolCallRegex = /"name":\s*"([^"]+)"/g;
        let match;
        while ((match = toolCallRegex.exec(text)) !== null) {
          toolCalls.push(match[1]);
        }
        
        let assistantSummary = '';
        if (toolCalls.length > 0) {
          assistantSummary = `Executed tools: ${Array.from(new Set(toolCalls)).join(', ')}`;
        } else {
          assistantSummary = text.length > 150 ? text.slice(0, 150) + '...' : text;
        }
        summaries.push(`[Assistant Turn ${assistantTurnCount}]: ${assistantSummary}`);
      }
    }

    const condensedSummary = `### Summary of Previous Conversation (Turns 1 to ${oldMessages.length})\n\n` + 
      summaries.join('\n') + 
      `\n\n*(Note: The above turns have been summarized to save context tokens. The 20 most recent messages are fully preserved below.)*`;

    const summaryMessage: Message = {
      role: 'user',
      content: condensedSummary,
    };

    return [summaryMessage, ...recentMessages];
  }
}
