import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Download,
  Layout,
  Star,
  Wand2,
  Zap,
  ShieldCheck,
  Heart,
} from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { MarketingFooter, PromptBox } from '@/components/marketing/MarketingChrome';
import { FeatureShowcase } from '@/components/marketing/FeatureShowcase';
import { AnimatedDemo } from '@/components/marketing/AnimatedDemo';
import { TestimonialsSection } from '@/components/marketing/TestimonialCard';
import { CountUpStats } from '@/components/marketing/CountUpStats';

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

const capabilities = [
  { icon: Wand2, title: 'Prompt-first building', desc: 'Turn a short brief into editable page structure and copy.' },
  { icon: Layout, title: 'Template jumpstarts', desc: 'Begin from practical patterns for portfolios, SaaS, blogs, and tools.' },
  { icon: Download, title: 'Export ready', desc: 'Package the finished project into files you can keep and host.' },
  { icon: ShieldCheck, title: 'Local sandbox', desc: 'All code runs in a safe iframe preview. No paid runner.' },
  { icon: Zap, title: 'Instant feedback', desc: 'Every edit triggers a live preview refresh. No rebuild required.' },
  { icon: Heart, title: 'Free forever', desc: 'No paywall, no trial. Build and export as many sites as you want.' },
];

const stats = [
  { value: '8', label: 'website templates' },
  { value: '100%', label: 'local project storage' },
  { value: '3', label: 'export-ready languages' },
  { value: '0', label: 'vendor lock-in' },
  { value: '0', label: 'monthly cost' },
];

interface LandingPageProps {
  onStartProject: (prompt: string) => void;
}

function WorkflowSection() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, x: -20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">Meet Joyful</p>
          <h2 className="mt-3 text-4xl font-bold tracking-normal text-gray-950 sm:text-5xl dark:text-white">
            Design, preview, and code in the same flow.
          </h2>
          <div className="mt-8 space-y-6">
            {workflow.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.15 }}
                className="grid grid-cols-[2.5rem_1fr] gap-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-sm font-bold text-indigo-600 dark:border-white/10 dark:bg-[#22231f] dark:text-[#f4d66a]">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-950 dark:text-white">{item.title}</h3>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/8 dark:bg-[#22231f]"
        >
          <div className="grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
            <div className="flex min-h-80 items-center justify-center rounded-md bg-white dark:bg-[#191a18]">
              <div className="relative h-48 w-48">
                <div className="absolute left-2 right-2 top-7 h-24 rounded-t-full bg-[linear-gradient(135deg,#ff7340,#e94483_48%,#556fff)] opacity-80" />
                <div className="absolute bottom-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_25%,#9fb8ff,#e566d6_48%,#ff4c54_76%)] shadow-[0_22px_70px_rgba(233,102,214,0.35)]" />
              </div>
            </div>
            <div className="rounded-md bg-white p-4 dark:bg-[#181916]">
              <div className="flex items-center gap-2 border-b border-gray-200 pb-4 dark:border-white/8">
                <Wand2 className="h-4 w-4 text-[#8fa7ff]" />
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
        </motion.div>
      </div>
    </section>
  );
}

