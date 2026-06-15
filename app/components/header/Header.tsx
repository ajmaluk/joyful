import { useStore } from '@nanostores/react';
import { useState, useRef, useEffect } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { toggleMobileSidebar } from '~/lib/stores/sidebar';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);
  const selectedView = useStore(workbenchStore.currentView);
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const setView = (view: WorkbenchViewType) => {
    workbenchStore.currentView.set(view);
    if (!showWorkbench) {
      workbenchStore.showWorkbench.set(true);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={classNames(
      "h-11 flex items-center justify-between px-4 border-b border-white/10 z-50 shrink-0",
      chat.started ? "bg-[#0a0a0a]" : "bg-transparent"
    )}>
      {/* Left Section: Logo & Status */}
      <div className="flex items-center space-x-3 relative group" ref={dropdownRef}>
        {/* Hamburger menu - visible on mobile only */}
        {!chat.started && (
          <button
            onClick={toggleMobileSidebar}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/10 text-white bg-transparent border-none transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Toggle sidebar"
          >
            <div className="i-ph:list text-lg" />
          </button>
        )}

        {/* Logo */}
        <a 
          href="/"
          className="w-6 h-6 flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0"
        >
          <img src="/logo.png" alt="Joyful" className="w-5 h-5 object-contain" />
        </a>
        
        {/* Dropdown Trigger */}
        <button 
          className="cursor-pointer bg-transparent border-none text-left p-0"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div className="flex items-center space-x-1">
            <span className="text-xs font-semibold text-white leading-tight">Joyful</span>
            <svg className={classNames("w-3.5 h-3.5 text-white/50 transition-transform duration-200", dropdownOpen ? "rotate-180" : undefined)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <p className="text-[9px] text-white/40 leading-none">
            {chat.started ? 'Previewing last saved version' : 'AI-powered app builder'}
          </p>
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-[100]">
            {/* User Info Header */}
            <div className="flex items-center space-x-3 p-3 border-b border-white/5 mb-1">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">U</div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">User</div>
                <div className="text-[11px] text-white/40 truncate">user@joyful.uthakkan.in</div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-0.5">
              <DropdownItem icon="i-ph:user" label="Profile" />
              <DropdownItem icon="i-ph:gear" label="Settings" shortcut="⌘ ," />
              <DropdownItem icon="i-ph:palette" label="Appearance" hasChevron />
              <DropdownItem icon="i-ph:question" label="Support" hasChevron />
              <DropdownItem icon="i-ph:book-open" label="Documentation" hasChevron />
              <DropdownItem icon="i-ph:users" label="Community" />
              <DropdownItem icon="i-ph:house" label="Home" onClick={() => { window.location.href = '/'; setDropdownOpen(false); }} />
            </div>
          </div>
        )}
      </div>

      {/* Center Section: Mode Toggles - only show when chat started */}
      {chat.started && (
        <div className="flex items-center space-x-1 bg-white/5 p-0.5 rounded-full border border-white/10">
          <button
            className={classNames(
              'flex items-center space-x-1.5 px-3 py-1 text-[11px] font-medium rounded-full transition-all cursor-pointer',
              selectedView === 'preview' && showWorkbench
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'bg-transparent text-gray-400 hover:text-white border border-transparent'
            )}
            onClick={() => setView('preview')}
          >
            <div className="i-ph:globe text-xs shrink-0" />
            <span>Preview</span>
          </button>
          <button
            className={classNames(
              'flex items-center space-x-1.5 px-3 py-1 text-[11px] font-medium rounded-full transition-all cursor-pointer',
              selectedView === 'code' && showWorkbench
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'bg-transparent text-gray-400 hover:text-white border border-transparent'
            )}
            onClick={() => setView('code')}
          >
            <div className="i-ph:code text-xs shrink-0" />
            <span>Code</span>
          </button>
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center space-x-2">
        {chat.started && (
          <ClientOnly>
            {() => (
              <div className="mr-0 sm:mr-1">
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        )}
        {chat.started && (
          <button 
            onClick={() => workbenchStore.downloadCodebase()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold px-3 py-1 rounded-md transition-colors cursor-pointer border-none"
          >
            Download
          </button>
        )}
      </div>
    </header>
  );
}

function DropdownItem({ icon, label, shortcut, hasChevron, onClick }: { 
  icon: string; 
  label: string; 
  shortcut?: string; 
  hasChevron?: boolean;
  onClick?: () => void;
}) {
  return (
    <button 
      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-white/80 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <div className={classNames(icon, 'text-[18px]')} />
        <span className="text-[13px]">{label}</span>
      </div>
      {shortcut && (
        <span className="text-[10px] text-white/30 font-mono">{shortcut}</span>
      )}
      {hasChevron && (
        <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}