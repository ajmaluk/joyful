"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { motion } from 'framer-motion';
import { Calendar, Clock, User, Search, ArrowRight, Sparkles, Tag } from 'lucide-react';
import { blogPosts, blogCategories, type BlogPost } from '@/data/joyful/blog';
import { PromptBox } from '@/components/joyful/marketing/MarketingChrome';
import { routeMeta } from '@/lib/seo';
import type { ChatAttachment, ChatMode } from '@/lib/types';

interface BlogListPageProps {
  onStartProject?: (prompt: string, mode?: ChatMode, attachments?: ChatAttachment[]) => void;
}

function BlogCard({ post, index }: { post: BlogPost; index: number }) {
  const router = useRouter();

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200/60 bg-white/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl dark:border-white/8 dark:bg-[#211f1b]/60 dark:hover:border-white/18 dark:hover:shadow-[0_18px_60px_rgba(0,0,0,0.38)]"
    >
      <button
        type="button"
        onClick={() => router.push(`/blog/${post.slug}`)}
        className="flex flex-col text-left"
      >
        {/* Image placeholder */}
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/40">
          {post.image ? (
            <img
              src={post.image}
              alt={post.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-12 w-12 text-indigo-300/50 dark:text-indigo-500/30" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-700 backdrop-blur-sm dark:bg-gray-900/80 dark:text-gray-200">
              <Tag className="h-3 w-3" />
              {post.category}
            </span>
          </div>
          {post.featured && (
            <div className="absolute right-3 top-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-1 text-[11px] font-semibold text-amber-900 backdrop-blur-sm">
                <Sparkles className="h-3 w-3" />
                Featured
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-lg font-bold text-gray-950 leading-snug group-hover:text-indigo-600 transition-colors dark:text-white dark:group-hover:text-indigo-400">
            {post.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-600 line-clamp-2 dark:text-[#aaa69d]">
            {post.description}
          </p>

          <div className="mt-auto pt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-[#7d7a73]">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {post.readTime} min read
            </span>
          </div>
        </div>
      </button>
    </motion.article>
  );
}

export default function BlogListPage({ onStartProject }: BlogListPageProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const meta = routeMeta['/blog'];

  const featuredPosts = blogPosts.filter((p) => p.featured);

  const filteredPosts = blogPosts.filter((post) => {
    const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      post.title.toLowerCase().includes(query) ||
      post.description.toLowerCase().includes(query) ||
      post.tags.some((t) => t.toLowerCase().includes(query)) ||
      post.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] text-gray-950 dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_20%,#21365f_38%,#3a2040_56%,#4a1030_72%,#4a2010_100%)] dark:text-[#f6f2ea]">
      

      {/* Hero */}
      <section className="relative isolate min-h-[60vh] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_28%,#6e89ff_48%,#ef83df_66%,#f23c78_84%,#ff713a_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.92)_22%,rgba(255,255,255,0.35)_42%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[60vh] max-w-6xl flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/85 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-lg shadow-indigo-950/10 backdrop-blur dark:border-white/10 dark:bg-[#17181a]/80 dark:text-white">
              <Sparkles className="h-3.5 w-3.5 text-[#4f7cff]" />
              Product updates & stories
            </div>
            <h1 className="mt-6 max-w-4xl text-balance text-4xl font-bold leading-[1.03] tracking-normal text-gray-950 sm:text-5xl dark:text-white">
              The Joyful Blog
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-gray-600 dark:text-white/70">
              Product updates, tutorials, guides, and deeper stories about building with Joyful.
            </p>
          </motion.div>

          {/* Featured posts */}
          {featuredPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Featured articles</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {featuredPosts.slice(0, 3).map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => router.push(`/blog/${post.slug}`)}
                    className="group relative overflow-hidden rounded-xl border border-gray-200/70 bg-white/70 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/50 hover:shadow-xl dark:border-white/10 dark:bg-black/30 dark:hover:border-amber-500/30"
                  >
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{post.category}</span>
                    <h3 className="mt-2 text-base font-bold text-gray-950 dark:text-white group-hover:text-indigo-600 transition-colors dark:group-hover:text-indigo-400">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2 dark:text-[#aaa69d]">{post.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-[#7d7a73]">
                      <span>{post.readTime} min read</span>
                      <span>·</span>
                      <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Filters and search */}
      <section className="border-y border-gray-200/60 bg-white/60 px-4 py-6 backdrop-blur-sm sm:px-6 lg:px-8 dark:border-white/8 dark:bg-[#171816]/60">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {blogCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200 ${
                    activeCategory === cat
                      ? 'bg-gray-950 text-white shadow-md dark:bg-[#f5f2ea] dark:text-[#171816]'
                      : 'border border-gray-200/60 bg-gray-50/60 text-gray-600 hover:border-gray-300 hover:bg-white hover:text-gray-950 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#aaa69d] dark:hover:border-white/20 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#aaa69d]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="h-10 w-full rounded-lg border border-gray-200/60 bg-white/60 pl-9 pr-4 text-sm font-medium text-gray-950 outline-none placeholder:text-gray-400 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/20 sm:w-72 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Blog grid */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200/60 bg-white/60 px-6 py-20 text-center backdrop-blur-sm dark:border-white/8 dark:bg-white/[0.02]">
              <Search className="mb-4 h-8 w-8 text-gray-400 dark:text-[#aaa69d]" />
              <h2 className="text-lg font-bold text-gray-950 dark:text-white">No articles found</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-[#aaa69d]">
                Try a different category or search term.
              </p>
              <button
                type="button"
                onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white dark:bg-[#f5f2ea] dark:text-[#171816]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post, index) => (
                <BlogCard key={post.id} post={post} index={index} />
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Articles', value: blogPosts.length.toString(), icon: <Sparkles className="h-5 w-5" /> },
              { label: 'Categories', value: (blogCategories.length - 1).toString(), icon: <Tag className="h-5 w-5" /> },
              { label: 'Topics', value: new Set(blogPosts.flatMap((p) => p.tags)).size.toString(), icon: <Search className="h-5 w-5" /> },
              { label: 'Read time', value: `${blogPosts.reduce((acc, p) => acc + p.readTime, 0)} min`, icon: <Clock className="h-5 w-5" /> },
            ].map((stat) => (
              <div
                key={stat.label}
                className="group rounded-xl border border-gray-200/60 bg-white/60 p-4 text-center backdrop-blur-sm transition-all duration-300 hover:border-gray-300 hover:bg-white dark:border-white/8 dark:bg-white/[0.03] dark:hover:border-white/16"
              >
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white">
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-gray-950 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-600 dark:text-[#aaa69d]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate min-h-[50vh] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_28%,#6e89ff_48%,#ef83df_66%,#f23c78_84%,#ff713a_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.92)_22%,rgba(255,255,255,0.35)_42%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[50vh] w-full max-w-6xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="max-w-4xl text-balance text-4xl font-bold leading-[1.03] tracking-normal text-gray-950 sm:text-5xl dark:text-white">
            Start building something Joyful
          </h2>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-gray-700 dark:text-white/70">
            Describe your idea and watch it come to life — no setup, no cloud costs.
          </p>
          <div className="mt-8 w-full max-w-xl">
            <PromptBox onSubmit={onStartProject} />
          </div>
          <button
            type="button"
            onClick={() => router.push('/blog')}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-950 transition-colors dark:text-gray-300 dark:hover:text-white"
          >
            Back to all articles <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      
    </div>
  );
}
