'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Shield, Calendar, Loader2, Check, Database, RefreshCw, Users, Shirt, Trophy, AlertCircle, Gamepad2, Globe } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { getActiveGameweek, setActiveGameweek, getClubFantasySettings, updateClubFantasySettings } from '@/lib/services/club';
import type { ClubFantasySettings } from '@/lib/services/club';
import {
  isApiConfigured,
  getMappingStatus,
  syncTeamMapping,
  syncPlayerMapping,
  syncFixtureMapping,
  type MappingStatus,
  type MappingResult,
} from '@/lib/services/footballData';
import type { ClubWithAdmin } from '@/types';

// ============================================
// API-Football Mapping Section
// ============================================

function ApiFootballSection() {
  const [status, setStatus] = useState<MappingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<'teams' | 'players' | 'fixtures' | null>(null);
  const [lastResult, setLastResult] = useState<{ type: string; result: MappingResult } | null>(null);
  const [fixtureGw, setFixtureGw] = useState<number>(1);
  const apiReady = isApiConfigured();

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getMappingStatus();
      setStatus(s);
    } catch (err) { console.error('[AdminSettings] loadMappingStatus:', err); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (apiReady) loadStatus();
    else setLoading(false);
  }, [apiReady, loadStatus]);

  const handleSyncTeams = async () => {
    setSyncing('teams');
    setLastResult(null);
    try {
      const result = await syncTeamMapping();
      setLastResult({ type: 'Teams', result });
      await loadStatus();
    } catch (e) {
      setLastResult({ type: 'Teams', result: { matched: 0, unmatched: [], errors: [e instanceof Error ? e.message : 'Fehler'] } });
    }
    setSyncing(null);
  };

  const handleSyncPlayers = async () => {
    setSyncing('players');
    setLastResult(null);
    try {
      const result = await syncPlayerMapping();
      setLastResult({ type: 'Spieler', result });
      await loadStatus();
    } catch (e) {
      setLastResult({ type: 'Spieler', result: { matched: 0, unmatched: [], errors: [e instanceof Error ? e.message : 'Fehler'] } });
    }
    setSyncing(null);
  };

  const handleSyncFixtures = async () => {
    setSyncing('fixtures');
    setLastResult(null);
    try {
      const result = await syncFixtureMapping(fixtureGw);
      setLastResult({ type: `Fixtures GW ${fixtureGw}`, result });
      await loadStatus();
    } catch (e) {
      setLastResult({ type: `Fixtures GW ${fixtureGw}`, result: { matched: 0, unmatched: [], errors: [e instanceof Error ? e.message : 'Fehler'] } });
    }
    setSyncing(null);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <Database className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <div className="font-bold">API-Football Integration</div>
          <div className="text-xs text-white/50">
            Echte Match-Daten importieren (TFF 1. Lig)
          </div>
        </div>
      </div>

      {!apiReady ? (
        <div className="text-sm text-white/40 p-4 bg-white/[0.02] rounded-xl border border-dashed border-white/10 text-center">
          <AlertCircle className="w-5 h-5 mx-auto mb-2 text-orange-400" />
          <div className="font-semibold text-white/60 mb-1">API Key nicht konfiguriert</div>
          <div>Setze <code className="text-sky-400 font-mono text-xs">NEXT_PUBLIC_API_FOOTBALL_KEY</code> in <code className="text-white/60 font-mono text-xs">.env.local</code></div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-white/30" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mapping Status Dashboard */}
          {status && (
            <div className="grid grid-cols-3 gap-3">
              <StatusPill label="Clubs" mapped={status.clubsMapped} total={status.clubsTotal} icon={<Shield className="w-3.5 h-3.5" />} />
              <StatusPill label="Spieler" mapped={status.playersMapped} total={status.playersTotal} icon={<Shirt className="w-3.5 h-3.5" />} />
              <StatusPill label="Fixtures" mapped={status.fixturesMapped} total={status.fixturesTotal} icon={<Trophy className="w-3.5 h-3.5" />} />
            </div>
          )}

          {/* Sync Actions */}
          <div className="space-y-3">
            {/* Teams */}
            <div className="flex items-center gap-3">
              <Button onClick={handleSyncTeams} disabled={!!syncing} className="flex-1">
                {syncing === 'teams' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                Teams syncen
              </Button>
            </div>

            {/* Players */}
            <div className="flex items-center gap-3">
              <Button onClick={handleSyncPlayers} disabled={!!syncing || (status?.clubsMapped ?? 0) === 0} className="flex-1">
                {syncing === 'players' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shirt className="w-4 h-4 mr-2" />}
                Spieler syncen
              </Button>
            </div>

            {/* Fixtures (per GW) */}
            <div className="flex items-center gap-3">
              <select
                value={fixtureGw}
                onChange={(e) => setFixtureGw(Number(e.target.value))}
                className="w-28 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm"
              >
                {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
                  <option key={gw} value={gw}>GW {gw}</option>
                ))}
              </select>
              <Button onClick={handleSyncFixtures} disabled={!!syncing || (status?.clubsMapped ?? 0) === 0} className="flex-1">
                {syncing === 'fixtures' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Fixtures syncen
              </Button>
            </div>
          </div>

          {/* Last Result */}
          {lastResult && (
            <div className={`p-3 rounded-xl text-sm ${lastResult.result.errors.length > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-[#22C55E]/10 border border-[#22C55E]/20'}`}>
              <div className="font-bold mb-1">
                {lastResult.type}: {lastResult.result.matched} gemappt
                {lastResult.result.unmatched.length > 0 && (
                  <span className="text-orange-400 font-normal"> / {lastResult.result.unmatched.length} nicht gefunden</span>
                )}
              </div>
              {lastResult.result.errors.length > 0 && (
                <div className="text-red-400 text-xs space-y-0.5">
                  {lastResult.result.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
              {lastResult.result.unmatched.length > 0 && lastResult.result.unmatched.length <= 10 && (
                <div className="text-orange-400/70 text-xs mt-1">
                  Nicht gefunden: {lastResult.result.unmatched.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function StatusPill({ label, mapped, total, icon }: { label: string; mapped: number; total: number; icon: React.ReactNode }) {
  const pct = total > 0 ? Math.round((mapped / total) * 100) : 0;
  const color = pct === 100 ? 'text-[#22C55E]' : pct > 0 ? 'text-[#FFD700]' : 'text-white/30';

  return (
    <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-[10px] font-bold text-white/40 uppercase">{label}</span>
      </div>
      <div className={`text-lg font-black ${color}`}>{mapped}/{total}</div>
      <div className="text-[10px] text-white/25">{pct}%</div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

const JURISDICTIONS: { value: ClubFantasySettings['fantasy_jurisdiction_preset']; label: string; desc: string }[] = [
  { value: 'TR', label: 'Türkei', desc: 'Entry Fees deaktiviert (Regulierung)' },
  { value: 'DE', label: 'Deutschland', desc: 'Entry Fees deaktiviert (Regulierung)' },
  { value: 'OTHER', label: 'Andere', desc: 'Entry Fees möglich (Eigenverantwortung)' },
];

export default function AdminSettingsTab({ club }: { club: ClubWithAdmin }) {
  const [currentGw, setCurrentGw] = useState<number | null>(null);
  const [selectedGw, setSelectedGw] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fantasy Settings
  const [fantasySettings, setFantasySettings] = useState<ClubFantasySettings | null>(null);
  const [fantasySaving, setFantasySaving] = useState(false);
  const [fantasySaved, setFantasySaved] = useState(false);

  useEffect(() => {
    getActiveGameweek(club.id).then(gw => {
      setCurrentGw(gw);
      setSelectedGw(gw);
    }).catch(err => console.error('[AdminSettings] getActiveGameweek:', err));
    getClubFantasySettings(club.id).then(setFantasySettings)
      .catch(err => console.error('[AdminSettings] getClubFantasySettings:', err));
  }, [club.id]);

  const handleSetGw = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await setActiveGameweek(club.id, selectedGw);
      setCurrentGw(selectedGw);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error('[AdminSettings] setActiveGameweek:', err); }
    setSaving(false);
  };

  const handleSaveFantasy = async () => {
    if (!fantasySettings) return;
    setFantasySaving(true);
    setFantasySaved(false);
    try {
      await updateClubFantasySettings(club.id, fantasySettings);
      setFantasySaved(true);
      setTimeout(() => setFantasySaved(false), 2000);
    } catch (err) { console.error('[AdminSettings] updateClubFantasySettings:', err); }
    setFantasySaving(false);
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

      {/* API-Football Integration */}
      <ApiFootballSection />

      {/* Fantasy Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="font-bold">Fantasy-Einstellungen</div>
            <div className="text-xs text-white/50">Jurisdiktion und Event-Defaults für diesen Club</div>
          </div>
        </div>

        {!fantasySettings ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-white/30" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Jurisdiction */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-white/40" />
                Jurisdiktion
              </label>
              <select
                value={fantasySettings.fantasy_jurisdiction_preset}
                onChange={(e) => {
                  const preset = e.target.value as ClubFantasySettings['fantasy_jurisdiction_preset'];
                  const allowFees = preset === 'OTHER';
                  setFantasySettings(prev => prev ? { ...prev, fantasy_jurisdiction_preset: preset, fantasy_allow_entry_fees: allowFees, fantasy_entry_fee_cents: allowFees ? prev.fantasy_entry_fee_cents : 0 } : prev);
                }}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm"
              >
                {JURISDICTIONS.map(j => (
                  <option key={j.value} value={j.value}>{j.label} — {j.desc}</option>
                ))}
              </select>
            </div>

            {/* Entry Fee Lock Info */}
            {!fantasySettings.fantasy_allow_entry_fees && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-300/80">
                  Entry Fees sind in <strong>{fantasySettings.fantasy_jurisdiction_preset === 'TR' ? 'der Türkei' : 'Deutschland'}</strong> aus regulatorischen Gründen deaktiviert. Alle Events dieses Clubs werden automatisch auf 0 BSD gesetzt.
                </div>
              </div>
            )}

            {/* Default Entry Fee (only if allowed) */}
            {fantasySettings.fantasy_allow_entry_fees && (
              <div>
                <label className="block text-sm font-medium mb-2">Standard-Teilnahmegebühr (BSD)</label>
                <input
                  type="number"
                  value={fantasySettings.fantasy_entry_fee_cents / 100}
                  onChange={(e) => setFantasySettings(prev => prev ? { ...prev, fantasy_entry_fee_cents: Math.max(0, Math.round(Number(e.target.value) * 100)) } : prev)}
                  min={0}
                  max={1000}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm"
                />
                <div className="text-[10px] text-white/30 mt-1">Wird als Default in neue Events übernommen</div>
              </div>
            )}

            <Button
              onClick={handleSaveFantasy}
              disabled={fantasySaving}
              className="w-full"
            >
              {fantasySaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : fantasySaved ? (
                <><Check className="w-4 h-4 text-[#22C55E]" /> Gespeichert</>
              ) : (
                'Fantasy-Einstellungen speichern'
              )}
            </Button>
          </div>
        )}
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
