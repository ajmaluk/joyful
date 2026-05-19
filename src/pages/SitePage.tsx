import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MarketingFooter, PromptBox } from '@/components/marketing/MarketingChrome';
import { sitePageContent } from '@/pages/site/sitePageContent';

const relatedPages: Record<string, Array<{ label: string; path: string }>> = {
  privacy: [
    { label: 'Security', path: '/security' },
    { label: 'Cookies', path: '/cookies' },
    { label: 'Terms', path: '/terms' },
  ],
  terms: [
    { label: 'Privacy', path: '/privacy' },
    { label: 'Security', path: '/security' },
    { label: 'Support', path: '/support' },
  ],
  cookies: [
    { label: 'Privacy', path: '/privacy' },
    { label: 'Security', path: '/security' },
    { label: 'Support', path: '/support' },
  ],
  licenses: [
    { label: 'Security', path: '/security' },
    { label: 'Terms', path: '/terms' },
    { label: 'Docs', path: '/docs' },
  ],
};

const defaultRelatedPages = [
  { label: 'Docs', path: '/docs' },
  { label: 'Templates', path: '/templates' },
  { label: 'Support', path: '/support' },
];

interface SitePageProps {
  slug: keyof typeof sitePageContent;
  onStartProject?: (prompt: string) => void;
}

export function SitePage({ slug, onStartProject }: SitePageProps) {
  const navigate = useNavigate();
  const page = sitePageContent[slug];
  const Icon = page.icon;
  const related = relatedPages[slug] ?? defaultRelatedPages;

  return (
    <div className="min-h-screen bg-white text-gray-950 dark:bg-[#171816] dark:text-[#f6f2ea]">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f7f8ff_24%,#eef3ff_45%,#fff1f8_72%,#fff6ee_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.14),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(255,255,255,0.42)_38%,rgba(255,255,255,0)_100%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/85 px-4 py-2 text-sm font-semibold text-gray-900 shadow-xl shadow-indigo-950/10 backdrop-blur dark:border-white/10 dark:bg-[#17181a]/80 dark:text-white">
              <Icon className="h-4 w-4 text-[#4f7cff]" />
              {page.badge}
            </div>
            <p className="mt-8 text-sm font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">
              {page.heroNote}
            </p>
            <h1 className="mt-3 max-w-5xl text-balance text-5xl font-bold leading-[1.02] tracking-normal text-gray-950 sm:text-6xl dark:text-white">
              {page.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-gray-600 sm:text-xl dark:text-white/70">
              {page.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/builder')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-950/10 transition-transform hover:scale-[1.02] dark:bg-white dark:text-[#171816]"
              >
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/docs')}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white/70 px-5 py-3 text-sm font-semibold text-gray-800 backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Read docs
              </button>
            </div>
          </div>

          <div className="mt-10 w-full">
            <PromptBox onSubmit={onStartProject} />
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {page.stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-gray-200 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-black/15">
                <div className="text-4xl font-bold text-gray-950 dark:text-white">{stat.value}</div>
                <div className="mt-8 text-sm font-medium text-gray-600 dark:text-[#aaa69d]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8 dark:border-white/8 dark:bg-[#171816]">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-4xl font-bold tracking-normal text-gray-950 dark:text-white">{page.badge} essentials</h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-[#aaa69d]">
                Important details are grouped into clear, scannable sections so this page feels useful instead of buried.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-[#f6f2ea] dark:hover:bg-white/5"
            >
              Contact us
            </button>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {page.highlights.map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <div key={feature.title} className="group rounded-xl border border-gray-200 bg-gray-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#2f5bff]/30 hover:shadow-xl dark:border-white/8 dark:bg-[#21221f] dark:hover:border-white/18 dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#2f5bff]/10 text-[#2f5bff] transition-colors group-hover:bg-[#2f5bff] group-hover:text-white dark:text-[#8fa7ff]">
                    <FeatureIcon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-950 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">{feature.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">Structured content</p>
            <h2 className="mt-3 text-4xl font-bold tracking-normal text-gray-950 sm:text-5xl dark:text-white">
              Each destination now feels like part of the same product story.
            </h2>
            <div className="mt-8 space-y-6">
              {page.sections.map((item, index) => (
                <div key={item.title} className="grid grid-cols-[2.5rem_1fr] gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-sm font-bold text-indigo-600 dark:border-white/10 dark:bg-[#22231f] dark:text-[#f4d66a]">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white">{item.title}</h3>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-white/8 dark:bg-[#22231f] dark:shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
            <div className="grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
              <div className="flex min-h-80 items-center justify-center rounded-md bg-white dark:bg-[#191a18]">
                <div className="relative h-48 w-48">
                  <div className="absolute left-2 right-2 top-7 h-24 rounded-t-full bg-[linear-gradient(135deg,#ff7340,#e94483_48%,#556fff)] opacity-80" />
                  <div className="absolute bottom-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_25%,#9fb8ff,#e566d6_48%,#ff4c54_76%)] shadow-[0_22px_70px_rgba(233,102,214,0.35)]" />
                </div>
              </div>
              <div className="rounded-md bg-white p-4 dark:bg-[#181916]">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-4 dark:border-white/8">
                  <Icon className="h-4 w-4 text-[#8fa7ff]" />
                  <span className="text-sm font-semibold text-gray-950 dark:text-white">{page.badge}</span>
                </div>
                <div className="space-y-3 pt-4">
                  {page.resources.map((resource) => (
                    <button
                      key={resource}
                      type="button"
                      onClick={() => navigate('/docs')}
                      className="group flex w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3 text-left text-sm leading-6 text-gray-700 transition-colors hover:border-gray-300 hover:bg-white dark:border-white/8 dark:bg-white/[0.03] dark:text-[#d6d1c7] dark:hover:bg-white/[0.06]"
                    >
                      <span>{resource}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-400 transition-transform group-hover:translate-x-1 dark:text-white/35" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/templates')}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.01] dark:bg-[#f5f2ea] dark:text-[#171816]"
                >
                  Explore templates <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50 px-4 py-16 sm:px-6 lg:px-8 dark:border-white/8 dark:bg-[#10110f]">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">Related pages</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal text-gray-950 dark:text-white">Keep the policy story connected.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">
              Legal, support, and product education pages work better when visitors can move between them without hunting through the footer.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 text-left font-semibold text-gray-900 transition-all hover:-translate-y-1 hover:border-[#2f5bff]/30 hover:shadow-xl dark:border-white/8 dark:bg-[#1b1c19] dark:text-white dark:hover:border-white/18"
              >
                <span>{item.label}</span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1 dark:text-white/40" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 bottom-0 h-72 bg-[linear-gradient(180deg,rgba(255,255,255,0),#eef3ff_42%,#fff1f8_72%,#fff6ee_100%)] dark:bg-[linear-gradient(180deg,rgba(23,24,22,0),#557fff_42%,#f172d4_70%,#ff4c78_100%)]" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <p className="text-sm font-semibold text-gray-600 dark:text-[#aaa69d]">{page.badge}</p>
          <h2 className="mt-2 text-4xl font-bold tracking-normal text-gray-950 sm:text-5xl dark:text-white">Keep building from here</h2>
          <div className="mt-8">
            <PromptBox compact onSubmit={onStartProject} />
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
