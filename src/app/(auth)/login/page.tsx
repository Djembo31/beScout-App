'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, CheckCircle, AlertCircle, Eye, EyeOff, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { signUp, signInWithPassword, signInWithOtp, signInWithOAuth } from '@/lib/services/auth';
import { useUser } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

type LoadingState = 'email' | 'password' | 'google' | 'apple' | null;
type AuthMode = 'login' | 'register' | 'magic';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile, loading, platformRole, clubAdmin } = useUser();
  const t = useTranslations('auth');
  const callbackError = searchParams.get('error');

  // Redirect authenticated users away from login — smart redirect by role
  useEffect(() => {
    if (!loading && user) {
      if (!profile) {
        const clubParam = searchParams.get('club');
        const refParam = searchParams.get('ref');
        const qs = [clubParam && `club=${clubParam}`, refParam && `ref=${refParam}`].filter(Boolean).join('&');
        router.replace(`/onboarding${qs ? `?${qs}` : ''}`);
        return;
      }
      if (platformRole) { router.replace('/bescout-admin'); return; }
      if (clubAdmin) { router.replace(`/club/${clubAdmin.slug}/admin`); return; }
      router.replace('/');
    }
  }, [loading, user, profile, platformRole, clubAdmin, router]);

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<LoadingState>(null);
  const [error, setError] = useState<string | null>(
    callbackError === 'auth_callback_failed' ? t('callbackError') : null
  );
  const [emailSent, setEmailSent] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (password.length < 6) {
        setError(t('passwordMinLength'));
        return;
      }
      if (password !== passwordConfirm) {
        setError(t('passwordMismatch'));
        return;
      }

      setLoadingMethod('password');
      const { data, error: authError } = await signUp(
        email, password, `${window.location.origin}/auth/callback`
      );

      if (authError) {
        setError(authError.message);
        setLoadingMethod(null);
      } else if (data.session) {
        // Email confirmation disabled → session exists → AuthProvider handles redirect to onboarding
        setLoadingMethod(null);
      } else {
        // Email confirmation enabled → show "check your inbox"
        setRegistered(true);
        setLoadingMethod(null);
      }
    } else {
      setLoadingMethod('password');
      const { error: authError } = await signInWithPassword(email, password);

      if (authError) {
        setError(
          authError.message === 'Invalid login credentials'
            ? t('invalidCredentials')
            : authError.message
        );
        setLoadingMethod(null);
      }
      // On success, AuthProvider handles redirect
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingMethod('email');
    setError(null);

    const { error: authError } = await signInWithOtp(
      email, `${window.location.origin}/auth/callback`
    );

    if (authError) {
      setError(authError.message);
      setLoadingMethod(null);
    } else {
      setEmailSent(true);
      setLoadingMethod(null);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoadingMethod(provider);
    setError(null);

    const { error: authError } = await signInWithOAuth(
      provider, `${window.location.origin}/auth/callback`
    );

    if (authError) {
      setError(authError.message);
      setLoadingMethod(null);
    } else {
      // OAuth opens a new tab — if user closes it without completing,
      // button stays disabled forever. Reset after 5s as safety net.
      setTimeout(() => setLoadingMethod(prev => prev === provider ? null : prev), 5000);
    }
  };

  const resetForm = () => {
    setEmailSent(false);
    setRegistered(false);
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setError(null);
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo Section */}
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/logo.png"
          alt="BeScout Logo"
          width={72}
          height={72}
          className="mb-3"
          priority
        />
        <Image
          src="/schrift.png"
          alt="BeScout"
          width={160}
          height={40}
          className="mb-2"
          priority
        />
        <p className="text-sm text-white/50">
          {t('subtitle')}
        </p>
      </div>

      {/* Login Card */}
      <Card className="p-6 sm:p-8">
        {emailSent ? (
          /* Magic Link Sent */
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-[#22C55E]" />
            </div>
            <h2 className="text-xl font-black mb-2">{t('linkSent')}</h2>
            <p className="text-sm text-white/60 mb-1">
              {t('linkSentDesc')}
            </p>
            <p className="text-sm font-bold text-white/90 mb-4">{email}</p>
            <p className="text-xs text-white/40">
              {t('checkInbox')}
            </p>
            <button
              onClick={resetForm}
              className="mt-6 text-sm text-[#FFD700]/70 hover:text-[#FFD700] transition-colors"
            >
              {t('otherEmail')}
            </button>
          </div>
        ) : registered ? (
          /* Registration Success */
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-[#22C55E]" />
            </div>
            <h2 className="text-xl font-black mb-2">{t('registrationSuccess')}</h2>
            <p className="text-sm text-white/60 mb-1">
              {t('confirmEmail')}
            </p>
            <p className="text-sm font-bold text-white/90 mb-4">{email}</p>
            <p className="text-xs text-white/40">
              {t('checkInboxConfirm')}
            </p>
            <button
              onClick={() => { resetForm(); setMode('login'); }}
              className="mt-6 text-sm text-[#FFD700]/70 hover:text-[#FFD700] transition-colors"
            >
              {t('goToLogin')}
            </button>
          </div>
        ) : (
          /* Auth Form */
          <>
            <h1 className="text-2xl font-black text-center mb-6">
              {mode === 'register' ? t('register') : mode === 'magic' ? t('magicLink') : t('welcome')}
            </h1>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 mb-5 rounded-xl bg-red-500/10 border border-red-400/20">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-sm text-red-200 flex-1">{error}</span>
                <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 shrink-0" aria-label={t('close', { ns: 'common' })}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Social Buttons (login & register) */}
            {mode !== 'magic' && (
              <>
                <div className="flex flex-col gap-3 mb-5">
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    loading={loadingMethod === 'google'}
                    disabled={loadingMethod !== null}
                    onClick={() => handleOAuth('google')}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {`Mit Google ${mode === 'register' ? 'registrieren' : 'anmelden'}`}
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    loading={loadingMethod === 'apple'}
                    disabled={loadingMethod !== null}
                    onClick={() => handleOAuth('apple')}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.62-2.2.44-3.06-.4C3.79 16.17 4.36 9.51 8.82 9.26c1.27.06 2.15.72 2.9.75.93-.19 1.82-.9 3.16-.77 1.59.16 2.63.86 3.23 2.1-2.95 1.74-2.25 5.58.53 6.66-.65 1.55-1.49 3.08-2.59 4.28zM12.1 9.21C11.95 7.06 13.7 5.3 15.75 5.14c.29 2.46-2.24 4.28-3.65 4.07z" />
                    </svg>
                    {`Mit Apple ${mode === 'register' ? 'registrieren' : 'anmelden'}`}
                  </Button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-white/40 font-medium">{t('orWithEmail')}</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              </>
            )}

            {/* Email + Password Form (login & register) */}
            {mode !== 'magic' ? (
              <form onSubmit={handlePasswordAuth} className="flex flex-col gap-3">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={cn(
                      'w-full pl-11 pr-4 py-3 rounded-xl text-sm',
                      'bg-white/5 border border-white/10',
                      'placeholder:text-white/30 text-white',
                      'focus:outline-none focus:border-[#FFD700]/40 focus:bg-white/[0.07]',
                      'transition-all'
                    )}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className={cn(
                      'w-full pl-11 pr-11 py-3 rounded-xl text-sm',
                      'bg-white/5 border border-white/10',
                      'placeholder:text-white/30 text-white',
                      'focus:outline-none focus:border-[#FFD700]/40 focus:bg-white/[0.07]',
                      'transition-all'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {mode === 'register' && (
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('confirmPasswordPlaceholder')}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                      minLength={6}
                      className={cn(
                        'w-full pl-11 pr-4 py-3 rounded-xl text-sm',
                        'bg-white/5 border border-white/10',
                        'placeholder:text-white/30 text-white',
                        'focus:outline-none focus:border-[#FFD700]/40 focus:bg-white/[0.07]',
                        'transition-all'
                      )}
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  fullWidth
                  loading={loadingMethod === 'password'}
                  disabled={loadingMethod !== null}
                >
                  {mode === 'register' ? t('register') : t('login')}
                </Button>
              </form>
            ) : (
              /* Magic Link Form */
              <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={cn(
                      'w-full pl-11 pr-4 py-3 rounded-xl text-sm',
                      'bg-white/5 border border-white/10',
                      'placeholder:text-white/30 text-white',
                      'focus:outline-none focus:border-[#FFD700]/40 focus:bg-white/[0.07]',
                      'transition-all'
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  fullWidth
                  loading={loadingMethod === 'email'}
                  disabled={loadingMethod !== null}
                >
                  {t('sendMagicLink')}
                </Button>
              </form>
            )}

            {/* Mode Switches */}
            <div className="mt-5 flex flex-col items-center gap-2 text-sm">
              {mode === 'login' && (
                <>
                  <button
                    onClick={() => { setMode('magic'); setError(null); }}
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    {t('preferMagicLink')}
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    onClick={() => { setMode('register'); setError(null); }}
                    className="text-[#FFD700]/70 hover:text-[#FFD700] transition-colors font-semibold"
                  >
                    {t('noAccount')}
                  </button>
                </>
              )}
              {mode === 'register' && (
                <button
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-[#FFD700]/70 hover:text-[#FFD700] transition-colors font-semibold"
                >
                  {t('hasAccount')}
                </button>
              )}
              {mode === 'magic' && (
                <button
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  {t('backToPassword')}
                </button>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Footer */}
      <div className="text-center mt-6">
        <p className="text-xs text-white/30">
          {t('termsPrefix')}{' '}
          <a href="#" className="text-white/50 hover:text-white/70 underline transition-colors">
            {t('terms')}
          </a>{' '}
          {t('and')}{' '}
          <a href="#" className="text-white/50 hover:text-white/70 underline transition-colors">
            {t('privacy')}
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
