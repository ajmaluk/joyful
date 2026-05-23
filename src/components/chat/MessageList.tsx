import { useState } from 'react';
import { Copy, Check, AlertTriangle, Brain, Loader2 } from 'lucide-react';
import type { AgentMessage } from '@/store/joyfulStore';
import { PlanCard } from './PlanCard';
import { ToolActivityCard } from './ToolActivityCard';
import { TodoCard } from './TodoCard';
import { CompileResultCard, ErrorCard } from './CompileResultCard';
import { MemoryCard } from './MemoryCard';
import { FinalSummaryCard } from './FinalSummaryCard';
import { ChangedFilesCard } from './ChangedFilesCard';
import type { ToolActivity, AgentPlanStep, Todo, CompileError, FinalSummary, FileChange } from '@/lib/agent/eventBus';

interface MessageListProps {
  messages: AgentMessage[];
  onOpenFile?: (path: string) => void;
  onRetry?: () => void;
  isGenerating?: boolean;
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[84%] rounded-l-2xl rounded-br-md border border-primary/20 bg-primary/10 px-3.5 py-2.5 shadow-none ring-1 ring-primary/10">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{content}</p>
      </div>
    </div>
  );
}

function AssistantText({ content, isLatest, isGenerating }: { content: string; isLatest: boolean; isGenerating?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  return (
    <div className="group space-y-2">
      <div className="rounded-l-2xl rounded-br-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5">
        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-200">
          {isLatest && isGenerating ? (
            <>
              {content}
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-foreground/50 animate-pulse" />
            </>
          ) : (
            content
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 px-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        >
          {copied ? (
            <><Check className="h-3 w-3 text-emerald-400" /><span>Copied</span></>
          ) : (
            <><Copy className="h-3 w-3" /><span>Copy</span></>
          )}
        </button>
      </div>
    </div>
  );
}

function ThinkingMessage({ content }: { content: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>{content || 'Working...'}</span>
    </div>
  );
}

function SystemMessage({ content, isError }: { content: string; isError: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${isError ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
        {isError ? (
          <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
        ) : (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        )}
      </div>
      <div className="border-l border-white/[0.08] pl-3">
        <p className={`text-xs leading-relaxed ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
          {content}
        </p>
      </div>
    </div>
  );
}

function WarningMessage({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
      <p className="text-xs text-amber-200">{content}</p>
    </div>
  );
}

export function MessageList({ messages, onOpenFile, onRetry, isGenerating }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/70 text-muted-foreground">
            <Brain className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Start a conversation</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Describe what you want to build or change. The agent will plan, build, and verify.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg, index) => {
        const isLatest = index === messages.length - 1;
        const metadata = msg.metadata;

        // User messages go first regardless of type
        if (msg.role === 'user') {
          return <UserMessage key={msg.id} content={msg.content} />;
        }

        // Then switch on type first, falling back to role
        switch (msg.type) {
          case 'thinking':
            return <ThinkingMessage key={msg.id} content={msg.content} />;

          case 'plan':
            return (
              <PlanCard
                key={msg.id}
                steps={(metadata?.steps as AgentPlanStep[]) || []}
              />
            );

          case 'todo_update':
            return (
              <TodoCard
                key={msg.id}
                todos={(metadata?.todos as Todo[]) || []}
              />
            );

          case 'tool_call':
            return (
              <ToolActivityCard
                key={msg.id}
                activity={(metadata?.activity as ToolActivity) || {
                  id: msg.id, tool: '', display: msg.content,
                  status: 'running', startedAt: msg.timestamp,
                }}
                onOpenFile={onOpenFile}
              />
            );

          case 'tool_result':
            return (
              <ToolActivityCard
                key={msg.id}
                activity={(metadata?.activity as ToolActivity) || {
                  id: msg.id, tool: '', display: msg.content,
                  status: 'success', startedAt: msg.timestamp,
                }}
                onOpenFile={onOpenFile}
              />
            );

          case 'file_change': {
            let change: FileChange;
            try {
              change = metadata ? {
                path: String(metadata.path || ''),
                action: (metadata.action as FileChange['action']) || 'updated',
                oldPath: metadata.oldPath as string | undefined,
                summary: String(metadata.summary || msg.content),
                timestamp: msg.timestamp,
                status: 'success' as const,
              } : JSON.parse(msg.content);
            } catch {
              change = {
                path: String(metadata?.path || msg.content),
                action: (metadata?.action as FileChange['action']) || 'updated',
                summary: msg.content,
                timestamp: msg.timestamp,
                status: 'success' as const,
              };
            }
            return (
              <ChangedFilesCard
                key={msg.id}
                changes={[change]}
                onOpenFile={onOpenFile}
                compact={true}
              />
            );
          }

          case 'compile_result':
            return (
              <CompileResultCard
                key={msg.id}
                success={Boolean(metadata?.success)}
                errors={(metadata?.errors as CompileError[]) || []}
                durationMs={metadata?.durationMs as number | undefined}
              />
            );

          case 'debug_result':
            return (
              <ErrorCard
                key={msg.id}
                error={(metadata?.error as CompileError) || { file: '', line: 0, column: 0, message: msg.content }}
                attempt={metadata?.attempt as number | undefined}
                fixAction={metadata?.fixAction as string | undefined}
                isFixed={metadata?.isFixed as boolean | undefined}
              />
            );

          case 'memory_update':
            return <MemoryCard key={msg.id} summary={msg.content} />;

          case 'context_update':
            return (
              <div key={msg.id} className="rounded-lg border border-sky-500/15 bg-sky-500/5 px-3 py-2 text-xs text-sky-200">
                {msg.content}
              </div>
            );

          case 'storage_update':
            return (
              <div key={msg.id} className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">
                {msg.content}
              </div>
            );

          case 'final_summary':
            return (
              <FinalSummaryCard
                key={msg.id}
                summary={(metadata?.summary as FinalSummary) || {
                  summary: msg.content, changedFiles: [],
                  errors: 0, warnings: 0, durationMs: 0, previewStatus: 'not_run',
                }}
                onOpenFile={onOpenFile}
                onRetry={onRetry}
                status={msg.content.includes('Failed') ? 'failed' : msg.content.includes('Cancelled') ? 'cancelled' : 'completed'}
              />
            );

          case 'warning':
            return <WarningMessage key={msg.id} content={msg.content} />;

          default:
            break;
        }

        // Fallback by role for untyped messages
        if (msg.role === 'system') {
          return <SystemMessage key={msg.id} content={msg.content} isError={msg.content.toLowerCase().includes('error')} />;
        }

        if (msg.role === 'error') {
          return <WarningMessage key={msg.id} content={msg.content} />;
        }

        // Default assistant text fallback
        return (
          <div key={msg.id}>
            <AssistantText
              content={msg.content}
              isLatest={isLatest}
              isGenerating={isGenerating && isLatest}
            />
            {Array.isArray(metadata?.steps) && (metadata.steps as unknown[]).length > 0 ? (
              <div className="mt-2">
                <PlanCard steps={metadata.steps as AgentPlanStep[]} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
