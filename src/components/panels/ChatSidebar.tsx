import { useState } from 'react';
import { Trash2, ChevronDown, Copy, Check, PanelRightClose, PanelRightOpen } from 'lucide-react';
import type { ChatMessage } from '@/types';

interface ChatSidebarProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onClearHistory?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function ChatSidebar({ messages, isGenerating, onClearHistory, onToggleSidebar, isSidebarOpen = true }: ChatSidebarProps) {
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear chat history?')) {
      onClearHistory?.();
    }
  };

  const conversationStarters = [
    { label: 'Explain the code', icon: '💡' },
    { label: 'Optimize performance', icon: '⚡' },
    { label: 'Add TypeScript types', icon: '📝' },
    { label: 'Write tests', icon: '✅' },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-shrink-0 flex-col bg-gray-50 border-l border-[#1A1A1A]">
      {/* Header */}
      <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[#1A1A1A] bg-white px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Chat History</h2>
          <button
            onClick={onToggleSidebar}
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            title={isSidebarOpen ? 'Close chat sidebar' : 'Open chat sidebar'}
            aria-label={isSidebarOpen ? 'Close chat sidebar' : 'Open chat sidebar'}
          >
            {isSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              title="Clear history"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Suggested prompts</p>
            <div className="space-y-2">
              {conversationStarters.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors"
              >
                <div
                  className="flex items-start justify-between gap-2 cursor-pointer"
                  onClick={() =>
                    setExpandedMessageId(expandedMessageId === message.id ? null : message.id)
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium ${
                      message.role === 'user'
                        ? 'text-indigo-600'
                        : message.role === 'assistant'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                    }`}>
                      {message.role === 'user' ? 'You' : message.role === 'assistant' ? 'Assistant' : 'Error'}
                    </p>
                    <p
                      className={`text-xs text-gray-700 mt-1 line-clamp-2 ${
                        expandedMessageId === message.id ? '' : ''
                      }`}
                    >
                      {message.content}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform ${
                      expandedMessageId === message.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* Expanded content */}
                {expandedMessageId === message.id && (
                  <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                    <p className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                      {message.content}
                    </p>

                    {message.files && message.files.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <p className="text-xs font-medium text-gray-500">Files:</p>
                        {message.files.map((file) => (
                          <div key={file.path} className="text-xs text-gray-600 pl-2 border-l-2 border-gray-200">
                            {file.path}
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleCopy(message.content, message.id)}
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 p-1.5 rounded-md hover:bg-gray-100 transition-colors mt-2"
                    >
                      {copiedId === message.id ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {isGenerating && (
              <div className="rounded-lg border border-gray-200 bg-white p-3 animate-pulse">
                <p className="text-xs font-medium text-emerald-600">Assistant</p>
                <p className="text-xs text-gray-700 mt-1 space-y-2">
                  <span className="inline-block h-2 w-2 bg-gray-300 rounded-full animate-bounce"></span>
                  <span className="inline-block h-2 w-2 bg-gray-300 rounded-full animate-bounce ml-1"></span>
                  <span className="inline-block h-2 w-2 bg-gray-300 rounded-full animate-bounce ml-1"></span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-[#1A1A1A] bg-white px-4 py-3">
        <p className="text-xs text-gray-500 text-center">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
