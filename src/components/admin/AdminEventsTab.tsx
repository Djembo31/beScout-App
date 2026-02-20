'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, Play, Square, XCircle, Loader2, Zap, CheckCircle2 } from 'lucide-react';
import { Card, Button, Chip, Modal } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { getEventsByClubId, createEvent, updateEventStatus } from '@/lib/services/events';
import { simulateGameweek, getGameweekStatuses } from '@/lib/services/fixtures';
import { centsToBsd, bsdToCents } from '@/lib/services/players';
import { fmtScout } from '@/lib/utils';
import type { ClubWithAdmin, DbEvent, GameweekStatus } from '@/types';

const EVENT_STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  upcoming: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/50', label: 'Geplant' },
  registering: { bg: 'bg-blue-500/15', border: 'border-blue-400/25', text: 'text-blue-300', label: 'Anmeldung' },
  'late-reg': { bg: 'bg-purple-500/15', border: 'border-purple-400/25', text: 'text-purple-300', label: 'Late-Reg' },
  running: { bg: 'bg-[#22C55E]/15', border: 'border-[#22C55E]/25', text: 'text-[#22C55E]', label: 'Live' },
  scoring: { bg: 'bg-[#FFD700]/15', border: 'border-[#FFD700]/25', text: 'text-[#FFD700]', label: 'Scoring' },
  ended: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/40', label: 'Beendet' },
  cancelled: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: 'Abgebrochen' },
};

