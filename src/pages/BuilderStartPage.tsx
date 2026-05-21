import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { ChevronDown, FolderOpen, ImagePlus, ListChecks, Plus, Send, Wand2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { ChatAttachment, ChatMode, Project } from '@/types';
import { readImageAttachment } from '@/services/attachments';

interface BuilderStartPageProps {
  projects: Project[];
  onStartProject: (prompt: string, mode?: ChatMode, attachments?: ChatAttachment[]) => void;
}

export function BuilderStartPage({ projects, onStartProject }: BuilderStartPageProps) {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [promptMode, setPromptMode] = useState<ChatMode>('build');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const recentProjects = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const handleInput = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 152)}px`;
  };

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    onStartProject(trimmed || (attachment ? 'Use the attached image as a visual reference and build the website from it.' : ''), promptMode, attachment ? [attachment] : []);
    setModeMenuOpen(false);
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAttachment(await readImageAttachment(file));
      setAttachmentError('');
    } catch (error) {
      setAttachment(null);
      setAttachmentError(error instanceof Error ? error.message : 'Could not attach that image.');
    } finally {
      event.target.value = '';
    }
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
                <div className="flex min-w-0 items-center gap-2">
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#aaa69d] transition-colors hover:bg-white/5 hover:text-white"
                    aria-label="Attach image"
                    title="Attach one image"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>
                  {attachment && (
                    <div className="flex min-w-0 max-w-[170px] items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-[#d8d3ca]">
                      <img src={attachment.dataUrl} alt="" className="h-5 w-5 rounded object-cover" />
                      <span className="truncate">{attachment.name}</span>
                      <button type="button" onClick={() => setAttachment(null)} aria-label="Remove image" className="hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {attachmentError && <span className="text-[10px] font-medium text-red-300">{attachmentError}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setModeMenuOpen(prev => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[#f6f2ea] transition-colors hover:bg-white/10"
                      aria-haspopup="menu"
                      aria-expanded={modeMenuOpen}
                    >
                      {promptMode === 'plan' ? <ListChecks className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />}
                      {promptMode === 'plan' ? 'Plan' : 'Build'}
                      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </button>
                    {modeMenuOpen && (
                      <div className="absolute bottom-full right-0 z-20 mb-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#20211e] p-1 shadow-xl">
                        {([
                          { value: 'build' as const, label: 'Build', hint: 'Create files', icon: Wand2 },
                          { value: 'plan' as const, label: 'Plan', hint: 'Review first', icon: ListChecks },
                        ]).map((option) => {
                          const Icon = option.icon;
                          const selected = promptMode === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setPromptMode(option.value);
                                setModeMenuOpen(false);
                              }}
                              className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                                selected ? 'bg-[#2f5bff]/15 text-white' : 'text-[#d8d3ca] hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <Icon className="mt-0.5 h-3.5 w-3.5 text-[#8fa7ff]" />
                              <span>
                                <span className="block text-xs font-semibold">{option.label}</span>
                                <span className="block text-[10px] leading-snug opacity-70">{option.hint}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    aria-label={promptMode === 'plan' ? 'Create implementation plan' : 'Start building'}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#2f5bff] to-[#f23c78] text-white shadow-lg shadow-[#2f5bff]/20 transition-transform hover:scale-[1.05]"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
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
