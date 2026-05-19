import { useState } from 'react';
import { Copy, RotateCcw, FileCode, Check, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { ChatMessage } from '@/types';
import { TypingText } from '@/components/ui/TypingText';

interface MessageBubbleProps {
  message: ChatMessage;
  isLatest: boolean;
  onOpenFile?: (path: string) => void;
  onRegenerate?: (messageId: string) => void;
  isGenerating?: boolean;
}

function getFileIcon(path: string) {
  if (path.endsWith('.html')) return '🌐';
  if (path.endsWith('.css')) return '🎨';
  if (path.endsWith('.js') || path.endsWith('.ts')) return '⚡';
  if (path.endsWith('.json')) return '📋';
  if (path.endsWith('.md')) return '📝';
  return '📄';
}

function getStatusBadge(message: ChatMessage) {
  if (!message.files || message.files.length === 0) return null;
  const hasOnlyCreates = message.files.every(f => f.action === 'create');
  const hasModifies = message.files.some(f => f.action === 'modify');
  const hasDeletes = message.files.some(f => f.action === 'delete');

  if (hasDeletes) return <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">Deleted</span>;
  if (hasModifies) return <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">Modified</span>;
  if (hasOnlyCreates) return <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">Generated</span>;
  return null;
}

export function MessageBubble({ message, isLatest, onOpenFile, onRegenerate, isGenerating }: MessageBubbleProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isContentExpanded, setIsContentExpanded] = useState(true);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const contentLength = message.content.length;
  const isLongContent = contentLength > 500;

  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-[fade-in_200ms_ease-out]">
        <div className="max-w-[85%] space-y-2">
          <div className="rounded-2xl bg-gradient-to-br from-[#A7ADF8] to-[#9397F3] px-5 py-3.5 shadow-lg">
            <p className="text-sm leading-relaxed text-gray-900 font-medium">
              {message.content}
            </p>
          </div>
          <p className="text-right text-[10px] text-gray-500 px-2">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  }

  if (message.role === 'system') {
    const isError = message.content.includes('Error');
    return (
      <div className="flex items-start gap-2 w-full animate-[fade-in_200ms_ease-out]">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${isError ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
          {isError ? (
            <AlertCircle className="h-4 w-4 text-red-400" />
          ) : (
            <Check className="h-4 w-4 text-green-400" />
          )}
        </div>
        <div className="flex-1">
          <p className={`text-xs ${isError ? 'text-red-400' : 'text-green-400'}`}>
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="w-full space-y-3 animate-[fade-in_200ms_ease-out] group">
      {/* Status badge */}
      {getStatusBadge(message)}

      {/* Content with collapse for long messages */}
      <div className="space-y-1">
        {isLongContent && (
          <button
            onClick={() => setIsContentExpanded(!isContentExpanded)}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isContentExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {isContentExpanded ? 'Collapse' : 'Expand'} explanation
          </button>
        )}

        {isContentExpanded ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
            {isLatest ? (
              <TypingText
                text={message.content}
                speed={10}
                delay={100}
                className="inline"
                showCursor={true}
              />
            ) : (
              message.content
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-500 italic">
            {contentLength} characters — click to expand
          </p>
        )}
      </div>

      {/* File chips */}
      {message.files && message.files.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Files Updated</p>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
              {message.files.length} file{message.files.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {message.files.map((file) => (
              <button
                key={file.path}
                onClick={() => onOpenFile?.(file.path)}
                className="group/file flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-sm"
              >
                <span className="text-sm">{getFileIcon(file.path)}</span>
                <span className="text-xs font-medium text-gray-900 truncate max-w-[140px]">{file.path}</span>
                <span className="text-[10px] text-gray-500 group-hover/file:text-indigo-600 transition-colors">Open</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => handleCopy(message.content)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
        >
          {copiedId === message.id ? (
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
        {onRegenerate && (
          <button
            onClick={() => onRegenerate(message.id)}
            disabled={isGenerating}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Regenerate</span>
          </button>
        )}
        <span className="text-[10px] text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
