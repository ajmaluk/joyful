import { memo, useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { projectList, type ProjectMeta, loadProjectList, updateProjectMeta, removeProjectMeta } from '~/lib/persistence/project-metadata';

interface ProjectsDashboardProps {
  onSelectTemplate: (prompt: string) => void;
  onRunTemplate: (prompt: string) => void;
}

interface ProjectWithThumbnail extends ProjectMeta {
  thumbnail?: string;
}

const TEMPLATES = [
  {
    id: 'temp-sketchbook',
    title: 'The Sketchbook Hallway',
    description: 'A collaborative canvas, brush engine, and sketching tools in a beautiful layout.',
    prompt: 'Create a collaborative sketchbook canvas app with rich brush engine, undo/redo history, colors palette, custom brush sizes, and ability to save drawings.',
    badge: 'Canvas App',
    gradient: 'from-orange-400 to-pink-600',
    icon: 'i-ph:paint-brush-broad',
  },
  {
    id: 'temp-agent-chat',
    title: 'Agent Chat Companion',
    description: 'Interactive AI companion with customizable agent personalities and speech feedback.',
    prompt: 'Build a premium AI Chat Companion web app with voice synthesis responses, customizable agent personas (developer, designer, philosopher), chat history, and dark mode.',
    badge: 'Website',
    gradient: 'from-yellow-400 to-orange-600',
    icon: 'i-ph:chats',
  },
  {
    id: 'temp-slidepix',
    title: 'SlidePix: AI Presentation Studio',
    description: 'Dynamic presentation editor with template selection, slide builder, and animations.',
    prompt: 'Design a web-based presentation builder like Pitch or Gamma with pre-designed slides templates, drag and drop editor, presentation mode, and exporting to PDF.',
    badge: 'Published',
    gradient: 'from-blue-400 to-indigo-600',
    icon: 'i-ph:slideshow',
  },
  {
    id: 'temp-assetwise',
    title: 'Remix of AssetWise',
    description: 'Sleek asset tracking dashboard, portfolios tracker, and interactive financial charts.',
    prompt: 'Create a beautiful financial assets and crypto portfolio tracker dashboard with interactive line charts, transaction history, asset allocation donut chart, and price alerts.',
    badge: 'Dashboard',
    gradient: 'from-violet-400 to-purple-600',
    icon: 'i-ph:chart-pie',
  },
];

export const ProjectsDashboard = memo(({ onSelectTemplate, onRunTemplate }: ProjectsDashboardProps) => {
  const projectsFromStore = useStore(projectList);
  const [projects, setProjects] = useState<ProjectWithThumbnail[]>([]);
  const [activeTab, setActiveTab] = useState<'my-projects' | 'recent' | 'templates'>('my-projects');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleRename = (id: string, currentName?: string) => {
    const newName = prompt('Enter new project name:', currentName || '');
    if (newName && newName.trim()) {
      updateProjectMeta(id, { description: newName.trim() });
      const list = loadProjectList();
      setProjects(list);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      removeProjectMeta(id);
      
      try {
        const { openDatabase, deleteById } = await import('~/lib/persistence/db');
        const dbInstance = await openDatabase();
        if (dbInstance) {
          await deleteById(dbInstance, id);
        }
      } catch (err) {
        console.error('Failed to delete from database:', err);
      }
      
      const list = loadProjectList();
      setProjects(list);
    }
  };

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const list = loadProjectList();
    setProjects(list);

    import('~/lib/persistence')
      .then(async ({ getThumbnail, db: dbInstance }) => {
        if (!dbInstance) return;

        const results = await Promise.allSettled(
          list.map(async (meta) => {
            const thumbnail = await getThumbnail(dbInstance, meta.id);
            return { id: meta.id, thumbnail };
          }),
        );

        const thumbnails = new Map<string, string | undefined>();

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.thumbnail) {
            thumbnails.set(result.value.id, result.value.thumbnail);
          }
        }

        if (thumbnails.size > 0) {
          setProjects((prev) =>
            prev.map((p) => ({
              ...p,
              thumbnail: thumbnails.get(p.id) || undefined,
            })),
          );
        }
      })
      .catch(() => {
        // silently degrade
      });
  }, []);

  useEffect(() => {
    if (projectsFromStore.length > 0 || projects.length === 0) {
      setProjects((prev) => {
        const thumbnailMap = new Map(prev.filter((p) => p.thumbnail).map((p) => [p.id, p.thumbnail]));
        return projectsFromStore.map((p) => ({
          ...p,
          thumbnail: thumbnailMap.get(p.id) || undefined,
        }));
      });
    }
  }, [projectsFromStore]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getGradient = (name: string) => {
    const gradients = [
      'from-blue-400 to-indigo-600',
      'from-purple-400 to-pink-600',
      'from-green-400 to-teal-600',
      'from-orange-400 to-red-600',
      'from-cyan-400 to-blue-600',
      'from-pink-400 to-rose-600',
      'from-violet-400 to-purple-600',
      'from-yellow-400 to-orange-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  // Filter projects by active tab
  const getFilteredItems = () => {
    if (activeTab === 'templates') {
      return []; // templates are shown separately
    }
    // For 'my-projects' or 'recent', return projects from localStorage
    // Recent is just sorted by timestamp descending
    if (activeTab === 'recent') {
      return [...projects].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6);
    }
    return projects;
  };

  const filteredProjects = getFilteredItems();

  return (
    <section id="projects-dashboard" className="hidden md:block w-full max-w-[98%] mx-auto mb-0 mt-24 md:mt-32">
      <div className="rounded-t-[2.5rem] rounded-b-none p-6 md:p-8 pb-8 shadow-2xl bg-[#0a0a0c] border-x border-t border-white/5">
        {/* Header Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center space-x-1 bg-black/35 p-1 rounded-2xl border border-white/5 w-full sm:w-auto animate-fade-in">
            <button
              onClick={() => setActiveTab('my-projects')}
              className={classNames(
                'flex-1 sm:flex-none px-4 md:px-5 py-2 text-xs md:text-sm font-medium rounded-xl transition-all duration-200',
                activeTab === 'my-projects' ? 'bg-white/10 text-white shadow-sm' : 'bg-transparent text-gray-400 hover:text-gray-200'
              )}
            >
              My projects
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={classNames(
                'flex-1 sm:flex-none px-4 md:px-5 py-2 text-xs md:text-sm font-medium rounded-xl transition-all duration-200',
                activeTab === 'recent' ? 'bg-white/10 text-white shadow-sm' : 'bg-transparent text-gray-400 hover:text-gray-200'
              )}
            >
              Recently viewed
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={classNames(
                'flex-1 sm:flex-none px-4 md:px-5 py-2 text-xs md:text-sm font-medium rounded-xl transition-all duration-200',
                activeTab === 'templates' ? 'bg-white/10 text-white shadow-sm' : 'bg-transparent text-gray-400 hover:text-gray-200'
              )}
            >
              Lovable templates
            </button>
          </div>
          {activeTab !== 'templates' && filteredProjects.length > 0 && (
            <a
              href="#view-all"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('my-projects');
              }}
              className="text-xs md:text-sm font-medium text-gray-400 hover:text-white flex items-center group transition-colors ml-auto sm:ml-0"
            >
              Browse all <div className="i-ph:arrow-right ml-2 group-hover:translate-x-1 transition-transform" />
            </a>
          )}
        </div>

        {/* Scrollable Container with fixed height representing one-and-a-half rows */}
        <div className="h-[380px] md:h-[410px] overflow-y-auto pr-2 premium-scrollbar">
          {/* Templates view */}
          {activeTab === 'templates' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-2">
              {TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => onSelectTemplate(tpl.prompt)}
                  className="group cursor-pointer flex flex-col justify-between h-full rounded-2xl border border-white/5 bg-zinc-900/40 p-5 hover:border-white/25 hover:bg-zinc-800/40 transition-all duration-300 relative overflow-hidden shadow-md"
                >
                  {/* Visual Header */}
                  <div>
                    <div className={classNames('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4', tpl.gradient)}>
                      <div className={classNames('text-white text-xl', tpl.icon)} />
                    </div>
                    <h3 className="font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors text-base">
                      {tpl.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed mb-6">
                      {tpl.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                      {tpl.badge}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRunTemplate(tpl.prompt);
                      }}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white text-zinc-400 hover:text-black flex items-center justify-center transition-all duration-200"
                      title="Generate with template"
                    >
                      <div className="i-ph:arrow-up-right text-base" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Projects grid */
            <>
              {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="i-ph:folder-dashed text-4xl mb-4 text-zinc-600" />
                  <h3 className="text-white font-medium mb-1">No projects found</h3>
                  <p className="text-sm text-zinc-500 max-w-xs">
                    {activeTab === 'recent'
                      ? 'No recently viewed projects. Start building to see them here.'
                      : 'Get started by typing a prompt to build your first project.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-2">
                  {filteredProjects.map((project) => (
                    <div key={project.id} className="group cursor-pointer flex flex-col relative">
                      <div className="relative mb-4 aspect-video flex-shrink-0">
                        <a
                          href={`/chat/${project.urlId || project.id}`}
                          className="block w-full h-full rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 group-hover:border-white/15 transition-all duration-300 shadow-md"
                        >
                          {project.thumbnail ? (
                            <img
                              src={project.thumbnail}
                              alt={project.description || 'Preview'}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className={classNames(
                                'w-full h-full flex items-center justify-center bg-gradient-to-br transition-all duration-300 group-hover:opacity-90',
                                getGradient(project.description || project.id)
                              )}
                            >
                              <span className="text-white text-3xl font-semibold opacity-70">
                                {getInitials(project.description || 'P')}
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all duration-300" />
                        </a>

                        {/* Three-dot dropdown options menu overlayed at the top-right of the preview card */}
                        <div className="absolute top-2 right-2 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setActiveMenuId(activeMenuId === project.id ? null : project.id);
                            }}
                            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-zinc-300 hover:text-white transition-all border border-white/5 shadow-md flex items-center justify-center"
                            title="Project options"
                          >
                            <div className="i-ph:dots-three-vertical text-base font-bold" />
                          </button>
                          {activeMenuId === project.id && (
                            <div className="absolute right-0 mt-1 w-32 bg-[#1c1c1a] border border-white/5 rounded-xl py-1.5 shadow-xl z-50">
                              <a
                                href={`/chat/${project.urlId || project.id}`}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <div className="i-ph:arrow-square-out text-sm" /> Open
                              </a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleRename(project.id, project.description);
                                  setActiveMenuId(null);
                                }}
                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white bg-transparent border-none transition-colors"
                              >
                                <div className="i-ph:pencil text-sm" /> Rename
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleDelete(project.id);
                                  setActiveMenuId(null);
                                }}
                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 bg-transparent border-none transition-colors"
                              >
                                <div className="i-ph:trash text-sm" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start justify-between">
                        <a href={`/chat/${project.urlId || project.id}`} className="flex items-start space-x-3 flex-1 min-w-0">
                          <div
                            className={classNames(
                              'w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold border border-white/20 text-white bg-gradient-to-tr',
                              getGradient(project.description || project.id)
                            )}
                          >
                            {getInitials(project.description || 'P')}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-white mb-1 group-hover:underline truncate text-sm md:text-base">
                              {project.description || 'Untitled Project'}
                            </h3>
                            <p className="text-[11px] md:text-xs text-zinc-500">{formatTime(project.timestamp)}</p>
                          </div>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
});

ProjectsDashboard.displayName = 'ProjectsDashboard';
