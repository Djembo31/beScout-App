'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Check, X, Loader2, ChevronRight, Globe, Camera, User, Lock, Eye, EyeOff, Search, Shield, Gift, Star } from 'lucide-react';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { createProfile, checkHandleAvailable, isValidHandle } from '@/lib/services/profiles';
import { updateProfile } from '@/lib/services/profiles';
import { getProfileByReferralCode, getClubByReferralCode, applyClubReferral } from '@/lib/services/referral';
import { updateUserPassword, signOut } from '@/lib/services/auth';
import { uploadAvatar } from '@/lib/services/avatars';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getAllClubs, followClubsBatch } from '@/lib/services/club';
import type { DbClub } from '@/types';

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, refreshProfile } = useUser();
  const t = useTranslations('auth');

  const [step, setStep] = useState(1);
  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle');
  const [displayNameValue, setDisplayNameValue] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [language, setLanguage] = useState<'de' | 'tr' | 'en'>('de');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Referral
  const [referrer, setReferrer] = useState<{ id: string; handle: string; display_name: string | null } | null>(null);

  // Club referral
  const [referralClub, setReferralClub] = useState<{ id: string; name: string; slug: string; logo_url: string | null } | null>(null);

  // Club selection (Step 3)
  const [allClubs, setAllClubs] = useState<DbClub[]>([]);
  const [clubSearch, setClubSearch] = useState('');
  const [selectedClubIds, setSelectedClubIds] = useState<Set<string>>(new Set());
  const [clubsLoading, setClubsLoading] = useState(false);

  // Detect if user signed up via OAuth (Google/Apple) — no password needed
  const isOAuthUser = user?.app_metadata?.provider !== 'email';

  // Redirect if already has profile
  useEffect(() => {
    if (!loading && profile) router.replace('/');
  }, [loading, profile, router]);

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
        if (c) {
          setReferralClub(c);
          // Auto-select this club
          setSelectedClubIds(prev => new Set(prev).add(c.id));
        }
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

  // Load clubs when reaching step 3, pre-select Sakaryaspor (pilot club)
  useEffect(() => {
    if (step === 3 && allClubs.length === 0) {
      setClubsLoading(true);
      getAllClubs()
        .then(clubs => {
          setAllClubs(clubs);
          // Pre-select Sakaryaspor as default pilot club (user can deselect)
          const sakaryaspor = clubs.find(c => c.slug === 'sakaryaspor');
          if (sakaryaspor) {
            setSelectedClubIds(prev => {
              if (prev.size === 0) return new Set([sakaryaspor.id]);
              return new Set(prev).add(sakaryaspor.id);
            });
          }
        })
        .catch(err => console.error('[Onboarding] Failed to load clubs:', err))
        .finally(() => setClubsLoading(false));
    }
  }, [step, allClubs.length]);

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
    if (handleStatus !== 'available' || handle.length < 3) return false;

    // Password validation only for email users (OAuth users skip password)
    if (!isOAuthUser) {
      if (password.length < 6) return false;
      if (password !== passwordConfirm) return false;
    }

    return true;
  };

  const handleStep1Next = () => {
    setPasswordError(null);

    if (!isOAuthUser) {
      if (password.length < 6) {
        setPasswordError(t('pwMinLength'));
        return;
      }
      if (password !== passwordConfirm) {
        setPasswordError(t('pwMismatch'));
        return;
      }
    }

    setStep(2);
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

  const toggleClub = (clubId: string) => {
    setSelectedClubIds(prev => {
      const next = new Set(prev);
      if (next.has(clubId)) {
        next.delete(clubId);
      } else {
        next.add(clubId);
      }
      return next;
    });
  };

  const filteredClubs = allClubs
    .filter(c =>
      c.name.toLowerCase().includes(clubSearch.toLowerCase()) ||
      c.city?.toLowerCase().includes(clubSearch.toLowerCase()) ||
      c.short.toLowerCase().includes(clubSearch.toLowerCase())
    )
    .sort((a, b) => {
      // Sakaryaspor (pilot club) always first
      if (a.slug === 'sakaryaspor') return -1;
      if (b.slug === 'sakaryaspor') return 1;
      return 0;
    });

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      // Set password if email user (OAuth users skip password)
      if (!isOAuthUser && password) {
        const { error: pwError } = await updateUserPassword(password);
        if (pwError) throw new Error(t('pwSetError', { error: pwError.message }));
      }

      // Determine primary club (first selected)
      const clubIdsArray = Array.from(selectedClubIds);
      const primaryClubId = clubIdsArray[0] ?? null;
      const primaryClub = primaryClubId ? allClubs.find(c => c.id === primaryClubId) : null;

      // Create profile
      await createProfile(user.id, {
        handle,
        display_name: displayNameValue || null,
        language,
        favorite_club_id: primaryClubId,
        favorite_club: primaryClub?.name ?? null,
        invited_by: referrer?.id ?? null,
      });

      // Insert club_followers for all selected clubs
      if (clubIdsArray.length > 0) {
        await followClubsBatch(user.id, clubIdsArray);
      }

      // Apply club referral if present
      if (referralClub) {
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
  }, [user, isOAuthUser, password, handle, displayNameValue, avatarFile, language, selectedClubIds, allClubs, referrer, referralClub, refreshProfile, router]);

  if (loading || profile) {
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

      {/* Progress Dots (3 steps) */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={cn('size-2.5 rounded-full transition-colors', step >= 1 ? 'bg-gold' : 'bg-white/20')} />
        <div className={cn('w-8 h-0.5 transition-colors', step >= 2 ? 'bg-gold' : 'bg-white/10')} />
        <div className={cn('size-2.5 rounded-full transition-colors', step >= 2 ? 'bg-gold' : 'bg-white/20')} />
        <div className={cn('w-8 h-0.5 transition-colors', step >= 3 ? 'bg-gold' : 'bg-white/10')} />
        <div className={cn('size-2.5 rounded-full transition-colors', step >= 3 ? 'bg-gold' : 'bg-white/20')} />
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
              {isOAuthUser ? t('chooseHandle') : t('chooseHandleAndPw')}
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
                    'bg-white/5 border',
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
                  'bg-white/5 border border-white/10',
                  'placeholder:text-white/30 text-white',
                  'focus:outline-none focus:border-gold/40 transition-colors'
                )}
              />
            </div>

            {/* Password fields — only for email users (OAuth users skip) */}
            {!isOAuthUser && (
              <>
                <div className="my-5 border-t border-white/10" />
                <p className="text-xs text-white/40 text-pretty mb-3">
                  {t('pwSetHint')}
                </p>

                <div className="mb-3">
                  <label htmlFor="onboard-password" className="text-xs text-white/50 font-semibold mb-1.5 block">{t('passwordLabel')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" aria-hidden="true" />
                    <input
                      id="onboard-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
                      placeholder={t('pwPlaceholder')}
                      className={cn(
                        'w-full pl-11 pr-11 py-3 rounded-xl text-sm',
                        'bg-white/5 border border-white/10',
                        'placeholder:text-white/30 text-white',
                        'focus:outline-none focus:border-gold/40 transition-colors'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      aria-label={t('pwShowLabel')}
                    >
                      {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="onboard-password-confirm" className="text-xs text-white/50 font-semibold mb-1.5 block">{t('pwConfirmLabel')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" aria-hidden="true" />
                    <input
                      id="onboard-password-confirm"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordConfirm}
                      onChange={(e) => { setPasswordConfirm(e.target.value); setPasswordError(null); }}
                      placeholder={t('pwConfirmPlaceholder')}
                      className={cn(
                        'w-full pl-11 pr-11 py-3 rounded-xl text-sm',
                        'bg-white/5 border border-white/10',
                        'placeholder:text-white/30 text-white',
                        'focus:outline-none focus:border-gold/40 transition-colors'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      aria-label={t('pwShowLabel')}
                    >
                      {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-400/20" role="alert">
                    <X className="size-4 text-red-400 shrink-0" aria-hidden="true" />
                    <span className="text-sm text-red-200">{passwordError}</span>
                  </div>
                )}
              </>
            )}

            {!validateStep1() && handle.length >= 1 && (
              <div className="text-xs text-white/30 mb-3">
                {handleStatus === 'checking' ? t('handleChecking') :
                 handleStatus === 'taken' ? t('handleTakenShort') :
                 handleStatus === 'invalid' ? t('handleInvalid') :
                 !isOAuthUser && password.length > 0 && password.length < 6 ? t('pwMinShort') :
                 !isOAuthUser && password.length >= 6 && password !== passwordConfirm ? t('pwMismatch') :
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
                  'bg-white/5 border border-white/10',
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
                onClick={() => setStep(3)}
              >
                {t('next')}
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-black text-balance mb-1">{t('chooseClub')}</h2>
            <p className="text-sm text-white/50 text-pretty mb-4">
              {t('chooseClubHint')}
            </p>

            {/* Club Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" aria-hidden="true" />
              <input
                type="text"
                value={clubSearch}
                onChange={(e) => setClubSearch(e.target.value)}
                placeholder={t('clubSearchPlaceholder')}
                aria-label={t('clubSearchLabel')}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 transition-colors"
              />
            </div>

            {/* Club Grid */}
            {clubsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 text-gold animate-spin motion-reduce:animate-none" aria-hidden="true" />
              </div>
            ) : (
              <div className="max-h-[260px] overflow-y-auto space-y-1.5 mb-4 pr-1">
                {filteredClubs.map((club) => {
                  const selected = selectedClubIds.has(club.id);
                  const color = club.primary_color ?? '#FFD700';
                  return (
                    <button
                      key={club.id}
                      onClick={() => toggleClub(club.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                        selected
                          ? 'bg-gold/10 border border-gold/30'
                          : 'bg-surface-subtle border border-white/[0.06] hover:bg-white/5'
                      )}
                    >
                      <div
                        className="size-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {club.logo_url ? (
                          <Image src={club.logo_url} alt="" width={20} height={20} className="size-5 object-contain" />
                        ) : (
                          club.short?.slice(0, 3)
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('text-sm font-semibold truncate', selected ? 'text-gold' : 'text-white')}>
                            {club.name}
                          </span>
                          {club.slug === 'sakaryaspor' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gold/15 border border-gold/25 text-[9px] font-bold text-gold uppercase shrink-0">
                              <Star className="size-2.5" aria-hidden="true" />
                              {t('recommended')}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/40">{club.league}</div>
                      </div>
                      {club.is_verified && <Shield className="size-3.5 text-gold/50 flex-shrink-0" aria-hidden="true" />}
                      {selected && (
                        <div className="size-5 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
                          <Check className="size-3 text-black" aria-hidden="true" />
                        </div>
                      )}
                    </button>
                  );
                })}
                {filteredClubs.length === 0 && (
                  <p className="text-center text-sm text-white/40 py-4">{t('noClubsFound')}</p>
                )}
              </div>
            )}

            {selectedClubIds.size > 0 && (
              <p className="text-xs text-gold/70 mb-3">
                {selectedClubIds.size > 1 ? t('clubsSelectedPlural', { count: selectedClubIds.size }) : t('clubsSelected', { count: selectedClubIds.size })}
              </p>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-400/20" role="alert">
                <X className="size-4 text-red-400 shrink-0" aria-hidden="true" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={() => setStep(2)} disabled={submitting}>
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