export default function AdminEventsTab({ club }: { club: ClubWithAdmin }) {
  const { user } = useUser();
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
  const [format, setFormat] = useState<string>('6er');
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
      } catch {}
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
        setError(result.error || 'Simulation fehlgeschlagen');
      } else {
        setSuccess(`Spieltag ${simGw} simuliert: ${result.fixtures_simulated} Spiele, ${result.player_stats_created} Spieler-Stats`);
        setTimeout(() => setSuccess(null), 5000);
        // Refresh GW statuses
        const statuses = await getGameweekStatuses(1, 38);
        setGwStatuses(statuses);
        // Auto-advance to next GW
        const nextUnsim = statuses.find(s => !s.is_complete);
        if (nextUnsim) setSimGw(nextUnsim.gameweek);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSimulating(false);
    }
  }, [simGw]);

  const resetForm = useCallback(() => {
    setName('');
    setType('club');
    setFormat('6er');
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
      });
      if (!result.success) {
        setError(result.error || 'Event konnte nicht erstellt werden.');
      } else {
        setSuccess('Event erfolgreich erstellt!');
        const refreshed = await getEventsByClubId(club.id);
        setEvents(refreshed);
        resetForm();
        setModalOpen(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSaving(false);
    }
  }, [user, name, type, format, gameweek, entryFee, prizePool, maxEntries, startsAt, locksAt, endsAt, club.id, resetForm, sponsorName, sponsorLogo]);

  const handleStatusChange = useCallback(async (eventId: string, newStatus: string) => {
    setError(null);
    try {
      const result = await updateEventStatus(eventId, newStatus);
      if (!result.success) {
        setError(result.error || 'Status konnte nicht geändert werden.');
      } else {
        const refreshed = await getEventsByClubId(club.id);
        setEvents(refreshed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    }
  }, [club.id]);

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="h-20 animate-pulse" />)}</div>;

  const activeEvents = events.filter(e => !['ended', 'cancelled'].includes(e.status));
  const pastEvents = events.filter(e => ['ended', 'cancelled'].includes(e.status));

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E] px-4 py-3 rounded-xl font-bold text-sm">{success}</div>
      )}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl font-bold text-sm cursor-pointer" onClick={() => setError(null)}>{error}</div>
      )}

      {/* ===== GAMEWEEK SIMULATION ===== */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-[#FFD700]" />
          <h3 className="font-black text-sm">Spieltag simulieren</h3>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <select
            value={simGw}
            onChange={(e) => setSimGw(parseInt(e.target.value))}
            className="px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/40"
          >
            {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => {
              const status = gwStatuses.find(s => s.gameweek === gw);
              return (
                <option key={gw} value={gw}>
                  Spieltag {gw} {status?.is_complete ? '✓' : ''}
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
            {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {simulating ? 'Simuliere...' : 'Simulieren'}
          </Button>
          {gwStatuses.find(s => s.gameweek === simGw)?.is_complete && (
            <span className="text-[#22C55E] text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Bereits simuliert
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
                className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center cursor-pointer transition-all ${
                  status?.is_complete
                    ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30'
                    : gw === simGw
                    ? 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30'
                    : 'bg-white/[0.03] text-white/30 border border-white/[0.06]'
                }`}
                onClick={() => setSimGw(gw)}
                title={`Spieltag ${gw}${status?.is_complete ? ' (simuliert)' : ''}`}
              >
                {gw}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Fantasy Events</h2>
          <p className="text-xs text-white/50">{events.length} Events • {activeEvents.length} aktiv</p>
        </div>
        <Button variant="gold" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Neues Event
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 mb-2">Keine Events vorhanden</div>
          <div className="text-sm text-white/50">Erstelle ein Event, um Fantasy-Turniere für deine Fans zu starten.</div>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeEvents.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-white/50">Aktive Events ({activeEvents.length})</div>
              {activeEvents.map(ev => {
                const sc = EVENT_STATUS_CONFIG[ev.status] || EVENT_STATUS_CONFIG.ended;
                return (
                  <Card key={ev.id} className="p-3 md:p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Calendar className="w-5 h-5 text-white/30 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate">{ev.name}</div>
                          <div className="text-xs text-white/40">
                            GW {ev.gameweek} • {ev.format} • {centsToBsd(ev.entry_fee) > 0 ? `${fmtScout(centsToBsd(ev.entry_fee))} $SCOUT` : 'Kostenlos'}
                            {ev.max_entries && ` • ${ev.current_entries}/${ev.max_entries}`}
                          </div>
                        </div>
                        <Chip className={`${sc.bg} ${sc.text} ${sc.border} border flex-shrink-0`}>{sc.label}</Chip>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span>Start: {new Date(ev.starts_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>Preis: {fmtScout(centsToBsd(ev.prize_pool))} $SCOUT</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ev.status === 'registering' && (
                          <>
                            <Button variant="gold" size="sm" onClick={() => handleStatusChange(ev.id, 'running')}>
                              <Play className="w-3 h-3" />Starten
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleStatusChange(ev.id, 'cancelled')}>
                              <XCircle className="w-3 h-3" />Abbrechen
                            </Button>
                          </>
                        )}
                        {ev.status === 'running' && (
                          <Button variant="outline" size="sm" onClick={() => handleStatusChange(ev.id, 'ended')}>
                            <Square className="w-3 h-3" />Beenden
                          </Button>
                        )}
                        {ev.status === 'scoring' && (
                          <Button variant="outline" size="sm" onClick={() => handleStatusChange(ev.id, 'ended')}>
                            <Square className="w-3 h-3" />Abschließen
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {pastEvents.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-white/30">Beendete Events ({pastEvents.length})</div>
              {pastEvents.map(ev => {
                const sc = EVENT_STATUS_CONFIG[ev.status] || EVENT_STATUS_CONFIG.ended;
                return (
                  <Card key={ev.id} className="p-3 md:p-4 opacity-60">
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar className="w-5 h-5 text-white/20 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate">{ev.name}</div>
                        <div className="text-xs text-white/40">
                          GW {ev.gameweek} • {ev.current_entries} Teilnehmer • {fmtScout(centsToBsd(ev.prize_pool))} $SCOUT
                        </div>
                      </div>
                      <Chip className={`${sc.bg} ${sc.text} ${sc.border} border flex-shrink-0`}>{sc.label}</Chip>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Event Modal */}
      <Modal open={modalOpen} title="Neues Event erstellen" onClose={() => setModalOpen(false)}>
        <div className="space-y-4 p-4 md:p-6">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              placeholder="z.B. Sakaryaspor GW 14"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Typ</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/40"
              >
                <option value="club">Club</option>
                <option value="bescout">BeScout</option>
                <option value="sponsor">Sponsor</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/40"
              >
                <option value="6er">6er</option>
                <option value="11er">11er</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Wertung</label>
            <select
              value={eventTier}
              onChange={(e) => setEventTier(e.target.value as 'arena' | 'club' | 'user')}
              className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/40"
            >
              <option value="club">Club Event (+1 bis +15 Punkte)</option>
              <option value="arena">Arena Event (+50/−15 Punkte)</option>
            </select>
            {eventTier === 'arena' && (
              <p className="mt-1 text-[10px] text-amber-400/70">Arena-Events vergeben +/− BeScout Score nach Platzierung. Untere 10% verlieren Punkte!</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Mindest-Abo (optional)</label>
            <select
              value={minSubTier}
              onChange={(e) => setMinSubTier(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/40"
            >
              <option value="">Alle (kein Abo nötig)</option>
              <option value="bronze">Bronze+</option>
              <option value="silber">Silber+</option>
              <option value="gold">Nur Gold</option>
            </select>
            {minSubTier && (
              <p className="mt-1 text-[10px] text-amber-400/70">Nur {minSubTier === 'bronze' ? 'Bronze' : minSubTier === 'silber' ? 'Silber' : 'Gold'}+ Mitglieder können teilnehmen</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Gameweek</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={gameweek}
                onChange={(e) => setGameweek(e.target.value)}
                placeholder="z.B. 14"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Max Teilnehmer</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={maxEntries}
                onChange={(e) => setMaxEntries(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Teilnahmegebühr ($SCOUT)</label>
              <input
                type="number"
                inputMode="numeric"
                step="0.01"
                min="0"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Preisgeld ($SCOUT)</label>
              <input
                type="number"
                inputMode="numeric"
                step="0.01"
                min="0"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Startzeit</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 text-white [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Lock-Zeit (Lineup-Deadline)</label>
            <input
              type="datetime-local"
              value={locksAt}
              onChange={(e) => setLocksAt(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 text-white [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Endzeit</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 text-white [color-scheme:dark]"
            />
          </div>
          {type === 'sponsor' && (
            <div className="space-y-3 p-3 bg-[#FFD700]/5 border border-[#FFD700]/15 rounded-xl">
              <div className="text-xs font-bold text-[#FFD700]/70 uppercase tracking-wider">Sponsor-Daten</div>
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Sponsor Name</label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value.slice(0, 40))}
                  placeholder="z.B. Nike"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Sponsor Logo URL</label>
                <input
                  type="url"
                  value={sponsorLogo}
                  onChange={(e) => setSponsorLogo(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
                />
              </div>
            </div>
          )}
          {name && startsAt && (
            <div className="bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/50">Teilnahmegebühr</span>
                <span className="font-mono font-bold">{parseFloat(entryFee) > 0 ? `${fmtScout(parseFloat(entryFee))} $SCOUT` : 'Kostenlos'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Preisgeld</span>
                <span className="font-mono font-bold text-[#FFD700]">{fmtScout(parseFloat(prizePool) || 0)} $SCOUT</span>
              </div>
            </div>
          )}
          <Button
            variant="gold"
            fullWidth
            onClick={handleCreate}
            disabled={saving || !name || !startsAt || !locksAt || !endsAt}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Erstelle...' : 'Event erstellen'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
