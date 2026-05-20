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
  const [activeStep, setActiveStep] = useState(0);
  const progressWidths = ['28%', '54%', '78%', '100%'];

  useEffect(() => {
    if (!inView) return;
    const interval = window.setInterval(() => {
      setActiveStep((step) => (step + 1) % demoSteps.length);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [inView]);

  return (
    <section ref={ref} className="relative isolate flex min-h-[82vh] items-center overflow-hidden px-4 py-14 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_24%,#dbe1ff_48%,#eee4ff_72%,#fff0e6_100%)] dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_24%,#21365f_50%,#3a2040_76%,#4a2010_100%)]" />
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(99,135,255,0.22),rgba(240,150,220,0.14)_42%,transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(99,135,255,0.18),rgba(240,150,220,0.12)_42%,transparent_70%)]"
        animate={{ scale: [1, 1.08, 1], opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">
            See it in action
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-normal text-gray-950 sm:text-4xl dark:text-white">
            From prompt to page in seconds
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white/92 shadow-xl shadow-indigo-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1b19]/95 dark:shadow-black/40"
        >
          {/* Window chrome */}
          <div className="flex h-9 items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 dark:border-white/8 dark:bg-[#22231f]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            <span className="ml-3 text-xs text-gray-500 dark:text-[#aaa69d]">Joyful AI Builder</span>
          </div>

          <div className="grid min-h-[340px] lg:grid-cols-[210px_1fr_220px]">
            {/* Mini chat panel */}
            <div className="border-r border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-[#1f201d]">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-[#d6d1c7]">
                <MessageSquare className="h-3.5 w-3.5" />
                AI Chat
              </div>
              <div className="mt-3 space-y-2.5">
                {demoSteps.map((step, i) => {
                  const isActive = activeStep === i;
                  const hasPlayed = activeStep >= i;
                  return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={inView ? { opacity: hasPlayed ? 1 : 0.45, x: 0, scale: isActive ? 1.025 : 1 } : {}}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.6 }}
                    className={`rounded-md border px-2.5 py-2 text-[11px] leading-relaxed transition-colors ${
                      step.chat.role === 'user'
                        ? 'ml-4 border-[#2f5bff]/15 bg-[#2f5bff]/10 text-[#2f5bff] dark:bg-[#2f5bff]/15 dark:text-[#8fa7ff]'
                        : 'border-gray-200 bg-white text-gray-700 shadow-sm dark:border-white/8 dark:bg-[#2a2b28] dark:text-[#d6d1c7]'
                    }`}
                  >
                    <TypewriterText text={step.chat.text} delay={400 + i * 600} />
                  </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Mini preview */}
            <div className="relative flex items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#f8faff,#f5f0ff_48%,#fff7f2)] p-4 dark:bg-[linear-gradient(135deg,#161714,#202238_48%,#241822)]">
              <motion.div
                className="absolute inset-x-8 top-8 h-20 rounded-full bg-[linear-gradient(90deg,rgba(47,91,255,0.18),rgba(242,60,120,0.12),rgba(255,113,58,0.12))] blur-3xl"
                animate={{ x: ['-8%', '8%', '-8%'], opacity: [0.35, 0.75, 0.35] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="relative w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl shadow-indigo-950/10 dark:border-white/10 dark:bg-[#1e1f1c]"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="flex h-7 items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-3 dark:border-white/8 dark:bg-[#252623]">
                  <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>
                <div className="space-y-2.5 p-4">
                  {/* Mock hero */}
                  <motion.div
                    className="h-4 rounded bg-gradient-to-r from-[#2f5bff]/24 via-[#a78bfa]/24 to-[#f23c78]/24"
                    animate={{ width: progressWidths[activeStep] }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="h-3 rounded bg-gray-100 dark:bg-white/5"
                    animate={{ width: activeStep > 0 ? '80%' : '46%' }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="h-7 rounded-full bg-[#2f5bff]/15"
                    animate={{ width: activeStep > 1 ? 112 : 84, opacity: activeStep > 0 ? 1 : 0.55 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                  {/* Mock features */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((card) => (
                      <motion.div
                        key={card}
                        className="h-11 rounded bg-gray-100 dark:bg-white/5"
                        animate={{ opacity: activeStep >= 1 ? 1 : 0.45, y: activeStep >= 1 ? 0 : 8 }}
                        transition={{ duration: 0.35, delay: card * 0.08 }}
                      />
                    ))}
                  </div>
                  {/* Mock pricing */}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[0, 1].map((card) => (
                      <motion.div
                        key={card}
                        className={`h-12 rounded ${card === 1 ? 'border-2 border-[#2f5bff]/30' : 'border border-gray-200 dark:border-white/10'}`}
                        animate={{ opacity: activeStep >= 2 ? 1 : 0.45, y: activeStep >= 2 ? 0 : 8 }}
                        transition={{ duration: 0.35, delay: card * 0.1 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Status badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.6, delay: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-600 dark:bg-green-500/15 dark:text-green-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </motion.div>
            </div>

            {/* Mini file explorer */}
            <div className="hidden border-l border-gray-200 bg-gray-50 p-3 lg:block dark:border-white/8 dark:bg-[#1f201d]">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-[#d6d1c7]">
                <FileCode className="h-3.5 w-3.5" />
                Files
              </div>
              <div className="mt-4 space-y-1.5">
                {demoSteps[demoSteps.length - 1].files.map((file, i) => (
                  <motion.div
                    key={file}
                    initial={{ opacity: 0, x: 10 }}
                    animate={inView ? { opacity: activeStep >= 1 ? 1 : 0.35, x: 0 } : {}}
                    transition={{ duration: 0.3, delay: 1.2 + i * 0.2 }}
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-gray-700 transition-colors hover:bg-white dark:text-[#d6d1c7] dark:hover:bg-[#2a2b28]"
                  >
                    <FileCode className="h-3 w-3 text-[#2f5bff]" />
                    {file}
                    <Check className="ml-auto h-3 w-3 text-green-500" />
                  </motion.div>
                ))}
              </div>

              <div className="mt-5 border-t border-gray-200 pt-3 dark:border-white/8">
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
