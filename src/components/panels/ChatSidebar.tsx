import { useState } from 'react';
import { Trash2, ChevronDown, Copy, Check, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { SiteConfirmDialog } from '@/components/ui/site-dialogs';
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
    setShowClearConfirm(true);
  };

  const conversationStarters = [
    { label: 'Explain the code', icon: '💡' },
    { label: 'Optimize performance', icon: '⚡' },
    { label: 'Add TypeScript types', icon: '📝' },
    { label: 'Write tests', icon: '✅' },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-shrink-0 flex-col border-l border-white/[0.08] bg-[#0f1115]">
      {/* Header */}
      <div className="flex h-11 flex-shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#12151a] px-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-xs font-semibold tracking-wide text-gray-200">Chat History</h2>
          <button
            onClick={onToggleSidebar}
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
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
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
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
          <div className="space-y-3 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-500">Suggested prompts</p>
            <div className="space-y-2">
              {conversationStarters.map((item) => (
                <div
                  key={item.label}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-xs text-gray-300 transition-colors hover:border-white/[0.14] hover:bg-white/[0.06]"
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="flex-1 leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-3.5">
            {messages.map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
              >
                <div
                  className="flex cursor-pointer items-start justify-between gap-2"
                  onClick={() =>
                    setExpandedMessageId(expandedMessageId === message.id ? null : message.id)
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${
                      message.role === 'user'
                        ? 'text-indigo-400'
                        : message.role === 'assistant'
                          ? 'text-emerald-400'
                          : 'text-red-400'
                    }`}>
                      {message.role === 'user' ? 'You' : message.role === 'assistant' ? 'Assistant' : 'Error'}
                    </p>
                    <p
                      className={`mt-1 line-clamp-2 text-xs leading-5 text-gray-300 ${
                        expandedMessageId === message.id ? '' : ''
                      }`}
                    >
                      {message.content}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 flex-shrink-0 text-gray-500 transition-transform ${
                      expandedMessageId === message.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* Expanded content */}
                {expandedMessageId === message.id && (
                  <div className="mt-3 space-y-2 border-t border-white/[0.08] pt-3">
                    <p className="break-words whitespace-pre-wrap text-xs leading-6 text-gray-300">
                      {message.content}
                    </p>

                    {message.files && message.files.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-gray-500">Files</p>
                        {message.files.map((file) => (
                          <div key={file.path} className="border-l-2 border-white/[0.12] pl-2 text-xs text-gray-400">
                            {file.path}
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleCopy(message.content, message.id)}
                      className="mt-2 flex items-center gap-1.5 rounded-md p-1.5 text-xs text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
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
              <div className="animate-pulse rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">Assistant</p>
                <p className="mt-1 space-y-2 text-xs text-gray-300">
                  <span className="inline-block h-2 w-2 rounded-full bg-gray-400 animate-bounce"></span>
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-gray-400 animate-bounce"></span>
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-gray-400 animate-bounce"></span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-white/[0.08] bg-[#12151a] px-3.5 py-2.5">
        <p className="text-center text-[10px] text-gray-500">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </p>
      </div>
      <SiteConfirmDialog
        open={showClearConfirm}
        title="Clear chat history?"
        description="This removes the current conversation history from the builder."
        confirmLabel="Clear"
        destructive
        onOpenChange={setShowClearConfirm}
        onConfirm={() => {
          onClearHistory?.();
          setShowClearConfirm(false);
        }}
      />
    </div>
  );
}
