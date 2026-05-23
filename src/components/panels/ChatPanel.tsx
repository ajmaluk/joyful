import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatAttachment, ChatMessage, ProjectFile, ChatMode, SavedGenerationState } from '@/types';
import { ChatToolbar } from '@/components/chat/ChatToolbar';
import { exportChatAsMarkdown } from '@/components/chat/chatExport';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { PromptInput } from '@/components/chat/PromptInput';
import { WorkingProcess, type BuildTodo } from '@/components/chat/WorkingProcess';
import { TodoList, type TodoItem } from '@/components/chat/TodoList';
import { TemplateSelector, type Template } from '@/components/chat/TemplateSelector';
import { uniqueId } from '@/utils/ids';

interface ChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  buildTodos: BuildTodo[];
  onSendMessage: (content: string, mode?: ChatMode, attachments?: ChatAttachment[]) => void;
  onOpenFile: (path: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onClearMessages?: () => void;
  onAbortGeneration?: () => void;
  savedGeneration?: SavedGenerationState | null;
  onRetrySavedGeneration?: () => void;
  onDismissSavedGeneration?: () => void;
  onSelectTemplate?: (template: Template) => void;
  onCloseSidebar?: () => void;
  files?: ProjectFile[];
  activeFile?: ProjectFile | null;
  pendingContext?: string;
}

export function ChatPanel({
  messages,
  isGenerating,
  buildTodos,
  onSendMessage,
  onOpenFile,
  onRegenerateMessage,
  onClearMessages,
  onAbortGeneration,
  savedGeneration,
  onRetrySavedGeneration,
  onDismissSavedGeneration,
  onSelectTemplate,
  onCloseSidebar,
  files = [],
  pendingContext,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionName, setSessionName] = useState('AI Chat');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [showTodos, setShowTodos] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('build');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating, scrollToBottom]);

  const handleClearChat = useCallback(() => {
    onClearMessages?.();
    setTodos([]);
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

  const handleProceedPlan = useCallback((messageId: string) => {
    const planMessage = messages.find(message => message.id === messageId);
    if (!planMessage?.sourcePrompt) return;
    setChatMode('build');
    onSendMessage(planMessage.sourcePrompt, 'build');
  }, [messages, onSendMessage]);

  const handleToggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, []);

  const handleAddTodo = useCallback((text: string) => {
    setTodos(prev => [...prev, { id: uniqueId('todo'), text, completed: false }]);
  }, []);

  const handleRemoveTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const isBuildComplete = buildTodos.length > 0 && buildTodos.every(t => t.status === 'done');

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-x-hidden bg-background">
      {/* Toolbar */}
      <ChatToolbar
        messageCount={messages.length}
        sessionName={sessionName}
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
        onRenameSession={setSessionName}
        onToggleTodos={() => setShowTodos(prev => !prev)}
        onCloseSidebar={onCloseSidebar}
        todoCount={todos.length}
      />

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-4 py-5">
        {savedGeneration && !isGenerating && (
          <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-amber-900 shadow-sm dark:text-amber-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold">
                  {savedGeneration.status === 'failed' ? 'Saved request failed' : 'Saved request found'}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 opacity-85">
                  {savedGeneration.prompt}
                </p>
                {savedGeneration.error && (
                  <p className="mt-1 line-clamp-2 text-[11px] opacity-75">{savedGeneration.error}</p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={onRetrySavedGeneration}
                  className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={onDismissSavedGeneration}
                  className="rounded-lg px-2 py-1.5 text-xs font-semibold opacity-70 hover:bg-amber-500/10 hover:opacity-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state with template selector */}
        {messages.length === 0 && files.length === 0 && onSelectTemplate && (
          <div className="min-w-0 space-y-6 py-4">
            <TemplateSelector
              onSelect={onSelectTemplate}
              disabled={isGenerating}
            />
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && (files.length > 0 || !onSelectTemplate) && (
          <div className="min-w-0 py-10">
            <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card/70 p-5 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                <MessageBubbleIcon />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Start a conversation</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Describe what you want to change, or ask for a build plan before editing.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border bg-background px-3 py-1">Build a feature</span>
                <span className="rounded-full border border-border bg-background px-3 py-1">Review the plan</span>
                <span className="rounded-full border border-border bg-background px-3 py-1">Improve the UI</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, index) => (
          <div key={msg.id} className="min-w-0 space-y-3">
            <MessageBubble
              message={msg}
              isLatest={index === messages.length - 1 && msg.role === 'assistant'}
              onOpenFile={onOpenFile}
              onRegenerate={onRegenerateMessage}
              onProceedPlan={handleProceedPlan}
              isGenerating={isGenerating}
            />

            {index < messages.length - 1 && msg.role === 'assistant' && <div className="h-px bg-border/35" />}
          </div>
        ))}

        {/* Build progress with todos */}
        {isGenerating && buildTodos.length > 0 && (
          <WorkingProcess todos={buildTodos} isComplete={false} />
        )}

        {/* Build complete indicator */}
        {!isGenerating && isBuildComplete && (
          <WorkingProcess todos={buildTodos} isComplete={true} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Todo list */}
      {showTodos && (
        <div className="min-w-0 overflow-x-hidden border-t border-border/60 bg-card/40 px-4 py-3">
          <TodoList
            todos={todos}
            onToggle={handleToggleTodo}
            onAdd={handleAddTodo}
            onRemove={handleRemoveTodo}
          />
        </div>
      )}

      {/* Input area */}
      <PromptInput
        onSend={onSendMessage}
        disabled={isGenerating}
        onCancel={onAbortGeneration}
        isGenerating={isGenerating}
        mode={chatMode}
        onModeChange={setChatMode}
        externalContext={pendingContext}
      />
    </div>
  );
}

function MessageBubbleIcon() {
  return <span className="text-lg leading-none">💬</span>;
}
