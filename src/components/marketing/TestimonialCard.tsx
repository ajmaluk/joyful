import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Quote, Star } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  rating: number;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Sarah Chen',
    role: 'Freelance Designer',
    quote: 'Joyful cut my landing page delivery from days to minutes. The AI understands design intent better than any tool I\'ve used.',
    rating: 5,
    initials: 'SC',
  },
  {
    name: 'Marcus Rivera',
    role: 'Startup Founder',
    quote: 'We launched our product page in under an hour. The live sandbox saved us from back-and-forth with developers.',
    rating: 5,
    initials: 'MR',
  },
  {
    name: 'Aisha Patel',
    role: 'Frontend Engineer',
    quote: 'The generated code is clean and actually usable. No hidden frameworks, no vendor lock-in — just HTML, CSS, and JS.',
    rating: 5,
    initials: 'AP',
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export function TestimonialCard({ testimonial, index }: { testimonial: Testimonial; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.12 }}
      className="group relative rounded-lg border border-gray-200 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl dark:border-white/8 dark:bg-[#22231f] dark:hover:border-white/18 dark:hover:shadow-[0_16px_50px_rgba(0,0,0,0.35)]"
    >
      <Quote className="absolute right-4 top-4 h-6 w-6 text-gray-200 transition-colors group-hover:text-[#2f5bff]/20 dark:text-white/5 dark:group-hover:text-[#2f5bff]/15" />
      <StarRating count={testimonial.rating} />
      <p className="mt-3 text-xs leading-5 text-gray-700 dark:text-[#d6d1c7]">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="mt-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2f5bff] to-[#f23c78] text-[11px] font-bold text-white">
          {testimonial.initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-950 dark:text-white">{testimonial.name}</p>
          <p className="text-xs text-gray-500 dark:text-[#aaa69d]">{testimonial.role}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section ref={ref} className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold uppercase tracking-normal text-indigo-600 dark:text-[#8fa7ff]">
            Loved by builders
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-normal text-gray-950 sm:text-4xl dark:text-white">
            What people are saying
          </h2>
        </motion.div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <TestimonialCard key={t.name} testimonial={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
