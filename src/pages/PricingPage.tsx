import { Check, Download, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const included = [
  'Local mock AI generation for static websites',
  'Browser-level sandbox preview without paid cloud runners',
  'Unlimited local projects stored in your browser',
  'HTML, CSS, and JavaScript editing',
  'ZIP export for deployment anywhere',
  'Templates, mobile preview, and live refresh',
];

export function PricingPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto bg-[#0f100f] text-[#f6f2ea]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-lg border border-white/8 bg-[#171816] p-8 sm:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(79,124,255,0.24),transparent_42%,rgba(255,122,61,0.16))]" />
          <div className="relative z-10 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-[#d8d3ca]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#66D28E]" />
              100% free local-first builder
            </div>
            <h1 className="text-4xl font-bold tracking-normal text-white">No pricing page. No paywall.</h1>
            <p className="mt-3 text-sm leading-6 text-[#aaa69d]">
              Joyful runs as a local browser workspace. The included AI path is the free local mock generator, and
              preview runs inside a browser iframe sandbox instead of a paid cloud sandbox.
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-white/8 bg-[#17120f] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-bold text-white">Free workspace</p>
                <p className="mt-1 text-sm text-[#aaa69d]">Everything needed to build and export static sites locally.</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-white">$0</div>
                <div className="text-xs font-semibold uppercase tracking-normal text-[#aaa69d]">forever</div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {included.map((item) => (
                <div key={item} className="flex gap-2 rounded-md border border-white/8 bg-white/[0.03] p-3">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#66D28E]" />
                  <span className="text-xs leading-relaxed text-[#d8d3ca]">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 rounded-md bg-[#f5f2ea] px-4 py-2.5 text-sm font-bold text-[#171816] transition-transform hover:scale-[1.01]"
              >
                <Sparkles className="h-4 w-4" />
                Start building
              </button>
              <button
                onClick={() => navigate('/templates')}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.06]"
              >
                <Download className="h-4 w-4" />
                Browse templates
              </button>
            </div>
          </section>

          <aside className="rounded-lg border border-white/8 bg-[#171816] p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-white/[0.06] text-[#8fa7ff]">
              <Zap className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-white">How AI works here</h2>
            <p className="mt-2 text-sm leading-6 text-[#aaa69d]">
              The current app uses a built-in local AI-style generator for development and demos. It does not require
              an API key by default, does not call paid model APIs, and keeps project data in local browser storage.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
