"use client";

import { useRouter } from 'next/navigation';

import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowLeft, Tag, Sparkles } from 'lucide-react';
import { getBlogPostBySlug, getRelatedPosts } from '@/data/joyful/blog';
import { PromptBox } from '@/components/joyful/marketing/MarketingChrome';
import { SITE_URL } from '@/lib/seo';
import type { ChatAttachment, ChatMode } from '@/lib/types';

interface BlogPostPageProps {
  onStartProject?: (prompt: string, mode?: ChatMode, attachments?: ChatAttachment[]) => void;
}

function renderContent(content: string): string {
  // Convert markdown-style content to HTML
  return content
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // Code blocks
      if (trimmed.startsWith('```')) {
        const lines = trimmed.split('\n');
        const code = lines.slice(1, -1).join('\n');
        return `<pre class="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 dark:border-white/10 dark:bg-[#181916] dark:text-[#d6d1c7]"><code class="font-mono text-[13px]">${escapeHtml(code)}</code></pre>`;
      }

      // Headings
      if (trimmed.startsWith('## ')) {
        return `<h2 class="mt-10 mb-4 text-2xl font-bold text-gray-950 dark:text-white">${escapeHtml(trimmed.slice(3))}</h2>`;
      }
      if (trimmed.startsWith('### ')) {
        return `<h3 class="mt-8 mb-3 text-xl font-bold text-gray-950 dark:text-white">${escapeHtml(trimmed.slice(4))}</h3>`;
      }

      // Unordered lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split('\n').map((line) => {
          const text = line.replace(/^[-*]\s+/, '');
          return `<li class="text-sm leading-7 text-gray-700 dark:text-[#d6d1c7]">${escapeHtml(text)}</li>`;
        });
        return `<ul class="ml-5 list-disc space-y-1">${items.join('')}</ul>`;
      }

      // Ordered lists
      if (/^\d+\.\s/.test(trimmed)) {
        const items = trimmed.split('\n').map((line) => {
          const text = line.replace(/^\d+\.\s+/, '');
          return `<li class="text-sm leading-7 text-gray-700 dark:text-[#d6d1c7]">${escapeHtml(text)}</li>`;
        });
        return `<ol class="ml-5 list-decimal space-y-1">${items.join('')}</ol>`;
      }

      // Checkboxes
      if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
        const items = trimmed.split('\n').map((line) => {
          const checked = line.startsWith('- [x]');
          const text = line.replace(/^- \[[x ]\]\s+/, '');
          return `<li class="flex items-start gap-2 text-sm leading-7 text-gray-700 dark:text-[#d6d1c7]">
            <span class="mt-1.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-gray-400 ${
              checked ? 'bg-indigo-500 border-indigo-500' : ''
            }">
              ${checked ? '<svg class="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>' : ''}
            </span>
            ${escapeHtml(text)}
          </li>`;
        });
        return `<ul class="space-y-1">${items.join('')}</ul>`;
      }

      // Regular paragraph
      return `<p class="text-sm leading-7 text-gray-700 dark:text-[#d6d1c7]">${escapeHtml(trimmed)}</p>`;
    })
    .join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

