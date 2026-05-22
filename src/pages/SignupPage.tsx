import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { routeMeta } from '@/lib/seo';
import { AlertCircle } from 'lucide-react';
import { AuthShell, GithubMarker, GoogleMarker, ProviderButton } from '@/components/auth/AuthShell';
import { createAccountWithEmail, getFriendlyFirebaseAuthError, isGmailAddress, signInWithGithub, signInWithGoogle } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';

export function SignupPage() {
  const meta = routeMeta['/signup'];
  const { authError: redirectAuthError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const activeAuthError = authError || redirectAuthError;

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
      setAuthError(getFriendlyFirebaseAuthError(err));
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
      setAuthError(getFriendlyFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={meta.canonical} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:url" content={meta.canonical} />
        <meta property="og:description" content={meta.description} />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
      </Helmet>
    <AuthShell
      title="Create your account"
      subtitle="Start building beautiful websites in minutes."
      switchText="Already have an account?"
      switchAction="Log in"
      switchTo="/login"
    >
      <div className="grid gap-2">
        <ProviderButton provider="Google" marker={<GoogleMarker />} disabled={isLoading} onClick={() => void handleSocialSignup('google')} />
        <ProviderButton provider="GitHub" marker={<GithubMarker />} disabled={isLoading} onClick={() => void handleSocialSignup('github')} />
      </div>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
        <span className="text-xs font-semibold uppercase tracking-normal text-gray-500 dark:text-[#aaa69d]">or</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {activeAuthError && (
          <div className="flex items-start gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-2.5 py-2 text-xs font-medium text-red-500">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <span>{activeAuthError}</span>
          </div>
        )}
        <div>
          <label htmlFor="signup-name" className="mb-1.5 block text-xs font-semibold text-gray-950 dark:text-[#f6f2ea]">
            Full name
          </label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setAuthError(''); setErrors(prev => ({ ...prev, name: undefined })); }}
            placeholder="John Doe"
            autoComplete="name"
            className={`h-9 w-full rounded-md border bg-white px-3 text-xs font-medium text-gray-950 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18 ${
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
          <label htmlFor="signup-email" className="mb-1.5 block text-xs font-semibold text-gray-950 dark:text-[#f6f2ea]">
            Email address
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setAuthError(''); setErrors(prev => ({ ...prev, email: undefined })); }}
            placeholder="you@gmail.com"
            autoComplete="email"
            className={`h-9 w-full rounded-md border bg-white px-3 text-xs font-medium text-gray-950 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18 ${
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
          <label htmlFor="signup-password" className="mb-1.5 block text-xs font-semibold text-gray-950 dark:text-[#f6f2ea]">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setAuthError(''); setErrors(prev => ({ ...prev, password: undefined })); }}
            placeholder="Create a strong password"
            autoComplete="new-password"
            className={`h-9 w-full rounded-md border bg-white px-3 text-xs font-medium text-gray-950 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64] dark:hover:border-white/18 ${
              errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-400/25' : ''
            }`}
          />
          {errors.password ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-400">
              <AlertCircle className="h-3.5 w-3.5" /> {errors.password}
            </p>
          ) : (
            <p className="mt-1 text-[11px] leading-4 text-gray-500 dark:text-[#aaa69d]">
              Use at least 8 characters with a mix of letters and numbers.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-3 text-xs font-bold text-white transition-all hover:scale-[1.01] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#6387ff]/70 disabled:opacity-60 disabled:hover:scale-100 dark:bg-[#f5f2ea] dark:text-[#171816]"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>Create account</>
          )}
        </button>
      </form>

      <p className="mt-3 text-center text-[11px] leading-4 text-gray-500 dark:text-[#aaa69d]">
        By creating an account, you agree to our{' '}
        <a href="#" className="underline hover:text-gray-700 dark:hover:text-white">Terms</a>
        {' '}and{' '}
        <a href="#" className="underline hover:text-gray-700 dark:hover:text-white">Privacy Policy</a>.
      </p>
    </AuthShell>
    </>
  );
}
