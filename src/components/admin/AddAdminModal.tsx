'use client';

import React, { useState } from 'react';
import { UserPlus, Loader2, Search, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Modal, Button } from '@/components/ui';
import { getProfileByHandle } from '@/lib/services/profiles';
import { addClubAdmin } from '@/lib/services/club';
import { getRoleBadge } from '@/lib/adminRoles';
import type { Profile, ClubAdminRole } from '@/types';

interface AddAdminModalProps {
  open: boolean;
  onClose: () => void;
  clubId: string;
  onAdded: () => void;
}

export default function AddAdminModal({ open, onClose, clubId, onAdded }: AddAdminModalProps) {
  const [handle, setHandle] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundProfile, setFoundProfile] = useState<Profile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<ClubAdminRole>('admin');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!handle.trim()) return;
    setSearching(true);
    setSearchError(null);
    setFoundProfile(null);
    try {
      const profile = await getProfileByHandle(handle.trim());
      if (!profile) {
        setSearchError(`Kein User mit Handle "${handle.trim()}" gefunden.`);
      } else {
        setFoundProfile(profile);
      }
    } catch {
      setSearchError('Fehler bei der Suche.');
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!foundProfile) return;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await addClubAdmin(clubId, foundProfile.id, selectedRole);
      if (!result.success) {
        setSaveError(result.error ?? 'Fehler beim Hinzufügen.');
      } else {
        // Reset and close
        setHandle('');
        setFoundProfile(null);
        setSelectedRole('admin');
        onAdded();
        onClose();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setHandle('');
    setFoundProfile(null);
    setSearchError(null);
    setSaveError(null);
    setSelectedRole('admin');
    onClose();
  };

  const adminBadge = getRoleBadge('admin');
  const editorBadge = getRoleBadge('editor');

  return (
    <Modal open={open} onClose={handleClose} title="Team-Mitglied hinzufügen">
      <div className="space-y-4 p-4 md:p-6">
        {/* Handle search */}
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">User-Handle</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="handle eingeben"
                className="w-full pl-7 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
              />
            </div>
            <Button variant="outline" onClick={handleSearch} disabled={searching || !handle.trim()}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Suchen
            </Button>
          </div>
        </div>

        {/* Search error */}
        {searchError && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {searchError}
          </div>
        )}

        {/* Found profile preview */}
        {foundProfile && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
              {foundProfile.avatar_url ? (
                <Image src={foundProfile.avatar_url} alt={foundProfile.handle} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white/50">
                  {foundProfile.handle.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-bold text-sm">{foundProfile.display_name || foundProfile.handle}</div>
                <div className="text-xs text-white/40">@{foundProfile.handle}</div>
              </div>
            </div>

            {/* Role selection */}
            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">Rolle zuweisen</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedRole('admin')}
                  className={cn('p-3 rounded-xl border text-left transition-colors', selectedRole === 'admin' ? `${adminBadge.bg} ${adminBadge.border}` : 'bg-white/[0.02] border-white/10 hover:border-white/20')}
                >
                  <div className={cn('text-sm font-bold', selectedRole === 'admin' ? adminBadge.color : 'text-white/70')}>
                    Verwalter
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">
                    Events, Bounties, Votes, Moderation
                  </div>
                </button>
                <button
                  onClick={() => setSelectedRole('editor')}
                  className={cn('p-3 rounded-xl border text-left transition-colors', selectedRole === 'editor' ? `${editorBadge.bg} ${editorBadge.border}` : 'bg-white/[0.02] border-white/10 hover:border-white/20')}
                >
                  <div className={cn('text-sm font-bold', selectedRole === 'editor' ? editorBadge.color : 'text-white/70')}>
                    Redakteur
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">
                    Einsicht, kein Schreibzugriff
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {saveError}
          </div>
        )}

        {/* Actions */}
        {foundProfile && (
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={handleClose}>Abbrechen</Button>
            <Button variant="gold" fullWidth onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {saving ? 'Hinzufügen...' : 'Hinzufügen'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
