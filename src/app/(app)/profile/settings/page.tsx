'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { User, Check, X, Loader2, Globe, AlertTriangle, Camera, Bell, BellRing, ArrowLeftRight, Send, Trophy, UserPlus, Target, Gift, ArrowLeft } from 'lucide-react';
import { Card, Button, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { updateProfile, checkHandleAvailable, isValidHandle } from '@/lib/services/profiles';
import { getAllClubsCached } from '@/lib/clubs';
import { uploadAvatar } from '@/lib/services/avatars';
import { getNotificationPreferences, updateNotificationPreferences, NOTIFICATION_CATEGORIES } from '@/lib/services/notifications';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { NotificationCategory } from '@/types';

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'unchanged';

export default function ProfileSettingsPage() {
  const { user, profile, loading, refreshProfile } = useUser();
  const t = useTranslations('profile');

  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle');
  const [displayNameVal, setDisplayNameVal] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteClub, setFavoriteClub] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [language, setLanguage] = useState<'de' | 'tr' | 'en'>('de');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMsg, setAccountMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<Record<NotificationCategory, boolean>>({
    trading: true, offers: true, fantasy: true, social: true, bounties: true, rewards: true,
  });
  const [notifPrefsLoaded, setNotifPrefsLoaded] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profile) {
      setHandle(profile.handle);
      setDisplayNameVal(profile.display_name ?? '');
      setBio(profile.bio ?? '');
      setFavoriteClub(profile.favorite_club_id ?? '');
      setLanguage(profile.language);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    getNotificationPreferences(user.id).then((prefs) => {
      setNotifPrefs({
        trading: prefs.trading,
        offers: prefs.offers,
        fantasy: prefs.fantasy,
        social: prefs.social,
        bounties: prefs.bounties,
        rewards: prefs.rewards,
      });
      setNotifPrefsLoaded(true);
    }).catch((err) => console.error('[Settings] Notification prefs failed:', err));
  }, [user]);

  // Push notification state
  useEffect(() => {
    import('@/lib/services/pushSubscription').then(({ isPushSupported, isPushEnabled }) => {
      setPushSupported(isPushSupported());
      setPushEnabled(isPushEnabled());
    }).catch((err) => { console.error('[Settings] Push service unavailable:', err); });
  }, []);

  const togglePush = useCallback(async () => {
    if (!user) return;
    setPushLoading(true);
    try {
      if (pushEnabled) {
        const { unsubscribeFromPush } = await import('@/lib/services/pushSubscription');
        await unsubscribeFromPush(user.id);
        setPushEnabled(false);
      } else {
        const { subscribeToPush } = await import('@/lib/services/pushSubscription');
        const ok = await subscribeToPush(user.id);
        setPushEnabled(ok);
      }
    } catch (err) {
      console.error('[Settings] Push toggle failed:', err);
    } finally {
      setPushLoading(false);
    }
  }, [user, pushEnabled]);

  const toggleNotifPref = useCallback((key: NotificationCategory) => {
    if (!user) return;
    setNotifPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateNotificationPreferences(user.id, updated).catch((err) =>
          console.error('[Settings] Save notif prefs failed:', err)
        );
      }, 500);
      return updated;
    });
  }, [user]);

  useEffect(() => {
    if (!handle || handle === profile?.handle) {
      setHandleStatus(handle === profile?.handle ? 'unchanged' : 'idle');
      return;
    }
    if (!isValidHandle(handle)) {
      setHandleStatus('invalid');
      return;
    }
    setHandleStatus('checking');
    const timer = setTimeout(async () => {
      const available = await checkHandleAvailable(handle);
      setHandleStatus(available ? 'available' : 'taken');
    }, 500);
    return () => clearTimeout(timer);
  }, [handle, profile?.handle]);

  const canSaveProfile = handleStatus === 'available' || handleStatus === 'unchanged';

  const handleSaveProfile = useCallback(async () => {
    if (!user || !canSaveProfile) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const selectedClub = favoriteClub ? getAllClubsCached().find(c => c.id === favoriteClub) : null;
      await updateProfile(user.id, {
        handle: handle !== profile?.handle ? handle : undefined,
        display_name: displayNameVal || null,
        bio: bio || null,
        favorite_club: selectedClub?.name ?? null,
        favorite_club_id: favoriteClub || null,
      });
      await refreshProfile();
      setProfileMsg({ type: 'success', text: t('saved') });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : t('saveFailed') });
    } finally {
      setSavingProfile(false);
    }
  }, [user, handle, displayNameVal, bio, favoriteClub, profile?.handle, canSaveProfile, refreshProfile, t]);

  const handleSaveAccount = useCallback(async () => {
    if (!user) return;
    setSavingAccount(true);
    setAccountMsg(null);
    try {
      await updateProfile(user.id, { language });
      document.cookie = `bescout-locale=${language};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
      await refreshProfile();
      setAccountMsg({ type: 'success', text: t('settingsSaved') });
      window.location.reload();
    } catch (err) {
      setAccountMsg({ type: 'error', text: err instanceof Error ? err.message : t('saveFailed') });
    } finally {
      setSavingAccount(false);
    }
  }, [user, language, refreshProfile, t]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: t('avatarTooLarge') });
      return;
    }
    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadAvatar(user.id, file);
      await updateProfile(user.id, { avatar_url: avatarUrl });
      await refreshProfile();
    } catch {
      setProfileMsg({ type: 'error', text: t('avatarUploadFailed') });
    } finally {
      setUploadingAvatar(false);
    }
  }, [user, refreshProfile, t]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 flex justify-center">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" />
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back to Profile */}
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('backToProfile')}
      </Link>

      <h1 className="text-2xl font-black">{t('settingsLabel')}</h1>

      {/* Profile Section */}
      <Card className="p-6">
        <h3 className="font-black text-lg text-balance mb-5">{t('title')}</h3>

        {/* Avatar Upload */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative group">
            <div className="relative size-16 rounded-2xl bg-gold/10 border border-white/10 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="" fill className="object-cover" />
              ) : (
                <User className="size-8 text-white/70" aria-hidden="true" />
              )}
            </div>
            <label aria-label={t('avatarUploadAria')} className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              {uploadingAvatar ? (
                <Loader2 className="size-5 text-white animate-spin motion-reduce:animate-none" />
              ) : (
                <Camera className="size-5 text-white" aria-hidden="true" />
              )}
              <input type="file" accept="image/png,image/jpeg" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div>
            <div className="text-sm font-semibold">{t('avatarLabel')}</div>
            <div className="text-[11px] text-white/40">{t('avatarHint')}</div>
          </div>
        </div>

        {/* Handle */}
        <div className="mb-4">
          <label htmlFor="settings-handle" className="text-[11px] text-white/50 font-semibold mb-1.5 block">{t('handleLabel')}</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
            <input
              id="settings-handle"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
              className={cn(
                'w-full pl-8 pr-10 py-2.5 rounded-xl text-sm',
                'bg-white/5 border',
                'placeholder:text-white/30 text-white',
                'focus:outline-none transition-colors',
                handleStatus === 'available' && 'border-green-500/40',
                (handleStatus === 'taken' || handleStatus === 'invalid') && 'border-red-400/40',
                (handleStatus === 'idle' || handleStatus === 'checking' || handleStatus === 'unchanged') && 'border-white/10 focus:border-gold/40'
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {handleStatus === 'checking' && <Loader2 className="size-4 text-white/40 animate-spin motion-reduce:animate-none" />}
              {handleStatus === 'available' && <Check className="size-4 text-green-500" />}
              {handleStatus === 'taken' && <X className="size-4 text-red-400" />}
              {handleStatus === 'invalid' && <X className="size-4 text-red-400" />}
            </div>
          </div>
          {handleStatus === 'taken' && <div className="mt-1 text-[11px] text-red-400">{t('handleTaken')}</div>}
          {handleStatus === 'invalid' && <div className="mt-1 text-[11px] text-red-400">{t('handleInvalid')}</div>}
        </div>

        {/* Display Name */}
        <div className="mb-4">
          <label htmlFor="settings-displayname" className="text-[11px] text-white/50 font-semibold mb-1.5 block">{t('displayNameLabel')}</label>
          <input
            id="settings-displayname"
            type="text"
            value={displayNameVal}
            onChange={(e) => setDisplayNameVal(e.target.value.slice(0, 50))}
            placeholder={t('displayNamePlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 placeholder:text-white/30 text-white focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>

        {/* Bio */}
        <div className="mb-4">
          <label htmlFor="settings-bio" className="text-[11px] text-white/50 font-semibold mb-1.5 flex items-center justify-between">
            <span>{t('bioLabel')}</span>
            <span className={cn('font-mono tabular-nums', bio.length > 140 ? 'text-amber-400' : 'text-white/30')}>
              {bio.length}/160
            </span>
          </label>
          <textarea
            id="settings-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            rows={3}
            placeholder={t('bioPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 placeholder:text-white/30 text-white focus:outline-none focus:border-gold/40 transition-colors resize-none"
          />
        </div>

        {/* Favorite Club */}
        <div className="mb-6">
          <label htmlFor="settings-club" className="text-[11px] text-white/50 font-semibold mb-1.5 block">{t('favoriteClubLabel')}</label>
          <select
            id="settings-club"
            value={favoriteClub}
            onChange={(e) => setFavoriteClub(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white appearance-none focus:outline-none focus:border-gold/40 transition-colors"
          >
            <option value="">{t('favoriteClubNone')}</option>
            {getAllClubsCached().map((club) => (
              <option key={club.id} value={club.id}>{club.name}</option>
            ))}
          </select>
        </div>

        {profileMsg && (
          <div role="alert" className={cn(
            'flex items-center gap-2 p-3 mb-4 rounded-xl border text-sm',
            profileMsg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-400/20 text-red-200'
          )}>
            {profileMsg.type === 'success' ? <Check className="size-4 shrink-0" aria-hidden="true" /> : <X className="size-4 shrink-0" aria-hidden="true" />}
            {profileMsg.text}
          </div>
        )}

        <Button variant="gold" loading={savingProfile} disabled={!canSaveProfile} onClick={handleSaveProfile}>
          {t('saveProfile')}
        </Button>
      </Card>

      {/* Account Section */}
      <Card className="p-6">
        <h3 className="font-black text-lg text-balance mb-5">{t('account')}</h3>

        <div className="mb-4">
          <label htmlFor="settings-email" className="text-[11px] text-white/50 font-semibold mb-1.5 block">{t('emailLabel')}</label>
          <input
            id="settings-email"
            type="email"
            value={user?.email ?? ''}
            readOnly
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface-minimal border border-white/5 text-white/40 cursor-not-allowed"
          />
          <div className="mt-1 text-[11px] text-white/25">{t('emailReadOnly')}</div>
        </div>

        <div className="mb-6">
          <label htmlFor="settings-language" className="text-[11px] text-white/50 font-semibold mb-1.5 flex items-center gap-1.5">
            <Globe className="size-3.5" aria-hidden="true" />
            {t('languageLabel')}
          </label>
          <select
            id="settings-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'de' | 'tr' | 'en')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white appearance-none focus:outline-none focus:border-gold/40 transition-colors"
          >
            <option value="de">{t('languageDe')}</option>
            <option value="tr">{t('languageTr')}</option>
            <option value="en">English</option>
          </select>
        </div>

        {accountMsg && (
          <div role="alert" className={cn(
            'flex items-center gap-2 p-3 mb-4 rounded-xl border text-sm',
            accountMsg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-400/20 text-red-200'
          )}>
            {accountMsg.type === 'success' ? <Check className="size-4 shrink-0" aria-hidden="true" /> : <X className="size-4 shrink-0" aria-hidden="true" />}
            {accountMsg.text}
          </div>
        )}

        <Button variant="gold" loading={savingAccount} onClick={handleSaveAccount}>
          {t('saveSettings')}
        </Button>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="size-4 text-gold" aria-hidden="true" />
          <h3 className="font-black text-lg text-balance">{t('notificationPrefs')}</h3>
        </div>
        <p className="text-[11px] text-white/40 text-pretty mb-5">{t('notificationPrefsDesc')}</p>

        {/* Push Notification Toggle */}
        {pushSupported && (
          <button
            onClick={togglePush}
            disabled={pushLoading}
            role="switch"
            aria-checked={pushEnabled}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-subtle transition-colors min-h-[44px] mb-3 border border-divider"
          >
            <div className="size-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0" aria-hidden="true">
              <BellRing className="size-4 text-gold" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium">{t('pushNotifications')}</div>
              <div className="text-[11px] text-white/40 line-clamp-1">{t('pushNotificationsDesc')}</div>
            </div>
            <div
              aria-hidden="true"
              className={cn(
                'w-11 h-6 rounded-full relative transition-colors shrink-0',
                pushEnabled ? 'bg-gold' : 'bg-white/10'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform',
                  pushEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                )}
              />
            </div>
          </button>
        )}

        {!notifPrefsLoaded ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" />
          </div>
        ) : (
          <div className="space-y-1">
            {NOTIFICATION_CATEGORIES.map(({ key }) => {
              const icons: Record<NotificationCategory, React.ReactNode> = {
                trading: <ArrowLeftRight className="size-4" />,
                offers: <Send className="size-4" />,
                fantasy: <Trophy className="size-4" />,
                social: <UserPlus className="size-4" />,
                bounties: <Target className="size-4" />,
                rewards: <Gift className="size-4" />,
              };
              return (
                <button
                  key={key}
                  onClick={() => toggleNotifPref(key)}
                  role="switch"
                  aria-checked={notifPrefs[key]}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-subtle transition-colors min-h-[44px]"
                >
                  <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60 shrink-0" aria-hidden="true">
                    {icons[key]}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium">{t(`notifCat_${key}` as any)}</div>
                    <div className="text-[11px] text-white/40 line-clamp-1">{t(`notifCat_${key}_desc` as any)}</div>
                  </div>
                  <div
                    aria-hidden="true"
                    className={cn(
                      'w-11 h-6 rounded-full relative transition-colors shrink-0',
                      notifPrefs[key] ? 'bg-gold' : 'bg-white/10'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform',
                        notifPrefs[key] ? 'translate-x-[22px]' : 'translate-x-0.5'
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-red-500/20">
        <h3 className="font-black text-lg text-balance mb-2 text-red-400">{t('dangerZone')}</h3>
        <p className="text-sm text-white/40 text-pretty mb-4">
          {t('deleteWarning')}
        </p>
        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
          <AlertTriangle className="size-4" aria-hidden="true" />
          {t('deleteAccount')}
        </Button>
      </Card>

      <Modal open={showDeleteModal} title={t('deleteTitle')} onClose={() => setShowDeleteModal(false)}>
        <p className="text-sm text-white/60 text-pretty mb-6">
          {t('deleteMessage')}
        </p>
        <Button variant="outline" fullWidth onClick={() => setShowDeleteModal(false)}>
          {t('understood')}
        </Button>
      </Modal>
    </div>
  );
}
