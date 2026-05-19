import { Check, Download, FileStack, Globe, HardDrive, Lock, Palette, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const included = [
  { icon: HardDrive, text: 'Local mock AI generation', desc: 'No API keys required' },
  { icon: Globe, text: 'Browser sandbox preview', desc: 'Secure iframe isolation' },
  { icon: FileStack, text: 'Unlimited projects', desc: 'Stored in your browser' },
  { icon: Palette, text: 'Full code editing', desc: 'HTML, CSS, JS control' },
  { icon: Download, text: 'ZIP export', desc: 'Deploy anywhere' },
  { icon: Lock, text: 'Privacy first', desc: 'Data stays local' },
];

const features = [
  'Template gallery with 6+ starter designs',
  'Mobile responsive preview',
  'Live auto-refresh editing',
  'AI-powered content generation',
  'One-click export to ZIP',
  'Dark/light theme support',
];

export function PricingPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto bg-[#0f100f] text-[#f6f2ea]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#171816] p-8 sm:p-12">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(79,124,255,0.2),transparent_42%,rgba(255,122,61,0.12),rgba(242,60,120,0.08))]" />
          <div className="absolute top-0 right-0 h-64 w-64 translate-x-20 -translate-y-20 rounded-full bg-[#2f5bff]/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-10 translate-y-10 rounded-full bg-[#f23c78]/15 blur-3xl" />
          
          <div className="relative z-10 max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#66D28E]/30 bg-[#66D28E]/10 px-4 py-2 text-xs font-bold text-[#66D28E]">
              <ShieldCheck className="h-4 w-4" />
              100% Free Forever
            </div>
            <h1 className="text-4xl font-bold tracking-normal text-white sm:text-5xl">
              No pricing. No paywall. No limits.
            </h1>
            <p className="mt-4 text-lg leading-7 text-[#aaa69d]">
              Joyful runs entirely in your browser. The AI generator, preview sandbox, and all features are included 
              at no cost. Your projects stay local until you export.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/builder')}
                className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#2f5bff] to-[#f23c78] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#2f5bff]/25 transition-transform hover:scale-[1.02] hover:shadow-xl"
              >
                <Sparkles className="h-4 w-4" />
                Start Building Free
              </button>
              <button
                onClick={() => navigate('/templates')}
                className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/[0.1]"
              >
                <Download className="h-4 w-4" />
                Browse Templates
              </button>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-white/8 bg-[#17120f] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#2f5bff] to-[#f23c78]">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">Free Workspace</p>
                  <p className="text-sm text-[#aaa69d]">Everything you need to build & export</p>
                </div>
              </div>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-6xl font-bold text-white">$0</span>
                <span className="text-lg font-semibold text-[#aaa69d]">/ forever</span>
              </div>
            </div>

            <div className="space-y-4">
              {included.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-start gap-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.05]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2f5bff]/10 text-[#2f5bff]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.text}</p>
                      <p className="text-sm text-[#aaa69d]">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-white/8 bg-[#171816] p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f23c78]/10 text-[#f23c78]">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">How AI Generation Works</h2>
                </div>
              </div>
              <p className="text-[#aaa69d] leading-relaxed">
                Joyful uses a built-in local generator that creates website layouts and content without calling 
                external AI APIs. Your projects stay private, and there's no need for API keys or paid subscriptions.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {features.slice(0, 4).map((feature) => (
                  <div key={feature} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-[#d8d3ca]">
                    <Check className="h-4 w-4 text-[#66D28E]" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-[#2f5bff]/10 to-[#f23c78]/10 p-8">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-6 w-6 text-[#2f5bff]" />
                <h3 className="text-lg font-bold text-white">Built for Teams</h3>
              </div>
              <p className="text-[#aaa69d] mb-4">
                Share exported projects with your team. The static HTML/CSS/JS output works with any hosting 
                provider or can be opened directly in a browser.
              </p>
              <button
                onClick={() => navigate('/docs')}
                className="text-sm font-semibold text-[#2f5bff] hover:underline"
              >
                Learn more in docs →
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
