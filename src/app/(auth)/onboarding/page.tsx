'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Check, X, Loader2, ChevronRight, Globe, Camera, User, Shield, Gift } from 'lucide-react';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { createProfile, checkHandleAvailable, isValidHandle } from '@/lib/services/profiles';
import { updateProfile } from '@/lib/services/profiles';
import { getProfileByReferralCode, getClubByReferralCode, applyClubReferral } from '@/lib/services/referral';
import { signOut } from '@/lib/services/auth';
import { uploadAvatar } from '@/lib/services/avatars';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { followClubsBatch } from '@/lib/services/club';

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, profileLoading, refreshProfile } = useUser();
  const t = useTranslations('auth');

  const [step, setStep] = useState(1);
  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle');
  const [displayNameValue, setDisplayNameValue] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [language, setLanguage] = useState<'de' | 'tr' | 'en'>('de');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Referral
  const [referrer, setReferrer] = useState<{ id: string; handle: string; display_name: string | null } | null>(null);

  // Club referral — auto-follow silently, no manual club selection step
  const [referralClub, setReferralClub] = useState<{ id: string; name: string; slug: string; logo_url: string | null } | null>(null);

  // Redirect if already has profile
  useEffect(() => {
    if (!loading && !profileLoading && profile) router.replace('/');
  }, [loading, profileLoading, profile, router]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // Look up referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode && refCode.length >= 4) {
      getProfileByReferralCode(refCode).then(p => {
        if (p) setReferrer(p);
      }).catch(err => console.error('[Onboarding] Referrer lookup failed:', err));
    }
  }, [searchParams]);

  // Look up club referral code from URL (?club=CODE)
  useEffect(() => {
    const clubCode = searchParams.get('club');
    if (clubCode && clubCode.length >= 3) {
      getClubByReferralCode(clubCode).then(c => {
        if (c) setReferralClub(c);
      }).catch(err => console.error('[Onboarding] Club referral lookup failed:', err));
    }
  }, [searchParams]);

  // Pre-fill from user data
  useEffect(() => {
    if (user) {
      const emailPrefix = user.email?.split('@')[0] ?? '';
      const cleaned = emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!handle) setHandle(cleaned.slice(0, 20));
      if (!displayNameValue) setDisplayNameValue(displayName(user));
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced handle check with stale-request guard
  const handleCheckRef = useRef(0);
  useEffect(() => {
    if (!handle) {
      setHandleStatus('idle');
      return;
    }
    if (!isValidHandle(handle)) {
      setHandleStatus('invalid');
      return;
    }
    setHandleStatus('checking');
    const requestId = ++handleCheckRef.current;
    const timer = setTimeout(async () => {
      const available = await checkHandleAvailable(handle);
      // Only apply result if this is still the latest request
      if (requestId === handleCheckRef.current) {
        setHandleStatus(available ? 'available' : 'taken');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [handle]);

  const validateStep1 = (): boolean => {
    return handleStatus === 'available' && handle.length >= 3;
  };

  const handleStep1Next = () => {
    if (validateStep1()) setStep(2);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) {
      setError(t('avatarTooLarge'));
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      // Create profile
      await createProfile(user.id, {
        handle,
        display_name: displayNameValue || null,
        language,
        favorite_club_id: referralClub?.id ?? null,
        favorite_club: referralClub?.name ?? null,
        invited_by: referrer?.id ?? null,
      });

      // Auto-follow referral club if present
      if (referralClub) {
        await followClubsBatch(user.id, [referralClub.id]);
        await applyClubReferral(user.id, referralClub.id);
      }

      // Upload avatar if selected
      if (avatarFile) {
        try {
          const avatarUrl = await uploadAvatar(user.id, avatarFile);
          await updateProfile(user.id, { avatar_url: avatarUrl });
        } catch (uploadErr) {
          console.error('[Onboarding] Avatar upload failed:', uploadErr);
          // Non-blocking — profile is already created, user can upload later
        }
      }

      await refreshProfile();
      localStorage.setItem('bescout-tour-pending', '1');
      router.push('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('profileCreateError');
      // Stale session: user was deleted but session token remains
      if (msg.includes('foreign key') || msg.includes('fkey')) {
        await signOut();
        router.replace('/login');
        return;
      }
      setError(msg);
      setSubmitting(false);
    }
  }, [user, handle, displayNameValue, avatarFile, language, referrer, referralClub, refreshProfile, router]);

  if (loading || profileLoading || profile) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="size-8 text-gold animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <Image src="/icons/bescout_icon_premium.svg" alt="BeScout" width={56} height={56} className="mb-3" priority />
        <Image src="/icons/bescout_wordmark_premium.svg" alt="BeScout" width={140} height={36} className="mb-2" priority />
        <p className="text-sm text-white/50 text-pretty">{t('createProfile')}</p>
      </div>

      {/* Progress Dots (2 steps) */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={cn('size-2.5 rounded-full transition-colors', step >= 1 ? 'bg-gold' : 'bg-white/20')} />
        <div className={cn('w-8 h-0.5 transition-colors', step >= 2 ? 'bg-gold' : 'bg-white/10')} />
        <div className={cn('size-2.5 rounded-full transition-colors', step >= 2 ? 'bg-gold' : 'bg-white/20')} />
      </div>

      {/* Referral Banner */}
      {referrer && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-gold/[0.06] border border-gold/15">
          <Gift className="size-5 text-gold shrink-0" aria-hidden="true" />
          <div className="text-sm">
            <span className="text-white/70">{t('invitedBy')} </span>
            <span className="font-bold text-gold">@{referrer.handle}</span>
          </div>
        </div>
      )}

      {/* Club Referral Banner */}
      {referralClub && !referrer && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/[0.06] border border-green-500/15">
          {referralClub.logo_url ? (
            <Image src={referralClub.logo_url} alt="" width={24} height={24} className="size-6 object-contain shrink-0" />
          ) : (
            <Shield className="size-5 text-green-500 shrink-0" aria-hidden="true" />
          )}
          <div className="text-sm">
            <span className="text-white/70">{t('invitedBy')} </span>
            <span className="font-bold text-green-500">{referralClub.name}</span>
          </div>
        </div>
      )}

      <Card className="p-6 sm:p-8">
        {step === 1 && (
          <>
            <h2 className="text-xl font-black text-balance mb-1">{t('yourProfile')}</h2>
            <p className="text-sm text-white/50 text-pretty mb-6">
              {t('chooseHandle')}
            </p>

            {/* Handle Input */}
            <div className="mb-4">
              <label htmlFor="onboard-handle" className="text-xs text-white/50 font-semibold mb-1.5 block">{t('handleLabel')}</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                <input
                  id="onboard-handle"
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                  placeholder={t('handlePlaceholder')}
                  className={cn(
                    'w-full pl-8 pr-10 py-3 rounded-xl text-sm',
                    'bg-surface-base border',
                    'placeholder:text-white/30 text-white',
                    'focus:outline-none transition-colors',
                    handleStatus === 'available' && 'border-green-500/40 focus:border-green-500/60',
                    handleStatus === 'taken' && 'border-red-400/40 focus:border-red-400/60',
                    handleStatus === 'invalid' && 'border-red-400/40 focus:border-red-400/60',
                    (handleStatus === 'idle' || handleStatus === 'checking') && 'border-white/10 focus:border-gold/40'
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {handleStatus === 'checking' && <Loader2 className="size-4 text-white/40 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                  {handleStatus === 'available' && <Check className="size-4 text-green-500" aria-hidden="true" />}
                  {handleStatus === 'taken' && <X className="size-4 text-red-400" aria-hidden="true" />}
                  {handleStatus === 'invalid' && <X className="size-4 text-red-400" aria-hidden="true" />}
                </div>
              </div>
              <div className="mt-1.5 text-xs">
                {handleStatus === 'taken' && <span className="text-red-400">{t('handleTaken')}</span>}
                {handleStatus === 'invalid' && <span className="text-red-400">{t('handleInvalid')}</span>}
                {handleStatus === 'available' && <span className="text-green-500">{t('handleAvailable')}</span>}
                {handleStatus === 'idle' && <span className="text-white/30">{t('handleInvalid')}</span>}
              </div>
            </div>

            {/* Display Name */}
            <div className="mb-4">
              <label htmlFor="onboard-display-name" className="text-xs text-white/50 font-semibold mb-1.5 block">{t('displayNameLabel')}</label>
              <input
                id="onboard-display-name"
                type="text"
                value={displayNameValue}
                onChange={(e) => setDisplayNameValue(e.target.value.slice(0, 50))}
                placeholder={t('displayNamePlaceholder')}
                className={cn(
                  'w-full px-4 py-3 rounded-xl text-sm',
                  'bg-surface-base border border-white/10',
                  'placeholder:text-white/30 text-white',
                  'focus:outline-none focus:border-gold/40 transition-colors'
                )}
              />
            </div>

            {!validateStep1() && handle.length >= 1 && (
              <div className="text-xs text-white/30 mb-3">
                {handleStatus === 'checking' ? t('handleChecking') :
                 handleStatus === 'taken' ? t('handleTakenShort') :
                 handleStatus === 'invalid' ? t('handleInvalid') :
                 null}
              </div>
            )}

            <Button
              variant="gold"
              size="lg"
              fullWidth
              disabled={!validateStep1()}
              onClick={handleStep1Next}
            >
              {t('next')}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-black text-balance mb-1">{t('profilePicAndLang')}</h2>
            <p className="text-sm text-white/50 text-pretty mb-6">{t('uploadHint')}</p>

            {/* Avatar Upload */}
            <div className="flex flex-col items-center mb-6">
              <label className="relative group cursor-pointer" aria-label={t('uploadLabel')}>
                <div className="size-24 rounded-2xl bg-gold/10 border-2 border-dashed border-white/20 group-hover:border-gold/40 flex items-center justify-center overflow-hidden transition-colors">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="size-10 text-white/30" aria-hidden="true" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-gold flex items-center justify-center shadow-lg">
                  <Camera className="size-4 text-black" aria-hidden="true" />
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              <div className="mt-3 text-xs text-white/40">
                {avatarPreview ? t('imageSelected') : t('imageHint')}
              </div>
            </div>

            {/* Language */}
            <div className="mb-6">
              <label htmlFor="onboard-language" className="text-xs text-white/50 font-semibold mb-1.5 flex items-center gap-1.5">
                <Globe className="size-3.5" aria-hidden="true" />
                {t('languageLabel')}
              </label>
              <select
                id="onboard-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'de' | 'tr' | 'en')}
                className={cn(
                  'w-full px-4 py-3 rounded-xl text-sm',
                  'bg-surface-base border border-white/10',
                  'text-white appearance-none',
                  'focus:outline-none focus:border-gold/40 transition-colors'
                )}
              >
                <option value="de">Deutsch</option>
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-400/20" role="alert">
                <X className="size-4 text-red-400 shrink-0" aria-hidden="true" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={() => setStep(1)} disabled={submitting}>
                {t('back')}
              </Button>
              <Button
                variant="gold"
                size="lg"
                fullWidth
                loading={submitting}
                onClick={handleSubmit}
              >
                {t('letsGo')}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="size-8 text-gold animate-spin motion-reduce:animate-none" aria-hidden="true" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
