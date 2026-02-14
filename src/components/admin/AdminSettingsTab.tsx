'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Shield, Calendar, Loader2, Check } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { getActiveGameweek, setActiveGameweek } from '@/lib/services/club';
import type { ClubWithAdmin } from '@/types';

export default function AdminSettingsTab({ club }: { club: ClubWithAdmin }) {
  const [currentGw, setCurrentGw] = useState<number | null>(null);
  const [selectedGw, setSelectedGw] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getActiveGameweek(club.id).then(gw => {
      setCurrentGw(gw);
      setSelectedGw(gw);
    }).catch(() => {});
  }, [club.id]);

  const handleSetGw = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await setActiveGameweek(club.id, selectedGw);
      setCurrentGw(selectedGw);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* error */ }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black">Einstellungen</h2>

      {/* Active Gameweek Control */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div>
            <div className="font-bold">Aktiver Spieltag</div>
            <div className="text-xs text-white/50">
              Steuert welcher Spieltag in Fantasy aktiv ist
              {currentGw != null && (
                <span className="ml-1 text-[#22C55E]">• Aktuell: GW {currentGw}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedGw}
            onChange={(e) => setSelectedGw(Number(e.target.value))}
            className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm"
          >
            {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
              <option key={gw} value={gw}>
                Spieltag {gw} {gw === currentGw ? '(aktuell)' : ''}
              </option>
            ))}
          </select>
          <Button
            onClick={handleSetGw}
            disabled={saving || selectedGw === currentGw}
            className="px-4"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4 text-[#22C55E]" />
            ) : (
              'Setzen'
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white/50" />
          </div>
          <div>
            <div className="font-bold">Club Info</div>
            <div className="text-xs text-white/50">Grundlegende Informationen</div>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
            <span className="text-white/50">Name</span>
            <span className="font-bold">{club.name}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
            <span className="text-white/50">Slug</span>
            <span className="font-mono text-white/70">{club.slug}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
            <span className="text-white/50">Liga</span>
            <span>{club.league}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
            <span className="text-white/50">Plan</span>
            <span className="text-[#FFD700] font-bold">{club.plan}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
            <span className="text-white/50">Verifiziert</span>
            <span className={club.is_verified ? 'text-[#22C55E]' : 'text-white/50'}>{club.is_verified ? 'Ja' : 'Nein'}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white/50" />
          </div>
          <div>
            <div className="font-bold">Branding & Team</div>
            <div className="text-xs text-white/50">Logo, Farben & Admin-Verwaltung</div>
          </div>
        </div>
        <div className="text-sm text-white/40 p-4 bg-white/[0.02] rounded-xl border border-dashed border-white/10 text-center">
          Logo-Upload, Farbanpassungen und Team-Management werden in Phase 7 freigeschaltet.
        </div>
      </Card>
    </div>
  );
}
