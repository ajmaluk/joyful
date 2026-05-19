import { useState, useRef } from 'react';
import { Wand2, Layout, Code2, ShieldCheck, Palette, Download, Terminal, Inspect, Wifi, Gauge, Smartphone, Monitor, Tablet, Layers, GitBranch, Zap } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

interface Feature {
  icon: typeof Wand2;
  title: string;
  desc: string;
}

interface FeatureTab {
  id: string;
  label: string;
  features: Feature[];
}

const tabs: FeatureTab[] = [
  {
    id: 'ai',
    label: 'AI Building',
    features: [
      { icon: Wand2, title: 'Prompt-first generation', desc: 'Describe your site in plain language. Joyful generates semantic HTML, modern CSS, and vanilla JS in seconds.' },
      { icon: Layout, title: 'Smart template routing', desc: '8+ template categories — portfolios, SaaS, restaurants, e-commerce, blogs, dashboards, agencies, events.' },
      { icon: Layers, title: 'Multi-file output', desc: 'Each generation produces index.html, style.css, and script.js with clean separation of concerns.' },
      { icon: GitBranch, title: 'Incremental edits', desc: 'Modify existing files instead of regenerating. Add sections, change themes, fix responsive behavior.' },
    ],
  },
  {
    id: 'sandbox',
    label: 'Sandbox',
    features: [
      { icon: Monitor, title: 'Live preview', desc: 'Instant iframe sandbox with hot-reload. See changes as the AI generates code.' },
      { icon: Terminal, title: 'Console panel', desc: 'Captured console.log, warn, and error output from the preview with level filtering.' },
      { icon: Inspect, title: 'Element inspector', desc: 'Click-to-select elements in the preview. See tag, id, classes, and computed dimensions.' },
      { icon: Wifi, title: 'Network monitor', desc: 'Track fetch and XHR requests from the sandbox with status, size, and timing.' },
    ],
  },
  {
    id: 'code',
    label: 'Code',
    features: [
      { icon: Code2, title: 'Clean output', desc: 'Generated code uses semantic HTML5, CSS custom properties, grid, flexbox, and IntersectionObserver.' },
      { icon: Download, title: 'Export as ZIP', desc: 'Package the finished project into a downloadable ZIP with all files and assets.' },
      { icon: Smartphone, title: 'Responsive by default', desc: 'Mobile-first layouts with clamp(), fluid typography, and proper viewport handling.' },
      { icon: Gauge, title: 'Performance metrics', desc: 'DOM node count, load timing, and memory usage displayed in the sandbox toolbar.' },
    ],
  },
  {
    id: 'design',
    label: 'Design',
    features: [
      { icon: Palette, title: 'Theme tuning', desc: 'Iterate on colors, spacing, fonts, and section hierarchy through conversational prompts.' },
      { icon: Tablet, title: 'Multi-device testing', desc: 'Switch between desktop (1280px), tablet (768px), and mobile (390px) or set custom viewports.' },
      { icon: ShieldCheck, title: 'Safe preview', desc: 'All code runs in a sandboxed iframe. No access to your data, cookies, or external services.' },
      { icon: Zap, title: 'Instant feedback', desc: 'Every edit triggers a debounced preview refresh. No manual save or rebuild required.' },
    ],
  },
];

export function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState('ai');
  const currentTab = tabs.find(t => t.id === activeTab)!;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">Capabilities</p>
          <h2 className="mt-3 text-4xl font-bold tracking-normal text-gray-950 sm:text-5xl dark:text-white">
            Everything you need to build and ship
          </h2>
          <p className="mt-4 text-base text-gray-600 dark:text-[#aaa69d]">Four pillars. One workspace. Zero vendor lock-in.</p>
        </motion.div>

        {/* Tab bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-12 flex justify-center"
        >
          <div className="inline-flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-[#1d1f1d]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-950 dark:text-[#aaa69d] dark:hover:text-white'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-lg bg-gray-950 dark:bg-[#f5f2ea]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Feature cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {currentTab.features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.35 }}
                  className="group relative rounded-xl border border-gray-200 bg-gray-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#2f5bff]/30 hover:shadow-xl dark:border-white/8 dark:bg-[#21221f] dark:hover:border-white/18 dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#2f5bff]/10 text-[#2f5bff] transition-all duration-300 group-hover:bg-[#2f5bff] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-950 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">{feature.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
