import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Download,
  Eye,
  Grid3X3,
  Mic,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { NewProjectModal } from '@/components/modals/NewProjectModal';
import { exportProjectAsZip, generatePreview } from '@/services/fileSystem';
import type { Project } from '@/types';

interface DashboardPageProps {
  projects: Project[];
  onCreateProject: (name: string, description: string) => Project;
  onDeleteProject: (id: string) => void;
}

const tabs = ['My projects', 'Recently viewed', 'Templates'] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

export function DashboardPage({ projects, onCreateProject, onDeleteProject }: DashboardPageProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('My projects');

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

  const handleDeleteProject = (project: Project) => {
    if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      onDeleteProject(project.id);
    }
  };

  const handleExportProject = async (project: Project) => {
    if (project.files.length === 0) return;
    await exportProjectAsZip(project);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0f100f] text-[#f6f2ea]">
      <section className="relative isolate overflow-hidden px-4 py-12 sm:px-6 sm:py-14 lg:px-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#171816_0%,#253f6d_28%,#6e89ff_48%,#ef83df_66%,#f23c78_84%,#ff713a_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(15,16,15,0.86)_0%,rgba(15,16,15,0.12)_48%,rgba(15,16,15,0)_100%)]" />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-center py-8 text-center sm:min-h-[48vh]">
          <button
            type="button"
            onClick={() => navigate('/docs')}
            className="mb-7 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-[#17181a]/80 p-1 pr-4 text-sm font-semibold text-white shadow-xl backdrop-blur transition-colors hover:border-white/20"
          >
            <span className="rounded-full bg-[#2f5bff] px-3 py-1 text-xs">New</span>
            <span className="truncate">Workspace skills - create your first skill</span>
            <ArrowRight className="h-4 w-4 flex-none" />
          </button>

          <h1 className="text-balance text-4xl font-bold tracking-normal text-white sm:text-5xl">
            What do you want to build?
          </h1>
          <p className="mt-2 text-lg text-white/60">Describe your idea and watch it come to life</p>

          <div className="mt-9 w-full max-w-4xl rounded-[1.45rem] border border-black/50 bg-[#20211e] p-3 text-left shadow-[0_28px_90px_rgba(0,0,0,0.36)] ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => setShowNewProject(true)}
              className="block min-h-24 w-full px-3 pt-3 text-left text-lg font-medium text-[#d8d3ca] outline-none transition-colors hover:text-white"
            >
              Ask Joyful to create a prototype...
            </button>
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNewProject(true)}
                aria-label="Create project"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-[#d8d3ca] transition-colors hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewProject(true)}
                  className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-[#d8d3ca] transition-colors hover:bg-white/5 hover:text-white sm:flex"
                >
                  Build <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Voice prompt"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#d8d3ca] transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewProject(true)}
                  aria-label="Start building"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f2ea] text-[#171816] transition-transform hover:scale-105"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 bg-[#0f100f] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-lg border border-white/10 bg-[#17120f] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.36)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1">
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
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-[#aaa69d] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa69d]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="h-10 w-full rounded-md border border-white/10 bg-white/[0.03] pl-9 pr-4 text-sm font-medium text-white outline-none transition-colors placeholder:text-[#6f6b64] hover:border-white/18 focus:border-[#6387ff] sm:w-72"
                />
              </div>
              <button
                onClick={() => setShowNewProject(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#f5f2ea] px-4 text-sm font-bold text-[#171816] transition-transform hover:scale-[1.01]"
              >
                <Plus className="h-4 w-4" />
                New project
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Projects', value: projects.length },
              { label: 'Files', value: totalFiles },
              { label: 'Drafts', value: projects.filter((project) => project.status === 'draft').length },
            ].map((stat) => (
              <div key={stat.label} className="group rounded-lg border border-white/8 bg-white/[0.03] p-4 transition-all duration-300 hover:border-white/16 hover:bg-white/[0.05]">
                <div className="text-2xl font-bold text-white transition-colors duration-300 group-hover:text-[#8fa7ff]">{stat.value}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-normal text-[#aaa69d]">{stat.label}</div>
              </div>
            ))}
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-20 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6387ff]/20 to-[#f23c78]/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6387ff]/20 text-[#6387ff]">
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white">Start building something amazing</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-[#aaa69d]">
                Create your first project and turn your idea into a beautiful website in minutes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setShowNewProject(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f5f2ea] px-6 py-3 text-sm font-bold text-[#171816] transition-transform hover:scale-[1.02]"
                >
                  <Sparkles className="h-4 w-4" />
                  Create your first project
                </button>
                <button
                  onClick={() => navigate('/templates')}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.05]"
                >
                  Browse templates
                </button>
              </div>
            </div>
          ) : visibleProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-white/8 bg-white/[0.02] px-6 py-20 text-center">
              <Search className="mb-4 h-8 w-8 text-[#aaa69d]" />
              <h2 className="text-lg font-bold text-white">No matching projects</h2>
              <p className="mt-2 text-sm text-[#aaa69d]">Try a different search term.</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleProjects.map((project) => (
                <article
                  key={project.id}
                  className="group relative overflow-hidden rounded-xl border border-white/8 bg-[#211f1b] transition-all duration-300 hover:-translate-y-1 hover:border-white/18 hover:shadow-[0_16px_50px_rgba(0,0,0,0.4)]"
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
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#1a1a18] to-[#2a2a28]">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#6387ff]/20 text-[#6387ff]">
                          <Wand2 className="h-7 w-7" />
                        </div>
                        <span className="text-sm font-medium text-white/60">Ready for your first prompt</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#171816]/0 opacity-0 backdrop-blur-md transition-all group-hover:bg-[#171816]/80 group-hover:opacity-100">
                      <span className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#171816]">Open Builder</span>
                    </div>
                  </button>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-white">{project.name}</h3>
                        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-[#aaa69d]">
                          {project.description || 'No description yet.'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#aaa69d]">
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
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-[#aaa69d] transition-all hover:bg-white/[0.08] hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportProject(project)}
                        disabled={project.files.length === 0}
                        aria-label={`Export ${project.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-[#aaa69d] transition-all hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(project)}
                        aria-label={`Delete ${project.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-[#aaa69d] transition-all hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
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
    </div>
  );
}
