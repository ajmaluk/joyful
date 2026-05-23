import { Brain } from 'lucide-react';

interface MemoryCardProps {
  summary: string;
}

export function MemoryCard({ summary }: MemoryCardProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-violet-500/10 bg-violet-500/5 px-3 py-2">
      <Brain className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
      <span className="text-[11px] leading-relaxed text-violet-200">
        {summary}
      </span>
    </div>
  );
}
