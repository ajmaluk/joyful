import type { MetaFunction } from '@remix-run/cloudflare';
import { NavLink, Outlet, useNavigate, useLocation } from '@remix-run/react';
import { useState } from 'react';
import { classNames } from '~/utils/classNames';

export const meta: MetaFunction = () => {
  return [
    { title: 'Settings — Joyful' },
    { name: 'description', content: 'Manage your Joyful account settings' },
  ];
};

const NAV_ITEMS = [
  {
    section: 'Account',
    items: [
      { to: '/settings/profile', icon: 'i-ph:user', label: 'Profile' },
      { to: '/settings/account', icon: 'i-ph:gear', label: 'Account' },
    ],
  },
  {
    section: 'Preferences',
    items: [
      { to: '/settings/appearance', icon: 'i-ph:palette', label: 'Appearance' },
    ],
  },
];

export default function SettingsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGoBack = () => {
    const backPath = sessionStorage.getItem('last_non_settings_path');
    if (backPath && !backPath.startsWith('/settings')) {
      navigate(backPath);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-11 flex items-center justify-between px-4 border-b border-white/10 shrink-0 bg-[#0a0a0a]">
        <div className="flex items-center space-x-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/10 text-white bg-transparent border-none transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Toggle settings menu"
          >
            <div className="i-ph:list text-lg" />
          </button>

          <button
            onClick={handleGoBack}
            className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            <div className="i-ph:arrow-left text-sm" />
            <span className="text-sm font-medium">Go back</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="/"
            className="w-6 h-6 flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
          >
            <img src="/logo.png" alt="Joyful" className="w-5 h-5 object-contain" />
          </a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={classNames(
            'w-[280px] md:w-64 shrink-0 border-r border-white/5 md:border-white/10 bg-[#0a0a0c]/95 md:bg-[#0a0a0a] backdrop-blur-xl md:backdrop-blur-none overflow-y-auto z-50 transition-transform duration-300 ease-in-out flex flex-col',
            'fixed md:relative inset-y-0 md:inset-auto left-0 h-full md:h-auto',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          )}
        >
          {/* Mobile Header */}
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-white/5 md:hidden">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Joyful" className="w-4 h-4 object-contain" />
              <span className="font-semibold text-sm text-white">Settings</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 hover:bg-white/5 rounded-lg transition-colors bg-transparent border-none flex items-center justify-center cursor-pointer"
            >
              <div className="i-ph:x text-zinc-400 text-base" />
            </button>
          </div>

          <nav className="p-3 md:p-4 space-y-5 md:space-y-6 flex-1">
            {NAV_ITEMS.map((section) => (
              <div key={section.section}>
                <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider px-3 mb-2">
                  {section.section}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        classNames(
                          'flex items-center !justify-start !text-left w-full space-x-3 px-3 py-2.5 md:py-2 rounded-lg text-[13px] transition-colors no-underline',
                          isActive
                            ? 'bg-white/10 text-white font-medium'
                            : 'text-white/60 hover:text-white hover:bg-white/5',
                        )
                      }
                    >
                      <div className={classNames(item.icon, 'text-[18px] shrink-0')} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-h-0 [WebkitOverflowScrolling:touch]">
          <div className="w-full px-3 py-4 sm:px-6 sm:py-8 md:px-8 lg:px-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
