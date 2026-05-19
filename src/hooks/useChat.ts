import { useState, useCallback } from 'react';
import type { ChatMessage, ProjectFile, AIGenerationResponse } from '@/types';
import { generateWithAI } from '@/services/aiService';
import * as storage from '@/services/storage';

export const GENERATION_STEPS = [
  'Analyzing your request...',
  'Detecting the best template...',
  'Generating page structure...',
  'Writing HTML content...',
  'Styling with CSS...',
  'Adding interactivity...',
  'Finalizing output...',
] as const;

export function useChat(projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => storage.getChatHistory(projectId));
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<number>(-1);

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
    setGenerationStep(0);
    try {
      const history = newMessages.map(m => ({ role: m.role, content: m.content }));

      // Advance through generation steps with realistic timing
      for (let i = 1; i < GENERATION_STEPS.length; i++) {
        await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
        setGenerationStep(i);
      }

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
      setGenerationStep(-1);
    }
  }, [messages, projectId]);

  return { messages, isGenerating, generationStep, sendMessage };
}
