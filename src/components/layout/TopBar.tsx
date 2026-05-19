import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Undo2, Redo2, RotateCcw, Monitor, Share2 } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isWorkspace = location.pathname.startsWith('/builder');
  const isLanding = location.pathname === '/';

  if (isLanding) {
    return (
      <header className="fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-center border-b border-gray-200 bg-white/82 px-4 text-gray-900 backdrop-blur-md dark:border-white/8 dark:bg-[#171816]/72 dark:text-[#f6f2ea]">
        <div className="flex w-full max-w-7xl items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 transition-opacity hover:opacity-85"
          >
            <BrandLogo className="h-8 w-8" />
            <span className="text-base font-bold text-gray-950 dark:text-white">joyful</span>
          </button>

          <nav className="hidden items-center gap-6 text-xs font-semibold text-gray-600 md:flex dark:text-white/72">
            <button onClick={() => navigate('/templates')} className="transition-colors hover:text-gray-950 dark:hover:text-white">
              Templates
            </button>
            <button onClick={() => navigate('/docs')} className="transition-colors hover:text-gray-950 dark:hover:text-white">
              Resources
            </button>
            <button onClick={() => navigate('/pricing')} className="transition-colors hover:text-gray-950 dark:hover:text-white">
              Pricing
            </button>
            <button onClick={() => navigate('/dashboard')} className="transition-colors hover:text-gray-950 dark:hover:text-white">
              Dashboard
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="hidden rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-950 sm:block dark:border-white/10 dark:text-white/78 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="rounded-md bg-gray-950 px-3 py-1.5 text-xs font-bold text-white transition-transform hover:scale-105 dark:bg-[#f5f2ea] dark:text-[#171816]"
            >
              Get started
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md">
      {/* Left cluster */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 transition-opacity hover:opacity-85"
        >
          <BrandLogo className="h-8 w-8" />
          <span className="text-base font-semibold text-foreground">joyful</span>
        </button>
        {isWorkspace && (
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <span>My Project</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Center cluster */}
      {isWorkspace && (
        <div className="hidden items-center gap-2 md:flex">
          <button className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground transition-colors hover:border-primary/50">
            <span>Local Lite</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          <div className="mx-1 h-5 w-px bg-border" />
          <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <Undo2 className="w-4 h-4" />
          </button>
          <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <Redo2 className="w-4 h-4" />
          </button>
          <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Right cluster */}
      <div className="flex items-center gap-2">
        {isWorkspace && (
          <>
            <button className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground transition-colors hover:border-primary/50 hover:bg-background">
              <Monitor className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground transition-colors hover:border-primary/50 hover:bg-background">
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </>
        )}

      </div>
    </header>
  );
}
