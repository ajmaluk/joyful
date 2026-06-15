import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { mobileSidebarOpen, closeMobileSidebar } from '~/lib/stores/sidebar';
import { projectList, type ProjectMeta, loadProjectList, updateProjectMeta, removeProjectMeta } from '~/lib/persistence/project-metadata';

interface IconSidebarProps {
  className?: string;
}

interface ProjectWithThumbnail extends ProjectMeta {
  thumbnail?: string;
}

export const IconSidebar = memo(({ className }: IconSidebarProps) => {
  const isOpen = useStore(mobileSidebarOpen);
  const projectsFromStore = useStore(projectList);
  const [projects, setProjects] = useState<ProjectWithThumbnail[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const loadedRef = useRef(false);



  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
      setShowProfileMenu(false);
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

  // Load projects from localStorage on mount + load thumbnails from IndexedDB
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const list = loadProjectList();
    setProjects(list);

    // Dynamic import to avoid SSR crash from indexedDB module-level call
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
        // silently degrade — thumbnails just won't load
      });
  }, []);

  // Update when the store changes (new projects saved)
  useEffect(() => {
    if (projectsFromStore.length > 0 || projects.length === 0) {
      setProjects((prev) => {
        // Merge store data with existing thumbnails
        const thumbnailMap = new Map(prev.filter((p) => p.thumbnail).map((p) => [p.id, p.thumbnail]));
        return projectsFromStore.map((p) => ({
          ...p,
          thumbnail: thumbnailMap.get(p.id) || undefined,
        }));
      });
    }
  }, [projectsFromStore]);

  // Format relative time
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

  // Get initials from project description
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Generate a consistent gradient based on project name
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

  const handleBackdropClick = useCallback(() => {
    closeMobileSidebar();
  }, []);

  const handleNavClick = useCallback(() => {
    closeMobileSidebar();
  }, []);



  return (
    <>
      {/* Backdrop overlay - mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden"
          onClick={handleBackdropClick}
        />
      )}

      {/* Desktop Sidebar (Dual state: Closed = w-12, Open = w-64) */}
      <aside
        onClick={() => {
          if (!isDrawerOpen) {
            setIsDrawerOpen(true);
          }
        }}
        className={classNames(
          'hidden md:flex flex-col pt-6 pb-4 z-50 bg-[#0a0a0c] flex-shrink-0 transition-all duration-300 select-none border-r border-white/5',
          isDrawerOpen ? 'w-64 px-4' : 'w-12 items-center px-0 gap-4 cursor-pointer',
          className,
        )}
      >
        {!isDrawerOpen ? (
          /* CLOSED STATE (w-12) */
          <>
            <a 
              href="/" 
              onClick={(e) => e.stopPropagation()}
              className="hover:scale-105 transition-transform flex items-center justify-center mt-2"
            >
              <img src="/logo.png" alt="Joyful" className="w-5 h-5 object-contain" />
            </a>

            <div className="w-8 h-px bg-white/10 my-2" />

            {/* Navigation Icons */}
            <nav className="flex flex-col gap-4 text-gray-400">
              <a
                href="/"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const hero = document.getElementById('hero');
                  if (hero) {
                    hero.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 text-white bg-white/10 hover:bg-white/15"
                title="Home"
              >
                <div className="i-ph:house text-base" />
              </a>
              <a
                href="#projects"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsDrawerOpen(true);
                }}
                className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 hover:text-white hover:bg-white/5 text-zinc-400"
                title="Projects"
              >
                <div className="i-ph:folder text-base" />
              </a>
            </nav>

            <div className="flex-1" />

            {/* Bottom Section: Profile Avatar and Mail Inbox with red badge */}
            <div className="flex flex-col items-center gap-4 text-gray-400">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileMenu(!showProfileMenu);
                  }}
                  className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-semibold border border-white/10 text-white hover:scale-105 transition-transform cursor-pointer"
                >
                  U
                </button>

                {showProfileMenu && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-10 bottom-0 w-60 bg-[#0a0a0c] border border-white/5 rounded-2xl py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[999] flex flex-col"
                  >
                    {/* User card header */}
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                        U
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate">Uthakkan</div>
                        <div className="text-[9px] text-zinc-500 truncate">root.uthakkan@gmail.com</div>
                      </div>
                    </div>

                    {/* Profile actions list */}
                    <div className="flex flex-col">
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:user text-sm" /> Profile
                        </span>
                      </button>
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:gear text-sm" /> Settings
                        </span>
                        <span className="text-[9px] text-zinc-600 font-mono">⌘ ,</span>
                      </button>
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:palette text-sm" /> Appearance
                        </span>
                        <div className="i-ph:caret-right text-[10px] text-zinc-600" />
                      </button>
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:question text-sm" /> Support
                        </span>
                        <div className="i-ph:caret-right text-[10px] text-zinc-600" />
                      </button>
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:book-open text-sm" /> Documentation
                        </span>
                        <div className="i-ph:caret-right text-[10px] text-zinc-600" />
                      </button>
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:users text-sm" /> Community
                        </span>
                      </button>
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:house text-sm" /> Home
                        </span>
                      </button>
                      
                      <div className="h-px bg-white/5 my-1" />
                      
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:sign-out text-sm" /> Sign out
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <a
                href="#inbox"
                onClick={(e) => e.stopPropagation()}
                className="relative flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:text-white hover:bg-white/5"
                title="Inbox"
              >
                <div className="i-ph:envelope text-base" />
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-[#0a0a0c]" />
              </a>
            </div>
          </>
        ) : (
          /* OPEN STATE (w-64) */
          <>
            {/* Top Header */}
            <div className="flex items-center justify-between mb-6 px-1 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Joyful" className="w-5 h-5 object-contain" />
                <div className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
                  <span className="text-xs font-semibold text-white truncate max-w-[140px]">Uthakkan's Joyful</span>
                  <div className="i-ph:caret-down text-[10px] text-zinc-400" />
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDrawerOpen(false);
                }}
                className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors bg-transparent border-none flex items-center justify-center cursor-pointer"
                title="Close sidebar"
              >
                <div className="i-ph:x text-sm" />
              </button>
            </div>

            {/* Navigation Buttons/Links inside the opened drawer */}
            <div className="flex flex-col gap-1 mb-6">
              <a
                href="/"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const hero = document.getElementById('hero');
                  if (hero) {
                    hero.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white bg-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="i-ph:house text-base" />
                <span>Home</span>
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="flex items-center justify-between w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 bg-transparent border-none cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <div className="i-ph:folder text-base" />
                  <span>Projects</span>
                </span>
              </button>
            </div>

            {/* Recents list */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-1.5">Recents</div>
              <div className="space-y-0.5">
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-[10px] text-zinc-600 italic">No recent projects</div>
                ) : (
                  projects.slice(0, 5).map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between px-3 py-1 rounded-lg hover:bg-white/5 transition-colors group relative"
                    >
                      <a
                        href={`/chat/${project.urlId || project.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-xs font-medium text-zinc-400 hover:text-white truncate py-0.5"
                      >
                        {project.description || 'Untitled Project'}
                      </a>

                      {/* Options Three-dot dropdown */}
                      <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setActiveMenuId(activeMenuId === project.id ? null : project.id);
                          }}
                          className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors bg-transparent border-none flex items-center justify-center cursor-pointer"
                        >
                          <div className="i-ph:dots-three-vertical text-sm" />
                        </button>
                        {activeMenuId === project.id && (
                          <div className="absolute right-0 mt-1 w-32 bg-[#1c1c1a] border border-white/5 rounded-xl py-1.5 shadow-xl z-50">
                            <a
                              href={`/chat/${project.urlId || project.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-[11px] text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                            >
                              <div className="i-ph:arrow-square-out text-xs" /> Open
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleRename(project.id, project.description);
                                setActiveMenuId(null);
                              }}
                              className="flex items-center gap-2 w-full text-left px-3 py-2 text-[11px] text-zinc-300 hover:bg-white/5 hover:text-white bg-transparent border-none transition-colors"
                            >
                              <div className="i-ph:pencil text-xs" /> Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDelete(project.id);
                                setActiveMenuId(null);
                              }}
                              className="flex items-center gap-2 w-full text-left px-3 py-2 text-[11px] text-red-400 hover:bg-red-500/10 bg-transparent border-none transition-colors"
                            >
                              <div className="i-ph:trash text-xs" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Profile and Inbox inside wide sidebar */}
            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-gray-400 relative">
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileMenu(!showProfileMenu);
                  }}
                  className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-semibold border border-white/10 text-white hover:scale-105 transition-transform cursor-pointer"
                >
                  U
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-white truncate max-w-[120px]">Uthakkan</div>
                </div>

                {showProfileMenu && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 bottom-10 w-60 bg-[#0a0a0c] border border-white/5 rounded-2xl py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[999] flex flex-col"
                  >
                    {/* User card header */}
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                        U
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate">Uthakkan</div>
                        <div className="text-[9px] text-zinc-500 truncate">root.uthakkan@gmail.com</div>
                      </div>
                    </div>

                    {/* Profile actions list */}
                    <div className="flex flex-col">
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:user text-sm" /> Profile
                        </span>
                      </button>
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:gear text-sm" /> Settings
                        </span>
                        <span className="text-[9px] text-zinc-600 font-mono">⌘ ,</span>
                      </button>
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:palette text-sm" /> Appearance
                        </span>
                        <div className="i-ph:caret-right text-[10px] text-zinc-600" />
                      </button>
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:question text-sm" /> Support
                        </span>
                        <div className="i-ph:caret-right text-[10px] text-zinc-600" />
                      </button>
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:book-open text-sm" /> Documentation
                        </span>
                        <div className="i-ph:caret-right text-[10px] text-zinc-600" />
                      </button>
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:users text-sm" /> Community
                        </span>
                      </button>
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:house text-sm" /> Home
                        </span>
                      </button>
                      
                      <div className="h-px bg-white/5 my-1" />
                      
                      <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors bg-transparent border-none text-left cursor-pointer">
                        <span className="flex items-center gap-2">
                          <div className="i-ph:sign-out text-sm" /> Sign out
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <a
                href="#inbox"
                onClick={(e) => e.stopPropagation()}
                className="relative flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:text-white hover:bg-white/5"
                title="Inbox"
              >
                <div className="i-ph:envelope text-base" />
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-[#0a0a0c]" />
              </a>
            </div>
          </>
        )}
      </aside>


      {/* Mobile: slide-over sidebar */}
      <aside
        className={classNames(
          'md:hidden fixed top-0 left-0 h-full w-[320px] bg-[#0a0a0c]/95 backdrop-blur-xl z-50 flex-shrink-0 flex flex-col border-r border-white/5 transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Joyful" className="w-5 h-5 object-contain" />
            <span className="font-bold text-lg text-white">Joyful</span>
          </div>
          <button
            onClick={closeMobileSidebar}
            className="p-2 hover:bg-white/5 rounded-full transition-colors bg-transparent border-none flex items-center justify-center cursor-pointer"
          >
            <div className="i-ph:x text-zinc-400 text-xl" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-6">
          <nav className="space-y-1">
            <a
              href="/"
              onClick={(e) => {
                handleNavClick();
                const hero = document.getElementById('hero');
                if (hero) {
                  hero.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors bg-white/5 text-white font-medium"
            >
              <div className="i-ph:house text-[20px]" />
              <span>Home</span>
            </a>
            <button
              onClick={() => {
                handleNavClick();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-zinc-400 hover:bg-white/5 hover:text-white w-full text-left bg-transparent border-none cursor-pointer"
            >
              <div className="i-ph:folder text-[20px]" />
              <span>Projects</span>
            </button>
          </nav>

          {/* Recents Section */}
          <div>
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-1.5">Recents</div>
            <div className="space-y-2">
              {/* Project items from localStorage */}
              {projects.length === 0 && (
                <div className="text-center py-6">
                  <div className="i-ph:folder-dashed text-2xl mx-auto mb-2 text-zinc-600" />
                  <p className="text-xs text-zinc-600">No projects yet</p>
                </div>
              )}

              {projects.map((project) => (
                <a
                  key={project.id}
                  href={`/chat/${project.urlId || project.id}`}
                  onClick={handleNavClick}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  {/* Thumbnail or gradient placeholder */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className={classNames(
                          'w-full h-full flex items-center justify-center bg-gradient-to-br',
                          getGradient(project.description || project.id),
                        )}
                      >
                        <span className="text-white text-[10px] font-medium">
                          {getInitials(project.description || 'P')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate group-hover:underline">
                      {project.description || 'Untitled Project'}
                    </div>
                    <div className="text-xs text-zinc-500">{formatTime(project.timestamp)}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Footer - Profile Avatar and Mail Inbox */}
        <div className="mt-auto p-4 border-t border-white/5 flex items-center justify-between text-gray-400 relative bg-[#0a0a0c]/95">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileMenu(!showProfileMenu);
              }}
              className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-semibold border border-white/10 text-white hover:scale-105 transition-transform cursor-pointer"
            >
              U
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-white truncate max-w-[140px]">Uthakkan</div>
            </div>

            {showProfileMenu && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute left-4 bottom-12 w-60 bg-[#0a0a0c] border border-white/5 rounded-2xl py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[999] flex flex-col"
              >
                {/* User card header */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                    U
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate">Uthakkan</div>
                    <div className="text-[9px] text-zinc-500 truncate">root.uthakkan@gmail.com</div>
                  </div>
                </div>

                {/* Profile actions list */}
                <div className="flex flex-col">
                  <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                    <span className="flex items-center gap-2">
                      <div className="i-ph:user text-sm" /> Profile
                    </span>
                  </button>
                  <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                    <span className="flex items-center gap-2">
                      <div className="i-ph:gear text-sm" /> Settings
                    </span>
                    <span className="text-[9px] text-zinc-600 font-mono">⌘ ,</span>
                  </button>
                  <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                    <span className="flex items-center gap-2">
                      <div className="i-ph:palette text-sm" /> Appearance
                    </span>
                    <div className="i-ph:caret-right text-[10px] text-zinc-600" />
                  </button>
                  <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                    <span className="flex items-center gap-2">
                      <div className="i-ph:question text-sm" /> Support
                    </span>
                    <div className="i-ph:caret-right text-[10px] text-zinc-600" />
                  </button>
                  <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                    <span className="flex items-center gap-2">
                      <div className="i-ph:book-open text-sm" /> Documentation
                    </span>
                    <div className="i-ph:caret-right text-[10px] text-zinc-600" />
                  </button>
                  <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                    <span className="flex items-center gap-2">
                      <div className="i-ph:users text-sm" /> Community
                    </span>
                  </button>
                  <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors bg-transparent border-none text-left cursor-pointer">
                    <span className="flex items-center gap-2">
                      <div className="i-ph:house text-sm" /> Home
                    </span>
                  </button>
                  
                  <div className="h-px bg-white/5 my-1" />
                  
                  <button className="flex items-center justify-between w-full px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors bg-transparent border-none text-left cursor-pointer">
                    <span className="flex items-center gap-2">
                      <div className="i-ph:sign-out text-sm" /> Sign out
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <a
            href="#inbox"
            onClick={(e) => e.stopPropagation()}
            className="relative flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:text-white hover:bg-white/5 bg-transparent border-none cursor-pointer"
            title="Inbox"
          >
            <div className="i-ph:envelope text-base" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-[#0a0a0c]" />
          </a>
        </div>
      </aside>
    </>
  );
});

IconSidebar.displayName = 'IconSidebar';
