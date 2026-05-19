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

export function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    storage.setAuthenticated(true);
    navigate('/dashboard');
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Start a new Joyful workspace and turn your first prompt into a working website."
      switchText="Already have an account?"
      switchAction="Log in"
      switchTo="/login"
    >
      <div className="space-y-3">
        <ProviderButton provider="Google" marker={<GoogleMarker />} />
        <ProviderButton provider="GitHub" marker={<GithubMarker />} />
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
        <span className="text-xs font-semibold uppercase tracking-normal text-gray-500 dark:text-[#aaa69d]">or</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="signup-name" className="mb-2 block text-sm font-bold text-gray-950 dark:text-[#f6f2ea]">
            Name
          </label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            required
            className="h-11 w-full rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-950 outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18"
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="mb-2 block text-sm font-bold text-gray-950 dark:text-[#f6f2ea]">
            Email
          </label>
          <input
            id="signup-email"
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
          <label htmlFor="signup-password" className="mb-2 block text-sm font-bold text-gray-950 dark:text-[#f6f2ea]">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            autoComplete="new-password"
            minLength={8}
            required
            className="h-11 w-full rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-950 outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18"
          />
          <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-[#aaa69d]">Use at least 8 characters.</p>
        </div>

        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 text-sm font-bold text-white transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#6387ff]/70 dark:bg-[#f5f2ea] dark:text-[#171816]"
        >
          Create account <SubmitIcon />
        </button>
      </form>

      <p className="mt-4 text-center text-xs leading-5 text-gray-500 dark:text-[#aaa69d]">
        By creating an account, you agree to the Terms and Privacy Policy.
      </p>
    </AuthShell>
  );
}
