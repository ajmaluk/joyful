"use client";


import { routeMeta } from '@/lib/seo';
import { ArrowRight, Check, Download, FileStack, Globe, HardDrive, Lock, Palette, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const included = [
  { icon: HardDrive, title: 'Local mock AI generation', body: 'Generate starter layouts without API keys or paid runner setup.' },
  { icon: Globe, title: 'Browser sandbox preview', body: 'Preview every page in an isolated iframe before exporting.' },
  { icon: FileStack, title: 'Unlimited projects', body: 'Keep building locally in the same workspace.' },
  { icon: Palette, title: 'Full code editing', body: 'Edit HTML, CSS, and JavaScript directly whenever you need control.' },
  { icon: Download, title: 'ZIP export', body: 'Package static files and deploy anywhere.' },
  { icon: Lock, title: 'Privacy first', body: 'Projects stay in your browser until you choose to export.' },
];

const features = [
  'Template gallery with starter designs',
  'Mobile responsive preview',
  'Live auto-refresh editing',
  'Prompt-assisted content generation',
  'One-click ZIP export',
  'Dark and light theme support',
];

const pricingSections = [
  {
    title: 'No hidden upgrade path',
    body: 'The builder, templates, preview, editing, and export workflow are presented as one free workspace.',
  },
  {
    title: 'Built for practical shipping',
    body: 'Joyful focuses on local projects and static exports, so there is no pricing maze between idea and working page.',
  },
  {
    title: 'Simple by design',
    body: 'Instead of tier tables, this page explains what is included and why the product can stay straightforward.',
  },
];

const revealUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
};

