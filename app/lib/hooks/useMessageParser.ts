import type { Message } from 'ai';
import { useCallback, useState } from 'react';
import { StreamingMessageParser } from '~/lib/runtime/message-parser';
import { workbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('useMessageParser');

const messageParser = new StreamingMessageParser({
  callbacks: {
    onArtifactOpen: (data) => {
      logger.trace('onArtifactOpen', data);

      workbenchStore.showWorkbench.set(true);
      workbenchStore.addArtifact(data);
    },
    onArtifactClose: (data) => {
      logger.trace('onArtifactClose');

      workbenchStore.updateArtifact(data, { closed: true });
    },
    onActionOpen: (data) => {
      logger.trace('onActionOpen', data.action);

      // we only add shell actions when when the close tag got parsed because only then we have the content
      if (data.action.type !== 'shell') {
        workbenchStore.addAction(data);
      }
    },
    onActionClose: (data) => {
      logger.trace('onActionClose', data.action);

      if (data.action.type === 'shell') {
        workbenchStore.addAction(data);
      }

      workbenchStore.runAction(data);
    },
  },
});

/**
 * Fallback: When the AI model doesn't use <boltArtifact> tags properly,
 * detect code blocks in the response and wrap them as artifacts so they
 * get rendered properly and the workbench/preview can show.
 */
function wrapCodeBlocksAsArtifacts(content: string): string {
  // If the message already has boltArtifact tags, don't modify it
  if (content.includes('<boltArtifact')) {
    return content;
  }

  // Check if there are code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const matches = [...content.matchAll(codeBlockRegex)];

  if (matches.length === 0) {
    return content;
  }

  // Extract all code blocks and create an artifact wrapper
  let artifactContent = '';
  let fileName = 'index';

  for (const match of matches) {
    const lang = match[1] || 'text';
    const code = match[2].trim();

    if (!code) continue;

    // Determine file path based on language
    let filePath = 'index';

    if (lang === 'html') {
      filePath = 'index.html';
    } else if (lang === 'css') {
      filePath = 'styles.css';
    } else if (lang === 'javascript' || lang === 'js') {
      filePath = 'app.js';
    } else if (lang === 'typescript' || lang === 'tsx' || lang === 'ts' || lang === 'jsx') {
      filePath = `app.${lang === 'tsx' || lang === 'ts' ? 'tsx' : 'jsx'}`;
    } else if (lang === 'json') {
      filePath = 'package.json';
    } else if (lang === 'bash' || lang === 'sh' || lang === 'shell') {
      // Shell commands go as shell actions
      artifactContent += `<boltAction type="shell">\n${code}\n</boltAction>\n\n`;
      continue;
    } else {
      // Try to infer filename from content or use a generic name
      const ext = lang || 'txt';
      fileName = `file-${Date.now()}`;
      filePath = `${fileName}.${ext}`;
    }

    artifactContent += `<boltAction type="file" filePath="${filePath}">\n${code}\n</boltAction>\n\n`;
  }

  if (artifactContent.trim()) {
    // Remove the original code blocks from the message and wrap in artifact
    let cleanedContent = content.replace(/```\w*\n[\s\S]*?```/g, '').trim();

    // If the cleaned content is just a brief intro/outro, keep it
    return `${cleanedContent}\n\n<boltArtifact id="generated-code" title="Generated Code">\n${artifactContent}</boltArtifact>`;
  }

  return content;
}

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<{ [key: number]: string }>({});

  const parseMessages = useCallback((messages: Message[], isLoading: boolean) => {
    let reset = false;

    if (import.meta.env.DEV && !isLoading) {
      reset = true;
      messageParser.reset();
    }

    const assistantMessages = messages.filter((m) => m.role === 'assistant');
    const latestAssistantMessageId = assistantMessages[assistantMessages.length - 1]?.id;
    workbenchStore.latestAssistantMessageId = latestAssistantMessageId;

    for (const [index, message] of messages.entries()) {
      if (message.role === 'assistant') {
        // Apply fallback wrapping for messages that are done streaming
        const processedContent = !isLoading ? wrapCodeBlocksAsArtifacts(message.content) : message.content;

        const newParsedContent = messageParser.parse(message.id, processedContent);

        setParsedMessages((prevParsed) => ({
          ...prevParsed,
          [index]: !reset ? (prevParsed[index] || '') + newParsedContent : newParsedContent,
        }));
      }
    }
  }, []);

  return { parsedMessages, parseMessages };
}
