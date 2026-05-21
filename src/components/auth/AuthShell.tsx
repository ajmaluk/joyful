import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Github, LockKeyhole, Send } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { TypingCycle } from '@/components/ui/TypingCycle';

const authHeroTexts = [
  'Ask Joyful to build your SaaS page.',
  'Ask Joyful to create a dashboard.',
  'Ask Joyful to design a portfolio.',
  'Ask Joyful to code a landing page.',
];

type AuthShellProps = {
  title: string;
  subtitle: string;
  switchText: string;
  switchAction: string;
  switchTo: string;
  children: ReactNode;
};

export function ProviderButton({
  provider,
  marker,
  lastUsed = false,
  onClick,
  disabled = false,
}: {
  provider: string;
  marker: ReactNode;
  lastUsed?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const isGithub = provider.toLowerCase() === 'github';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-9 w-full items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#6387ff]/70 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 ${
        isGithub
          ? 'border-gray-950 bg-gray-950 text-white hover:scale-[1.01] hover:bg-gray-800 hover:shadow-lg dark:border-white/12 dark:bg-white/[0.08] dark:text-white dark:hover:border-white/22 dark:hover:bg-white/[0.12]'
          : 'border-gray-200 bg-white text-gray-700 hover:scale-[1.01] hover:border-gray-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.07]'
      }`}
    >
      <span className="flex h-4 w-4 items-center justify-center text-sm">{marker}</span>
      <span>Continue with {provider}</span>
      {lastUsed && (
        <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-[#4f7cff]/30 bg-[#4f7cff]/10 px-2 py-0.5 text-[11px] font-bold text-[#4f7cff] sm:inline-flex dark:border-[#4f7cff]/60 dark:bg-[#27345d] dark:text-[#8fa7ff]">
          Last used
        </span>
      )}
    </button>
  );
}

export function AuthShell({
  title,
  subtitle,
  switchText,
  switchAction,
  switchTo,
  children,
}: AuthShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-full overflow-y-auto bg-white text-gray-950 dark:bg-[#10110f] dark:text-[#f6f2ea]">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="fixed left-4 top-4 z-20 flex items-center gap-2 rounded-md px-2 py-1 text-xs font-bold text-gray-950 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-white/5"
      >
        <BrandLogo className="h-5 w-5" />
        <span>Joyful</span>
      </button>

      <main className="grid min-h-dvh lg:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
        <section className="flex min-h-dvh items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-10 dark:bg-[#10110f]">
          <div className="w-full max-w-xs">
            <div className="mb-4">
              <h1 className="text-2xl font-bold tracking-normal text-gray-950 dark:text-white">{title}</h1>
              <p className="mt-1.5 text-[11px] leading-5 text-gray-600 dark:text-[#aaa69d]">{subtitle}</p>
            </div>

            {children}

            <div className="mt-4 border-t border-gray-200 pt-3.5 text-center text-[11px] text-gray-600 dark:border-white/8 dark:text-[#aaa69d]">
              {switchText}{' '}
              <button
                type="button"
                onClick={() => navigate(switchTo)}
                className="font-semibold text-gray-950 underline underline-offset-4 transition-colors hover:text-indigo-600 dark:text-[#f6f2ea] dark:hover:text-white"
              >
                {switchAction}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-600 dark:text-[#aaa69d]">
              <LockKeyhole className="h-3 w-3" />
              <span>SSO available on Business and Enterprise plans</span>
            </div>
          </div>
        </section>

        <aside className="hidden min-h-dvh border-l border-gray-200/70 lg:block dark:border-white/8">
          <div className="sticky top-0 h-dvh overflow-hidden bg-white dark:bg-[#171816]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_28%,#6e89ff_48%,#ef83df_66%,#f23c78_84%,#ff713a_100%)] dark:bg-[linear-gradient(180deg,#171816_0%,#243961_24%,#6e89ff_46%,#e87cda_67%,#f23d76_84%,#ff7a3d_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.92)_22%,rgba(255,255,255,0.35)_42%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(23,24,22,0.76)_0%,rgba(23,24,22,0.12)_48%,rgba(23,24,22,0)_100%)]" />

            <div className="relative z-10 mx-auto flex h-full max-w-3xl items-center justify-center px-8 py-12">
              <div className="w-full max-w-xl rounded-[1.35rem] border border-gray-200 bg-white p-3 shadow-[0_26px_90px_rgba(36,56,140,0.28)] dark:border-white/10 dark:bg-[#1d1f1d] dark:shadow-[0_26px_90px_rgba(0,0,0,0.34)]">
                <div className="flex min-h-16 items-center gap-4 rounded-[1.05rem] px-4 py-3 text-left text-gray-950 dark:text-white">
                  <span className="min-w-0 flex-1 text-base font-medium sm:text-lg">
                    <TypingCycle
                      texts={authHeroTexts}
                      speed={30}
                      deleteSpeed={12}
                      delayBetweenTexts={1600}
                      className="inline"
                      showCursor={true}
                    />
                  </span>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-950 text-white shadow-lg shadow-gray-950/20 dark:bg-[#f5f2ea] dark:text-[#171816]">
                    <ArrowUp className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export function GoogleMarker() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function GithubMarker() {
  return <Github className="h-4 w-4" />;
}

export function SubmitIcon() {
  return <Send className="h-4 w-4" />;
}
