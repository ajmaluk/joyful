import { useState } from 'react';
import { Github, AlertCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { createAccountWithEmail, isGmailAddress, signInWithGithub, signInWithGoogle } from '@/services/firebase';

export function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Enter a valid email';
    else if (!isGmailAddress(email)) newErrors.email = 'Use a @gmail.com email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Use at least 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await createAccountWithEmail(name, email, password);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not create your account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignup = async (provider: 'google' | 'github') => {
    setAuthError('');
    setIsLoading(true);
    try {
      await (provider === 'google' ? signInWithGoogle() : signInWithGithub());
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not continue with that provider.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start building beautiful websites in minutes."
      switchText="Already have an account?"
      switchAction="Log in"
      switchTo="/login"
    >
      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => void handleSocialSignup('google')}
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.06]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => void handleSocialSignup('github')}
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-gray-900 px-4 text-sm font-semibold text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          <Github className="h-5 w-5" />
          Continue with GitHub
        </button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
        <span className="text-xs font-semibold uppercase tracking-normal text-gray-500 dark:text-[#aaa69d]">or</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {authError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{authError}</span>
          </div>
        )}
        <div>
          <label htmlFor="signup-name" className="mb-2 block text-sm font-semibold text-gray-950 dark:text-[#f6f2ea]">
            Full name
          </label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setAuthError(''); setErrors(prev => ({ ...prev, name: undefined })); }}
            placeholder="John Doe"
            autoComplete="name"
            className={`h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-gray-950 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18 ${
              errors.name ? 'border-red-400 focus:border-red-400 focus:ring-red-400/25' : ''
            }`}
          />
          {errors.name && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-400">
              <AlertCircle className="h-3.5 w-3.5" /> {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="signup-email" className="mb-2 block text-sm font-semibold text-gray-950 dark:text-[#f6f2ea]">
            Email address
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setAuthError(''); setErrors(prev => ({ ...prev, email: undefined })); }}
            placeholder="you@gmail.com"
            autoComplete="email"
            className={`h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-gray-950 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18 ${
              errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-400/25' : ''
            }`}
          />
          {errors.email && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-400">
              <AlertCircle className="h-3.5 w-3.5" /> {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="signup-password" className="mb-2 block text-sm font-semibold text-gray-950 dark:text-[#f6f2ea]">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setAuthError(''); setErrors(prev => ({ ...prev, password: undefined })); }}
            placeholder="Create a strong password"
            autoComplete="new-password"
            className={`h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-gray-950 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18 ${
              errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-400/25' : ''
            }`}
          />
          {errors.password ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-400">
              <AlertCircle className="h-3.5 w-3.5" /> {errors.password}
            </p>
          ) : (
            <p className="mt-1.5 text-xs leading-5 text-gray-500 dark:text-[#aaa69d]">
              Use at least 8 characters with a mix of letters and numbers.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-bold text-white transition-all hover:scale-[1.01] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#6387ff]/70 disabled:opacity-60 disabled:hover:scale-100 dark:bg-[#f5f2ea] dark:text-[#171816]"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>Create account</>
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-xs leading-5 text-gray-500 dark:text-[#aaa69d]">
        By creating an account, you agree to our{' '}
        <a href="#" className="underline hover:text-gray-700 dark:hover:text-white">Terms</a>
        {' '}and{' '}
        <a href="#" className="underline hover:text-gray-700 dark:hover:text-white">Privacy Policy</a>.
      </p>
    </AuthShell>
  );
}
