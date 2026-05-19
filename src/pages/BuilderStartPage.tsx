import { useRef, useState, type KeyboardEvent } from 'react';
import { FolderOpen, Plus, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { Project } from '@/types';

interface BuilderStartPageProps {
  projects: Project[];
  onStartProject: (prompt: string) => void;
}

export function BuilderStartPage({ projects, onStartProject }: BuilderStartPageProps) {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const recentProjects = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const handleInput = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 152)}px`;
  };

  const handleSubmit = () => {
    onStartProject(prompt.trim());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0f100f] text-[#f6f2ea]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-lg border border-white/8 bg-[#171816] p-8 sm:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(79,124,255,0.22),transparent_38%,rgba(255,122,61,0.18)_100%)]" />
          <div className="relative z-10 max-w-2xl">
            <BrandLogo className="mb-5 h-14 w-14" />
            <h1 className="text-4xl font-bold tracking-normal text-white">Choose a project to build.</h1>
            <p className="mt-3 text-sm leading-6 text-[#aaa69d]">
              Describe a new app and Joyful will create the workspace, open chat, and start building. Send an empty prompt to open a fresh blank project.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#1d1f1d] p-3 shadow-2xl shadow-black/30">
              <textarea
                ref={textareaRef}
                value={prompt}
                rows={3}
                onChange={(event) => {
                  setPrompt(event.target.value);
                  handleInput();
                }}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Build a modern portfolio for a product designer..."
                className="block min-h-24 w-full resize-none bg-transparent px-3 pt-3 text-base font-medium text-white outline-none placeholder:text-[#7d7a73]"
                aria-label="Describe what you want Joyful to build"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/templates')}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#aaa69d] transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  Browse templates
                </button>
                <button
                  onClick={handleSubmit}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2f5bff] to-[#f23c78] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-[#2f5bff]/20 transition-transform hover:scale-[1.02]"
                >
                  Build
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-white/8 bg-[#17120f] p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Recent projects</h2>
              <p className="mt-1 text-sm text-[#aaa69d]">Open a workspace and keep building.</p>
            </div>
          </div>

          <div className="grid gap-3">
            {recentProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/12 bg-white/[0.02] p-6">
                <p className="text-sm font-bold text-white">No projects yet</p>
                <p className="mt-1 text-sm text-[#aaa69d]">Create one to open the builder workspace.</p>
              </div>
            ) : (
              recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/builder/${project.id}`)}
                  className="flex items-center justify-between gap-4 rounded-lg border border-white/8 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/18 hover:bg-white/[0.05]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/[0.06] text-[#8fa7ff]">
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{project.name}</p>
                      <p className="mt-1 text-xs text-[#aaa69d]">
                        {project.files.length} files · Updated {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#f6f2ea]">Open</span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