export default function PricingPage() {
  const router = useRouter();
  const meta = routeMeta['/pricing'];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] text-gray-950 dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_20%,#21365f_38%,#3a2040_56%,#4a1030_72%,#4a2010_100%)] dark:text-[#f6f2ea]">
      
      <section className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_28%,#6e89ff_48%,#ef83df_66%,#f23c78_84%,#ff713a_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.92)_22%,rgba(255,255,255,0.35)_42%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/85 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-lg shadow-indigo-950/10 backdrop-blur dark:border-white/10 dark:bg-[#17181a]/80 dark:text-white">
              <ShieldCheck className="h-3.5 w-3.5 text-[#4f7cff]" />
              100% Free Forever
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">
              Clear pricing, no fine print
            </p>
            <h1 className="mt-2 max-w-4xl text-balance text-4xl font-bold leading-[1.03] tracking-normal text-gray-950 sm:text-5xl dark:text-white">
              No pricing. No paywall. No limits.
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-gray-600 dark:text-white/70">
              Joyful runs in your browser. The generator, preview sandbox, templates, editor, and export flow are included at no cost.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push('/builder')}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-950/10 transition-transform hover:scale-[1.02] dark:bg-white dark:text-[#171816]"
              >
                Start building free
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => router.push('/templates')}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white/70 px-4 py-2.5 text-xs font-semibold text-gray-800 backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Browse templates
                <Download className="h-4 w-4" />
              </button>
            </div>
          </motion.div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              { value: '$0', label: 'forever' },
              { value: '100%', label: 'local project storage' },
              { value: 'ZIP', label: 'export included' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.18 + index * 0.08 }}
                className="rounded-lg border border-gray-200 bg-white/75 p-4 shadow-lg shadow-indigo-950/5 backdrop-blur transition-transform duration-300 hover:-translate-y-1 dark:border-white/10 dark:bg-black/20"
              >
                <div className="text-3xl font-bold text-gray-950 dark:text-white">{stat.value}</div>
                <div className="mt-6 text-xs font-medium text-gray-600 dark:text-[#aaa69d]">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200/60 bg-white/60 px-4 py-12 backdrop-blur-sm sm:px-6 lg:px-8 dark:border-white/8 dark:bg-[#171816]/60">
        <motion.div {...revealUp} transition={{ duration: 0.5 }} className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-normal text-gray-950 dark:text-white">Free workspace essentials</h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-[#aaa69d]">
                Everything important is grouped clearly, so the page feels like the rest of the product story.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/docs')}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-[#f6f2ea] dark:hover:bg-white/5"
            >
              Read docs
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {included.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.42, delay: index * 0.08 }}
                  className="group rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#2f5bff]/30 hover:bg-white hover:shadow-lg dark:border-white/8 dark:bg-[#21221f] dark:hover:border-white/18 dark:hover:bg-[#252622] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-[#2f5bff]/10 text-[#2f5bff] transition-colors group-hover:bg-[#2f5bff] group-hover:text-white dark:text-[#8fa7ff]">
                    <FeatureIcon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-gray-950 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-[#aaa69d]">{feature.body}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <motion.div {...revealUp} transition={{ duration: 0.5 }}>
            <p className="text-xs font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">Why it stays simple</p>
            <h2 className="mt-2 text-3xl font-bold tracking-normal text-gray-950 sm:text-4xl dark:text-white">
              The pricing page should explain trust, not sell another tier.
            </h2>
            <div className="mt-6 space-y-5">
              {pricingSections.map((item, index) => (
                <div key={item.title} className="grid grid-cols-[2rem_1fr] gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-bold text-indigo-600 dark:border-white/10 dark:bg-[#22231f] dark:text-[#f4d66a]">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-950 dark:text-white">{item.title}</h3>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...revealUp}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-white/8 dark:bg-[#22231f] dark:shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
          >
            <div className="grid gap-4">
              <div className="rounded-md bg-white p-4 dark:bg-[#181916]">
                <div className="flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-white/8">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#2f5bff] to-[#f23c78] text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white">Free Workspace</h3>
                    <p className="text-sm text-gray-600 dark:text-[#aaa69d]">Everything you need to build and export</p>
                  </div>
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-950 dark:text-white">$0</span>
                  <span className="text-base font-semibold text-gray-600 dark:text-[#aaa69d]">/ forever</span>
                </div>
                <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 dark:border-white/8 dark:bg-white/[0.03] dark:text-[#d6d1c7]">
                      <Check className="h-4 w-4 shrink-0 text-[#2f5bff] dark:text-[#f4d66a]" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:border-white/8 dark:bg-[#10110f]">
        <motion.div {...revealUp} transition={{ duration: 0.5 }} className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">Related pages</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-gray-950 dark:text-white">Keep the pricing story connected.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">
              Visitors can move from the free promise into templates, docs, and support without hunting through the footer.
            </p>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              { label: 'Templates', path: '/templates' },
              { label: 'Docs', path: '/docs' },
              { label: 'Support', path: '/support' },
            ].map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => router.push(item.path)}
                className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 text-left text-sm font-semibold text-gray-900 transition-all hover:-translate-y-1 hover:border-[#2f5bff]/30 hover:shadow-lg dark:border-white/8 dark:bg-[#1b1c19] dark:text-white dark:hover:border-white/18"
              >
                <span>{item.label}</span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1 dark:text-white/40" />
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_28%,#6e89ff_48%,#ef83df_66%,#f23c78_84%,#ff713a_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.92)_22%,rgba(255,255,255,0.35)_42%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
        <motion.div
          {...revealUp}
          transition={{ duration: 0.55 }}
          className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8"
        >
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200/80 bg-white/85 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-lg shadow-indigo-950/10 backdrop-blur dark:border-white/10 dark:bg-[#17181a]/80 dark:text-white">
            <ShieldCheck className="h-3.5 w-3.5 text-[#4f7cff]" />
            100% Free Forever
          </div>
          <h2 className="max-w-4xl text-balance text-4xl font-bold leading-[1.03] tracking-normal text-gray-950 sm:text-5xl lg:text-6xl dark:text-white">Build without a pricing wall</h2>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-gray-700 dark:text-white/70">
            Open the workspace, start from a prompt, and export when the page is ready.
          </p>
          <button
            type="button"
            onClick={() => router.push('/builder')}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-950/10 transition-transform hover:scale-[1.02] dark:bg-white dark:text-[#171816]"
          >
            Open workspace
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </section>

      
    </div>
  );
}
