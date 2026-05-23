import { Layers, FileText, Bug } from 'lucide-react';
import type { AgentMessage } from '@/store/joyfulStore';
import { AgentActivityCard } from './cards/AgentActivityCard';
import { PlanCard } from './cards/PlanCard';
import { TodoCard } from './cards/TodoCard';
import { FileReadCard } from './cards/FileReadCard';
import { ErrorDebugCard } from './cards/ErrorDebugCard';
import { ContextCard } from './cards/ContextCard';
import { MemoryCard } from './cards/MemoryCard';

interface AgentActivityRendererProps {
  message: AgentMessage;
  onOpenFile?: (path: string) => void;
}

export function AgentActivityRenderer({ message, onOpenFile }: AgentActivityRendererProps) {
  const meta = message.metadata;

  switch (message.type) {
    case 'plan':
      if (meta?.steps) {
        return <PlanCard steps={meta.steps as any[]} goal="" />;
      }
      break;

    case 'todo_update':
      if (meta?.todos) {
        return <TodoCard todos={meta.todos as any[]} />;
      }
      break;

    case 'tool_call':
      if (meta?.contextFiles) {
        return (
          <AgentActivityCard icon={<Layers className="h-4 w-4" />} title="Context Selected" timestamp={message.timestamp}>
            <ContextCard files={meta.contextFiles as string[]} chunks={meta.contextChunks as any} repoMapUsed={!!meta.repoMapUsed} memoryUsed={!!meta.memoryUsed} estimatedTokens={meta.estimatedTokens as number | undefined} onOpenFile={onOpenFile} />
          </AgentActivityCard>
        );
      }
      if (meta?.activity) {
        const activity = meta.activity as Record<string, unknown>;
        const tool = activity.tool as string;
        if (tool === 'read_file_around' || tool === 'read_file' || tool === 'read_file_chunk') {
          const input = activity.input as Record<string, unknown> | undefined;
          return (
            <AgentActivityCard icon={<FileText className="h-4 w-4" />} title={`Read: ${input?.path || activity.display || ''}`} timestamp={message.timestamp} status={activity.status as any}>
              <FileReadCard path={(input?.path as string) || ''} totalLines={0} reason={message.content} onOpenFile={onOpenFile} />
            </AgentActivityCard>
          );
        }
      }
      break;

    case 'debug_result':
      if (meta?.errors) {
        const errors = meta.errors as Array<{ file: string; line: number; message: string; likelyCause?: string }>;
        const error = errors[0];
        return (
          <AgentActivityCard icon={<Bug className="h-4 w-4" />} title="Debug" timestamp={message.timestamp} status="running">
            <ErrorDebugCard type="compile_error" file={error.file} line={error.line} message={error.message} likelyCause={error.likelyCause} onOpenFile={onOpenFile} />
          </AgentActivityCard>
        );
      }
      break;

    case 'memory_update':
      if (meta?.type === 'memory') {
        return <MemoryCard type="loaded" summary={message.content} />;
      }
      break;

    case 'warning':
      break;
  }

  return null;
}
