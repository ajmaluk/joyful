import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { toggleMobileSidebar } from '~/lib/stores/sidebar';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames(
        'flex items-center px-4 sm:px-5 py-3 sm:py-4 border-b h-[var(--header-height)] transition-all duration-200 relative',
        {
          'border-transparent bg-transparent': !chat.started,
          'border-bolt-elements-borderColor bg-bolt-elements-background-depth-1': chat.started,
        },
      )}
    >
      {/* Hamburger menu - visible on mobile only */}
      {!chat.started && (
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/10 text-white bg-transparent border-none transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Toggle sidebar"
        >
          <div className="i-ph:list text-xl" />
        </button>
      )}

      <div className={classNames('flex items-center gap-2 cursor-pointer md:hidden', !chat.started ? 'absolute left-1/2 -translate-x-1/2' : '')}>
        <img src="/logo.png" alt="Joyful" className="w-5 h-5 object-contain flex-shrink-0" />
        <span className="font-bold text-base text-white tracking-tight whitespace-nowrap">Joyful</span>
      </div>

      {/* Balance spacer on mobile home page */}
      {!chat.started && <div className="md:hidden w-10" />}

      <span
        className={classNames(
          'flex-1 px-2 sm:px-4 truncate text-center text-xs sm:text-sm',
          chat.started ? 'text-bolt-elements-textPrimary' : 'text-white/70',
        )}
      >
        <ClientOnly>{() => <ChatDescription />}</ClientOnly>
      </span>
      {chat.started && (
        <ClientOnly>
          {() => (
            <div className="mr-0 sm:mr-1">
              <HeaderActionButtons />
            </div>
          )}
        </ClientOnly>
      )}
    </header>
  );
}
