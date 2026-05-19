import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Code2,
  Download,
  Github,
  Layout,
  Mail,
  Mic,
  MousePointer2,
  Palette,
  Plus,
  Send,
  ShieldCheck,
  Twitter,
  Wand2,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';

const templates = [
  { name: 'Founder Portfolio', desc: 'Personal work showcase', image: '/templates/portfolio.jpg' },
  { name: 'SaaS Launch', desc: 'Product landing page', image: '/templates/saas.jpg' },
  { name: 'Restaurant Story', desc: 'Menu and reservations', image: '/templates/restaurant.jpg' },
  { name: 'Analytics Dashboard', desc: 'Metrics and reports', image: '/templates/dashboard.jpg' },
  { name: 'Editorial Blog', desc: 'Articles and collections', image: '/templates/blog.jpg' },
  { name: 'AI Tool', desc: 'Prompt-driven product', image: '/templates/ai-tool.jpg' },
];

const workflow = [
  {
    title: 'Start with an idea',
    desc: 'Describe the site, drop in references, or pick a template. Joyful turns fuzzy intent into a project plan.',
  },
  {
    title: 'Watch it come alive',
    desc: 'Preview pages while the code updates, then steer the design with plain-language edits.',
  },
  {
    title: 'Refine and ship',
    desc: 'Polish copy, colors, sections, and responsive behavior before exporting clean HTML, CSS, and JS.',
  },
];

const features = [
  { icon: Wand2, title: 'Prompt-first building', desc: 'Turn a short brief into editable page structure and copy.' },
  { icon: Layout, title: 'Template jumpstarts', desc: 'Begin from practical patterns for portfolios, SaaS, blogs, and tools.' },
  { icon: Code2, title: 'Code included', desc: 'Open the generated HTML, CSS, and JavaScript whenever you want control.' },
  { icon: ShieldCheck, title: 'Local preview', desc: 'Run work in a browser sandbox before you export or deploy.' },
  { icon: Palette, title: 'Design tuning', desc: 'Iterate on theme, spacing, and section hierarchy without hunting through files.' },
  { icon: Download, title: 'Export ready', desc: 'Package the finished project into files you can keep and host.' },
];

const examples = [
  'A polished portfolio for a product designer',
  'A SaaS homepage with pricing and FAQs',
  'A restaurant site with menu highlights',
];

const stats = [
  { value: '6', label: 'starter templates' },
  { value: '100%', label: 'local project storage' },
  { value: '3', label: 'export-ready languages' },
];

const footerLinks = {
  Product: ['Dashboard', 'Templates', 'Builder', 'Pricing'],
  Resources: ['Docs', 'Guides', 'Examples', 'Support'],
  Company: ['About', 'Security', 'Contact', 'Status'],
  Legal: ['Privacy', 'Terms', 'Cookies', 'Licenses'],
};

const footerRoutes: Record<string, string> = {
  Dashboard: '/dashboard',
  Templates: '/templates',
  Builder: '/builder',
  Pricing: '/pricing',
};

