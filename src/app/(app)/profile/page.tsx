'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Check, X, Loader2, Globe, AlertTriangle, Camera, Bell, ArrowLeftRight, Send, Trophy, UserPlus, Target, Gift } from 'lucide-react';
import { Card, Button, Modal, Skeleton, SkeletonCard } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { updateProfile, checkHandleAvailable, isValidHandle } from '@/lib/services/profiles';
import { getAllClubsCached } from '@/lib/clubs';
import { uploadAvatar } from '@/lib/services/avatars';
import { getNotificationPreferences, updateNotificationPreferences, NOTIFICATION_CATEGORIES } from '@/lib/services/notifications';
import ProfileView from '@/components/profile/ProfileView';
import { useTranslations } from 'next-intl';
import type { NotificationCategory } from '@/types';

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'unchanged';

// ============================================
// SETTINGS TAB
// ============================================

function SettingsTab() {
  const { user, profile, refreshProfile } = useUser();
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

  // Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState<Record<NotificationCategory, boolean>>({
    trading: true, offers: true, fantasy: true, social: true, bounties: true, rewards: true,
  });
  const [notifPrefsLoaded, setNotifPrefsLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profile) {
      setHandle(profile.handle);
      setDisplayNameVal(profile.display_name ?? '');
      setBio(profile.bio ?? '');
      setFavoriteClub(profile.favorite_club ?? '');
      setLanguage(profile.language);
    }
  }, [profile]);

  // Load notification preferences
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

  const toggleNotifPref = useCallback((key: NotificationCategory) => {
    if (!user) return;
    setNotifPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      // Debounced save
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
      await updateProfile(user.id, {
        handle: handle !== profile?.handle ? handle : undefined,
        display_name: displayNameVal || null,
        bio: bio || null,
        favorite_club: favoriteClub || null,
      });
      await refreshProfile();
      setProfileMsg({ type: 'success', text: t('saved') });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : t('saveFailed') });
    } finally {
      setSavingProfile(false);
    }
  }, [user, handle, displayNameVal, bio, favoriteClub, profile?.handle, canSaveProfile, refreshProfile]);

  const handleSaveAccount = useCallback(async () => {
    if (!user) return;
    setSavingAccount(true);
    setAccountMsg(null);
    try {
      await updateProfile(user.id, { language });
      // Set locale cookie for next-intl
      document.cookie = `bescout-locale=${language};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
      await refreshProfile();
      setAccountMsg({ type: 'success', text: t('settingsSaved') });
      // Reload to apply new locale across the app
      window.location.reload();
    } catch (err) {
      setAccountMsg({ type: 'error', text: err instanceof Error ? err.message : t('saveFailed') });
    } finally {
      setSavingAccount(false);
    }
  }, [user, language, refreshProfile]);

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
  }, [user, refreshProfile]);

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card className="p-6">
        <h3 className="font-black text-lg text-balance mb-5">{t('title')}</h3>

        {/* Avatar Upload */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative group">
            <div className="size-16 rounded-2xl bg-gold/10 border border-white/10 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="size-8 text-white/70" />
              )}
            </div>
            <label className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              {uploadingAvatar ? (
                <Loader2 className="size-5 text-white animate-spin motion-reduce:animate-none" />
              ) : (
                <Camera className="size-5 text-white" />
              )}
              <input type="file" accept="image/png,image/jpeg" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div>
            <div className="text-sm font-semibold">{t('avatarLabel')}</div>
            <div className="text-xs text-white/40">{t('avatarHint')}</div>
          </div>
        </div>

        {/* Handle */}
        <div className="mb-4">
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('handleLabel')}</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
            <input
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
          {handleStatus === 'taken' && <div className="mt-1 text-xs text-red-400">{t('handleTaken')}</div>}
          {handleStatus === 'invalid' && <div className="mt-1 text-xs text-red-400">{t('handleInvalid')}</div>}
        </div>

        {/* Display Name */}
        <div className="mb-4">
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('displayNameLabel')}</label>
          <input
            type="text"
            value={displayNameVal}
            onChange={(e) => setDisplayNameVal(e.target.value.slice(0, 50))}
            placeholder={t('displayNamePlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 placeholder:text-white/30 text-white focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>

        {/* Bio */}
        <div className="mb-4">
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex items-center justify-between">
            <span>{t('bioLabel')}</span>
            <span className={cn('font-mono tabular-nums', bio.length > 140 ? 'text-amber-400' : 'text-white/30')}>
              {bio.length}/160
            </span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            rows={3}
            placeholder={t('bioPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 placeholder:text-white/30 text-white focus:outline-none focus:border-gold/40 transition-colors resize-none"
          />
        </div>

        {/* Favorite Club */}
        <div className="mb-6">
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('favoriteClubLabel')}</label>
          <select
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
          <div className={cn(
            'flex items-center gap-2 p-3 mb-4 rounded-xl border text-sm',
            profileMsg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-400/20 text-red-200'
          )}>
            {profileMsg.type === 'success' ? <Check className="size-4 shrink-0" /> : <X className="size-4 shrink-0" />}
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
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('emailLabel')}</label>
          <input
            type="email"
            value={user?.email ?? ''}
            readOnly
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/[0.02] border border-white/5 text-white/40 cursor-not-allowed"
          />
          <div className="mt-1 text-[10px] text-white/25">{t('emailReadOnly')}</div>
        </div>

        <div className="mb-6">
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex items-center gap-1.5">
            <Globe className="size-3.5" />
            {t('languageLabel')}
          </label>
          <select
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
          <div className={cn(
            'flex items-center gap-2 p-3 mb-4 rounded-xl border text-sm',
            accountMsg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-400/20 text-red-200'
          )}>
            {accountMsg.type === 'success' ? <Check className="size-4 shrink-0" /> : <X className="size-4 shrink-0" />}
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
          <Bell className="size-4 text-gold" />
          <h3 className="font-black text-lg text-balance">{t('notificationPrefs')}</h3>
        </div>
        <p className="text-xs text-white/40 text-pretty mb-5">{t('notificationPrefsDesc')}</p>

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
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors min-h-[44px]"
                >
                  <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60 shrink-0">
                    {icons[key]}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium">{t(`notifCat_${key}` as any)}</div>
                    <div className="text-xs text-white/40 line-clamp-1">{t(`notifCat_${key}_desc` as any)}</div>
                  </div>
                  <div
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
          <AlertTriangle className="size-4" />
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

// ============================================
// MAIN PAGE
// ============================================

export default function ProfilePage() {
  const { user, profile, loading } = useUser();

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Hero skeleton */}
        <div className="animate-pulse bg-white/[0.02] border border-white/10 rounded-2xl h-48 relative">
          <div className="absolute bottom-4 left-4 flex items-end gap-4">
            <Skeleton className="size-20 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        {/* Tabs + content */}
        <Skeleton className="h-10 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <ProfileView
      targetUserId={user.id}
      targetProfile={profile}
      isSelf={true}
      renderSettings={() => <SettingsTab />}
    />
  );
}
