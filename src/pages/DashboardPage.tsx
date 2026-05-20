import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Clock,
  Download,
  Eye,
  Grid3X3,
  ListChecks,
  Mic,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { NewProjectModal } from '@/components/modals/NewProjectModal';
import { SiteConfirmDialog } from '@/components/ui/site-dialogs';
import { exportProjectAsZip, generatePreview } from '@/services/fileSystem';
import type { ChatMode, Project } from '@/types';

interface DashboardPageProps {
  projects: Project[];
  onCreateProject: (name: string, description: string) => Project;
  onDeleteProject: (id: string) => void;
  onStartProject?: (prompt: string, mode?: ChatMode) => void;
}

const tabs = ['My projects', 'Recently viewed', 'Templates'] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

export function DashboardPage({ projects, onCreateProject, onDeleteProject, onStartProject }: DashboardPageProps) {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [search, setSearch] = useState('');
  const [prompt, setPrompt] = useState('');
  const [promptMode, setPromptMode] = useState<ChatMode>('build');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('My projects');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [projects],
  );

  const filteredProjects = sortedProjects.filter((project) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      term.length === 0 ||
      project.name.toLowerCase().includes(term) ||
      project.description.toLowerCase().includes(term);
    return matchesSearch;
  });

  const visibleProjects = activeTab === 'Recently viewed' ? filteredProjects.slice(0, 4) : filteredProjects;
  const totalFiles = projects.reduce((sum, project) => sum + project.files.length, 0);

  const handleCreateProject = (name: string, description: string) => {
    const project = onCreateProject(name, description);
    navigate(`/builder/${project.id}`);
  };

  const handlePromptInput = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  };

  const handlePromptSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      textareaRef.current?.focus();
      return;
    }
    if (onStartProject) {
      onStartProject(trimmed, promptMode);
      return;
    }
    const project = onCreateProject(trimmed.slice(0, 54), trimmed);
    navigate(`/builder/${project.id}`, { state: { initialPrompt: trimmed, initialMode: promptMode } });
  };

  const canSubmitPrompt = prompt.trim().length > 0;
  const promptButtonLabel = canSubmitPrompt
    ? promptMode === 'plan'
      ? 'Create implementation plan'
      : 'Start building'
    : "Can't submit an empty request";

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handlePromptSubmit();
    }
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
  };

  const handleExportProject = async (project: Project) => {
    if (project.files.length === 0) return;
    await exportProjectAsZip(project);
  };

  return (
    <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] text-gray-950 dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_20%,#21365f_38%,#3a2040_56%,#4a1030_72%,#4a2010_100%)] dark:text-[#f6f2ea]">
      <section className="relative isolate overflow-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#edf1ff_26%,#7890ff_50%,#d76cd1_69%,#f34f78_84%,#ff7748_100%)] dark:bg-[linear-gradient(180deg,#111214_0%,#1d2d50_28%,#586fe4_52%,#b656b7_70%,#d83e69_86%,#e9643d_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.88)_24%,rgba(255,255,255,0.26)_48%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.09),transparent_40%),linear-gradient(180deg,rgba(12,13,15,0.88)_0%,rgba(12,13,15,0.2)_45%,rgba(12,13,15,0)_100%)]" />

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-center py-4 text-center sm:min-h-[80vh] sm:py-6">
          <button
            type="button"
            onClick={() => navigate('/docs')}
            className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-white/85 p-1 pr-3 text-sm font-semibold text-gray-900 shadow-lg shadow-indigo-950/10 backdrop-blur transition-colors hover:border-gray-300 dark:border-white/10 dark:bg-[#17181a]/80 dark:text-white dark:hover:border-white/20"
          >
            <span className="rounded-full bg-[#2f5bff] px-2.5 py-0.5 text-xs text-white">New</span>
            <span className="truncate">Workspace skills - create your first skill</span>
            <ArrowRight className="h-4 w-4 flex-none" />
          </button>

          <h1 className="text-balance text-3xl font-bold tracking-normal text-gray-950 sm:text-4xl lg:text-5xl dark:text-white">
            What do you want to build?
          </h1>
          <p className="mt-2 text-base font-medium text-gray-700 sm:text-lg dark:text-white/60">Describe your idea and watch it come to life</p>

          <div className="mt-7 w-full max-w-3xl rounded-2xl border border-gray-200 bg-white/95 p-2.5 text-left shadow-[0_18px_60px_rgba(15,23,42,0.14)] ring-1 ring-black/5 backdrop-blur dark:border-white/10 dark:bg-[#1d1e22]/95 dark:shadow-[0_18px_60px_rgba(0,0,0,0.34)] dark:ring-white/10">
            <textarea
              ref={textareaRef}
              value={prompt}
              rows={3}
              onChange={(event) => {
                setPrompt(event.target.value);
                handlePromptInput();
              }}
              onInput={handlePromptInput}
              onKeyDown={handlePromptKeyDown}
              placeholder="Ask Joyful to create a prototype..."
              className="block min-h-16 max-h-32 w-full resize-none bg-transparent px-3 pt-2.5 text-left text-base font-medium leading-6 text-gray-900 outline-none placeholder:text-gray-400 dark:text-[#f5f2ea] dark:placeholder:text-[#d8d3ca]/70"
              aria-label="Describe what you want Joyful to build"
            />
            <div className="flex items-center justify-between gap-3 pt-1.5">
              <button
                type="button"
                onClick={() => navigate('/templates')}
                aria-label="Create project"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-950 dark:bg-white/5 dark:text-[#d8d3ca] dark:hover:bg-white/10 dark:hover:text-white"
              >
                <Plus className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setModeMenuOpen(prev => !prev)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-[#f5f2ea] dark:hover:bg-white/10"
                    aria-haspopup="menu"
                    aria-expanded={modeMenuOpen}
                  >
                    {promptMode === 'plan' ? <ListChecks className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />}
                    {promptMode === 'plan' ? 'Plan' : 'Build'}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                  {modeMenuOpen && (
                    <div className="absolute bottom-full right-0 z-20 mb-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-[#20211e]">
                      {([
                        { value: 'build' as const, label: 'Build', hint: 'Create and edit files', icon: Wand2 },
                        { value: 'plan' as const, label: 'Plan', hint: 'Get an implementation plan first', icon: ListChecks },
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
                              selected
                                ? 'bg-[#2f5bff]/10 text-gray-950 dark:text-white'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-[#d8d3ca] dark:hover:bg-white/10 dark:hover:text-white'
                            }`}
                          >
                            <Icon className="mt-0.5 h-3.5 w-3.5 text-[#2f5bff]" />
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
                  aria-label="Voice prompt"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-950 dark:text-[#d8d3ca] dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePromptSubmit}
                  disabled={!canSubmitPrompt}
                  aria-label={promptButtonLabel}
                  title={promptButtonLabel}
                  className={`flex h-8 w-8 items-center justify-center rounded-full shadow-lg transition-transform ${
                    canSubmitPrompt
                      ? 'bg-gradient-to-r from-[#2f5bff] to-[#f23c78] text-white shadow-[#2f5bff]/20 hover:scale-105 dark:bg-[#f5f2ea] dark:bg-none dark:text-[#171816] dark:shadow-none'
                      : 'bg-secondary text-secondary-foreground shadow-none hover:scale-100 dark:bg-white/10 dark:text-[#f5f2ea]'
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                    <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 bg-transparent px-4 py-5 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-7xl rounded-[2rem] border border-[#2f5bff]/12 bg-white/96 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.1)] backdrop-blur sm:p-5 dark:border-white/10 dark:bg-[#18191d]/96 dark:shadow-[0_24px_70px_rgba(0,0,0,0.36)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/[0.03]">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    if (tab === 'Templates') navigate('/templates');
                    setActiveTab(tab);
                  }}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? 'bg-white text-gray-950 shadow-sm dark:bg-white/10 dark:text-white'
                      : 'text-gray-500 hover:bg-white hover:text-gray-950 dark:text-[#aaa69d] dark:hover:bg-white/5 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#aaa69d]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="h-10 w-full rounded-md border border-gray-200 bg-white pl-9 pr-4 text-sm font-medium text-gray-950 outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/20 sm:w-72 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18"
                />
              </div>
              <button
                onClick={() => setShowNewProject(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-gray-950 px-4 text-sm font-bold text-white transition-transform hover:scale-[1.01] dark:bg-[#f5f2ea] dark:text-[#171816]"
              >
                <Plus className="h-4 w-4" />
                New project
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Projects', value: projects.length },
              { label: 'Files', value: totalFiles },
              { label: 'Drafts', value: projects.filter((project) => project.status === 'draft').length },
            ].map((stat) => (
              <div key={stat.label} className="group rounded-2xl border border-gray-200 bg-gray-50 p-3.5 transition-all duration-300 hover:border-gray-300 hover:bg-white dark:border-white/8 dark:bg-white/[0.03] dark:hover:border-white/16 dark:hover:bg-white/[0.05]">
                <div className="text-xl font-bold text-gray-950 transition-colors duration-300 group-hover:text-[#2f5bff] dark:text-white dark:group-hover:text-[#8fa7ff]">{stat.value}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-normal text-gray-500 dark:text-[#aaa69d]">{stat.label}</div>
              </div>
            ))}
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#2f5bff]/18 bg-[#2f5bff]/4 px-6 py-20 text-center dark:border-white/12 dark:bg-white/[0.02]">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[#2f5bff]/10 ring-1 ring-[#2f5bff]/15">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2f5bff] text-white shadow-lg shadow-[#2f5bff]/20">
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-950 dark:text-white">Start building something amazing</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">
                Create your first project and turn your idea into a beautiful website in minutes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setShowNewProject(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] dark:bg-[#f5f2ea] dark:text-[#171816]"
                >
                  <Sparkles className="h-4 w-4" />
                  Create your first project
                </button>
                <button
                  onClick={() => navigate('/templates')}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/[0.05]"
                >
                  Browse templates
                </button>
              </div>
            </div>
          ) : visibleProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-gray-200 bg-gray-50 px-6 py-20 text-center dark:border-white/8 dark:bg-white/[0.02]">
              <Search className="mb-4 h-8 w-8 text-gray-400 dark:text-[#aaa69d]" />
              <h2 className="text-lg font-bold text-gray-950 dark:text-white">No matching projects</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-[#aaa69d]">Try a different search term.</p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleProjects.map((project) => (
                <article
                  key={project.id}
                  className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_14px_38px_rgba(15,23,42,0.14)] dark:border-white/8 dark:bg-[#1d1e22] dark:hover:border-white/18 dark:hover:shadow-[0_14px_38px_rgba(0,0,0,0.38)]"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/builder/${project.id}`)}
                    className="relative block aspect-[16/9] w-full overflow-hidden bg-[#f5f2ea] text-left"
                  >
                    {project.files.length > 0 ? (
                      <iframe
                        srcDoc={generatePreview(project.files)}
                        className="h-full w-full bg-white"
                        sandbox="allow-scripts"
                        style={{ pointerEvents: 'none' }}
                        title={project.name}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#1a1a18] dark:to-[#2a2a28]">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#6387ff]/20 text-[#6387ff]">
                          <Wand2 className="h-7 w-7" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-white/60">Ready for your first prompt</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#171816]/0 opacity-0 backdrop-blur-md transition-all group-hover:bg-[#171816]/80 group-hover:opacity-100">
                      <span className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#171816]">Open Builder</span>
                    </div>
                  </button>

                  <div className="p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-gray-950 dark:text-white">{project.name}</h3>
                        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-gray-600 dark:text-[#aaa69d]">
                          {project.description || 'No description yet.'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-500 dark:text-[#aaa69d]">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(project.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Grid3X3 className="h-3.5 w-3.5" />
                          {project.files.length} files
                        </span>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        project.status === 'published' 
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      }`}>
                        {project.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/builder/${project.id}`)}
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#6387ff] text-sm font-semibold text-white transition-all hover:bg-[#7a9aff]"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/builder/${project.id}`)}
                        aria-label={`Preview ${project.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-950 dark:border-white/10 dark:text-[#aaa69d] dark:hover:bg-white/[0.08] dark:hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportProject(project)}
                        disabled={project.files.length === 0}
                        aria-label={`Export ${project.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-[#aaa69d] dark:hover:bg-white/[0.08] dark:hover:text-white"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(project)}
                        aria-label={`Delete ${project.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-all hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-600 dark:border-white/10 dark:text-[#aaa69d] dark:hover:text-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <NewProjectModal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={handleCreateProject}
      />
      <SiteConfirmDialog
        open={Boolean(projectToDelete)}
        title="Delete project?"
        description={
          projectToDelete
            ? `Delete "${projectToDelete.name}"? This cannot be undone.`
            : 'This project will be permanently deleted.'
        }
        confirmLabel="Delete"
        destructive
        onOpenChange={(open) => {
          if (!open) setProjectToDelete(null);
        }}
        onConfirm={() => {
          if (!projectToDelete) return;
          onDeleteProject(projectToDelete.id);
          setProjectToDelete(null);
        }}
      />
    </div>
  );
}
