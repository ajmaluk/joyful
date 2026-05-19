import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ProjectFile } from '@/types';
import { ChatToolbar, exportChatAsMarkdown } from '@/components/chat/ChatToolbar';
import { SmartSuggestions } from '@/components/chat/SmartSuggestions';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { PromptInput } from '@/components/chat/PromptInput';
import { FileDiffViewer, buildDiffsFromFiles } from '@/components/chat/FileDiffViewer';
import { ActionHistory, buildActionsFromFiles } from '@/components/chat/ActionHistory';
import { WorkingProcess } from '@/components/chat/WorkingProcess';

interface ChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  generationStep?: number;
  onSendMessage: (content: string) => void;
  onOpenFile: (path: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  files?: ProjectFile[];
}

export function ChatPanel({
  messages,
  isGenerating,
  generationStep = -1,
  onSendMessage,
  onOpenFile,
  onRegenerateMessage,
  files = [],
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionName, setSessionName] = useState('AI Chat');
  const [lastDiffs, setLastDiffs] = useState<ReturnType<typeof buildDiffsFromFiles>>([]);
  const [actions, setActions] = useState<ReturnType<typeof buildActionsFromFiles>>([]);
  const [nextSteps, setNextSteps] = useState<string[] | undefined>();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating, scrollToBottom]);

  // Track file changes from the last assistant message
  useEffect(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant?.files && lastAssistant.files.length > 0) {
      const fileOps = lastAssistant.files.map(f => ({
        path: f.path,
        content: f.content || '',
        action: f.action,
      }));
      setLastDiffs(buildDiffsFromFiles(fileOps, files));
      setActions(prev => [...buildActionsFromFiles(fileOps, files), ...prev]);
    }
  }, [messages, files]);

  const handleClearChat = useCallback(() => {
    setActions([]);
    setLastDiffs([]);
    setNextSteps(undefined);
  }, []);

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
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      {/* Toolbar */}
      <ChatToolbar
        messageCount={messages.length}
        sessionName={sessionName}
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
        onRenameSession={setSessionName}
      />

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-6 py-8">
            <SmartSuggestions
              files={files}
              nextSteps={nextSteps}
              onSelect={handleSuggestionSelect}
              disabled={isGenerating}
            />
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={msg.id} className="space-y-3">
            <MessageBubble
              message={msg}
              isLatest={index === messages.length - 1 && msg.role === 'assistant'}
              onOpenFile={onOpenFile}
              onRegenerate={onRegenerateMessage}
              isGenerating={isGenerating}
            />

            {/* Show diffs after assistant messages with files */}
            {msg.role === 'assistant' && msg.files && msg.files.length > 0 && index === messages.length - 1 && (
              <div className="ml-2 space-y-3">
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
      {messages.length > 0 && !isGenerating && (
        <div className="border-t border-border px-4 py-3 bg-gradient-to-b from-muted/20 to-background">
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
