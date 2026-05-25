'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Sparkles, Compass, BookOpen,
  Settings, User, FolderPlus, Layout, Code2, LogOut
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { signOutUser } from '@/lib/firebase'
import { BrandLogo } from '@/components/joyful/brand-logo'
import type { Project } from '@/lib/types'
import { getProjects, saveProject } from '@/lib/services/storage'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const topNavItems = [
  { icon: Sparkles, label: 'New Project', path: '/builder', action: 'new' as const },
  { icon: Layout, label: 'Builder', path: '/builder' },
  { icon: Compass, label: 'Templates', path: '/templates' },
  { icon: BookOpen, label: 'Docs', path: '/docs' },
]

const bottomNavItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
]

export function LeftSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])

  const userLabel = user?.displayName || user?.email || 'Profile'

  useEffect(() => {
    setProjects(getProjects())
    const onStorage = () => setProjects(getProjects())
    window.addEventListener('storage', onStorage)
    window.addEventListener('joyful_projects_changed', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('joyful_projects_changed', onStorage)
    }
  }, [])

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
    .slice(0, 8)

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const handleNewProject = () => {
    const now = new Date().toISOString()
    const id = (globalThis.crypto && (globalThis.crypto as any).randomUUID ? (globalThis.crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    const project = { id, name: 'Untitled Project', files: [], updatedAt: now }
    try {
      saveProject(project)
    } catch (e) {
      console.warn('Could not save new project locally', e)
    }
    router.push(`/builder/${id}`)
  }

  const handleNavClick = (item: typeof topNavItems[0]) => {
    if (item.action === 'new') {
      handleNewProject()
    } else {
      router.push(item.path)
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={`${expanded ? 'w-56' : 'w-16'} hidden h-full min-h-0 flex-shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3 transition-all duration-200 md:flex`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <button
          onClick={() => router.push('/dashboard')}
          className={`mb-3 flex w-full items-center transition-opacity hover:opacity-85 ${
            expanded ? 'gap-3 px-2.5 text-left' : 'justify-center px-2'
          }`}
        >
          <BrandLogo className="h-6 w-6" />
          {expanded && <span className="truncate text-base font-bold text-foreground">Joyful</span>}
        </button>

        {/* Top nav items */}
        <div className="flex flex-col gap-0.5 w-full px-2">
          {topNavItems.map((item) => {
            const active = isActive(item.path) && !item.action
            const Icon = item.icon
            const button = (
              <button
                onClick={() => handleNavClick(item)}
                className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${
                  active
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {expanded && (
                  <span className="text-[13px] font-medium truncate">{item.label}</span>
                )}
              </button>
            )

            return expanded ? (
              <div key={item.label}>{button}</div>
            ) : (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  {button}
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Divider */}
        <div className="w-full px-4 my-2">
          <div className="h-px bg-sidebar-border" />
        </div>

        {/* Projects section */}
        <div className="flex flex-col gap-0.5 w-full px-2 flex-1 min-h-0">
          {expanded && (
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground">Projects</span>
              <button
                onClick={handleNewProject}
                className="rounded p-0.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {!expanded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/builder')}
                  className={`flex w-full items-center justify-center rounded-md px-2.5 py-2 transition-colors ${
                    isActive('/builder')
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Layout className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Projects</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Quick project links - shown when expanded */}
          {expanded && (
            <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
              <button
                onClick={() => router.push('/builder')}
                className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Code2 className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs truncate">Open builder</span>
              </button>
              {recentProjects.length > 0 ? (
                <div className="mt-1 space-y-0.5">
                  {recentProjects.map((project) => {
                    const active = pathname === `/builder/${project.id}`
                    return (
                      <button
                        key={project.id}
                        onClick={() => router.push(`/builder/${project.id}`)}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                          active
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }`}
                        title={project.name}
                      >
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-[10px] font-bold text-primary">
                          {project.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">{project.name}</span>
                          <span className="block truncate text-[10px] text-sidebar-foreground/70">
                            {project.files?.length || 0} file{(project.files?.length || 0) === 1 ? '' : 's'}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="mx-2.5 mt-2 rounded-md border border-dashed border-sidebar-border p-3 text-xs leading-5 text-sidebar-foreground">
                  No projects yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex flex-col gap-0.5 w-full px-2 mt-auto">
          <button
            onClick={() => router.push('/settings')}
            className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              {user?.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <User className="h-3.5 w-3.5" />}
            </span>
            {expanded && (
              <span className="truncate text-[13px] font-medium">{userLabel}</span>
            )}
          </button>
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const button = (
              <button
                onClick={() => router.push(item.path)}
                className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${
                  isActive(item.path)
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {expanded && (
                  <span className="text-[13px] font-medium truncate">{item.label}</span>
                )}
              </button>
            )

            return expanded ? (
              <div key={item.label}>{button}</div>
            ) : (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  {button}
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
          <button
            type="button"
            onClick={() => {
              void signOutUser().then(() => router.push('/'))
            }}
            className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sidebar-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {expanded && <span className="truncate text-[13px] font-medium">Sign out</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
