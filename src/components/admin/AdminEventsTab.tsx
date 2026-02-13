'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, Play, Square, XCircle, Loader2 } from 'lucide-react';
import { Card, Button, Chip, Modal } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { getEventsByClubId, createEvent, updateEventStatus } from '@/lib/services/events';
import { centsToBsd, bsdToCents } from '@/lib/services/players';
import { fmtBSD } from '@/lib/utils';
import type { ClubWithAdmin, DbEvent } from '@/types';

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getEventsByClubId(club.id);
        if (!cancelled) setEvents(data);
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [club.id]);

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
  }, [user, name, type, format, gameweek, entryFee, prizePool, maxEntries, startsAt, locksAt, endsAt, club.id, resetForm]);

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
                            GW {ev.gameweek} • {ev.format} • {centsToBsd(ev.entry_fee) > 0 ? `${fmtBSD(centsToBsd(ev.entry_fee))} BSD` : 'Kostenlos'}
                            {ev.max_entries && ` • ${ev.current_entries}/${ev.max_entries}`}
                          </div>
                        </div>
                        <Chip className={`${sc.bg} ${sc.text} ${sc.border} border flex-shrink-0`}>{sc.label}</Chip>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span>Start: {new Date(ev.starts_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>Preis: {fmtBSD(centsToBsd(ev.prize_pool))} BSD</span>
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
                          GW {ev.gameweek} • {ev.current_entries} Teilnehmer • {fmtBSD(centsToBsd(ev.prize_pool))} BSD
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Gameweek</label>
              <input
                type="number"
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
                min="0"
                value={maxEntries}
                onChange={(e) => setMaxEntries(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Entry Fee (BSD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Preisgeld (BSD)</label>
              <input
                type="number"
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
          {name && startsAt && (
            <div className="bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/50">Entry Fee</span>
                <span className="font-mono font-bold">{parseFloat(entryFee) > 0 ? `${fmtBSD(parseFloat(entryFee))} BSD` : 'Kostenlos'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Preisgeld</span>
                <span className="font-mono font-bold text-[#FFD700]">{fmtBSD(parseFloat(prizePool) || 0)} BSD</span>
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
