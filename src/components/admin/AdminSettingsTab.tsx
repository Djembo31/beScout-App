'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, Shield, Calendar, Loader2, Check, Database, RefreshCw, Users, Shirt, Trophy, AlertCircle, Gamepad2, Globe, UserPlus, Trash2, Crown, Palette } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card, Button } from '@/components/ui';
import { getActiveGameweek, setActiveGameweek, getClubFantasySettings, updateClubFantasySettings, getClubAdmins, removeClubAdmin, addClubAdmin, updateClubBranding } from '@/lib/services/club';
import type { ClubFantasySettings } from '@/lib/services/club';
import {
  isApiConfigured,
  getMappingStatus,
  syncTeamMapping,
  syncPlayerMapping,
  syncFixtureMapping,
  importGameweek,
  type MappingStatus,
  type MappingResult,
  type ImportResult,
} from '@/lib/services/footballData';
import { canPerformAction, getRoleBadge } from '@/lib/adminRoles';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import AddAdminModal from '@/components/admin/AddAdminModal';
import type { ClubWithAdmin, ClubAdminRole, DbClubAdmin } from '@/types';

// ============================================
// API-Football Mapping Section
// ============================================

function ApiFootballSection({ userId }: { userId: string }) {
  const t = useTranslations('admin');
  const [status, setStatus] = useState<MappingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<'teams' | 'players' | 'fixtures' | 'import' | null>(null);
  const [lastResult, setLastResult] = useState<{ type: string; result: MappingResult } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
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
    setImportResult(null);
    try {
      const result = await syncTeamMapping(userId);
      setLastResult({ type: t('syncTeams'), result });
      await loadStatus();
    } catch (e) {
      setLastResult({ type: t('syncTeams'), result: { matched: 0, unmatched: [], errors: [e instanceof Error ? e.message : String(e)] } });
    }
    setSyncing(null);
  };

  const handleSyncPlayers = async () => {
    setSyncing('players');
    setLastResult(null);
    setImportResult(null);
    try {
      const result = await syncPlayerMapping(userId);
      setLastResult({ type: t('syncPlayers'), result });
      await loadStatus();
    } catch (e) {
      setLastResult({ type: t('syncPlayers'), result: { matched: 0, unmatched: [], errors: [e instanceof Error ? e.message : String(e)] } });
    }
    setSyncing(null);
  };

  const handleSyncFixtures = async () => {
    setSyncing('fixtures');
    setLastResult(null);
    setImportResult(null);
    try {
      const result = await syncFixtureMapping(userId, fixtureGw);
      setLastResult({ type: `${t('labelFixtures')} GW ${fixtureGw}`, result });
      await loadStatus();
    } catch (e) {
      setLastResult({ type: `${t('labelFixtures')} GW ${fixtureGw}`, result: { matched: 0, unmatched: [], errors: [e instanceof Error ? e.message : String(e)] } });
    }
    setSyncing(null);
  };

  const handleImportGameweek = async () => {
    setSyncing('import');
    setLastResult(null);
    setImportResult(null);
    try {
      const result = await importGameweek(userId, fixtureGw);
      setImportResult(result);
    } catch (e) {
      setImportResult({ success: false, fixturesImported: 0, statsImported: 0, scoresSynced: 0, errors: [e instanceof Error ? e.message : String(e)] });
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
          <div className="font-bold">{t('apiFootball')}</div>
          <div className="text-xs text-white/50">
            {t('apiFootballDesc')}
          </div>
        </div>
      </div>

      {!apiReady ? (
        <div className="text-sm text-white/40 p-4 bg-surface-base rounded-xl border border-dashed border-white/10 text-center">
          <AlertCircle className="w-5 h-5 mx-auto mb-2 text-orange-400" />
          <div className="font-semibold text-white/60 mb-1">{t('apiKeyNotConfigured')}</div>
          <div>{t('apiKeySetHint', { key: 'NEXT_PUBLIC_API_FOOTBALL_KEY', file: '.env.local' })}</div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-white/30" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mapping Status Dashboard */}
          {status && (
            <div className="grid grid-cols-3 gap-3">
              <StatusPill label={t('labelClubs')} mapped={status.clubsMapped} total={status.clubsTotal} icon={<Shield className="w-3.5 h-3.5" />} />
              <StatusPill label={t('labelPlayers')} mapped={status.playersMapped} total={status.playersTotal} icon={<Shirt className="w-3.5 h-3.5" />} />
              <StatusPill label={t('labelFixtures')} mapped={status.fixturesMapped} total={status.fixturesTotal} icon={<Trophy className="w-3.5 h-3.5" />} />
            </div>
          )}

          {/* Sync Actions */}
          <div className="space-y-3">
            {/* Teams */}
            <div className="flex items-center gap-3">
              <Button onClick={handleSyncTeams} disabled={!!syncing} className="flex-1">
                {syncing === 'teams' ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                {t('syncTeams')}
              </Button>
            </div>

            {/* Players */}
            <div className="flex items-center gap-3">
              <Button onClick={handleSyncPlayers} disabled={!!syncing || (status?.clubsMapped ?? 0) === 0} className="flex-1">
                {syncing === 'players' ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none mr-2" /> : <Shirt className="w-4 h-4 mr-2" />}
                {t('syncPlayers')}
              </Button>
            </div>

            {/* Fixtures (per GW) */}
            <div className="flex items-center gap-3">
              <select
                id="fixture-gw"
                aria-label={t('gwFixtureSyncAria')}
                value={fixtureGw}
                onChange={(e) => setFixtureGw(Number(e.target.value))}
                className="w-28 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm min-h-[44px]"
              >
                {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
                  <option key={gw} value={gw}>GW {gw}</option>
                ))}
              </select>
              <Button onClick={handleSyncFixtures} disabled={!!syncing || (status?.clubsMapped ?? 0) === 0} className="flex-1">
                {syncing === 'fixtures' ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {t('syncFixtures')}
              </Button>
            </div>

            {/* Import Gameweek */}
            <div className="flex items-center gap-3">
              <div className="w-28" />
              <Button
                onClick={handleImportGameweek}
                disabled={!!syncing || (status?.fixturesMapped ?? 0) === 0}
                className="flex-1"
              >
                {syncing === 'import' ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none mr-2" /> : <Trophy className="w-4 h-4 mr-2" />}
                {t('importGameweek')}
              </Button>
            </div>
          </div>

          {/* Last Mapping Result */}
          {lastResult && (
            <div className={cn('p-3 rounded-xl text-sm', lastResult.result.errors.length > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20')}>
              <div className="font-bold mb-1">
                {lastResult.type}: {t('mapped', { count: lastResult.result.matched })}
                {lastResult.result.unmatched.length > 0 && (
                  <span className="text-orange-400 font-normal"> / {t('notFoundCount', { count: lastResult.result.unmatched.length })}</span>
                )}
              </div>
              {lastResult.result.errors.length > 0 && (
                <div className="text-red-400 text-xs space-y-0.5">
                  {lastResult.result.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
              {lastResult.result.unmatched.length > 0 && lastResult.result.unmatched.length <= 10 && (
                <div className="text-orange-400/70 text-xs mt-1">
                  {t('notFoundLabel')} {lastResult.result.unmatched.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className={cn('p-3 rounded-xl text-sm', importResult.errors.length > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20')}>
              <div className="font-bold mb-1">
                {t('importResult', { gw: fixtureGw, fixtures: importResult.fixturesImported, stats: importResult.statsImported, scores: importResult.scoresSynced })}
              </div>
              {importResult.errors.length > 0 && (
                <div className="text-red-400 text-xs space-y-0.5">
                  {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
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
  const color = pct === 100 ? 'text-green-500' : pct > 0 ? 'text-gold' : 'text-white/30';

  return (
    <div className="p-3 bg-surface-base rounded-xl border border-divider text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-[10px] font-bold text-white/40 uppercase">{label}</span>
      </div>
      <div className={cn('text-lg font-black', color)}>{mapped}/{total}</div>
      <div className="text-[10px] text-white/25">{pct}%</div>
    </div>
  );
}

// ============================================
// Branding Section
// ============================================

function BrandingSection({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('admin');
  const { addToast } = useToast();
  const [primaryColor, setPrimaryColor] = useState(club.primary_color ?? '#FFD700');
  const [secondaryColor, setSecondaryColor] = useState(club.secondary_color ?? '#FFFFFF');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const result = await updateClubBranding(club.id, {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
      });
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        addToast(result.error ?? t('saveError'), 'error');
      }
    } catch (err) {
      console.error('[AdminSettings] updateClubBranding:', err);
      addToast(t('saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <div className="font-bold">{t('branding')}</div>
          <div className="text-xs text-white/50">{t('brandingDesc')}</div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Color Pickers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="primary-color" className="block text-sm font-medium mb-2">{t('primaryColor')}</label>
            <div className="flex items-center gap-2">
              <input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                maxLength={7}
                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono min-h-[44px] focus:outline-none focus:border-gold/40 focus-visible:ring-2 focus-visible:ring-gold/50"
              />
            </div>
          </div>
          <div>
            <label htmlFor="secondary-color" className="block text-sm font-medium mb-2">{t('secondaryColor')}</label>
            <div className="flex items-center gap-2">
              <input
                id="secondary-color"
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                maxLength={7}
                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono min-h-[44px] focus:outline-none focus:border-gold/40 focus-visible:ring-2 focus-visible:ring-gold/50"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 rounded-xl border border-white/10" style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}10)` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2" style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}20` }} />
            <div>
              <div className="font-bold text-sm" style={{ color: primaryColor }}>{club.name}</div>
              <div className="text-xs" style={{ color: secondaryColor }}>{club.league}</div>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} aria-busy={saving} className="w-full">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : saved ? (
            <><Check className="w-4 h-4 text-green-500" aria-hidden="true" /> {t('saved')}</>
          ) : (
            t('saveBranding')
          )}
        </Button>
      </div>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

const JURISDICTION_VALUES: ClubFantasySettings['fantasy_jurisdiction_preset'][] = ['TR', 'DE', 'OTHER'];

type AdminWithProfile = DbClubAdmin & { handle: string; display_name: string | null };

export default function AdminSettingsTab({ club }: { club: ClubWithAdmin }) {
  const { user } = useUser();
  const { addToast } = useToast();
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const tr = useTranslations('roles');
  const role = club.admin_role ?? 'editor';
  const isOwner = canPerformAction('manage_admins', role);
  const jurisdictions = JURISDICTION_VALUES.map(value => ({
    value,
    label: t(`jurisdiction${value}` as any),
    desc: t(`jurisdiction${value}Desc` as any),
  }));

  const [currentGw, setCurrentGw] = useState<number | null>(null);
  const [selectedGw, setSelectedGw] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fantasy Settings
  const [fantasySettings, setFantasySettings] = useState<ClubFantasySettings | null>(null);
  const [fantasySaving, setFantasySaving] = useState(false);
  const [fantasySaved, setFantasySaved] = useState(false);

  // Team Management
  const [admins, setAdmins] = useState<AdminWithProfile[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const loadAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const data = await getClubAdmins(club.id);
      setAdmins(data);
    } catch (err) {
      console.error('[AdminSettings] getClubAdmins:', err);
    } finally {
      setAdminsLoading(false);
    }
  }, [club.id]);

  useEffect(() => {
    getActiveGameweek(club.id).then(gw => {
      setCurrentGw(gw);
      setSelectedGw(gw);
    }).catch(err => console.error('[AdminSettings] getActiveGameweek:', err));
    getClubFantasySettings(club.id).then(setFantasySettings)
      .catch(err => console.error('[AdminSettings] getClubFantasySettings:', err));
    loadAdmins();
  }, [club.id, loadAdmins]);

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

  const handleRemoveAdmin = async (userId: string) => {
    setRemovingId(userId);
    try {
      const result = await removeClubAdmin(club.id, userId);
      if (result.success) {
        addToast(t('memberRemoved'), 'success');
        await loadAdmins();
      } else {
        addToast(result.error ?? t('removeError'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : tc('error'), 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: ClubAdminRole) => {
    setChangingRole(userId);
    try {
      const result = await addClubAdmin(club.id, userId, newRole);
      if (result.success) {
        addToast(t('roleChanged'), 'success');
        await loadAdmins();
      } else {
        addToast(result.error ?? tc('error'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : tc('error'), 'error');
    } finally {
      setChangingRole(null);
    }
  };

  const canSetGw = canPerformAction('set_gameweek', role);
  const canSetJurisdiction = canPerformAction('set_jurisdiction', role);
  const canSyncApi = canPerformAction('sync_api', role);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black">{t('settings')}</h2>

      {/* Active Gameweek Control — Owner only */}
      {canSetGw && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gold" />
            </div>
            <div>
              <div className="font-bold">{t('activeGameweek')}</div>
              <div className="text-xs text-white/50">
                {t('activeGameweekDesc')}
                {currentGw != null && (
                  <span className="ml-1 text-green-500">• {t('current')}: GW {currentGw}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              id="active-gw"
              aria-label={t('activeGameweekAria')}
              value={selectedGw}
              onChange={(e) => setSelectedGw(Number(e.target.value))}
              className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm min-h-[44px]"
            >
              {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
                <option key={gw} value={gw}>
                  {t('gameweekLabel', { gw })} {gw === currentGw ? t('gameweekCurrent') : ''}
                </option>
              ))}
            </select>
            <Button
              onClick={handleSetGw}
              disabled={saving || selectedGw === currentGw}
              className="px-4"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
              ) : saved ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                t('set')
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* API-Football Integration — Owner + Admin */}
      {canSyncApi && user?.id && <ApiFootballSection userId={user.id} />}

      {/* Fantasy Settings — Owner only for jurisdiction */}
      {canSetJurisdiction && (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="font-bold">{t('fantasySettings')}</div>
            <div className="text-xs text-white/50">{t('fantasySettingsDesc')}</div>
          </div>
        </div>

        {!fantasySettings ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-white/30" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Jurisdiction */}
            <div>
              <label htmlFor="jurisdiction" className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-white/40" />
                {t('jurisdiction')}
              </label>
              <select
                id="jurisdiction"
                value={fantasySettings.fantasy_jurisdiction_preset}
                onChange={(e) => {
                  const preset = e.target.value as ClubFantasySettings['fantasy_jurisdiction_preset'];
                  const allowFees = preset === 'OTHER';
                  setFantasySettings(prev => prev ? { ...prev, fantasy_jurisdiction_preset: preset, fantasy_allow_entry_fees: allowFees, fantasy_entry_fee_cents: allowFees ? prev.fantasy_entry_fee_cents : 0 } : prev);
                }}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm min-h-[44px]"
              >
                {jurisdictions.map(j => (
                  <option key={j.value} value={j.value}>{j.label} — {j.desc}</option>
                ))}
              </select>
            </div>

            {/* Entry Fee Lock Info */}
            {!fantasySettings.fantasy_allow_entry_fees && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-300/80">
                  {t('entryFeesDisabled', { country: t(fantasySettings.fantasy_jurisdiction_preset === 'TR' ? 'countryTR' : 'countryDE') })}
                </div>
              </div>
            )}

            {/* Default Entry Fee (only if allowed) */}
            {fantasySettings.fantasy_allow_entry_fees && (
              <div>
                <label htmlFor="entry-fee" className="block text-sm font-medium mb-2">{t('defaultEntryFee')}</label>
                <input
                  id="entry-fee"
                  type="number"
                  inputMode="numeric"
                  value={fantasySettings.fantasy_entry_fee_cents / 100}
                  onChange={(e) => setFantasySettings(prev => prev ? { ...prev, fantasy_entry_fee_cents: Math.max(0, Math.round(Number(e.target.value) * 100)) } : prev)}
                  min={0}
                  max={1000}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm min-h-[44px]"
                />
                <div className="text-[10px] text-white/30 mt-1">{t('defaultEntryFeeHint')}</div>
              </div>
            )}

            <Button
              onClick={handleSaveFantasy}
              disabled={fantasySaving}
              className="w-full"
            >
              {fantasySaving ? (
                <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
              ) : fantasySaved ? (
                <><Check className="w-4 h-4 text-green-500" /> {t('saved')}</>
              ) : (
                t('saveFantasySettings')
              )}
            </Button>
          </div>
        )}
      </Card>
      )}

      {/* Branding — Owner only */}
      {isOwner && <BrandingSection club={club} />}

      {/* Club Info */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white/50" />
          </div>
          <div>
            <div className="font-bold">{t('clubInfo')}</div>
            <div className="text-xs text-white/50">{t('basicInfo')}</div>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 bg-surface-base rounded-xl">
            <span className="text-white/50">{t('fieldName')}</span>
            <span className="font-bold">{club.name}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-base rounded-xl">
            <span className="text-white/50">{t('fieldSlug')}</span>
            <span className="font-mono text-white/70">{club.slug}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-base rounded-xl">
            <span className="text-white/50">{t('fieldLeague')}</span>
            <span>{club.league}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-base rounded-xl">
            <span className="text-white/50">{t('fieldPlan')}</span>
            <span className="text-gold font-bold">{club.plan}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-base rounded-xl">
            <span className="text-white/50">{t('fieldVerified')}</span>
            <span className={club.is_verified ? 'text-green-500' : 'text-white/50'}>{club.is_verified ? tc('yes') : tc('no')}</span>
          </div>
        </div>
      </Card>

      {/* Team-Verwaltung */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-gold" />
            </div>
            <div>
              <div className="font-bold">{t('teamManagement')}</div>
              <div className="text-xs text-white/50">{t('teamManagementDesc')}</div>
            </div>
          </div>
          {isOwner && (
            <Button variant="gold" size="sm" onClick={() => setAddModalOpen(true)}>
              <UserPlus className="w-3.5 h-3.5" />
              {t('addMember')}
            </Button>
          )}
        </div>

        {adminsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-white/30" />
          </div>
        ) : (
          <div className="space-y-2">
            {admins.map(admin => {
              const badge = getRoleBadge(admin.role);
              const isSelf = admin.user_id === user?.id;
              const isAdminOwner = admin.role === 'owner';
              return (
                <div key={admin.id} className="flex items-center gap-3 p-3 bg-surface-base rounded-xl border border-divider">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                    {admin.handle.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">
                      {admin.display_name || admin.handle}
                      {isSelf && <span className="text-[10px] text-white/30 ml-1">{t('you')}</span>}
                    </div>
                    <div className="text-[10px] text-white/40">@{admin.handle}</div>
                  </div>
                  {/* Role badge / dropdown */}
                  {isOwner && !isAdminOwner ? (
                    <select
                      aria-label={t('roleFor', { name: admin.handle })}
                      value={admin.role}
                      onChange={(e) => handleChangeRole(admin.user_id, e.target.value as ClubAdminRole)}
                      disabled={changingRole === admin.user_id}
                      className={cn('px-2 py-2 rounded-lg text-xs font-bold border min-h-[44px] bg-transparent cursor-pointer', badge.bg, badge.color, badge.border)}
                    >
                      <option value="admin">{t('roleAdmin')}</option>
                      <option value="editor">{t('roleEditor')}</option>
                    </select>
                  ) : (
                    <span className={cn('px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1', badge.bg, badge.color, badge.border)}>
                      {isAdminOwner && <Crown className="w-3 h-3" />}
                      {tr(badge.labelKey)}
                    </span>
                  )}
                  {/* Remove button — Owner only, can't remove self */}
                  {isOwner && !isAdminOwner && !isSelf && (
                    <button
                      onClick={() => handleRemoveAdmin(admin.user_id)}
                      disabled={removingId === admin.user_id}
                      aria-label={t('removeAdmin', { name: admin.handle })}
                      className="p-2.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      {removingId === admin.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isOwner && (
          <div className="text-sm text-white/40 p-4 bg-surface-base rounded-xl border border-dashed border-white/10 text-center mt-4">
            {t('ownerOnlyTeam')}
          </div>
        )}
      </Card>

      {/* Add Admin Modal */}
      {isOwner && (
        <AddAdminModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          clubId={club.id}
          onAdded={loadAdmins}
        />
      )}
    </div>
  );
}
