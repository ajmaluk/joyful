import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ChatMessage, ProjectFile } from '@/types';
import { ChatToolbar } from '@/components/chat/ChatToolbar';
import { exportChatAsMarkdown } from '@/components/chat/chatExport';
import { SmartSuggestions } from '@/components/chat/SmartSuggestions';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { PromptInput } from '@/components/chat/PromptInput';
import { FileDiffViewer } from '@/components/chat/FileDiffViewer';
import { buildDiffsFromFiles } from '@/components/chat/fileDiffUtils';
import { ActionHistory } from '@/components/chat/ActionHistory';
import { buildActionsFromFiles } from '@/components/chat/actionHistoryUtils';
import { WorkingProcess } from '@/components/chat/WorkingProcess';

interface ChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  generationStep?: number;
  onSendMessage: (content: string) => void;
  onOpenFile: (path: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onClearMessages?: () => void;
  files?: ProjectFile[];
}

export function ChatPanel({
  messages,
  isGenerating,
  generationStep = -1,
  onSendMessage,
  onOpenFile,
  onRegenerateMessage,
  onClearMessages,
  files = [],
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionName, setSessionName] = useState('AI Chat');
  const nextSteps = useMemo(
    () => [...messages].reverse().find(message => message.role === 'assistant' && message.nextSteps?.length)?.nextSteps,
    [messages]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating, scrollToBottom]);

  const lastAssistantWithFiles = useMemo(
    () => [...messages].reverse().find(m => m.role === 'assistant' && m.files && m.files.length > 0),
    [messages]
  );

  const lastDiffs = useMemo(() => {
    if (!lastAssistantWithFiles?.files?.length) return [];
    return buildDiffsFromFiles(
      lastAssistantWithFiles.files.map(f => ({
        path: f.path,
        content: f.content || '',
        action: f.action,
      })),
      files
    );
  }, [files, lastAssistantWithFiles]);

  const actions = useMemo(() => {
    const seen = new Set<string>();
    return messages.flatMap(message => {
      if (message.role !== 'assistant' || !message.files?.length) return [];
      const fileOps = message.files.map(f => ({ path: f.path, action: f.action }));
      return buildActionsFromFiles(fileOps, files, {
        idPrefix: message.id,
        timestamp: message.timestamp,
      });
    }).filter(action => {
      const key = `${action.path}:${action.type}:${action.timestamp}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).reverse();
  }, [files, messages]);

  const handleClearChat = useCallback(() => {
    onClearMessages?.();
  }, [onClearMessages]);

  const handleExportChat = useCallback(() => {
    const markdown = exportChatAsMarkdown(messages);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionName.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, sessionName]);

  const handleSuggestionSelect = useCallback((prompt: string) => {
    onSendMessage(prompt);
  }, [onSendMessage]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-x-hidden bg-background">
      {/* Toolbar */}
      <ChatToolbar
        messageCount={messages.length}
        sessionName={sessionName}
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
        onRenameSession={setSessionName}
      />

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="min-w-0 space-y-6 py-8">
            <SmartSuggestions
              files={files}
              nextSteps={nextSteps}
              onSelect={handleSuggestionSelect}
              disabled={isGenerating}
            />
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={msg.id} className="min-w-0 space-y-3">
            <MessageBubble
              message={msg}
              isLatest={index === messages.length - 1 && msg.role === 'assistant'}
              onOpenFile={onOpenFile}
              onRegenerate={onRegenerateMessage}
              isGenerating={isGenerating}
            />

            {/* Show diffs after assistant messages with files */}
            {msg.role === 'assistant' && msg.files && msg.files.length > 0 && index === messages.length - 1 && (
              <div className="ml-2 min-w-0 space-y-3 overflow-x-hidden">
                <FileDiffViewer diffs={lastDiffs} />
              </div>
            )}

            {/* Subtle divider between messages */}
            {index < messages.length - 1 && (
              <div className="mx-8 border-t border-border" />
            )}
          </div>
        ))}

        {/* Action history */}
        {actions.length > 0 && (
          <div className="mt-4">
            <ActionHistory actions={actions} onActionClick={(action) => onOpenFile(action.path)} />
          </div>
        )}

        {/* Working process indicator */}
        {isGenerating && (
          <WorkingProcess generationStep={generationStep} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Show smart suggestions after generation */}
      {messages.length > 0 && !isGenerating && nextSteps && nextSteps.length > 0 && (
        <div className="min-w-0 overflow-x-hidden border-t border-border bg-card px-4 py-3">
          <SmartSuggestions
            files={files}
            nextSteps={nextSteps}
            onSelect={handleSuggestionSelect}
            disabled={isGenerating}
          />
        </div>
      )}

      {/* Enhanced input area */}
      <PromptInput
        onSend={onSendMessage}
        disabled={isGenerating}
      />
    </div>
  );
}
