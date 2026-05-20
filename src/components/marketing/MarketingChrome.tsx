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
    <div className={`mx-auto w-full ${compact ? 'max-w-xl' : 'max-w-3xl'}`}>
      <div className="rounded-[1.15rem] border border-gray-200/80 bg-white/90 p-2.5 text-left shadow-[0_22px_70px_rgba(15,23,42,0.11)] ring-1 ring-black/5 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_26px_80px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-[#1d1f1d]/90 dark:shadow-[0_22px_70px_rgba(0,0,0,0.3)] dark:ring-black/40 dark:hover:shadow-[0_26px_80px_rgba(0,0,0,0.36)]">
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
          className={`block w-full resize-none bg-transparent px-2.5 text-left font-medium text-gray-900 outline-none placeholder:text-gray-400 dark:text-[#e7e4dc] dark:placeholder:text-gray-500 ${compact ? 'min-h-12 pt-1.5 text-xs' : 'min-h-24 pt-2.5 text-sm sm:text-base'}`}
          aria-label="Describe what you want Joyful to build"
        />
        <div className="flex items-center justify-between gap-2 pt-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Add context"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100/80 text-gray-500 transition-all duration-200 hover:bg-gray-200 hover:text-gray-950 hover:scale-105 hover:shadow-md dark:bg-white/5 dark:text-[#aaa69d] dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="hidden items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-950 sm:flex dark:text-[#aaa69d] dark:hover:bg-white/5 dark:hover:text-white"
            >
              Build <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Voice prompt"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-950 dark:text-[#aaa69d] dark:hover:bg-white/5 dark:hover:text-white"
            >
              <Mic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              aria-label="Start building"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-[#2f5bff] to-[#f23c78] text-white shadow-lg shadow-[#2f5bff]/25 transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-[#2f5bff]/40 active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
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
    <footer className="relative overflow-hidden border-t border-gray-200 bg-gray-50 px-4 py-12 shadow-[0_-18px_60px_rgba(15,23,42,0.05)] sm:px-6 lg:px-8 dark:border-white/10 dark:bg-[#10110f] dark:shadow-[0_-18px_60px_rgba(0,0,0,0.24)]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#2f5bff]/5 dark:to-[#2f5bff]/10" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-[1.2fr_3fr]">
          <div>
            <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3">
              <BrandLogo className="h-9 w-9" showText />
            </button>
            <p className="mt-4 max-w-xs text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">
              Build beautiful websites in minutes with AI. No coding required, export anytime.
            </p>
            <div className="mt-5 flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#aaa69d]">
                <Zap className="h-4 w-4 text-[#2f5bff]" />
                <span>100% Free</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#aaa69d]">
                <Heart className="h-4 w-4 text-[#f23c78]" />
                <span>Open Source</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:gap-8">
            {Object.entries(marketingFooterLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-[#aaa69d]">{category}</h3>
                <ul className="mt-4 space-y-3">
                  {links.map((link) => (
                    <li key={link}>
                      <button
                        type="button"
                        onClick={() => navigate(marketingFooterRoutes[link] ?? '/docs')}
                        className="text-left text-sm text-gray-600 transition-all hover:text-[#2f5bff] hover:translate-x-1 dark:text-[#aaa69d] dark:hover:text-white"
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
        <div className="mt-10 flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-white/8">
          <div className="flex items-center gap-4">
            <p className="text-xs text-gray-500 dark:text-[#aaa69d]">&copy; 2026 Joyful. All rights reserved.</p>
            <span className="hidden text-sm text-gray-400 dark:text-gray-600 sm:inline">•</span>
            <p className="text-xs text-gray-400 dark:text-[#6f6b64]">Made with care in San Francisco</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-all hover:border-[#2f5bff] hover:text-[#2f5bff] dark:border-white/10 dark:text-[#aaa69d] dark:hover:border-white/20 dark:hover:text-white"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-all hover:border-[#2f5bff] hover:text-[#2f5bff] dark:border-white/10 dark:text-[#aaa69d] dark:hover:border-white/20 dark:hover:text-white"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="mailto:hello@joyful.com"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-all hover:border-[#2f5bff] hover:text-[#2f5bff] dark:border-white/10 dark:text-[#aaa69d] dark:hover:border-white/20 dark:hover:text-white"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