import { useParams } from 'next/navigation';
export default function BlogPostPage({ onStartProject }: BlogPostPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const post = slug ? getBlogPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#10110f]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Article not found</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-[#aaa69d]">
            The article you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <button
            type="button"
            onClick={() => router.push('/blog')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white dark:bg-[#f5f2ea] dark:text-[#171816]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to blog
          </button>
        </div>
      </div>
    );
  }

  const relatedPosts = getRelatedPosts(post, 3);
  const postTitle = `${post.title} - Joyful Blog`;
  const postDescription = post.description;
  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const ogImage = post.image || `${SITE_URL}/og-image.png`;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] text-gray-950 dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_20%,#21365f_38%,#3a2040_56%,#4a1030_72%,#4a2010_100%)] dark:text-[#f6f2ea]">
      

      {/* Back button */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.push('/blog')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-950 transition-colors dark:text-[#aaa69d] dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to blog
        </button>
      </div>

      {/* Article header */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_28%,#6e89ff_48%,#ef83df_66%,#f23c78_84%,#ff713a_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.92)_22%,rgba(255,255,255,0.35)_42%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur-sm dark:bg-gray-900/60 dark:text-gray-200">
                <Tag className="h-3 w-3" />
                {post.category}
              </span>
              {post.featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/80 px-3 py-1 text-xs font-semibold text-amber-900">
                  <Sparkles className="h-3 w-3" />
                  Featured
                </span>
              )}
            </div>
            <h1 className="max-w-4xl text-balance text-3xl font-bold leading-[1.08] tracking-normal text-gray-950 sm:text-4xl lg:text-5xl dark:text-white">
              {post.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-gray-600 dark:text-white/70">
              {post.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-gray-500 dark:text-[#aaa69d]">
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {post.author.charAt(0)}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{post.author}</span>
                <span className="text-gray-400 dark:text-[#7d7a73]">{post.authorRole}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readTime} min read
              </span>
            </div>
            {post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-white/60 px-2.5 py-1 text-xs font-medium text-gray-600 backdrop-blur-sm dark:bg-white/[0.05] dark:text-[#aaa69d]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Article content */}
      <section className="border-y border-gray-200/60 bg-white/60 px-4 py-12 backdrop-blur-sm sm:px-6 lg:px-8 dark:border-white/8 dark:bg-[#171816]/60">
        <div className="mx-auto max-w-3xl">
          <motion.article
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="prose-custom space-y-4"
            dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
          />
        </div>
      </section>

      {/* Author card */}
      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-gray-200/60 bg-white/60 p-6 backdrop-blur-sm dark:border-white/8 dark:bg-[#211f1b]/60">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-base font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                {post.author.charAt(0)}
              </span>
              <div>
                <p className="text-base font-bold text-gray-950 dark:text-white">{post.author}</p>
                <p className="text-sm text-gray-600 dark:text-[#aaa69d]">{post.authorRole}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="border-y border-gray-200/60 bg-white/60 px-4 py-12 backdrop-blur-sm sm:px-6 lg:px-8 dark:border-white/8 dark:bg-[#171816]/60">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-gray-950 dark:text-white">Related articles</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-[#aaa69d]">Continue reading from the Joyful blog</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {relatedPosts.map((related, i) => (
                <motion.button
                  key={related.id}
                  type="button"
                  onClick={() => router.push(`/blog/${related.slug}`)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="group flex flex-col rounded-xl border border-gray-200/60 bg-white/60 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl dark:border-white/8 dark:bg-[#211f1b]/60 dark:hover:border-white/18"
                >
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{related.category}</span>
                  <h3 className="mt-2 text-sm font-bold text-gray-950 dark:text-white group-hover:text-indigo-600 transition-colors dark:group-hover:text-indigo-400">
                    {related.title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-gray-600 line-clamp-2 dark:text-[#aaa69d]">
                    {related.description}
                  </p>
                  <div className="mt-auto pt-3 text-xs text-gray-500 dark:text-[#7d7a73]">
                    {related.readTime} min read
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative isolate min-h-[50vh] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_28%,#6e89ff_48%,#ef83df_66%,#f23c78_84%,#ff713a_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.92)_22%,rgba(255,255,255,0.35)_42%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[50vh] w-full max-w-6xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/85 px-3 py-1.5 text-xs font-semibold text-gray-900 backdrop-blur dark:border-white/10 dark:bg-[#17181a]/80 dark:text-white">
            <Sparkles className="h-3.5 w-3.5 text-[#4f7cff]" />
            Keep building
          </span>
          <h2 className="max-w-4xl text-balance text-4xl font-bold leading-[1.03] tracking-normal text-gray-950 sm:text-5xl dark:text-white">
            Ready to build something Joyful?
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
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-950 transition-colors dark:text-[#aaa69d] dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to all articles
          </button>
        </div>
      </section>

      
    </div>
  );
}
