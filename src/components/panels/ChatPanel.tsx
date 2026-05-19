import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Copy, RotateCcw, FileCode, Check, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '@/types';

interface ChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onSendMessage: (content: string) => void;
  onOpenFile: (path: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
}

export function ChatPanel({ messages, isGenerating, onSendMessage, onOpenFile, onRegenerateMessage }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  };

  const handleTextareaInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const suggestedPrompts = [
    { label: 'Homepage', prompt: 'Create a polished SaaS homepage with pricing', icon: '🏠' },
    { label: 'Mobile', prompt: 'Make the mobile layout cleaner and faster', icon: '📱' },
    { label: 'SEO', prompt: 'Improve copy, hierarchy, and SEO metadata', icon: '🔍' },
    { label: 'Landing', prompt: 'Turn this into a conversion-focused landing page', icon: '🚀' },
  ];

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {messages.length === 0 && (
          <div className="space-y-4 py-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">✨ Suggested requests</p>
                <span className="rounded-full border border-gray-300 px-2.5 py-1 text-[10px] text-gray-500 bg-white/50">Local</span>
              </div>
              <p className="text-xs text-gray-500">Try one of these to get started</p>
            </div>
            <div className="grid gap-2.5">
              {suggestedPrompts.map((item) => (
                <button
                  key={item.prompt}
                  onClick={() => {
                    setInput(item.prompt);
                    textareaRef.current?.focus();
                  }}
                  className="group relative flex w-full items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-left transition-all duration-200 hover:border-gray-400 hover:bg-gray-100 hover:shadow-[0_8px_16px_rgba(0,0,0,0.3)]"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 text-base transition-all duration-200 group-hover:border-gray-400 group-hover:scale-110">
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-indigo-600 group-hover:text-indigo-600">{item.label}</p>
                    <p className="text-sm leading-snug text-gray-700 group-hover:text-gray-900 truncate">
                      {item.prompt}
                    </p>
                  </div>
                  <ArrowUp className="h-4 w-4 rotate-45 text-gray-500 transition-all duration-200 group-hover:text-indigo-600 group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`animate-[fade-in_200ms_ease-out] group ${
              msg.role === 'user' ? 'flex justify-end' : ''
            }`}
          >
            {msg.role === 'user' ? (
              <div className="max-w-[85%] space-y-2">
                <div className="rounded-2xl bg-gradient-to-br from-[#A7ADF8] to-[#9397F3] px-5 py-3.5 shadow-lg">
                  <p className="text-sm leading-relaxed text-gray-900 font-medium">
                    {msg.content}
                  </p>
                </div>
                <p className="text-right text-[10px] text-gray-500 px-2">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ) : msg.role === 'assistant' ? (
              <div className="w-full space-y-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">{msg.content}</p>
                {msg.files && msg.files.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">📁 Files Updated</p>
                    {msg.files.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => onOpenFile(file.path)}
                        className="flex w-full items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-left transition-all duration-200 hover:border-gray-400 hover:bg-gray-100 hover:shadow-md group/file"
                      >
                        <FileCode className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-900 font-medium truncate">{file.path}</span>
                        <span className="text-[10px] text-gray-600 group-hover/file:text-indigo-600 transition-colors">Open</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button 
                    onClick={() => handleCopyMessage(msg.content, msg.id)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  {onRegenerateMessage && (
                    <button 
                      onClick={() => onRegenerateMessage(msg.id)}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Regenerate</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 w-full">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${msg.content.includes('Error') ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                  {msg.content.includes('Error') ? (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  ) : (
                    <Check className="h-4 w-4 text-green-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-xs ${msg.content.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                    {msg.content}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isGenerating && (
          <div className="animate-[fade-in_200ms_ease-out] flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl border border-gray-300 shadow-lg">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
            <span className="text-[10px] text-gray-500 ml-1">Generating...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-300 bg-white px-4 py-3.5">
        <div className="flex flex-col rounded-2xl border border-gray-300 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)_inset] transition-all duration-200 focus-within:border-gray-400 focus-within:shadow-[0_0_12px_rgba(99,102,241,0.1)]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); handleTextareaInput(); }}
            onKeyDown={handleKeyDown}
            placeholder="Ask Joyful to build or improve..."
            rows={1}
            className="max-h-[120px] resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none placeholder:text-gray-600"
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-2.5 py-1 text-[10px] text-gray-600 bg-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Local sandbox
              </span>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className="rounded-lg bg-gradient-to-r from-gray-100 to-gray-50 p-2.5 text-gray-900 transition-all duration-200 hover:from-white hover:to-gray-100 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
