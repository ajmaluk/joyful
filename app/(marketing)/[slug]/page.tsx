"use client";

import { use } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { PromptBox } from '@/components/joyful/marketing/MarketingChrome';
import { sitePageContent } from './sitePageContent';
import { routeMeta } from '@/lib/seo';
import type { ChatAttachment, ChatMode } from '@/lib/types';

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

const revealUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
};

interface SitePageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function SitePage({ params, ...rest }: SitePageProps) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug as keyof typeof sitePageContent;
  const router = useRouter();
  const page = sitePageContent[slug];

  if (!page) {
    router.replace('/');
    return null;
  }

  const Icon = page.icon;
  const related = relatedPages[slug] ?? defaultRelatedPages;
  const path = slug === 'home' ? '/' : `/${slug}`;
  const meta = routeMeta[path] || routeMeta['/'];

  const onStartProject = (prompt: string, mode?: ChatMode, attachments?: ChatAttachment[]) => {
    const searchParams = new URLSearchParams()
    searchParams.set('prompt', prompt)
    if (mode) searchParams.set('mode', mode)
    // NOTE: attachments are not easily serializable via URL query string, usually handled via state/storage in real app
    router.push(`/builder?${searchParams.toString()}`)
  };

  return (
    <>
      
      <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] text-gray-950 dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_20%,#21365f_38%,#3a2040_56%,#4a1030_72%,#4a2010_100%)] dark:text-[#f6f2ea]">
      <section className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_28%,#6e89ff_48%,#ef83df_66%,#f23c78_84%,#ff713a_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.92)_22%,rgba(255,255,255,0.35)_42%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/85 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-lg shadow-indigo-950/10 backdrop-blur dark:border-white/10 dark:bg-[#17181a]/80 dark:text-white">
              <Icon className="h-3.5 w-3.5 text-[#4f7cff]" />
              {page.badge}
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">
              {page.heroNote}
            </p>
            <h1 className="mt-2 max-w-4xl text-balance text-4xl font-bold leading-[1.03] tracking-normal text-gray-950 sm:text-5xl dark:text-white">
              {page.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-gray-600 dark:text-white/70">
              {page.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push('/builder')}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-950/10 transition-transform hover:scale-[1.02] dark:bg-white dark:text-[#171816]"
              >
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => router.push('/docs')}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white/70 px-4 py-2.5 text-xs font-semibold text-gray-800 backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Read docs
              </button>
            </div>
          </motion.div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {page.stats.map((stat, index) => (
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
              <h2 className="text-3xl font-bold tracking-normal text-gray-950 dark:text-white">{page.badge} essentials</h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-[#aaa69d]">
                Important details are grouped into clear, scannable sections so this page feels useful instead of buried.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/contact')}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-[#f6f2ea] dark:hover:bg-white/5"
            >
              Contact us
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {page.highlights.map((feature, index) => {
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
            <p className="text-xs font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">Structured content</p>
            <h2 className="mt-2 text-3xl font-bold tracking-normal text-gray-950 sm:text-4xl dark:text-white">
              Each destination now feels like part of the same product story.
            </h2>
            <div className="mt-6 space-y-5">
              {page.sections.map((item, index) => (
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
            className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-white/8 dark:bg-[#22231f] dark:shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
          >
            <div className="grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
              <div className="flex min-h-64 items-center justify-center rounded-md bg-white dark:bg-[#191a18]">
                <div className="relative h-40 w-40">
                  <div className="absolute left-2 right-2 top-7 h-24 rounded-t-full bg-[linear-gradient(135deg,#ff7340,#e94483_48%,#556fff)] opacity-80" />
                  <div className="absolute bottom-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_25%,#9fb8ff,#e566d6_48%,#ff4c54_76%)] shadow-[0_22px_70px_rgba(233,102,214,0.35)]" />
                </div>
              </div>
              <div className="rounded-md bg-white p-3 dark:bg-[#181916]">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-3 dark:border-white/8">
                  <Icon className="h-4 w-4 text-[#8fa7ff]" />
                  <span className="text-sm font-semibold text-gray-950 dark:text-white">{page.badge}</span>
                </div>
                <div className="space-y-2.5 pt-3">
                  {page.resources.map((resource) => (
                    <button
                      key={resource}
                      type="button"
                      onClick={() => router.push('/docs')}
                      className="group flex w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-2.5 text-left text-xs leading-5 text-gray-700 transition-colors hover:border-gray-300 hover:bg-white dark:border-white/8 dark:bg-white/[0.03] dark:text-[#d6d1c7] dark:hover:bg-white/[0.06]"
                    >
                      <span>{resource}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-400 transition-transform group-hover:translate-x-1 dark:text-white/35" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/templates')}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 py-2.5 text-xs font-bold text-white transition-transform hover:scale-[1.01] dark:bg-[#f5f2ea] dark:text-[#171816]"
                >
                  Explore templates <ArrowRight className="h-4 w-4" />
                </button>
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
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-gray-950 dark:text-white">Keep the {page.badge.toLowerCase()} story connected.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">
              Legal, support, and product education pages work better when visitors can move between them without hunting through the footer.
            </p>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {related.map((item) => (
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
            <Icon className="h-3.5 w-3.5 text-[#4f7cff]" />
            {page.badge}
          </div>
          <h2 className="max-w-4xl text-balance text-4xl font-bold leading-[1.03] tracking-normal text-gray-950 sm:text-5xl lg:text-6xl dark:text-white">Keep building from here</h2>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-gray-700 dark:text-white/70">
            Start a fresh project with the same polished Joyful workspace, then export when it is ready.
          </p>
          <div className="mt-8 w-full">
            <PromptBox onSubmit={onStartProject} />
          </div>
        </motion.div>
      </section>

      
    </div>
    </>
  );
}
