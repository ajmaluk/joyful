import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Github, LockKeyhole, Send } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';

type AuthShellProps = {
  title: string;
  subtitle: string;
  switchText: string;
  switchAction: string;
  switchTo: string;
  children: ReactNode;
};

const highlights = [
  'Local projects stay in your workspace',
  'Preview every page before exporting',
  'Prompt, code, and templates in one flow',
];

export function ProviderButton({
  provider,
  marker,
  lastUsed = false,
}: {
  provider: string;
  marker: ReactNode;
  lastUsed?: boolean;
}) {
  return (
    <button
      type="button"
      className="relative flex h-11 w-full items-center justify-center gap-3 rounded-md border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#6387ff]/70 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#f6f2ea] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
    >
      <span className="flex h-5 w-5 items-center justify-center text-base">{marker}</span>
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
    <div className="min-h-full overflow-y-auto bg-white text-gray-950 dark:bg-[#171816] dark:text-[#f6f2ea]">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="fixed left-4 top-4 z-20 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-bold text-gray-950 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-white/5"
      >
        <BrandLogo className="h-8 w-8" />
        <span>joyful</span>
      </button>

      <main className="grid min-h-dvh lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <section className="flex min-h-dvh items-center justify-center px-4 py-20 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-7">
              <BrandLogo className="mb-6 h-14 w-14" />
              <h1 className="text-4xl font-bold tracking-normal text-gray-950 dark:text-white">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">{subtitle}</p>
            </div>

            {children}

            <div className="mt-6 border-t border-gray-200 pt-5 text-center text-sm text-gray-600 dark:border-white/8 dark:text-[#aaa69d]">
              {switchText}{' '}
              <button
                type="button"
                onClick={() => navigate(switchTo)}
                className="font-semibold text-gray-950 underline underline-offset-4 transition-colors hover:text-indigo-600 dark:text-[#f6f2ea] dark:hover:text-white"
              >
                {switchAction}
              </button>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-[#aaa69d]">
              <LockKeyhole className="h-4 w-4" />
              <span>SSO available on Business and Enterprise plans</span>
            </div>
          </div>
        </section>

        <aside className="hidden min-h-dvh p-4 lg:block">
          <div className="sticky top-4 h-[calc(100dvh-2rem)] overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/8 dark:bg-[#1d1f1d]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#eef3ff_34%,#fff1f8_68%,#fff6ee_100%)] dark:bg-[linear-gradient(180deg,#171816_0%,#243961_24%,#6e89ff_46%,#e87cda_67%,#f23d76_84%,#ff7a3d_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.18)_48%,rgba(255,255,255,0)_100%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(23,24,22,0.76)_0%,rgba(23,24,22,0.12)_48%,rgba(23,24,22,0)_100%)]" />

            <div className="relative z-10 flex h-full flex-col justify-between p-10">
              <div className="max-w-md">
                <p className="text-sm font-bold uppercase tracking-normal text-gray-500 dark:text-white/65">Build faster</p>
                <h2 className="mt-3 text-4xl font-bold leading-tight tracking-normal text-gray-950 dark:text-white">
                  Start with a prompt. Leave with a working page.
                </h2>
              </div>

              <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white/90 p-3 shadow-[0_26px_80px_rgba(15,23,42,0.16)] backdrop-blur dark:bg-[#f5f2ea]/90 dark:shadow-[0_26px_80px_rgba(0,0,0,0.28)]">
                <div className="flex items-center gap-4 rounded-xl px-4 py-3 text-gray-950 dark:text-[#171816]">
                  <span className="flex-1 text-lg font-semibold">Ask Joyful to build dashboards.</span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-950 text-white dark:bg-[#171816]">
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </div>
              </div>

              <div className="grid gap-3">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-md border border-white/40 bg-white/36 px-4 py-3 text-sm font-semibold text-gray-700 backdrop-blur dark:border-white/10 dark:bg-black/16 dark:text-white/80"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-indigo-600 dark:bg-white/10 dark:text-[#f4d66a]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export function GoogleMarker() {
  return <span className="font-bold text-gray-900 dark:text-white">G</span>;
}

export function GithubMarker() {
  return <Github className="h-5 w-5" />;
}

export function SubmitIcon() {
  return <Send className="h-4 w-4" />;
}