function TemplatesSection() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
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
        </motion.div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template, index) => (
            <motion.button
              key={template.name}
              type="button"
              onClick={() => navigate('/templates')}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-2xl dark:border-white/8 dark:bg-[#22231f] dark:hover:border-white/18 dark:hover:shadow-[0_16px_50px_rgba(0,0,0,0.35)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#1a1a18] dark:to-[#2a2a28]">
                <img
                  src={template.image}
                  alt={`${template.name} preview`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#2f5bff]/10 text-[#2f5bff]">
                    <Layout className="h-8 w-8" />
                  </div>
                </div>
                {index < 3 && (
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-[#2f5bff] px-2.5 py-1 text-xs font-semibold text-white">
                    <Star className="h-3 w-3 fill-white" /> Popular
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="p-4">
                <h3 className="text-base font-bold text-gray-950 dark:text-white">{template.name}</h3>
                <p className="mt-1.5 text-sm text-gray-600 dark:text-[#aaa69d]">{template.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

function CapabilitiesGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="border-y border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8 dark:border-white/8 dark:bg-[#171816]">
      <div className="mx-auto max-w-7xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">Why Joyful</p>
          <h2 className="mt-3 text-4xl font-bold tracking-normal text-gray-950 dark:text-white">
            Built for builders
          </h2>
        </motion.div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {capabilities.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="group relative rounded-xl border border-gray-200 bg-gray-50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#2f5bff]/30 hover:shadow-xl dark:border-white/8 dark:bg-[#21221f] dark:hover:border-white/18 dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#2f5bff]/10 text-[#2f5bff] transition-all duration-300 group-hover:bg-[#2f5bff] group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-950 dark:text-white">{feature.title}</h3>
                <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-[#aaa69d]">{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-4xl font-bold tracking-normal text-gray-950 dark:text-white">Joyful in numbers</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-[#aaa69d]">Built for fast starts, practical exports, and fewer scattered tools.</p>
        <CountUpStats stats={stats} />
      </div>
    </section>
  );
}

function CTASection({ onStartProject }: { onStartProject: (prompt: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 lg:px-8">
      <div className="absolute inset-x-0 bottom-0 h-72 bg-[linear-gradient(180deg,rgba(255,255,255,0),#eef3ff_42%,#fff1f8_72%,#fff6ee_100%)] dark:bg-[linear-gradient(180deg,rgba(23,24,22,0),#557fff_42%,#f172d4_70%,#ff4c78_100%)]" />
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="relative z-10 mx-auto max-w-5xl text-center"
      >
        <p className="text-sm font-semibold text-gray-600 dark:text-[#aaa69d]">AI App Builder</p>
        <h2 className="mt-2 text-4xl font-bold tracking-normal text-gray-950 sm:text-5xl dark:text-white">Ready to build?</h2>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-medium text-gray-700 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-[#aaa69d]">
            <ShieldCheck className="h-3 w-3 text-green-500" />
            No signup required
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-medium text-gray-700 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-[#aaa69d]">
            <Heart className="h-3 w-3 text-[#f23c78]" />
            Free forever
          </span>
        </div>
        <div className="mt-8">
          <PromptBox compact onSubmit={onStartProject} />
        </div>
      </motion.div>
    </section>
  );
}

export function LandingPage({ onStartProject }: LandingPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-950 dark:bg-[#171816] dark:text-[#f6f2ea]">
      {/* Hero */}
      <section className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f7f8ff_24%,#eef3ff_45%,#fff1f8_72%,#fff6ee_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.14),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(255,255,255,0.42)_38%,rgba(255,255,255,0)_100%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/docs')}
            className="mb-8 inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-white/85 p-1 pr-4 text-sm font-semibold text-gray-900 shadow-xl shadow-indigo-950/10 backdrop-blur transition-colors hover:border-gray-300 dark:border-white/10 dark:bg-[#17181a]/80 dark:text-white dark:shadow-xl dark:hover:border-white/20"
          >
            <span className="rounded-full bg-[#2f5bff] px-3 py-1 text-xs">New</span>
            <span className="truncate">Advanced sandbox with console and inspector</span>
            <ArrowRight className="h-4 w-4 flex-none" />
          </button>

          <h1 className="max-w-5xl text-balance text-5xl font-bold leading-[1.02] tracking-normal text-gray-950 sm:text-6xl lg:text-7xl dark:text-white">
            Build something Joyful
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-gray-850 sm:text-xl dark:text-white">
            Create apps and websites by chatting with AI
          </p>

          <div className="mt-10 w-full">
            <PromptBox onSubmit={onStartProject} />
          </div>
        </div>
      </section>

      {/* Capabilities grid */}
      <CapabilitiesGrid />

      {/* Feature showcase tabs */}
      <FeatureShowcase />

      {/* Workflow */}
      <WorkflowSection />

      {/* Animated demo */}
      <AnimatedDemo />

      {/* Templates */}
      <TemplatesSection />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Stats */}
      <StatsSection />

      {/* CTA */}
      <CTASection onStartProject={onStartProject} />
      <MarketingFooter />
    </div>
  );
}
