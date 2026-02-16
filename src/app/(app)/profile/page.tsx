'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, Check, X, Loader2, Globe, AlertTriangle, Camera } from 'lucide-react';
import { Card, Button, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { updateProfile, checkHandleAvailable, isValidHandle } from '@/lib/services/profiles';
import { getAllClubsCached } from '@/lib/clubs';
import { uploadAvatar } from '@/lib/services/avatars';
import ProfileView from '@/components/profile/ProfileView';

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'unchanged';

// ============================================
// SETTINGS TAB
// ============================================

function SettingsTab() {
  const { user, profile, refreshProfile } = useUser();

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

  useEffect(() => {
    if (profile) {
      setHandle(profile.handle);
      setDisplayNameVal(profile.display_name ?? '');
      setBio(profile.bio ?? '');
      setFavoriteClub(profile.favorite_club ?? '');
      setLanguage(profile.language);
    }
  }, [profile]);

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
      setProfileMsg({ type: 'success', text: 'Profil gespeichert!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Fehler beim Speichern.' });
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
      await refreshProfile();
      setAccountMsg({ type: 'success', text: 'Einstellungen gespeichert!' });
    } catch (err) {
      setAccountMsg({ type: 'error', text: err instanceof Error ? err.message : 'Fehler beim Speichern.' });
    } finally {
      setSavingAccount(false);
    }
  }, [user, language, refreshProfile]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Bild darf maximal 2MB groß sein.' });
      return;
    }
    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadAvatar(user.id, file);
      await updateProfile(user.id, { avatar_url: avatarUrl });
      await refreshProfile();
    } catch {
      setProfileMsg({ type: 'error', text: 'Avatar konnte nicht hochgeladen werden.' });
    } finally {
      setUploadingAvatar(false);
    }
  }, [user, refreshProfile]);

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card className="p-6">
        <h3 className="font-black text-lg mb-5">Profil</h3>

        {/* Avatar Upload */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#22C55E]/20 border border-white/10 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-white/70" />
              )}
            </div>
            <label className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              {uploadingAvatar ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
              <input type="file" accept="image/png,image/jpeg" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div>
            <div className="text-sm font-semibold">Profilbild</div>
            <div className="text-xs text-white/40">JPG/PNG, max. 2MB</div>
          </div>
        </div>

        {/* Handle */}
        <div className="mb-4">
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Manager-Name</label>
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
                'focus:outline-none transition-all',
                handleStatus === 'available' && 'border-[#22C55E]/40',
                (handleStatus === 'taken' || handleStatus === 'invalid') && 'border-red-400/40',
                (handleStatus === 'idle' || handleStatus === 'checking' || handleStatus === 'unchanged') && 'border-white/10 focus:border-[#FFD700]/40'
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {handleStatus === 'checking' && <Loader2 className="w-4 h-4 text-white/40 animate-spin" />}
              {handleStatus === 'available' && <Check className="w-4 h-4 text-[#22C55E]" />}
              {handleStatus === 'taken' && <X className="w-4 h-4 text-red-400" />}
              {handleStatus === 'invalid' && <X className="w-4 h-4 text-red-400" />}
            </div>
          </div>
          {handleStatus === 'taken' && <div className="mt-1 text-xs text-red-400">Bereits vergeben.</div>}
          {handleStatus === 'invalid' && <div className="mt-1 text-xs text-red-400">3-20 Zeichen, nur a-z, 0-9 und _</div>}
        </div>

        {/* Display Name */}
        <div className="mb-4">
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Anzeigename</label>
          <input
            type="text"
            value={displayNameVal}
            onChange={(e) => setDisplayNameVal(e.target.value.slice(0, 50))}
            placeholder="Dein Name"
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 placeholder:text-white/30 text-white focus:outline-none focus:border-[#FFD700]/40 transition-all"
          />
        </div>

        {/* Bio */}
        <div className="mb-4">
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex items-center justify-between">
            <span>Bio</span>
            <span className={cn('font-mono', bio.length > 140 ? 'text-amber-400' : 'text-white/30')}>
              {bio.length}/160
            </span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            rows={3}
            placeholder="Über dich..."
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 placeholder:text-white/30 text-white focus:outline-none focus:border-[#FFD700]/40 transition-all resize-none"
          />
        </div>

        {/* Favorite Club */}
        <div className="mb-6">
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Lieblingsverein</label>
          <select
            value={favoriteClub}
            onChange={(e) => setFavoriteClub(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white appearance-none focus:outline-none focus:border-[#FFD700]/40 transition-all"
          >
            <option value="">Kein Verein</option>
            {getAllClubsCached().map((club) => (
              <option key={club.id} value={club.id}>{club.name}</option>
            ))}
          </select>
        </div>

        {profileMsg && (
          <div className={cn(
            'flex items-center gap-2 p-3 mb-4 rounded-xl border text-sm',
            profileMsg.type === 'success' ? 'bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]' : 'bg-red-500/10 border-red-400/20 text-red-200'
          )}>
            {profileMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
            {profileMsg.text}
          </div>
        )}

        <Button variant="gold" loading={savingProfile} disabled={!canSaveProfile} onClick={handleSaveProfile}>
          Profil speichern
        </Button>
      </Card>

      {/* Account Section */}
      <Card className="p-6">
        <h3 className="font-black text-lg mb-5">Konto</h3>

        <div className="mb-4">
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">E-Mail</label>
          <input
            type="email"
            value={user?.email ?? ''}
            readOnly
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/[0.02] border border-white/5 text-white/40 cursor-not-allowed"
          />
          <div className="mt-1 text-[10px] text-white/25">Kann nicht geändert werden</div>
        </div>

        <div className="mb-6">
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Sprache
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'de' | 'tr' | 'en')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white appearance-none focus:outline-none focus:border-[#FFD700]/40 transition-all"
          >
            <option value="de">Deutsch</option>
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>
        </div>

        {accountMsg && (
          <div className={cn(
            'flex items-center gap-2 p-3 mb-4 rounded-xl border text-sm',
            accountMsg.type === 'success' ? 'bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]' : 'bg-red-500/10 border-red-400/20 text-red-200'
          )}>
            {accountMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
            {accountMsg.text}
          </div>
        )}

        <Button variant="gold" loading={savingAccount} onClick={handleSaveAccount}>
          Einstellungen speichern
        </Button>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-red-500/20">
        <h3 className="font-black text-lg mb-2 text-red-400">Gefahrenzone</h3>
        <p className="text-sm text-white/40 mb-4">
          Das Löschen deines Kontos kann nicht rückgängig gemacht werden.
        </p>
        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
          <AlertTriangle className="w-4 h-4" />
          Konto löschen
        </Button>
      </Card>

      <Modal open={showDeleteModal} title="Konto löschen?" onClose={() => setShowDeleteModal(false)}>
        <p className="text-sm text-white/60 mb-6">
          Diese Funktion ist im Pilot-Betrieb noch nicht verfügbar. Kontaktiere uns bei Fragen.
        </p>
        <Button variant="outline" fullWidth onClick={() => setShowDeleteModal(false)}>
          Verstanden
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
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFD700]" />
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
