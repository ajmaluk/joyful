import { useState } from 'react';
import { ArrowRight, Copy, RotateCcw, Check, AlertCircle, FileCode2, Terminal, Image as ImageIcon, ListChecks, GitCommitHorizontal, Wrench, Brain, Images } from 'lucide-react';
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

export function MessageBubble({ message, isLatest, onOpenFile, onRegenerate, onProceedPlan, isGenerating }: MessageBubbleProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const isPlanMessage = message.role === 'assistant' && message.actionType === 'plan';
  const displayedFiles = showAllFiles ? message.files : message.files?.slice(0, 8);
  const hasMoreFiles = (message.files?.length || 0) > 8;

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
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.attachments.map(attachment => (
                  <div key={attachment.id} className="overflow-hidden rounded-lg border border-primary/20 bg-background/60">
                    <img
                      src={attachment.dataUrl}
                      alt={attachment.name}
                      className="h-20 w-28 object-cover"
                    />
                    <div className="flex max-w-28 items-center gap-1 px-1.5 py-1 text-[10px] text-muted-foreground">
                      <ImageIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{attachment.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
          {isLatest && isGenerating ? (
            <TypingText
              text={message.content}
              speed={20}
              delay={120}
              className="inline"
              showCursor={true}
            />
          ) : (
            message.content
          )}
        </p>
      </div>

      {message.metadata?.buildReport && (
        <div className="grid grid-cols-2 gap-1.5 px-1 sm:grid-cols-4">
          {[
            ['Created', message.metadata.buildReport.filesCreated],
            ['Updated', message.metadata.buildReport.filesModified + message.metadata.buildReport.patchesApplied],
            ['Deleted', message.metadata.buildReport.filesDeleted],
            ['Checks', `${message.metadata.buildReport.validationPassed}/${message.metadata.buildReport.validationPassed + message.metadata.buildReport.validationFailed}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-card/60 px-2.5 py-2">
              <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      )}

      {message.metadata?.applyReport && (
        <div className={`rounded-xl border p-2.5 ${
          message.metadata.applyReport.skipped > 0
            ? 'border-amber-500/20 bg-amber-500/5 text-amber-200'
            : 'border-emerald-500/15 bg-emerald-500/5 text-emerald-200'
        }`}>
          <p className="text-[11px] font-semibold uppercase opacity-80">Apply result</p>
          <p className="mt-1 text-xs">
            {message.metadata.applyReport.applied} operation{message.metadata.applyReport.applied === 1 ? '' : 's'} applied
            {message.metadata.applyReport.skipped > 0 ? `, ${message.metadata.applyReport.skipped} skipped` : ''}
          </p>
          {message.metadata.applyReport.skippedOperations.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.metadata.applyReport.skippedOperations.slice(0, 3).map((operation, index) => (
                <p key={`${operation.path}-${index}`} className="truncate text-[11px] opacity-80">
                  {operation.path}: {operation.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {message.metadata?.agentPlan && message.metadata.agentPlan.length > 0 && (
        <div className="space-y-1 rounded-xl border border-border bg-card/50 p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            Plan
          </div>
          {message.metadata.agentPlan.map((step) => (
            <div key={step.id} className="flex items-start gap-2 text-xs">
              <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                step.status === 'error' ? 'bg-red-400' : step.status === 'done' ? 'bg-emerald-400' : step.status === 'active' ? 'bg-sky-400' : 'bg-muted-foreground/40'
              }`} />
              <span className="min-w-0 text-muted-foreground">
                <span className="font-medium text-foreground">{step.title}</span>
                {step.detail && <span className="ml-1">{step.detail}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {message.metadata?.toolTrace && message.metadata.toolTrace.length > 0 && (
        <div className="space-y-1 rounded-xl border border-border bg-card/50 p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" />
            Agent trace
          </div>
          {message.metadata.toolTrace.slice(0, 10).map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-xs">
              <span className={`mt-1 h-1.5 w-1.5 rounded-full ${
                item.status === 'error' ? 'bg-red-400' : item.status === 'skipped' ? 'bg-amber-400' : item.status === 'running' ? 'bg-sky-400' : 'bg-emerald-400'
              }`} />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-foreground">{item.label}</span>
                {item.target && <span className="ml-1 font-mono text-muted-foreground">{item.target}</span>}
                {item.detail && <span className="block truncate text-muted-foreground">{item.detail}</span>}
              </span>
            </div>
          ))}
          {message.metadata.toolTrace.length > 10 && (
            <p className="pt-1 text-[11px] text-muted-foreground">+{message.metadata.toolTrace.length - 10} more agent action(s)</p>
          )}
        </div>
      )}

      {message.metadata?.memory && (
        <div className="rounded-xl border border-border bg-card/50 p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
            <Brain className="h-3.5 w-3.5" />
            Memory
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            {message.metadata.memory.selectedSkills.length > 0 && (
              <p><span className="font-medium text-foreground">Skills:</span> {message.metadata.memory.selectedSkills.join(', ')}</p>
            )}
            {message.metadata.memory.contextFiles.length > 0 && (
              <p className="truncate"><span className="font-medium text-foreground">Context:</span> {message.metadata.memory.contextFiles.join(', ')}</p>
            )}
            {message.metadata.memory.knownIssues.length > 0 && (
              <p className="text-red-300"><span className="font-medium">Known issues:</span> {message.metadata.memory.knownIssues.length}</p>
            )}
          </div>
        </div>
      )}

      {message.metadata?.mediaAssets && message.metadata.mediaAssets.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
            <Images className="h-3.5 w-3.5" />
            Image assets
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {message.metadata.mediaAssets.slice(0, 6).map((asset) => (
              <button
                key={asset.id}
                type="button"
                className="group overflow-hidden rounded-lg border border-border bg-background text-left"
                title={`${asset.alt} (${asset.query})`}
                onClick={() => window.open(asset.url, '_blank', 'noopener,noreferrer')}
              >
                <img src={asset.thumb || asset.url} alt={asset.alt} className="h-16 w-full object-cover transition-transform group-hover:scale-105" />
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {message.metadata.mediaAssets.length} Unsplash-backed image reference{message.metadata.mediaAssets.length === 1 ? '' : 's'} available to the build.
          </p>
        </div>
      )}

      {message.files && message.files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {(displayedFiles || []).map((file) => (
            <button
              key={`${file.action}-${file.path}`}
              type="button"
              onClick={() => onOpenFile?.(file.path)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-gray-400 transition-colors hover:border-primary/25 hover:text-primary"
              title={file.path}
            >
              <FileCode2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{file.action || 'modify'} {file.path}</span>
            </button>
          ))}
          {hasMoreFiles && (
            <button
              type="button"
              onClick={() => setShowAllFiles(!showAllFiles)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-gray-500 transition-colors hover:border-primary/25 hover:text-primary"
            >
              {showAllFiles ? 'Show less' : `+${message.files.length - 8} more`}
            </button>
          )}
        </div>
      )}

      {message.metadata?.patchDetails && message.metadata.patchDetails.length > 0 && (
        <div className="space-y-1 rounded-xl border border-border bg-card/50 p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
            <GitCommitHorizontal className="h-3.5 w-3.5" />
            Targeted edits
          </div>
          {message.metadata.patchDetails.slice(0, 6).map((patch, index) => (
            <button
              key={`${patch.path}-${index}`}
              type="button"
              onClick={() => onOpenFile?.(patch.path)}
              className="flex w-full items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white/[0.04]"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{patch.path}</span>
                <span className="block truncate text-muted-foreground">{patch.reason || 'Targeted file edit'}</span>
              </span>
              <span className="flex-shrink-0 rounded-md bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {patch.lineStart ? `L${patch.lineStart}-${patch.lineEnd ?? patch.lineStart}` : 'text'}
              </span>
            </button>
          ))}
        </div>
      )}

      {message.metadata?.sandboxResults && message.metadata.sandboxResults.length > 0 && (
        <div className="space-y-1 px-1">
          {message.metadata.sandboxResults.map((result) => (
            <div
              key={result.command}
              className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px] ${
                result.status === 'done'
                  ? 'border-emerald-500/15 bg-emerald-500/5 text-emerald-300'
                  : 'border-red-500/20 bg-red-500/5 text-red-300'
              }`}
            >
              <Terminal className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">{result.command}</p>
                {(result.stderr || result.stdout) && (
                  <p className="mt-0.5 line-clamp-2 text-[10px] opacity-75">
                    {(result.stderr || result.stdout).trim()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {message.nextSteps && message.nextSteps.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-2.5">
          <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Follow-ups</p>
          <ul className="space-y-1">
            {message.nextSteps.slice(0, 4).map((step, index) => (
              <li key={`${step}-${index}`} className="text-xs leading-5 text-muted-foreground">
                {index + 1}. {step}
              </li>
            ))}
          </ul>
        </div>
      )}

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
