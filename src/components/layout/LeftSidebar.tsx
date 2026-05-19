import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles, Compass, BookOpen,
  Settings, User, FolderPlus, Layout, Code2, LogOut
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { signOutUser } from '@/services/firebase';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const topNavItems = [
  { icon: Sparkles, label: 'New Project', path: '/builder', action: 'new' as const },
  { icon: Layout, label: 'Builder', path: '/builder' },
  { icon: Compass, label: 'Templates', path: '/templates' },
  { icon: BookOpen, label: 'Docs', path: '/docs' },
];

const bottomNavItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
];

interface LeftSidebarProps {
  onNewProject: () => void;
}

export function LeftSidebar({ onNewProject }: LeftSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const userLabel = user?.displayName || user?.email || 'Profile';

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (item: typeof topNavItems[0]) => {
    if (item.action === 'new') {
      onNewProject();
    } else {
      navigate(item.path);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={`${expanded ? 'w-56' : 'w-16'} hidden h-full min-h-0 flex-shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3 transition-all duration-200 md:flex`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <button
          onClick={() => navigate('/builder')}
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
            const active = isActive(item.path) && !item.action;
            const Icon = item.icon;
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
            );

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
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-full px-4 my-2">
          <div className="h-px bg-sidebar-border" />
        </div>

        {/* Projects section */}
        <div className="flex flex-col gap-0.5 w-full px-2 flex-1">
          {expanded && (
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Projects</span>
              <button
                onClick={onNewProject}
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
                  onClick={() => navigate('/builder')}
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
            <>
              <button
                onClick={() => navigate('/builder')}
                className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Code2 className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs truncate">Open builder</span>
              </button>
            </>
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex flex-col gap-0.5 w-full px-2 mt-auto">
          <button
            onClick={() => navigate('/settings')}
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
            const Icon = item.icon;
            const button = (
              <button
                onClick={() => navigate(item.path)}
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
            );

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
            );
          })}
          <button
            type="button"
            onClick={() => {
              void signOutUser().then(() => navigate('/'));
            }}
            className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sidebar-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {expanded && <span className="truncate text-[13px] font-medium">Sign out</span>}
          </button>
          {/* Free badge */}
          {expanded && (
            <div className="mx-2 mt-2 flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-emerald-300">Free forever</span>
                <span className="text-[10px] text-emerald-400/60">All features included</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
