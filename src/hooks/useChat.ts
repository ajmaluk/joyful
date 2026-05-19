import { useState, useCallback } from 'react';
import type { ChatMessage, ProjectFile, AIGenerationResponse } from '@/types';
import { generateWithAI } from '@/services/aiService';
import * as storage from '@/services/storage';

export const GENERATION_STEPS = [
  'Understand the request',
  'Plan files and sections',
  'Choose the right template',
  'Write or edit HTML',
  'Polish styling and responsive layout',
  'Update interactivity',
  'Save files and refresh preview',
] as const;

function buildTaskLabels(content: string, response?: AIGenerationResponse): string[] {
  if (response?.files.length) {
    const operationLabels = response.files.map((file) => {
      const verb = file.action === 'delete' ? 'Delete' : file.action === 'modify' ? 'Edit' : 'Create';
      return `${verb} ${file.path}`;
    });
    return ['Understand request', 'Plan file changes', ...operationLabels, 'Refresh preview'].slice(0, 8);
  }

  const lower = content.toLowerCase();
  const labels = ['Understand request', 'Choose best site structure'];
  if (/style|ui|design|premium|better|improve/.test(lower)) labels.push('Polish visual system');
  if (/responsive|mobile/.test(lower)) labels.push('Check responsive layout');
  if (/file|create|edit|delete|remove/.test(lower)) labels.push('Apply file operations');
  labels.push('Generate files', 'Refresh preview');
  return labels.slice(0, 7);
}

export function useChat(projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => storage.getChatHistory(projectId));
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<number>(-1);

  const clearMessages = useCallback(() => {
    setMessages([]);
    storage.saveChatHistory(projectId, []);
  }, [projectId]);

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
      const completedTasks = buildTaskLabels(content, response).map((label, index) => ({
        id: `task_${Date.now()}_${index}`,
        label,
        status: 'done' as const,
      }));

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response.summary,
        timestamp: new Date().toISOString(),
        tasks: completedTasks,
        nextSteps: response.nextSteps,
        files: response.files.map(f => ({
          path: f.path,
          action: f.action || (existingFiles.some(file => file.path === f.path) ? 'modify' : 'create'),
          content: f.content || '',
        })),
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

  return { messages, isGenerating, generationStep, sendMessage, clearMessages };
}