function PromptBox({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();

  return (
    <div className={`mx-auto w-full ${compact ? 'max-w-2xl' : 'max-w-4xl'}`}>
      <div className="rounded-[1.45rem] border border-gray-200 bg-white p-3 text-left shadow-[0_28px_90px_rgba(15,23,42,0.16)] ring-1 ring-black/5 dark:border-white/10 dark:bg-[#1d1f1d] dark:shadow-[0_28px_90px_rgba(0,0,0,0.38)] dark:ring-black/40">
        <button
          type="button"
          onClick={() => navigate('/builder')}
          className={`block w-full resize-none bg-transparent px-3 text-left font-medium text-gray-900 outline-none transition-colors hover:text-gray-950 dark:text-[#e7e4dc] dark:hover:text-white ${compact ? 'min-h-16 pt-2 text-sm' : 'min-h-28 pt-3 text-base sm:text-lg'}`}
        >
          Ask Joyful to create a dashboard for a coffee subscription...
        </button>
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Add context"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-950 dark:bg-white/5 dark:text-[#aaa69d] dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
            {!compact && (
              <div className="hidden gap-2 sm:flex">
                {examples.slice(0, 2).map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => navigate('/builder')}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-950 dark:border-white/10 dark:text-[#b9b5aa] dark:hover:border-white/20 dark:hover:text-white"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-950 sm:flex dark:text-[#aaa69d] dark:hover:bg-white/5 dark:hover:text-white"
            >
              Build <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Voice prompt"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-950 dark:text-[#aaa69d] dark:hover:bg-white/5 dark:hover:text-white"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/builder')}
              aria-label="Start building"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-950 text-white transition-transform hover:scale-105 dark:bg-[#f5f2ea] dark:text-[#181816]"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-950 dark:bg-[#171816] dark:text-[#f6f2ea]">
      <section className="relative isolate min-h-[calc(100vh-3rem)] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f7f8ff_24%,#eef3ff_45%,#fff1f8_72%,#fff6ee_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.14),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(255,255,255,0.42)_38%,rgba(255,255,255,0)_100%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col items-center px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/docs')}
            className="mb-8 inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-white/85 p-1 pr-4 text-sm font-semibold text-gray-900 shadow-xl shadow-indigo-950/10 backdrop-blur transition-colors hover:border-gray-300 dark:border-white/10 dark:bg-[#17181a]/80 dark:text-white dark:shadow-xl dark:hover:border-white/20"
          >
            <span className="rounded-full bg-[#2f5bff] px-3 py-1 text-xs">New</span>
            <span className="truncate">Better themes, cleaner exports</span>
            <ArrowRight className="h-4 w-4 flex-none" />
          </button>

          <h1 className="max-w-5xl text-balance text-5xl font-bold leading-[1.02] tracking-normal text-gray-950 sm:text-6xl lg:text-7xl dark:text-white">
            Build something Joyful
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-gray-600 sm:text-xl dark:text-white/70">
            Create polished websites by chatting with AI, then refine the code, preview, and export from one calm workspace.
          </p>

          <div className="mt-10 w-full">
            <PromptBox />
          </div>

          <div className="mt-9 grid w-full max-w-3xl grid-cols-1 gap-2 text-left sm:grid-cols-3">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => navigate('/builder')}
                className="group flex min-h-14 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white/70 px-4 py-3 text-sm font-medium text-gray-700 backdrop-blur transition-colors hover:bg-white hover:text-gray-950 dark:border-white/12 dark:bg-black/14 dark:text-white/78 dark:hover:bg-black/24 dark:hover:text-white"
              >
                <span>{example}</span>
                <ArrowRight className="h-4 w-4 flex-none opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8 dark:border-white/8 dark:bg-[#171816]">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-semibold text-gray-500 dark:text-[#9f9a8f]">
            A practical builder for people who want the page, the code, and the finish.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/8 dark:bg-[#21221f]">
                  <Icon className="mb-4 h-5 w-5 text-[#8fa7ff]" />
                  <h3 className="text-sm font-semibold text-gray-950 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-[#aaa69d]">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">Meet Joyful</p>
            <h2 className="mt-3 text-4xl font-bold tracking-normal text-gray-950 sm:text-5xl dark:text-white">
              Design, preview, and code in the same flow.
            </h2>
            <div className="mt-8 space-y-6">
              {workflow.map((item, index) => (
                <div key={item.title} className="grid grid-cols-[2.5rem_1fr] gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-sm font-bold text-indigo-600 dark:border-white/10 dark:bg-[#22231f] dark:text-[#f4d66a]">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white">{item.title}</h3>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/8 dark:bg-[#22231f]">
            <div className="grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
              <div className="flex min-h-80 items-center justify-center rounded-md bg-white dark:bg-[#191a18]">
                <div className="relative h-48 w-48">
                  <div className="absolute left-2 right-2 top-7 h-24 rounded-t-full bg-[linear-gradient(135deg,#ff7340,#e94483_48%,#556fff)] opacity-80" />
                  <div className="absolute bottom-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_25%,#9fb8ff,#e566d6_48%,#ff4c54_76%)] shadow-[0_22px_70px_rgba(233,102,214,0.35)]" />
                </div>
              </div>
              <div className="rounded-md bg-white p-4 dark:bg-[#181916]">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-4 dark:border-white/8">
                  <MousePointer2 className="h-4 w-4 text-[#8fa7ff]" />
                  <span className="text-sm font-semibold text-gray-950 dark:text-white">Live editing</span>
                </div>
                <div className="space-y-3 pt-4">
                  {[
                    'Add a dark hero with a coral call to action.',
                    'Make the pricing cards easier to compare.',
                    'Export the finished project as a ZIP.',
                  ].map((item) => (
                    <div key={item} className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:border-white/8 dark:bg-white/[0.03] dark:text-[#d6d1c7]">
                      {item}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/builder')}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.01] dark:bg-[#f5f2ea] dark:text-[#171816]"
                >
                  Open builder <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-4xl font-bold tracking-normal text-gray-950 dark:text-white">Discover templates</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-[#aaa69d]">Start from a real layout, then make it yours with prompts.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/templates')}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-[#f6f2ea] dark:hover:bg-white/5"
            >
              View all
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => navigate('/templates')}
                className="group overflow-hidden rounded-lg border border-gray-200 bg-white text-left transition-colors hover:border-gray-300 dark:border-white/8 dark:bg-[#22231f] dark:hover:border-white/18"
              >
                <div className="aspect-[16/9] overflow-hidden bg-[#111]">
                  <img
                    src={template.image}
                    alt={template.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-950 dark:text-white">{template.name}</h3>
                    <p className="mt-1 text-xs text-gray-600 dark:text-[#aaa69d]">{template.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-none text-[#8fa7ff] opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-4xl font-bold tracking-normal text-gray-950 dark:text-white">Joyful in numbers</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-[#aaa69d]">Built for fast starts, practical exports, and fewer scattered tools.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="min-h-44 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-white/8 dark:bg-[#22231f]">
                <div className="text-5xl font-bold tracking-normal text-gray-950 dark:text-white">{stat.value}</div>
                <div className="mt-16 text-sm font-medium text-gray-600 dark:text-[#aaa69d]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 bottom-0 h-72 bg-[linear-gradient(180deg,rgba(255,255,255,0),#eef3ff_42%,#fff1f8_72%,#fff6ee_100%)] dark:bg-[linear-gradient(180deg,rgba(23,24,22,0),#557fff_42%,#f172d4_70%,#ff4c78_100%)]" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <p className="text-sm font-semibold text-gray-600 dark:text-[#aaa69d]">AI App Builder</p>
          <h2 className="mt-2 text-4xl font-bold tracking-normal text-gray-950 sm:text-5xl dark:text-white">Ready to build?</h2>
          <div className="mt-8">
            <PromptBox compact />
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-gray-50 px-4 py-14 shadow-[0_-24px_80px_rgba(15,23,42,0.06)] sm:px-6 lg:px-8 dark:border-white/10 dark:bg-[#10110f] dark:shadow-[0_-24px_80px_rgba(0,0,0,0.28)]">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-[1.1fr_3fr]">
            <div>
              <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2">
                <BrandLogo className="h-11 w-11" />
                <span className="text-2xl font-bold text-gray-950 dark:text-white">joyful</span>
              </button>
              <p className="mt-5 max-w-sm text-base leading-7 text-gray-600 dark:text-[#aaa69d]">
                Prompt, preview, edit, and export websites without losing the thread.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">
              {Object.entries(footerLinks).map(([category, links]) => (
                <div key={category}>
                  <h3 className="text-base font-bold text-gray-950 dark:text-white">{category}</h3>
                  <ul className="mt-5 space-y-4">
                    {links.map((link) => (
                      <li key={link}>
                        <button
                          type="button"
                          onClick={() => navigate(footerRoutes[link] ?? '/docs')}
                          className="text-left text-base text-gray-600 transition-colors hover:text-gray-950 dark:text-[#aaa69d] dark:hover:text-white"
                        >
                          {link}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-14 flex flex-col gap-5 border-t border-gray-200 pt-7 sm:flex-row sm:items-center sm:justify-between dark:border-white/8">
            <p className="text-sm text-gray-600 dark:text-[#aaa69d]">&copy; 2026 joyful. All rights reserved.</p>
            <div className="flex items-center gap-3">
              {[Github, Twitter, Mail].map((Icon, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label="Social link"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-white hover:text-gray-950 dark:border-white/10 dark:text-[#aaa69d] dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
