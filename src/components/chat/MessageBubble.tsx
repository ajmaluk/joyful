import { useState } from 'react';
import { ArrowRight, Copy, RotateCcw, Check, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '@/types';
import { TypingText } from '@/components/ui/TypingText';

interface MessageBubbleProps {
  message: ChatMessage;
  isLatest: boolean;
  onOpenFile?: (path: string) => void;
  onRegenerate?: (messageId: string) => void;
  onProceedPlan?: (messageId: string) => void;
  isGenerating?: boolean;
}

export function MessageBubble({ message, isLatest, onRegenerate, onProceedPlan, isGenerating }: MessageBubbleProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isPlanMessage = message.role === 'assistant' && message.actionType === 'plan';

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-[fade-in_200ms_ease-out]">
        <div className="max-w-[84%]">
          <div className="rounded-l-2xl rounded-br-md border border-primary/20 bg-primary/10 px-3.5 py-2.5 shadow-none ring-1 ring-primary/10">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {message.content}
            </p>
          </div>
          <p className="mt-1 px-1 text-right text-[10px] text-muted-foreground/70">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  }

  if (message.role === 'system') {
    const isError = message.content.includes('Error');
    return (
      <div className="flex w-full items-start gap-2 animate-[fade-in_200ms_ease-out]">
        <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${isError ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
          {isError ? (
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          )}
        </div>
        <div className="min-w-0 flex-1 border-l border-white/[0.08] pl-3">
          <p className={`text-xs leading-relaxed ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant message - clean professional walkthrough
  return (
    <div className="group w-full animate-[fade-in_200ms_ease-out] space-y-2">
      <div className="rounded-l-2xl rounded-br-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 shadow-none">
        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-200">
          {isLatest ? (
            <TypingText
              text={message.content}
              speed={12}
              delay={80}
              className="inline"
              showCursor={true}
            />
          ) : (
            message.content
          )}
        </p>
      </div>

      {isPlanMessage && isLatest && onProceedPlan && (
        <div className="flex justify-end px-1">
          <button
            type="button"
            onClick={() => onProceedPlan(message.id)}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-transform hover:bg-primary/15 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            Proceed to build
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
        <button
          onClick={() => handleCopy(message.content)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
        >
          {copiedId === message.id ? (
            <>
              <Check className="w-3 h-3 text-green-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
        {onRegenerate && (
          <button
            onClick={() => onRegenerate(message.id)}
            disabled={isGenerating}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Regenerate</span>
          </button>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground/70">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
