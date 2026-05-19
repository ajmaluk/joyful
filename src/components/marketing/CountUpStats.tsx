import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface CountUpStatsProps {
  stats: { value: string; label: string }[];
}

function parseNumericPart(raw: string): { prefix: string; target: number; suffix: string } {
  const match = raw.match(/^(\D*)(\d+)(.*)$/);
  if (!match) return { prefix: '', target: 0, suffix: raw };
  return { prefix: match[1], target: parseInt(match[2], 10), suffix: match[3] };
}

function CountUpNumber({ raw, inView }: { raw: string; inView: boolean }) {
  const [current, setCurrent] = useState(0);
  const { prefix, target, suffix } = parseNumericPart(raw);

  useEffect(() => {
    if (!inView || target === 0) {
      if (inView && target === 0) setCurrent(0);
      return;
    }

    let frame: number;
    const duration = 1200;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  return (
    <span>
      {prefix}
      {current}
      {suffix}
    </span>
  );
}

export function CountUpStats({ stats }: CountUpStatsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <div ref={ref} className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          className="group min-h-44 rounded-lg border border-gray-200 bg-gray-50 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg dark:border-white/8 dark:bg-[#22231f] dark:hover:border-white/16 dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
        >
          <div className="text-5xl font-bold tracking-normal text-gray-950 transition-colors duration-300 dark:text-white dark:group-hover:text-[#8fa7ff]">
            <CountUpNumber raw={stat.value} inView={inView} />
          </div>
          <div className="mt-16 text-sm font-medium text-gray-600 dark:text-[#aaa69d]">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
