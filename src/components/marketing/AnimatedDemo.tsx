import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  FileCode, MessageSquare, ChevronRight,
  Check, Sparkles,
} from 'lucide-react';

interface DemoStep {
  chat: { role: 'user' | 'ai'; text: string };
  files: string[];
}

const demoSteps: DemoStep[] = [
  {
    chat: { role: 'user', text: 'Build a SaaS landing page with pricing' },
    files: [],
  },
  {
    chat: { role: 'ai', text: 'Creating your landing page with hero, features, and pricing sections...' },
    files: ['index.html', 'style.css', 'script.js'],
  },
  {
    chat: { role: 'user', text: 'Add a dark mode toggle' },
    files: ['index.html', 'style.css', 'script.js'],
  },
  {
    chat: { role: 'ai', text: 'Done! Added a theme toggle in the navbar with smooth transitions.' },
    files: ['index.html', 'style.css', 'script.js'],
  },
];

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
        }
      }, 18);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [inView, text, delay]);

  return <span ref={ref}>{displayed}</span>;
}

export function AnimatedDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">
            See it in action
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-normal text-gray-950 dark:text-white">
            From prompt to page in seconds
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-[#1a1b19] dark:shadow-black/40"
        >
          {/* Window chrome */}
          <div className="flex h-10 items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 dark:border-white/8 dark:bg-[#22231f]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            <span className="ml-3 text-xs text-gray-500 dark:text-[#aaa69d]">Joyful AI Builder</span>
          </div>

          <div className="grid min-h-[360px] lg:grid-cols-[240px_1fr_260px]">
            {/* Mini chat panel */}
            <div className="border-r border-gray-200 bg-gray-50 p-4 dark:border-white/8 dark:bg-[#1f201d]">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-[#d6d1c7]">
                <MessageSquare className="h-3.5 w-3.5" />
                AI Chat
              </div>
              <div className="mt-4 space-y-3">
                {demoSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.6 }}
                    className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      step.chat.role === 'user'
                        ? 'ml-4 bg-[#2f5bff]/10 text-[#2f5bff] dark:bg-[#2f5bff]/15 dark:text-[#8fa7ff]'
                        : 'bg-white text-gray-700 shadow-sm dark:bg-[#2a2b28] dark:text-[#d6d1c7]'
                    }`}
                  >
                    <TypewriterText text={step.chat.text} delay={400 + i * 600} />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Mini preview */}
            <div className="relative flex items-center justify-center bg-gray-100 p-6 dark:bg-[#161714]">
              <div className="w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#1e1f1c]">
                <div className="flex h-7 items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-3 dark:border-white/8 dark:bg-[#252623]">
                  <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>
                <div className="space-y-3 p-5">
                  {/* Mock hero */}
                  <div className="h-5 w-3/5 rounded bg-gradient-to-r from-[#2f5bff]/20 to-[#f23c78]/20" />
                  <div className="h-3 w-4/5 rounded bg-gray-100 dark:bg-white/5" />
                  <div className="h-8 w-24 rounded-full bg-[#2f5bff]/15" />
                  {/* Mock features */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="h-14 rounded bg-gray-100 dark:bg-white/5" />
                    <div className="h-14 rounded bg-gray-100 dark:bg-white/5" />
                    <div className="h-14 rounded bg-gray-100 dark:bg-white/5" />
                  </div>
                  {/* Mock pricing */}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="h-16 rounded border border-gray-200 dark:border-white/10" />
                    <div className="h-16 rounded border-2 border-[#2f5bff]/30" />
                  </div>
                </div>
              </div>

              {/* Status badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.3, delay: 2.8 }}
                className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-600 dark:bg-green-500/15 dark:text-green-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </motion.div>
            </div>

            {/* Mini file explorer */}
            <div className="hidden border-l border-gray-200 bg-gray-50 p-4 lg:block dark:border-white/8 dark:bg-[#1f201d]">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-[#d6d1c7]">
                <FileCode className="h-3.5 w-3.5" />
                Files
              </div>
              <div className="mt-4 space-y-1.5">
                {demoSteps[demoSteps.length - 1].files.map((file, i) => (
                  <motion.div
                    key={file}
                    initial={{ opacity: 0, x: 10 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.3, delay: 1.2 + i * 0.2 }}
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-gray-700 transition-colors hover:bg-white dark:text-[#d6d1c7] dark:hover:bg-[#2a2b28]"
                  >
                    <FileCode className="h-3 w-3 text-[#2f5bff]" />
                    {file}
                    <Check className="ml-auto h-3 w-3 text-green-500" />
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 border-t border-gray-200 pt-4 dark:border-white/8">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-[#d6d1c7]">
                  <Sparkles className="h-3.5 w-3.5 text-[#f23c78]" />
                  Next steps
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {['Add testimonials', 'Improve SEO', 'Deploy'].map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0 }}
                      animate={inView ? { opacity: 1 } : {}}
                      transition={{ duration: 0.3, delay: 2.5 + i * 0.15 }}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-gray-500 dark:text-[#aaa69d]"
                    >
                      <ChevronRight className="h-3 w-3" />
                      {step}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
