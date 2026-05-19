import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AuthShell,
  GithubMarker,
  GoogleMarker,
  ProviderButton,
  SubmitIcon,
} from '@/components/auth/AuthShell';
import * as storage from '@/services/storage';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    storage.setAuthenticated(true);
    navigate('/dashboard');
  };

  return (
    <AuthShell
      title="Log in"
      subtitle="Continue building your pages, templates, and exports from the same workspace."
      switchText="Don't have an account?"
      switchAction="Create your account"
      switchTo="/signup"
    >
      <div className="space-y-3">
        <ProviderButton provider="Google" marker={<GoogleMarker />} lastUsed />
        <ProviderButton provider="GitHub" marker={<GithubMarker />} />
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
        <span className="text-xs font-semibold uppercase tracking-normal text-gray-500 dark:text-[#aaa69d]">or</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-2 block text-sm font-bold text-gray-950 dark:text-[#f6f2ea]">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="h-11 w-full rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-950 outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="block text-sm font-bold text-gray-950 dark:text-[#f6f2ea]">
              Password
            </label>
            <button
              type="button"
              className="text-xs font-semibold text-gray-500 underline underline-offset-4 transition-colors hover:text-gray-950 dark:text-[#aaa69d] dark:hover:text-white"
            >
              Forgot?
            </button>
          </div>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            className="h-11 w-full rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-950 outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18"
          />
        </div>

        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 text-sm font-bold text-white transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#6387ff]/70 dark:bg-[#f5f2ea] dark:text-[#171816]"
        >
          Continue <SubmitIcon />
        </button>
      </form>
    </AuthShell>
  );
}
