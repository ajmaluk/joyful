import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { ArrowRight, Github, Mail, Mic, Plus, Send, Twitter, Heart, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { marketingFooterLinks, marketingFooterRoutes } from '@/components/marketing/marketingRoutes';

const promptExamples = [
  "Landing page for a SaaS startup",
  "Portfolio with dark mode",
  "Restaurant website with menu",
  "E-commerce product page",
];

let currentExample = 0;

interface PromptBoxProps {
  compact?: boolean;
  onSubmit?: (prompt: string) => void;
}

export function PromptBox({ compact = false, onSubmit }: PromptBoxProps) {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [placeholder, setPlaceholder] = useState(promptExamples[0]);

  useEffect(() => {
    if (compact) return;
    const interval = setInterval(() => {
      currentExample = (currentExample + 1) % promptExamples.length;
      setPlaceholder(promptExamples[currentExample]);
    }, 3000);
    return () => clearInterval(interval);
  }, [compact]);

  const handleSubmit = () => {
    const trimmedPrompt = prompt.trim();
    if (onSubmit) {
      onSubmit(trimmedPrompt);
    } else {
      navigate('/builder', { state: { prompt: trimmedPrompt } });
    }
  };

  const handleInput = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, compact ? 112 : 180)}px`;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`mx-auto w-full ${compact ? 'max-w-2xl' : 'max-w-4xl'}`}>
      <div className="rounded-[1.45rem] border border-gray-200 bg-white p-3 text-left shadow-[0_28px_90px_rgba(15,23,42,0.16)] ring-1 ring-black/5 dark:border-white/10 dark:bg-[#1d1f1d] dark:shadow-[0_28px_90px_rgba(0,0,0,0.38)] dark:ring-black/40">
        <textarea
          ref={textareaRef}
          value={prompt}
          rows={compact ? 2 : 4}
          onChange={(event) => {
            setPrompt(event.target.value);
            handleInput();
          }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={compact ? 'Ask Joyful to create...' : placeholder}
          className={`block w-full resize-none bg-transparent px-3 text-left font-medium text-gray-900 outline-none placeholder:text-gray-400 dark:text-[#e7e4dc] dark:placeholder:text-gray-500 ${compact ? 'min-h-16 pt-2 text-sm' : 'min-h-28 pt-3 text-base sm:text-lg'}`}
          aria-label="Describe what you want Joyful to build"
        />
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Add context"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-950 dark:bg-white/5 dark:text-[#aaa69d] dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-950 sm:flex dark:text-[#aaa69d] dark:hover:bg-white/5 dark:hover:text-white"
            >
              Build <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Voice prompt"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-950 dark:text-[#aaa69d] dark:hover:bg-white/5 dark:hover:text-white"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              aria-label="Start building"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#2f5bff] to-[#f23c78] text-white shadow-lg shadow-[#2f5bff]/25 transition-transform hover:scale-105 hover:shadow-xl"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingFooter() {
  const navigate = useNavigate();

  return (
    <footer className="relative overflow-hidden border-t border-gray-200 bg-gray-50 px-4 py-16 shadow-[0_-24px_80px_rgba(15,23,42,0.06)] sm:px-6 lg:px-8 dark:border-white/10 dark:bg-[#10110f] dark:shadow-[0_-24px_80px_rgba(0,0,0,0.28)]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#2f5bff]/5 dark:to-[#2f5bff]/10" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-[1.2fr_3fr]">
          <div>
            <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3">
              <BrandLogo className="h-12 w-12" showText />
            </button>
            <p className="mt-6 max-w-sm text-base leading-7 text-gray-600 dark:text-[#aaa69d]">
              Build beautiful websites in minutes with AI. No coding required, export anytime.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#aaa69d]">
                <Zap className="h-4 w-4 text-[#2f5bff]" />
                <span>100% Free</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#aaa69d]">
                <Heart className="h-4 w-4 text-[#f23c78]" />
                <span>Open Source</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">
            {Object.entries(marketingFooterLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-[#aaa69d]">{category}</h3>
                <ul className="mt-5 space-y-4">
                  {links.map((link) => (
                    <li key={link}>
                      <button
                        type="button"
                        onClick={() => navigate(marketingFooterRoutes[link] ?? '/docs')}
                        className="text-left text-base text-gray-600 transition-all hover:text-[#2f5bff] hover:translate-x-1 dark:text-[#aaa69d] dark:hover:text-white"
                      >
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-col gap-6 border-t border-gray-200 pt-8 sm:flex-row sm:items-center sm:justify-between dark:border-white/8">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-[#aaa69d]">&copy; 2026 Joyful. All rights reserved.</p>
            <span className="hidden text-sm text-gray-400 dark:text-gray-600 sm:inline">•</span>
            <p className="text-sm text-gray-400 dark:text-[#6f6b64]">Made with care in San Francisco</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-all hover:border-[#2f5bff] hover:text-[#2f5bff] dark:border-white/10 dark:text-[#aaa69d] dark:hover:border-white/20 dark:hover:text-white"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-all hover:border-[#2f5bff] hover:text-[#2f5bff] dark:border-white/10 dark:text-[#aaa69d] dark:hover:border-white/20 dark:hover:text-white"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="mailto:hello@joyful.com"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-all hover:border-[#2f5bff] hover:text-[#2f5bff] dark:border-white/10 dark:text-[#aaa69d] dark:hover:border-white/20 dark:hover:text-white"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
