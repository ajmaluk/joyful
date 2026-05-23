import { Brain, Bookmark, Lightbulb, RefreshCw } from 'lucide-react';

interface Reflection {
  id: string;
  lesson: string;
}

interface SkillEntry {
  name: string;
  description: string;
}

interface Decision {
  topic: string;
  decision: string;
}

interface MemoryCardProps {
  type: 'loaded' | 'saved';
  summary: string;
  reflections?: Reflection[];
  skills?: SkillEntry[];
  decisions?: Decision[];
}

export function MemoryCard({ type, summary, reflections, skills, decisions }: MemoryCardProps) {
  return (
    <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-violet-400">
        {type === 'saved' ? <Brain className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Memory {type === 'saved' ? 'saved' : 'loaded'}
      </div>

      <p className="mb-2 text-xs leading-relaxed text-violet-200">{summary}</p>

      {reflections && reflections.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-400/70">
            <Lightbulb className="h-3 w-3" />
            Reflections
          </div>
          <div className="space-y-1">
            {reflections.map((r) => (
              <p key={r.id} className="text-[11px] text-violet-200/80">
                <span className="font-medium text-violet-300">{r.id}:</span> {r.lesson}
              </p>
            ))}
          </div>
        </div>
      )}

      {skills && skills.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-400/70">
            <Bookmark className="h-3 w-3" />
            Skills
          </div>
          <div className="flex flex-wrap gap-1">
            {skills.map((s) => (
              <span
                key={s.name}
                className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] text-violet-300"
                title={s.description}
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {decisions && decisions.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-400/70">
            <Brain className="h-3 w-3" />
            Decisions
          </div>
          <div className="space-y-1">
            {decisions.map((d, i) => (
              <p key={i} className="text-[11px] text-violet-200/80">
                <span className="font-medium text-violet-300">{d.topic}:</span> {d.decision}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
