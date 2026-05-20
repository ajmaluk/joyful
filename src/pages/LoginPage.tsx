import { useState, type FormEvent } from 'react';
import {
  AuthShell,
  GithubMarker,
  GoogleMarker,
  ProviderButton,
  SubmitIcon,
} from '@/components/auth/AuthShell';
import { signInWithEmail, signInWithGithub, signInWithGoogle } from '@/services/firebase';
import { AlertCircle } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (action: () => Promise<unknown>) => {
    setError('');
    setIsLoading(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleAuth(() => signInWithEmail(email, password));
  };

  return (
    <AuthShell
      title="Log in"
      subtitle="Continue building your pages, templates, and exports from the same workspace."
      switchText="Don't have an account?"
      switchAction="Create your account"
      switchTo="/signup"
    >
      <div className="space-y-2">
        <ProviderButton provider="Google" marker={<GoogleMarker />} disabled={isLoading} onClick={() => void handleAuth(signInWithGoogle)} />
        <ProviderButton provider="GitHub" marker={<GithubMarker />} disabled={isLoading} onClick={() => void handleAuth(signInWithGithub)} />
      </div>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
        <span className="text-xs font-semibold uppercase tracking-normal text-gray-500 dark:text-[#aaa69d]">or</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-2.5 py-2 text-xs font-medium text-red-500">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <span>{error}</span>
          </div>
        )}
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold text-gray-950 dark:text-[#f6f2ea]">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="you@gmail.com"
            autoComplete="email"
            required
            className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-xs font-medium text-gray-950 outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="block text-xs font-bold text-gray-950 dark:text-[#f6f2ea]">
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
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-xs font-medium text-gray-950 outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-3 text-xs font-bold text-white transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#6387ff]/70 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 dark:bg-[#f5f2ea] dark:text-[#171816]"
        >
          {isLoading ? 'Signing in...' : <>Continue <SubmitIcon /></>}
        </button>
      </form>
    </AuthShell>
  );
}
