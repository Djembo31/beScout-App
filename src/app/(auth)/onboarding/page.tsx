'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Check, X, Loader2, ChevronRight, Globe, Camera, User, Lock, Eye, EyeOff, Search, Shield, Gift } from 'lucide-react';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { createProfile, checkHandleAvailable, isValidHandle } from '@/lib/services/profiles';
import { updateProfile } from '@/lib/services/profiles';
import { getProfileByReferralCode } from '@/lib/services/referral';
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

  // Club selection (Step 3)
  const [allClubs, setAllClubs] = useState<DbClub[]>([]);
  const [clubSearch, setClubSearch] = useState('');
  const [selectedClubIds, setSelectedClubIds] = useState<Set<string>>(new Set());
  const [clubsLoading, setClubsLoading] = useState(false);

  // Detect if user signed up with email+password (already has a password)
  const hasPassword = user?.app_metadata?.provider === 'email'
    && user?.app_metadata?.providers?.includes('email');

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

  // Pre-fill from user data
  useEffect(() => {
    if (user) {
      const emailPrefix = user.email?.split('@')[0] ?? '';
      const cleaned = emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!handle) setHandle(cleaned.slice(0, 20));
      if (!displayNameValue) setDisplayNameValue(displayName(user));
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load clubs when reaching step 3
  useEffect(() => {
    if (step === 3 && allClubs.length === 0) {
      setClubsLoading(true);
      getAllClubs()
        .then(setAllClubs)
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

    // Password validation only if user doesn't already have one
    if (!hasPassword) {
      if (password.length < 6) return false;
      if (password !== passwordConfirm) return false;
    }

    return true;
  };

  const handleStep1Next = () => {
    setPasswordError(null);

    if (!hasPassword) {
      if (password.length < 6) {
        setPasswordError('Passwort muss mindestens 6 Zeichen lang sein.');
        return;
      }
      if (password !== passwordConfirm) {
        setPasswordError('Passwörter stimmen nicht überein.');
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
      setError('Bild darf maximal 2MB groß sein.');
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

  const filteredClubs = allClubs.filter(c =>
    c.name.toLowerCase().includes(clubSearch.toLowerCase()) ||
    c.city?.toLowerCase().includes(clubSearch.toLowerCase()) ||
    c.short.toLowerCase().includes(clubSearch.toLowerCase())
  );

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      // Set password if user doesn't have one yet (OAuth / Magic Link)
      if (!hasPassword && password) {
        const { error: pwError } = await updateUserPassword(password);
        if (pwError) throw new Error(`Passwort konnte nicht gesetzt werden: ${pwError.message}`);
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
      const msg = err instanceof Error ? err.message : 'Profil konnte nicht erstellt werden.';
      // Stale session: user was deleted but session token remains
      if (msg.includes('foreign key') || msg.includes('fkey')) {
        await signOut();
        router.replace('/login');
        return;
      }
      setError(msg);
      setSubmitting(false);
    }
  }, [user, hasPassword, password, handle, displayNameValue, avatarFile, language, selectedClubIds, allClubs, referrer, refreshProfile, router]);

  if (loading || profile) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <Image src="/logo.png" alt="BeScout" width={56} height={56} className="mb-3" priority />
        <Image src="/schrift.png" alt="BeScout" width={140} height={36} className="mb-2" priority />
        <p className="text-sm text-white/50">Erstelle dein Manager-Profil</p>
      </div>

      {/* Progress Dots (3 steps) */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={cn('w-2.5 h-2.5 rounded-full transition-all', step >= 1 ? 'bg-[#FFD700]' : 'bg-white/20')} />
        <div className={cn('w-8 h-0.5 transition-all', step >= 2 ? 'bg-[#FFD700]' : 'bg-white/10')} />
        <div className={cn('w-2.5 h-2.5 rounded-full transition-all', step >= 2 ? 'bg-[#FFD700]' : 'bg-white/20')} />
        <div className={cn('w-8 h-0.5 transition-all', step >= 3 ? 'bg-[#FFD700]' : 'bg-white/10')} />
        <div className={cn('w-2.5 h-2.5 rounded-full transition-all', step >= 3 ? 'bg-[#FFD700]' : 'bg-white/20')} />
      </div>

      {/* Referral Banner */}
      {referrer && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#FFD700]/[0.06] border border-[#FFD700]/15">
          <Gift className="w-5 h-5 text-[#FFD700] shrink-0" />
          <div className="text-sm">
            <span className="text-white/70">Eingeladen von </span>
            <span className="font-bold text-[#FFD700]">@{referrer.handle}</span>
          </div>
        </div>
      )}

      <Card className="p-6 sm:p-8">
        {step === 1 && (
          <>
            <h2 className="text-xl font-black mb-1">Dein Profil</h2>
            <p className="text-sm text-white/50 mb-6">
              {hasPassword
                ? 'Wähle deinen einzigartigen Handle für BeScout.'
                : 'Handle wählen und Passwort setzen für zukünftige Anmeldungen.'}
            </p>

            {/* Handle Input */}
            <div className="mb-4">
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">Handle</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                  placeholder="dein_name"
                  className={cn(
                    'w-full pl-8 pr-10 py-3 rounded-xl text-sm',
                    'bg-white/5 border',
                    'placeholder:text-white/30 text-white',
                    'focus:outline-none transition-all',
                    handleStatus === 'available' && 'border-[#22C55E]/40 focus:border-[#22C55E]/60',
                    handleStatus === 'taken' && 'border-red-400/40 focus:border-red-400/60',
                    handleStatus === 'invalid' && 'border-red-400/40 focus:border-red-400/60',
                    (handleStatus === 'idle' || handleStatus === 'checking') && 'border-white/10 focus:border-[#FFD700]/40'
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {handleStatus === 'checking' && <Loader2 className="w-4 h-4 text-white/40 animate-spin" />}
                  {handleStatus === 'available' && <Check className="w-4 h-4 text-[#22C55E]" />}
                  {handleStatus === 'taken' && <X className="w-4 h-4 text-red-400" />}
                  {handleStatus === 'invalid' && <X className="w-4 h-4 text-red-400" />}
                </div>
              </div>
              <div className="mt-1.5 text-xs">
                {handleStatus === 'taken' && <span className="text-red-400">Dieser Name ist bereits vergeben.</span>}
                {handleStatus === 'invalid' && <span className="text-red-400">3-20 Zeichen, nur a-z, 0-9 und _</span>}
                {handleStatus === 'available' && <span className="text-[#22C55E]">Verfügbar!</span>}
                {handleStatus === 'idle' && <span className="text-white/30">3-20 Zeichen, nur a-z, 0-9 und _</span>}
              </div>
            </div>

            {/* Display Name */}
            <div className="mb-4">
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">Anzeigename (optional)</label>
              <input
                type="text"
                value={displayNameValue}
                onChange={(e) => setDisplayNameValue(e.target.value.slice(0, 50))}
                placeholder="Dein Name"
                className={cn(
                  'w-full px-4 py-3 rounded-xl text-sm',
                  'bg-white/5 border border-white/10',
                  'placeholder:text-white/30 text-white',
                  'focus:outline-none focus:border-[#FFD700]/40 transition-all'
                )}
              />
            </div>

            {/* Password fields — only if user doesn't have a password yet */}
            {!hasPassword && (
              <>
                <div className="my-5 border-t border-white/10" />
                <p className="text-xs text-white/40 mb-3">
                  Setze ein Passwort, damit du dich beim nächsten Mal mit E-Mail + Passwort anmelden kannst.
                </p>

                <div className="mb-3">
                  <label className="text-xs text-white/50 font-semibold mb-1.5 block">Passwort</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
                      placeholder="Min. 6 Zeichen"
                      className={cn(
                        'w-full pl-11 pr-11 py-3 rounded-xl text-sm',
                        'bg-white/5 border border-white/10',
                        'placeholder:text-white/30 text-white',
                        'focus:outline-none focus:border-[#FFD700]/40 transition-all'
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
                </div>

                <div className="mb-4">
                  <label className="text-xs text-white/50 font-semibold mb-1.5 block">Passwort bestätigen</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordConfirm}
                      onChange={(e) => { setPasswordConfirm(e.target.value); setPasswordError(null); }}
                      placeholder="Passwort wiederholen"
                      className={cn(
                        'w-full pl-11 pr-11 py-3 rounded-xl text-sm',
                        'bg-white/5 border border-white/10',
                        'placeholder:text-white/30 text-white',
                        'focus:outline-none focus:border-[#FFD700]/40 transition-all'
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
                </div>

                {passwordError && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-400/20">
                    <X className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-sm text-red-200">{passwordError}</span>
                  </div>
                )}
              </>
            )}

            {!validateStep1() && handle.length >= 1 && (
              <div className="text-xs text-white/30 mb-3">
                {handleStatus === 'checking' ? 'Handle wird geprüft...' :
                 handleStatus === 'taken' ? 'Handle ist vergeben — wähle einen anderen.' :
                 handleStatus === 'invalid' ? 'Handle: 3-20 Zeichen, nur a-z, 0-9 und _' :
                 !hasPassword && password.length > 0 && password.length < 6 ? 'Passwort: min. 6 Zeichen.' :
                 !hasPassword && password.length >= 6 && password !== passwordConfirm ? 'Passwörter stimmen nicht überein.' :
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
              Weiter
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-black mb-1">Profilbild & Sprache</h2>
            <p className="text-sm text-white/50 mb-6">Lade ein Bild hoch und wähle deine Sprache.</p>

            {/* Avatar Upload */}
            <div className="flex flex-col items-center mb-6">
              <label className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#22C55E]/20 border-2 border-dashed border-white/20 group-hover:border-[#FFD700]/40 flex items-center justify-center overflow-hidden transition-all">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-white/30" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center shadow-lg">
                  <Camera className="w-4 h-4 text-black" />
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              <div className="mt-3 text-xs text-white/40">
                {avatarPreview ? 'Bild ausgewählt' : 'JPG/PNG, max. 2MB (optional)'}
              </div>
            </div>

            {/* Language */}
            <div className="mb-6">
              <label className="text-xs text-white/50 font-semibold mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Sprache
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'de' | 'tr' | 'en')}
                className={cn(
                  'w-full px-4 py-3 rounded-xl text-sm',
                  'bg-white/5 border border-white/10',
                  'text-white appearance-none',
                  'focus:outline-none focus:border-[#FFD700]/40 transition-all'
                )}
              >
                <option value="de">Deutsch</option>
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-400/20">
                <X className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={() => setStep(1)} disabled={submitting}>
                Zurück
              </Button>
              <Button
                variant="gold"
                size="lg"
                fullWidth
                onClick={() => setStep(3)}
              >
                Weiter
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-black mb-1">Wähle deinen Club</h2>
            <p className="text-sm text-white/50 mb-4">
              Folge mindestens einem Club um loszulegen. Du kannst später weitere hinzufügen.
            </p>

            {/* Club Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={clubSearch}
                onChange={(e) => setClubSearch(e.target.value)}
                placeholder="Club suchen..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 transition-all"
              />
            </div>

            {/* Club Grid */}
            {clubsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
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
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                        selected
                          ? 'bg-[#FFD700]/10 border border-[#FFD700]/30'
                          : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/5'
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {club.logo_url ? (
                          <img src={club.logo_url} alt="" className="w-5 h-5 object-contain" />
                        ) : (
                          club.short?.slice(0, 3)
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className={cn('text-sm font-semibold truncate', selected ? 'text-[#FFD700]' : 'text-white')}>
                          {club.name}
                        </div>
                        <div className="text-[10px] text-white/40">{club.league}</div>
                      </div>
                      {club.is_verified && <Shield className="w-3.5 h-3.5 text-[#FFD700]/50 flex-shrink-0" />}
                      {selected && (
                        <div className="w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}
                    </button>
                  );
                })}
                {filteredClubs.length === 0 && (
                  <p className="text-center text-sm text-white/40 py-4">Keine Clubs gefunden.</p>
                )}
              </div>
            )}

            {selectedClubIds.size > 0 && (
              <p className="text-xs text-[#FFD700]/70 mb-3">
                {selectedClubIds.size} Club{selectedClubIds.size > 1 ? 's' : ''} ausgewählt
              </p>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-400/20">
                <X className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={() => setStep(2)} disabled={submitting}>
                Zurück
              </Button>
              <Button
                variant="gold"
                size="lg"
                fullWidth
                loading={submitting}
                disabled={selectedClubIds.size === 0}
                onClick={handleSubmit}
              >
                Los geht&apos;s
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
          <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
