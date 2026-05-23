import { Helmet } from 'react-helmet-async';
import { useCallback, useMemo, useRef, useState, useEffect, type ChangeEvent, type KeyboardEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { routeMeta } from '@/lib/seo';
import {
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Clock,
  Download,
  Eye,
  Grid3X3,
  ImagePlus,
  ListChecks,
  Loader2,
  Mic,
  Pause,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { NewProjectModal } from '@/components/modals/NewProjectModal';
import { SiteConfirmDialog } from '@/components/ui/site-dialogs';
import { exportProjectAsZip, generatePreview } from '@/services/fileSystem';
import type { ChatAttachment, ChatMode, Project, ProjectFile } from '@/types';
import { mergeVoiceTranscript, useVoiceInput } from '@/hooks/useVoiceInput';
import { useClickOutside } from '@/hooks/useClickOutside';
import { readImageAttachment } from '@/services/attachments';

interface DashboardPageProps {
  projects: Project[];
  onCreateProject: (name: string, description: string) => Project;
  onDeleteProject: (id: string) => void;
  onStartProject?: (prompt: string, mode?: ChatMode, attachments?: ChatAttachment[]) => void;
}

const tabs = ['My projects', 'Recently viewed', 'Templates'] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

export function DashboardPage({ projects, onCreateProject, onDeleteProject, onStartProject }: DashboardPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const meta = routeMeta[location.pathname] || routeMeta['/'];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [prompt, setPrompt] = useState('');
  const [promptAttachment, setPromptAttachment] = useState<ChatAttachment | null>(null);
  const [promptAttachmentError, setPromptAttachmentError] = useState('');
  const [promptMode, setPromptMode] = useState<ChatMode>('build');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('My projects');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);

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

  const handleCreateProject = (name: string, description: string) => {
    const project = onCreateProject(name, description);
    navigate(`/builder/${project.id}`);
  };

  const handlePromptInput = useCallback(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, []);

  const handlePromptVoiceTranscript = useCallback((transcript: string) => {
    setPrompt(prev => mergeVoiceTranscript(prev, transcript));
    requestAnimationFrame(() => handlePromptInput());
  }, [handlePromptInput]);

  const {
    isSupported: isVoiceSupported,
    isRecording,
    isProcessing,
    toggleRecording,
  } = useVoiceInput({
    onTranscript: handlePromptVoiceTranscript,
  });

  useClickOutside(modeMenuRef, () => setModeMenuOpen(false), modeMenuOpen);

  const handlePromptSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed && !promptAttachment) {
      textareaRef.current?.focus();
      return;
    }
    const request = trimmed || 'Use the attached image as a visual reference and build the website from it.';
    const attachments = promptAttachment ? [promptAttachment] : [];
    if (onStartProject) {
      onStartProject(request, promptMode, attachments);
      return;
    }
    const project = onCreateProject(request.slice(0, 54), request);
    navigate(`/builder/${project.id}`, { state: { initialPrompt: request, initialMode: promptMode, initialAttachments: attachments } });
  };

  const handlePromptImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setPromptAttachment(await readImageAttachment(file));
      setPromptAttachmentError('');
    } catch (error) {
      setPromptAttachment(null);
      setPromptAttachmentError(error instanceof Error ? error.message : 'Could not attach that image.');
    } finally {
      event.target.value = '';
    }
  };

  const canSubmitPrompt = prompt.trim().length > 0 || Boolean(promptAttachment);
  const promptButtonLabel = canSubmitPrompt
    ? promptMode === 'plan'
      ? 'Create implementation plan'
      : 'Start building'
    : "Can't submit an empty request";
  const voiceButtonLabel = isProcessing
    ? 'Processing voice input'
    : isRecording
      ? 'Pause recording'
      : isVoiceSupported
        ? 'Start voice input'
        : 'Voice input is not supported in this browser';

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
    try {
      await exportProjectAsZip(project);
    } catch {
      // Export failed silently - user can retry
    }
  };

  return (
    <>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={meta.canonical} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:url" content={meta.canonical} />
        <meta property="og:description" content={meta.description} />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
      </Helmet>
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
              name="build-prompt"
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
                onClick={() => imageInputRef.current?.click()}
                aria-label="Attach image"
                title="Attach one image"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-950 dark:bg-white/5 dark:text-[#d8d3ca] dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handlePromptImageChange} />
              {promptAttachment && (
                <div className="flex min-w-0 max-w-[190px] items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-[#d8d3ca]">
                  <img src={promptAttachment.dataUrl} alt="" className="h-5 w-5 rounded object-cover" />
                  <span className="truncate">{promptAttachment.name}</span>
                  <button type="button" onClick={() => setPromptAttachment(null)} aria-label="Remove image" className="hover:text-gray-950 dark:hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {promptAttachmentError && <span className="text-[10px] font-medium text-red-500">{promptAttachmentError}</span>}
              <div className="flex items-center gap-2">
                <div ref={modeMenuRef} className="relative">
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
                  onClick={() => {
                    if (isProcessing) return;
                    toggleRecording();
                  }}
                  disabled={(!isVoiceSupported && !isRecording && !isProcessing) || isProcessing}
                  aria-label={voiceButtonLabel}
                  title={voiceButtonLabel}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    isRecording
                      ? 'bg-red-500 text-white hover:bg-red-500/90'
                      : isProcessing
                        ? 'bg-secondary text-secondary-foreground'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-950 dark:text-[#d8d3ca] dark:hover:bg-white/5 dark:hover:text-white'
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isRecording ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePromptSubmit}
                  disabled={!canSubmitPrompt}
                  aria-label={promptButtonLabel}
                  title={promptButtonLabel}
                  className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-transform ${
                    canSubmitPrompt
                      ? 'bg-[#2f5bff] text-white shadow-[#2f5bff]/25 hover:scale-105'
                      : 'bg-gray-200 text-gray-500 shadow-none hover:scale-100 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white/10 dark:text-[#aaa69d]'
                  }`}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 bg-[#f6f7fb] px-4 py-5 sm:px-6 lg:px-10 dark:bg-[#18191d]">
        <div className="mx-auto w-full max-w-7xl rounded-[2rem] border border-gray-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5 dark:border-white/10 dark:bg-[#18191d] dark:shadow-[0_24px_70px_rgba(0,0,0,0.36)]">
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

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => setShowNewProject(true)}
                  className="order-first inline-flex h-10 items-center justify-center gap-2 rounded-md bg-gray-950 px-4 text-sm font-bold text-white transition-transform hover:scale-[1.01] dark:bg-[#f5f2ea] dark:text-[#171816]"
                >
                  <Plus className="h-4 w-4" />
                  New project
                </button>
                <div className="relative sm:ml-auto">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#aaa69d]" />
                  <input
                    name="project-search"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search projects..."
                    className="h-10 w-full rounded-md border border-gray-200 bg-white pl-9 pr-4 text-sm font-medium text-gray-950 outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/20 sm:w-72 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18"
                  />
                </div>
              </div>
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
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleProjects.map((project) => (
                <article
                  key={project.id}
                  className="group relative overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_14px_38px_rgba(15,23,42,0.14)] dark:border-white/8 dark:bg-[#1d1e22] dark:hover:border-white/18 dark:hover:shadow-[0_14px_38px_rgba(0,0,0,0.38)]"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/builder/${project.id}`)}
                    className="relative block aspect-[16/9] w-full overflow-hidden bg-[#f5f2ea] text-left"
                  >
                    {project.files.length > 0 ? (
                      <PreviewThumbnail files={project.files} name={project.name} />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#1a1a18] dark:to-[#2a2a28]">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#6387ff]/20 text-[#6387ff]">
                          <Wand2 className="h-7 w-7" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-white/60">Ready for your first prompt</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#171816]/0 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:bg-[#171816]/72 group-hover:opacity-100">
                      <span className="rounded-full border border-white/20 bg-white/95 px-4 py-2.5 text-sm font-bold text-[#171816] shadow-lg shadow-black/10 transition-transform duration-300 group-hover:scale-[1.02]">
                        Open Builder
                      </span>
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
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#6387ff] text-sm font-semibold text-white shadow-sm shadow-[#6387ff]/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#7a9aff] hover:shadow-md hover:shadow-[#6387ff]/25 active:translate-y-0"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/builder/${project.id}`)}
                        aria-label={`Preview ${project.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6387ff]/30 hover:bg-[#6387ff]/8 hover:text-[#6387ff] active:translate-y-0 dark:border-white/10 dark:bg-white/[0.02] dark:text-[#aaa69d] dark:hover:bg-white/[0.08] dark:hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportProject(project)}
                        disabled={project.files.length === 0}
                        aria-label={`Export ${project.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6387ff]/30 hover:bg-[#6387ff]/8 hover:text-[#6387ff] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.02] dark:text-[#aaa69d] dark:hover:bg-white/[0.08] dark:hover:text-white"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(project)}
                        aria-label={`Delete ${project.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-600 active:translate-y-0 dark:border-white/10 dark:bg-white/[0.02] dark:text-[#aaa69d] dark:hover:text-red-200"
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
    </>
  );
}

function PreviewThumbnail({ files, name }: { files: ProjectFile[]; name: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (files.length === 0) return;
    let cancelled = false;
    (async () => {
      const html = await generatePreview(files);
      if (cancelled) return;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      if (iframeRef.current) {
        iframeRef.current.src = url;
      }
    })();
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [files]);

  if (files.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#1a1a18] dark:to-[#2a2a28]">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#6387ff]/20 text-[#6387ff]">
          <Wand2 className="h-7 w-7" />
        </div>
        <span className="text-sm font-medium text-gray-500 dark:text-white/60">Ready for your first prompt</span>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className="h-full w-full bg-white"
      sandbox="allow-scripts"
      style={{ pointerEvents: 'none' }}
      title={name}
    />
  );
}
