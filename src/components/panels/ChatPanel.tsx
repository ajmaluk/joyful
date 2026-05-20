import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ProjectFile, ChatMode } from '@/types';
import { ChatToolbar } from '@/components/chat/ChatToolbar';
import { exportChatAsMarkdown } from '@/components/chat/chatExport';
import { SmartSuggestions } from '@/components/chat/SmartSuggestions';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { PromptInput } from '@/components/chat/PromptInput';
import { WorkingProcess, type BuildTodo } from '@/components/chat/WorkingProcess';
import { TodoList, type TodoItem } from '@/components/chat/TodoList';
import { TemplateSelector, type Template } from '@/components/chat/TemplateSelector';

interface ChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  buildTodos: BuildTodo[];
  onSendMessage: (content: string, mode?: ChatMode) => void;
  onOpenFile: (path: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onClearMessages?: () => void;
  onAbortGeneration?: () => void;
  onSelectTemplate?: (template: Template) => void;
  onCloseSidebar?: () => void;
  files?: ProjectFile[];
  activeFile?: ProjectFile | null;
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
  onSelectTemplate,
  onCloseSidebar,
  files = [],
  activeFile = null,
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

  const handleSuggestionSelect = useCallback((prompt: string) => {
    onSendMessage(prompt, 'build');
  }, [onSendMessage]);

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
    setTodos(prev => [...prev, { id: `todo_${Date.now()}`, text, completed: false }]);
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
        {/* Empty state with template selector */}
        {messages.length === 0 && files.length === 0 && onSelectTemplate && (
          <div className="min-w-0 space-y-6 py-4">
            <TemplateSelector
              onSelect={onSelectTemplate}
              disabled={isGenerating}
            />
          </div>
        )}

        {/* Empty state with suggestions */}
        {messages.length === 0 && (files.length > 0 || !onSelectTemplate) && (
          <div className="min-w-0 space-y-6 py-8">
            <SmartSuggestions
              files={files}
              activeFile={activeFile}
              onSelect={handleSuggestionSelect}
              disabled={isGenerating}
            />
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
      />
    </div>
  );
}
