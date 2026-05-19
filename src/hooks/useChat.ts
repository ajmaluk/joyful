import { useState, useCallback } from 'react';
import type { ChatMessage, ProjectFile, AIGenerationResponse } from '@/types';
import { generateWithAI } from '@/services/aiService';
import * as storage from '@/services/storage';

export function useChat(projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => storage.getChatHistory(projectId));
  const [isGenerating, setIsGenerating] = useState(false);

  const sendMessage = useCallback(async (
    content: string,
    existingFiles: ProjectFile[]
  ): Promise<AIGenerationResponse | null> => {
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    storage.saveChatHistory(projectId, newMessages);

    setIsGenerating(true);
    try {
      const history = newMessages.map(m => ({ role: m.role, content: m.content }));
      const response = await generateWithAI(content, existingFiles, history);

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response.summary,
        timestamp: new Date().toISOString(),
        files: response.files.map(f => ({ path: f.path, action: 'create', content: f.content })),
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      storage.saveChatHistory(projectId, finalMessages);

      return response;
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong. Please try again.'}`,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...newMessages, errorMsg];
      setMessages(finalMessages);
      storage.saveChatHistory(projectId, finalMessages);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [messages, projectId]);

  return { messages, isGenerating, sendMessage };
}
