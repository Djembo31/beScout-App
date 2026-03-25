'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, Play, Square, XCircle, Loader2, Zap, CheckCircle2, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button, Chip, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { getEventsByClubId, createEvent, updateEventStatus } from '@/lib/services/events';
import { simulateGameweek, getGameweekStatuses } from '@/lib/services/fixtures';
import { centsToBsd, bsdToCents } from '@/lib/services/players';
import { fmtScout } from '@/lib/utils';
import type { ClubWithAdmin, DbEvent, EventCurrency, GameweekStatus, RewardTier } from '@/types';
import { useScoutEventsEnabled } from '@/lib/queries/events';
import RewardStructureEditor from './RewardStructureEditor';

export default function AdminEventsTab({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('admin');
  const { user } = useUser();
  const scoutEventsEnabled = useScoutEventsEnabled();

  const EVENT_STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
    upcoming: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/50', label: t('evStatusPlanned') },
    registering: { bg: 'bg-blue-500/15', border: 'border-blue-400/25', text: 'text-blue-300', label: t('evStatusRegistering') },
    'late-reg': { bg: 'bg-purple-500/15', border: 'border-purple-400/25', text: 'text-purple-300', label: t('evStatusLateReg') },
    running: { bg: 'bg-green-500/15', border: 'border-green-500/25', text: 'text-green-500', label: t('evStatusLive') },
    scoring: { bg: 'bg-gold/15', border: 'border-gold/25', text: 'text-gold', label: t('evStatusScoring') },
    ended: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/40', label: t('evStatusEnded') },
    cancelled: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: t('evStatusCancelled') },
  };

  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Gameweek simulation state
  const [simGw, setSimGw] = useState(1);
  const [simulating, setSimulating] = useState(false);
  const [gwStatuses, setGwStatuses] = useState<GameweekStatus[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('club');
  const [format, setFormat] = useState<string>('7er');
  const [gameweek, setGameweek] = useState('');
  const [entryFee, setEntryFee] = useState('0');
  const [prizePool, setPrizePool] = useState('0');
  const [maxEntries, setMaxEntries] = useState('20');
  const [startsAt, setStartsAt] = useState('');
  const [locksAt, setLocksAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorLogo, setSponsorLogo] = useState('');
  const [eventTier, setEventTier] = useState<'arena' | 'club' | 'user'>('club');
  const [minSubTier, setMinSubTier] = useState('');
  const [salaryCap, setSalaryCap] = useState('');
  const [rewardStructure, setRewardStructure] = useState<RewardTier[] | null>(null);
  const [currency, setCurrency] = useState<EventCurrency>('tickets');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [data, statuses] = await Promise.all([
          getEventsByClubId(club.id),
          getGameweekStatuses(1, 38),
        ]);
        if (!cancelled) {
          setEvents(data);
          setGwStatuses(statuses);
          // Auto-select next unsimulated GW
          const nextUnsim = statuses.find(s => !s.is_complete);
          if (nextUnsim) setSimGw(nextUnsim.gameweek);
        }
      } catch (err) { console.error('[AdminEventsTab] Failed to load events:', err); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [club.id]);

  const handleSimulate = useCallback(async () => {
    setSimulating(true);
    setError(null);
    try {
      const result = await simulateGameweek(simGw);
      if (!result.success) {
        setError(result.error || t('simulationFailed'));
      } else {
        setSuccess(t('simulationResult', { gw: simGw, fixtures: result.fixtures_simulated ?? 0, stats: result.player_stats_created ?? 0 }));
        setTimeout(() => setSuccess(null), 5000);
        // Refresh GW statuses
        const statuses = await getGameweekStatuses(1, 38);
        setGwStatuses(statuses);
        // Auto-advance to next GW
        const nextUnsim = statuses.find(s => !s.is_complete);
        if (nextUnsim) setSimGw(nextUnsim.gameweek);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setSimulating(false);
    }
  }, [simGw, t]);

  const resetForm = useCallback(() => {
    setName('');
    setType('club');
    setFormat('7er');
    setGameweek('');
    setEntryFee('0');
    setPrizePool('0');
    setMaxEntries('20');
    setStartsAt('');
    setLocksAt('');
    setEndsAt('');
    setSponsorName('');
    setSponsorLogo('');
    setEventTier('club');
    setMinSubTier('');
    setSalaryCap('');
    setRewardStructure(null);
    setCurrency('tickets');
  }, []);

  const handleClone = useCallback((ev: DbEvent) => {
    setName(`${ev.name} (${t('clone')})`);
    setType(ev.type);
    setFormat(ev.format);
    setGameweek(String(ev.gameweek));
    setEntryFee(String(centsToBsd(ev.entry_fee)));
    setPrizePool(String(centsToBsd(ev.prize_pool)));
    setMaxEntries(String(ev.max_entries || 20));
    setEventTier(ev.event_tier as 'arena' | 'club' | 'user');
    setMinSubTier(ev.min_subscription_tier || '');
    setSalaryCap(ev.salary_cap ? String(ev.salary_cap) : '');
    setRewardStructure(ev.reward_structure ?? null);
    setCurrency(ev.currency ?? 'tickets');
    setStartsAt('');
    setLocksAt('');
    setEndsAt('');
    setSponsorName('');
    setSponsorLogo('');
    setModalOpen(true);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!user || !name || !startsAt || !locksAt || !endsAt) return;
    setSaving(true);
    setError(null);
    try {
      const result = await createEvent({
        name,
        type,
        format,
        gameweek: parseInt(gameweek) || 1,
        entryFeeCents: bsdToCents(parseFloat(entryFee) || 0),
        prizePoolCents: bsdToCents(parseFloat(prizePool) || 0),
        maxEntries: parseInt(maxEntries) || 0,
        startsAt: new Date(startsAt).toISOString(),
        locksAt: new Date(locksAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        clubId: club.id,
        createdBy: user.id,
        sponsorName: type === 'sponsor' ? sponsorName : undefined,
        sponsorLogo: type === 'sponsor' ? sponsorLogo : undefined,
        eventTier,
        minSubscriptionTier: minSubTier || null,
        salaryCap: salaryCap ? parseInt(salaryCap) : null,
        rewardStructure: rewardStructure,
        currency,
      });
      if (!result.success) {
        setError(result.error || t('eventCreateError'));
      } else {
        setSuccess(t('eventCreateSuccess'));
        const refreshed = await getEventsByClubId(club.id);
        setEvents(refreshed);
        resetForm();
        setModalOpen(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setSaving(false);
    }
  }, [user, name, type, format, gameweek, entryFee, prizePool, maxEntries, startsAt, locksAt, endsAt, club.id, resetForm, sponsorName, sponsorLogo, rewardStructure, currency, t]);

  const [changingId, setChangingId] = useState<string | null>(null);

  const handleStatusChange = useCallback(async (eventId: string, newStatus: string) => {
    if (changingId) return;
    setChangingId(eventId);
    setError(null);
    try {
      const result = await updateEventStatus(eventId, newStatus);
      if (!result.success) {
        setError(result.error || t('statusChangeError'));
      } else {
        const refreshed = await getEventsByClubId(club.id);
        setEvents(refreshed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setChangingId(null);
    }
  }, [club.id, changingId, t]);

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="h-20 animate-pulse" />)}</div>;

  const activeEvents = events.filter(e => !['ended', 'cancelled'].includes(e.status));
  const pastEvents = events.filter(e => ['ended', 'cancelled'].includes(e.status));

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-500 px-4 py-3 rounded-xl font-bold text-sm">{success}</div>
      )}
      {error && (
        <div role="alert" className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl font-bold text-sm cursor-pointer" onClick={() => setError(null)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setError(null); } }} tabIndex={0}>{error}</div>
      )}

      {/* ===== GAMEWEEK SIMULATION ===== */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-gold" />
          <h3 className="font-black text-sm">{t('simulateGameweek')}</h3>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <select
            value={simGw}
            onChange={(e) => setSimGw(parseInt(e.target.value))}
            aria-label={t('simulateGameweek')}
            className="px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40"
          >
            {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => {
              const status = gwStatuses.find(s => s.gameweek === gw);
              return (
                <option key={gw} value={gw}>
                  {t('spieltag')} {gw} {status?.is_complete ? '✓' : ''}
                </option>
              );
            })}
          </select>
          <Button
            variant="gold"
            size="sm"
            onClick={handleSimulate}
            disabled={simulating || gwStatuses.find(s => s.gameweek === simGw)?.is_complete === true}
          >
            {simulating ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : <Play className="w-4 h-4" />}
            {simulating ? t('simulating') : t('simulate')}
          </Button>
          {gwStatuses.find(s => s.gameweek === simGw)?.is_complete && (
            <span className="text-green-500 text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t('alreadySimulated')}
            </span>
          )}
        </div>
        {/* GW status overview */}
        <div className="mt-3 flex gap-1 flex-wrap">
          {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => {
            const status = gwStatuses.find(s => s.gameweek === gw);
            return (
              <div
                key={gw}
                className={cn(
                  'size-6 rounded text-[9px] font-bold flex items-center justify-center cursor-pointer transition-colors',
                  status?.is_complete
                    ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                    : gw === simGw
                    ? 'bg-gold/15 text-gold border border-gold/30'
                    : 'bg-surface-subtle text-white/30 border border-white/[0.06]'
                )}
                onClick={() => setSimGw(gw)}
                title={`${t('spieltag')} ${gw}${status?.is_complete ? ` ${t('simulated')}` : ''}`}
              >
                {gw}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-balance">{t('fantasyEvents')}</h2>
          <p className="text-xs text-white/50">{t('eventsActiveCount', { count: events.length, active: activeEvents.length })}</p>
        </div>
        <Button variant="gold" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('newEvent')}
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-white/20" aria-hidden="true" />
          <div className="text-white/30 mb-2">{t('noEvents')}</div>
          <div className="text-sm text-white/50 text-pretty">{t('noEventsDesc')}</div>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeEvents.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-white/50">{t('activeEventsCount', { count: activeEvents.length })}</div>
              {activeEvents.map(ev => {
                const sc = EVENT_STATUS_CONFIG[ev.status] || EVENT_STATUS_CONFIG.ended;
                return (
                  <Card key={ev.id} className="p-3 md:p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Calendar className="w-5 h-5 text-white/30 flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate">{ev.name}</div>
                          <div className="text-xs text-white/40">
                            GW {ev.gameweek} • {ev.format} • {centsToBsd(ev.entry_fee) > 0 ? `${fmtScout(centsToBsd(ev.entry_fee))} CR` : t('free')}
                            {ev.max_entries && ` • ${ev.current_entries}/${ev.max_entries}`}
                          </div>
                        </div>
                        <Chip className={cn(sc.bg, sc.text, sc.border, 'border flex-shrink-0')}>{sc.label}</Chip>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span>{t('startColonLabel')} {new Date(ev.starts_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{t('priceColonLabel')} <span className="tabular-nums">{fmtScout(centsToBsd(ev.prize_pool))}</span> CR</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ev.status === 'registering' && (
                          <>
                            <Button variant="gold" size="sm" onClick={() => handleStatusChange(ev.id, 'running')} disabled={changingId === ev.id}>
                              {changingId === ev.id ? <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> : <Play className="w-3 h-3" />}{t('start')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleStatusChange(ev.id, 'cancelled')} disabled={changingId === ev.id}>
                              {changingId === ev.id ? <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> : <XCircle className="w-3 h-3" />}{t('cancel')}
                            </Button>
                          </>
                        )}
                        {ev.status === 'running' && (
                          <Button variant="outline" size="sm" onClick={() => handleStatusChange(ev.id, 'ended')} disabled={changingId === ev.id}>
                            {changingId === ev.id ? <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> : <Square className="w-3 h-3" />}{t('end')}
                          </Button>
                        )}
                        {ev.status === 'scoring' && (
                          <Button variant="outline" size="sm" onClick={() => handleStatusChange(ev.id, 'ended')} disabled={changingId === ev.id}>
                            {changingId === ev.id ? <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> : <Square className="w-3 h-3" />}{t('finalize')}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleClone(ev)} aria-label={`${t('cloneEvent')}: ${ev.name}`}>
                          <Copy className="w-3 h-3" aria-hidden="true" />{t('cloneEvent')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {pastEvents.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-white/30">{t('pastEventsCount', { count: pastEvents.length })}</div>
              {pastEvents.map(ev => {
                const sc = EVENT_STATUS_CONFIG[ev.status] || EVENT_STATUS_CONFIG.ended;
                return (
                  <Card key={ev.id} className="p-3 md:p-4 opacity-60">
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar className="w-5 h-5 text-white/20 flex-shrink-0" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate">{ev.name}</div>
                        <div className="text-xs text-white/40">
                          GW {ev.gameweek} • <span className="tabular-nums">{ev.current_entries}</span> {t('participantsLabel')} • <span className="tabular-nums">{fmtScout(centsToBsd(ev.prize_pool))}</span> CR
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleClone(ev)} className="shrink-0" aria-label={`${t('cloneEvent')}: ${ev.name}`}>
                        <Copy className="w-3 h-3" aria-hidden="true" />{t('cloneEvent')}
                      </Button>
                      <Chip className={cn(sc.bg, sc.text, sc.border, 'border flex-shrink-0')}>{sc.label}</Chip>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Event Modal */}
      <Modal open={modalOpen} title={t('createEventTitle')} onClose={() => setModalOpen(false)}>
        <div className="space-y-4 p-4 md:p-6">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('nameLabel')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              placeholder={t('eventNamePlaceholder')}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('typeLabel')}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                aria-label={t('typeLabel')}
                className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40"
              >
                <option value="club">Club</option>
                <option value="bescout">BeScout</option>
                <option value="sponsor">Sponsor</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('formatLabel')}</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                aria-label={t('formatLabel')}
                className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40"
              >
                <option value="7er">{t('format7')}</option>
                <option value="11er">{t('format11')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('ratingLabel')}</label>
            <select
              value={eventTier}
              onChange={(e) => setEventTier(e.target.value as 'arena' | 'club' | 'user')}
              aria-label={t('ratingLabel')}
              className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40"
            >
              <option value="club">{t('clubEventOption')}</option>
              <option value="arena">{t('arenaEventOption')}</option>
            </select>
            {eventTier === 'arena' && (
              <p className="mt-1 text-[10px] text-amber-400/70">{t('arenaWarning')}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('minSubLabel')}</label>
            <select
              value={minSubTier}
              onChange={(e) => setMinSubTier(e.target.value)}
              aria-label={t('minSubLabel')}
              className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40"
            >
              <option value="">{t('allNoSub')}</option>
              <option value="bronze">{t('tierBronzePlus')}</option>
              <option value="silber">{t('tierSilberPlus')}</option>
              <option value="gold">{t('onlyGold')}</option>
            </select>
            {minSubTier && (
              <p className="mt-1 text-[10px] text-amber-400/70">{t('onlyTierCanJoin', { tier: minSubTier === 'bronze' ? 'Bronze' : minSubTier === 'silber' ? 'Silber' : 'Gold' })}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('salaryCapLabel')}</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={salaryCap}
              onChange={(e) => setSalaryCap(e.target.value)}
              placeholder={t('salaryCapPlaceholder')}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
            />
            {salaryCap && <p className="mt-1 text-[10px] text-white/40">{t('salaryCapHint')}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('gameweekFormLabel')}</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={gameweek}
                onChange={(e) => setGameweek(e.target.value)}
                placeholder={t('gameweekPlaceholder')}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('maxParticipants')}</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={maxEntries}
                onChange={(e) => setMaxEntries(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('entryFeeLabel')}</label>
              <input
                type="number"
                inputMode="numeric"
                step="0.01"
                min="0"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('prizeMoneyLabel')}</label>
              <input
                type="number"
                inputMode="numeric"
                step="0.01"
                min="0"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>
          {/* Currency */}
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('eventCurrency')}</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as EventCurrency)}
              aria-label={t('eventCurrency')}
              className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40"
            >
              <option value="tickets">{t('ticketsLabel')}</option>
              {scoutEventsEnabled && <option value="scout">$SCOUT</option>}
            </select>
          </div>
          <RewardStructureEditor
            value={rewardStructure}
            onChange={setRewardStructure}
            prizePool={bsdToCents(parseFloat(prizePool) || 0)}
          />
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('startTime')}</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 text-white [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('lockTime')}</label>
            <input
              type="datetime-local"
              value={locksAt}
              onChange={(e) => setLocksAt(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 text-white [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('endTime')}</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 text-white [color-scheme:dark]"
            />
          </div>
          {type === 'sponsor' && (
            <div className="space-y-3 p-3 bg-gold/5 border border-gold/15 rounded-xl">
              <div className="text-xs font-bold text-gold/70 uppercase">{t('sponsorData')}</div>
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">{t('sponsorNameLabel')}</label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value.slice(0, 40))}
                  placeholder={t('sponsorNamePlaceholder')}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">{t('sponsorLogoLabel')}</label>
                <input
                  type="url"
                  value={sponsorLogo}
                  onChange={(e) => setSponsorLogo(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
                />
              </div>
            </div>
          )}
          {name && startsAt && (
            <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/50">{t('entryFeePreview')}</span>
                <span className="font-mono font-bold tabular-nums">{parseFloat(entryFee) > 0 ? `${fmtScout(parseFloat(entryFee))} CR` : t('free')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">{t('prizePreview')}</span>
                <span className="font-mono font-bold text-gold tabular-nums">{fmtScout(parseFloat(prizePool) || 0)} CR</span>
              </div>
            </div>
          )}
          <Button
            variant="gold"
            fullWidth
            onClick={handleCreate}
            disabled={saving || !name || !startsAt || !locksAt || !endsAt}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : <Plus className="w-4 h-4" />}
            {saving ? t('eventCreating') : t('eventCreate')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
