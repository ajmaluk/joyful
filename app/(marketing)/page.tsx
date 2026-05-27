
"use client";

import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Code2,
  Download,
  Layout,
  Star,
  Wand2,
  Zap,
  ShieldCheck,
  Heart,
} from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { PromptBox } from '@/components/joyful/marketing/MarketingChrome';
import { FeatureShowcase } from '@/components/joyful/marketing/FeatureShowcase';
import { AnimatedDemo } from '@/components/joyful/marketing/AnimatedDemo';
import { TestimonialsSection } from '@/components/joyful/marketing/TestimonialCard';
import type { ChatAttachment } from '@/lib/types';

import { CountUpStats } from '@/components/joyful/marketing/CountUpStats';

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



const joyfulCode = [
  '<section class="hero">',
  '  <h1>Build something Joyful</h1>',
  '  <button>Launch site</button>',
  '</section>',
];

function AnimatedJoyfulIcon() {
  return (
    <motion.div
      className="absolute flex h-32 w-32 items-center justify-center"
      initial={{ opacity: 0, scale: 0.72, y: 8 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.72, 1, 1.04, 0.66],
        y: [8, 0, -8, -32],
      }}
      transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.96),rgba(255,218,229,0.5)_34%,rgba(99,102,241,0.2)_66%,transparent_78%)] blur-xl"
        animate={{ opacity: [0.48, 0.92, 0.48], scale: [0.86, 1.12, 0.86] }}
        transition={{ duration: 2.7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.img
        src="/brand-logo-180.png"
        alt=""
        className="relative h-24 w-24 rounded-full object-cover drop-shadow-[0_20px_40px_rgba(99,102,241,0.3)]"
        style={{ clipPath: 'circle(48% at 50% 50%)' }}
        animate={{ scale: [1, 1.025, 1], y: [0, -3, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute left-4 top-9 h-4 w-4 rounded-full bg-white shadow-[0_0_22px_rgba(255,255,255,0.95)]"
        animate={{ opacity: [0.18, 0.9, 0.18], scale: [0.62, 1.16, 0.62] }}
        transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute right-7 top-5 h-3 w-3 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.9)]"
        animate={{ opacity: [0.12, 0.78, 0.12], scale: [0.58, 1.12, 0.58] }}
        transition={{ duration: 2.7, repeat: Infinity, ease: 'easeInOut', delay: 0.45 }}
      />
      <motion.span
        className="absolute inset-x-8 top-10 h-10 rounded-full bg-white/25 blur-md"
        animate={{ opacity: [0.12, 0.42, 0.12], x: ['-14%', '14%', '-14%'] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

function JoyfulMorphAnimation() {
  const [typed, setTyped] = useState('');
  const code = joyfulCode.join('\n');

  useEffect(() => {
    let index = 0;
    let interval: number | undefined;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        index += 1;
        if (index > code.length + 54) {
          index = 0;
        }
        setTyped(code.slice(0, Math.min(index, code.length)));
      }, 26);
    }, 1300);
    return () => {
      window.clearTimeout(start);
      if (interval) window.clearInterval(interval);
    };
  }, [code]);

  return (
    <div className="relative flex h-full min-h-64 items-center justify-center overflow-hidden rounded-md bg-[linear-gradient(180deg,#ffffff_0%,#f7f8ff_52%,#fff1f8_100%)] dark:bg-[#191a18]">
      <motion.div
        className="absolute h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(99,135,255,0.22),rgba(242,60,120,0.14)_52%,transparent_72%)] blur-2xl"
        animate={{ scale: [0.9, 1.14, 0.9], opacity: [0.5, 0.95, 0.5] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <AnimatedJoyfulIcon />

      <motion.div
        className="relative w-[min(92%,18rem)] overflow-hidden rounded-lg border border-gray-200 bg-[#101116] text-left shadow-xl shadow-indigo-950/20"
        initial={{ opacity: 0, scale: 0.82, rotateX: 18, y: 24 }}
        animate={{
          opacity: [0, 0, 1, 1, 0],
          scale: [0.82, 0.82, 1, 1, 0.94],
          rotateX: [18, 18, 0, 0, -8],
          y: [24, 24, 0, 0, -12],
        }}
        transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex h-8 items-center justify-between border-b border-white/10 bg-white/[0.04] px-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/60">
            <Code2 className="h-3 w-3" />
            index.html
          </div>
        </div>
        <pre className="min-h-36 whitespace-pre-wrap px-3.5 py-3.5 font-mono text-[11px] leading-5 text-[#dbe4ff]">
          <code>{typed}<span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse bg-[#8fa7ff]" /></code>
        </pre>
        <motion.div
          className="absolute bottom-3 right-3 rounded-full bg-green-400/15 px-2.5 py-1 text-[11px] font-semibold text-green-300"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          building
        </motion.div>
      </motion.div>
    </div>
  );
}

function WorkflowSection() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, x: -20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">Meet Joyful</p>
          <h2 className="mt-2 text-3xl font-bold tracking-normal text-gray-950 sm:text-4xl dark:text-white">
            Design, preview, and code in the same flow.
          </h2>
          <div className="mt-6 space-y-5">
            {workflow.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.15 }}
                className="grid grid-cols-[2rem_1fr] gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-bold text-indigo-600 dark:border-white/10 dark:bg-[#22231f] dark:text-[#f4d66a]">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-950 dark:text-white">{item.title}</h3>
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
          className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-[#22231f]"
        >
          <div className="grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
            <JoyfulMorphAnimation />
            <div className="rounded-md bg-white p-3 dark:bg-[#181916]">
              <div className="flex items-center gap-2 border-b border-gray-200 pb-3 dark:border-white/8">
                <Wand2 className="h-4 w-4 text-[#8fa7ff]" />
                <span className="text-sm font-semibold text-gray-950 dark:text-white">Live editing</span>
              </div>
              <div className="space-y-2.5 pt-3">
                {[
                  'Add a dark hero with a coral call to action.',
                  'Make the pricing cards easier to compare.',
                  'Export the finished project as a ZIP.',
                ].map((item) => (
                  <div key={item} className="rounded-md border border-gray-200 bg-gray-50 p-2.5 text-xs leading-5 text-gray-700 dark:border-white/8 dark:bg-white/[0.03] dark:text-[#d6d1c7]">
                    {item}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => router.push('/builder')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 py-2.5 text-xs font-bold text-white transition-transform hover:scale-[1.01] dark:bg-[#f5f2ea] dark:text-[#171816]"
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
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h2 className="text-3xl font-bold tracking-normal text-gray-950 dark:text-white">Discover templates</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-[#aaa69d]">Start from a real layout, then make it yours with prompts.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/templates')}
            className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-[#f6f2ea] dark:hover:bg-white/5"
          >
            View all
          </button>
        </motion.div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template, index) => (
            <motion.button
              key={template.name}
              type="button"
              onClick={() => router.push('/templates')}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl dark:border-white/8 dark:bg-[#22231f] dark:hover:border-white/18 dark:hover:shadow-[0_16px_50px_rgba(0,0,0,0.35)]"
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2f5bff]/10 text-[#2f5bff]">
                    <Layout className="h-6 w-6" />
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
    <section className="border-y border-gray-200 bg-white px-4 py-12 sm:px-6 lg:px-8 dark:border-white/8 dark:bg-[#171816]">
      <div className="mx-auto max-w-6xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">Why Joyful</p>
          <h2 className="mt-2 text-3xl font-bold tracking-normal text-gray-950 dark:text-white">
            Built for builders
          </h2>
        </motion.div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {capabilities.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="group relative rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#2f5bff]/30 hover:shadow-lg dark:border-white/8 dark:bg-[#21221f] dark:hover:border-white/18 dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-[#2f5bff]/10 text-[#2f5bff] transition-all duration-300 group-hover:bg-[#2f5bff] group-hover:text-white">
                  <Icon className="h-4 w-4" />
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
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold tracking-normal text-gray-950 dark:text-white">Joyful in numbers</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-[#aaa69d]">Built for fast starts, practical exports, and fewer scattered tools.</p>
        <CountUpStats stats={stats} />
      </div>
    </section>
  );
}

function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section className="relative isolate min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_28%,#6e89ff_48%,#ef83df_66%,#f23c78_84%,#ff713a_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.92)_22%,rgba(255,255,255,0.35)_42%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8"
      >
        <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200/80 bg-white/85 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-lg shadow-indigo-950/10 backdrop-blur dark:border-white/10 dark:bg-[#17181a]/80 dark:text-white">
          AI App Builder
        </div>
        <h2 className="max-w-4xl text-balance text-4xl font-bold leading-[1.03] tracking-normal text-gray-950 sm:text-5xl lg:text-6xl dark:text-white">Ready to build?</h2>
        <div className="mt-8 w-full">
          <PromptBox />
        </div>
      </motion.div>
    </section>
  );
}

export default function LandingPage() {
  const router = useRouter();

  

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] text-gray-950 dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_20%,#21365f_38%,#3a2040_56%,#4a1030_72%,#4a2010_100%)] dark:text-[#f6f2ea]">
      

      {/* Hero */}
      <section className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_28%,#6e89ff_48%,#ef83df_66%,#f23c78_84%,#ff713a_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.92)_22%,rgba(255,255,255,0.35)_42%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            type="button"
            onClick={() => router.push('/docs')}
            className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200/80 bg-white/85 p-1 pr-3 text-xs font-semibold text-gray-900 shadow-lg shadow-indigo-950/10 backdrop-blur transition-all duration-200 hover:border-gray-300 hover:scale-[1.02] hover:shadow-xl dark:border-white/10 dark:bg-[#17181a]/80 dark:text-white dark:shadow-xl dark:hover:border-white/20"
          >
            <span className="rounded-full bg-[#2f5bff] px-3 py-1 text-xs">New</span>
            <span className="truncate">Advanced sandbox with console and inspector</span>
            <ArrowRight className="h-4 w-4 flex-none" />
          </motion.button>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-4xl text-balance text-4xl font-bold leading-[1.03] tracking-normal text-gray-950 sm:text-5xl lg:text-6xl dark:text-white"
          >
            Build something Joyful
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 max-w-2xl text-base font-medium leading-7 text-gray-900 sm:text-lg dark:text-white"
          >
            Create apps and websites by chatting with AI
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 w-full"
          >
            <PromptBox />
          </motion.div>
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
      <CTASection  />
      
    </div>
  );
}
