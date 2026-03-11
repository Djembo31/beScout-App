'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, Calendar, Pencil, Loader2, ArrowUpDown, CheckSquare,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button, Chip, Modal } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd, bsdToCents } from '@/lib/services/players';
import { useToast } from '@/components/providers/ToastProvider';
import {
  getAllEventsAdmin, createEvent, updateEvent, bulkUpdateStatus,
  getEventAdminStats, EDITABLE_FIELDS, ALLOWED_TRANSITIONS,
} from '@/lib/services/events';
import { getAllClubs } from '@/lib/services/club';
import RewardStructureEditor from '@/components/admin/RewardStructureEditor';
import type { DbEvent, DbClub, RewardTier } from '@/types';

// -- Extended type for events with club join -----------------------------------
type AdminEvent = DbEvent & { clubs?: { name: string; slug: string } | null };

// -- Status config (mirrored from Club Admin) ---------------------------------
const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  upcoming:     { bg: 'bg-white/5',        border: 'border-white/10',      text: 'text-white/50',   label: 'Geplant' },
  registering:  { bg: 'bg-blue-500/15',    border: 'border-blue-400/25',   text: 'text-blue-300',   label: 'Registrierung' },
  'late-reg':   { bg: 'bg-purple-500/15',  border: 'border-purple-400/25', text: 'text-purple-300', label: 'Nachmeldung' },
  running:      { bg: 'bg-green-500/15',   border: 'border-green-500/25',  text: 'text-green-500',  label: 'Live' },
  scoring:      { bg: 'bg-gold/15',        border: 'border-gold/25',       text: 'text-gold',       label: 'Auswertung' },
  ended:        { bg: 'bg-white/5',        border: 'border-white/10',      text: 'text-white/40',   label: 'Beendet' },
  cancelled:    { bg: 'bg-red-500/10',     border: 'border-red-500/20',    text: 'text-red-400',    label: 'Abgebrochen' },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);
const EVENT_TYPES = ['bescout', 'club', 'sponsor', 'special'] as const;

// -- Sort config ---------------------------------------------------------------
type SortField = 'created_at' | 'current_entries' | 'prize_pool';
const SORT_LABELS: Record<SortField, string> = {
  created_at: 'Datum',
  current_entries: 'Teilnehmer',
  prize_pool: 'Preisgeld',
};

// -- Shared input class --------------------------------------------------------
const INPUT_CLS = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25';
const SELECT_CLS = 'w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40 min-h-[44px]';
const INTERACTIVE = 'hover:bg-white/[0.05] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50 disabled:opacity-40 disabled:cursor-not-allowed';

// ==============================================================================
// Component
// ==============================================================================

export function AdminEventsManagementTab({ adminId }: { adminId: string }) {
  const t = useTranslations('bescoutAdmin');
  const { addToast } = useToast();

  // -- Data state --------------------------------------------------------------
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [clubs, setClubs] = useState<DbClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<{ activeCount: number; totalParticipants: number; totalPool: number } | null>(null);

  // -- Filter state ------------------------------------------------------------
  const [filters, setFilters] = useState<{
    status: string[];
    type: string[];
    clubId: string;
    gameweek: number | null;
    search: string;
  }>({ status: [], type: [], clubId: '', gameweek: null, search: '' });

  // -- Sort state --------------------------------------------------------------
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  // -- Selection state ---------------------------------------------------------
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // -- Modal state -------------------------------------------------------------
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [saving, setSaving] = useState(false);

  // -- Form state --------------------------------------------------------------
  const [formName, setFormName] = useState('');
  const [formClubId, setFormClubId] = useState('');
  const [formType, setFormType] = useState<string>('bescout');
  const [formFormat, setFormFormat] = useState<string>('6er');
  const [formEventTier, setFormEventTier] = useState<'arena' | 'club' | 'user'>('arena');
  const [formMinSubTier, setFormMinSubTier] = useState('');
  const [formSalaryCap, setFormSalaryCap] = useState('');
  const [formGameweek, setFormGameweek] = useState('');
  const [formMaxEntries, setFormMaxEntries] = useState('20');
  const [formEntryFee, setFormEntryFee] = useState('0');
  const [formPrizePool, setFormPrizePool] = useState('0');
  const [formRewardStructure, setFormRewardStructure] = useState<RewardTier[] | null>(null);
  const [formStartsAt, setFormStartsAt] = useState('');
  const [formLocksAt, setFormLocksAt] = useState('');
  const [formEndsAt, setFormEndsAt] = useState('');
  const [formSponsorName, setFormSponsorName] = useState('');
  const [formSponsorLogo, setFormSponsorLogo] = useState('');

  // -- Data loading ------------------------------------------------------------
  const fetchEvents = useCallback(async () => {
    try {
      const data = await getAllEventsAdmin({
        status: filters.status.length > 0 ? filters.status : undefined,
        type: filters.type.length > 0 ? filters.type : undefined,
        clubId: filters.clubId || undefined,
        gameweek: filters.gameweek ?? undefined,
        search: filters.search || undefined,
      });
      setEvents(data as AdminEvent[]);
      setError(false);
    } catch {
      setError(true);
    }
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [eventsData, clubsData, statsData] = await Promise.all([
          getAllEventsAdmin(),
          getAllClubs(),
          getEventAdminStats(),
        ]);
        if (!cancelled) {
          setEvents(eventsData as AdminEvent[]);
          setClubs(clubsData);
          setStats(statsData);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Refetch when filters change (skip initial load)
  const [filtersReady, setFiltersReady] = useState(false);
  useEffect(() => {
    if (!filtersReady) { setFiltersReady(true); return; }
    fetchEvents();
  }, [filters, fetchEvents, filtersReady]);

  // -- Sorting -----------------------------------------------------------------
  const sortedEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'current_entries') {
        cmp = (a.current_entries ?? 0) - (b.current_entries ?? 0);
      } else if (sortField === 'prize_pool') {
        cmp = (a.prize_pool ?? 0) - (b.prize_pool ?? 0);
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [events, sortField, sortAsc]);

  // -- Form helpers ------------------------------------------------------------
  const resetForm = useCallback(() => {
    setFormName('');
    setFormClubId('');
    setFormType('bescout');
    setFormFormat('6er');
    setFormEventTier('arena');
    setFormMinSubTier('');
    setFormSalaryCap('');
    setFormGameweek('');
    setFormMaxEntries('20');
    setFormEntryFee('0');
    setFormPrizePool('0');
    setFormRewardStructure(null);
    setFormStartsAt('');
    setFormLocksAt('');
    setFormEndsAt('');
    setFormSponsorName('');
    setFormSponsorLogo('');
    setEditingEvent(null);
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((ev: AdminEvent) => {
    setEditingEvent(ev);
    setFormName(ev.name);
    setFormClubId(ev.club_id ?? '');
    setFormType(ev.type);
    setFormFormat(ev.format);
    setFormEventTier(ev.event_tier ?? 'club');
    setFormMinSubTier(ev.min_subscription_tier ?? '');
    setFormSalaryCap(ev.salary_cap != null ? String(ev.salary_cap) : '');
    setFormGameweek(ev.gameweek != null ? String(ev.gameweek) : '');
    setFormMaxEntries(ev.max_entries != null ? String(ev.max_entries) : '0');
    setFormEntryFee(String(centsToBsd(ev.entry_fee)));
    setFormPrizePool(String(centsToBsd(ev.prize_pool)));
    setFormRewardStructure(ev.reward_structure ?? null);
    setFormStartsAt(ev.starts_at ? toDatetimeLocal(ev.starts_at) : '');
    setFormLocksAt(ev.locks_at ? toDatetimeLocal(ev.locks_at) : '');
    setFormEndsAt(ev.ends_at ? toDatetimeLocal(ev.ends_at) : '');
    setFormSponsorName(ev.sponsor_name ?? '');
    setFormSponsorLogo(ev.sponsor_logo ?? '');
    setModalOpen(true);
  }, []);

  const isFieldDisabled = useCallback((field: string): boolean => {
    if (!editingEvent) return false;
    const allowed = EDITABLE_FIELDS[editingEvent.status] ?? [];
    return !allowed.includes(field);
  }, [editingEvent]);

  const isRewardEditorDisabled = useMemo(() => {
    if (!editingEvent) return false;
    return !['upcoming', 'registering'].includes(editingEvent.status);
  }, [editingEvent]);

  // -- Submit ------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    if (!formName || !formStartsAt || !formLocksAt || !formEndsAt) return;
    setSaving(true);
    try {
      if (editingEvent) {
        // Build update payload with only editable fields
        const payload: Record<string, unknown> = {};
        const maybePut = (key: string, value: unknown) => {
          if (!isFieldDisabled(key)) payload[key] = value;
        };
        maybePut('name', formName);
        maybePut('type', formType);
        maybePut('format', formFormat);
        maybePut('gameweek', parseInt(formGameweek) || 1);
        maybePut('entry_fee', bsdToCents(parseFloat(formEntryFee) || 0));
        maybePut('prize_pool', bsdToCents(parseFloat(formPrizePool) || 0));
        maybePut('max_entries', parseInt(formMaxEntries) || null);
        maybePut('starts_at', new Date(formStartsAt).toISOString());
        maybePut('locks_at', new Date(formLocksAt).toISOString());
        maybePut('ends_at', new Date(formEndsAt).toISOString());
        maybePut('sponsor_name', formType === 'sponsor' ? formSponsorName : null);
        maybePut('sponsor_logo', formType === 'sponsor' ? formSponsorLogo : null);
        maybePut('event_tier', formEventTier);
        maybePut('min_subscription_tier', formMinSubTier || null);
        maybePut('salary_cap', formSalaryCap ? parseInt(formSalaryCap) : null);
        maybePut('reward_structure', formRewardStructure);

        const result = await updateEvent(editingEvent.id, payload);
        if (!result.success) {
          addToast(result.error ?? 'Fehler beim Speichern', 'error');
          return;
        }
        addToast('Event aktualisiert', 'success');
      } else {
        const result = await createEvent({
          name: formName,
          type: formType,
          format: formFormat,
          gameweek: parseInt(formGameweek) || 1,
          entryFeeCents: bsdToCents(parseFloat(formEntryFee) || 0),
          prizePoolCents: bsdToCents(parseFloat(formPrizePool) || 0),
          maxEntries: parseInt(formMaxEntries) || 0,
          startsAt: new Date(formStartsAt).toISOString(),
          locksAt: new Date(formLocksAt).toISOString(),
          endsAt: new Date(formEndsAt).toISOString(),
          clubId: formClubId || '',
          createdBy: adminId,
          sponsorName: formType === 'sponsor' ? formSponsorName : undefined,
          sponsorLogo: formType === 'sponsor' ? formSponsorLogo : undefined,
          eventTier: formEventTier,
          minSubscriptionTier: formMinSubTier || null,
          salaryCap: formSalaryCap ? parseInt(formSalaryCap) : null,
          rewardStructure: formRewardStructure,
        });
        if (!result.success) {
          addToast(result.error ?? 'Fehler beim Erstellen', 'error');
          return;
        }
        addToast('Event erstellt', 'success');
      }
      // Refresh
      const [refreshed, newStats] = await Promise.all([
        getAllEventsAdmin(),
        getEventAdminStats(),
      ]);
      setEvents(refreshed as AdminEvent[]);
      setStats(newStats);
      resetForm();
      setModalOpen(false);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unbekannter Fehler', 'error');
    } finally {
      setSaving(false);
    }
  }, [
    formName, formType, formFormat, formGameweek, formEntryFee, formPrizePool,
    formMaxEntries, formStartsAt, formLocksAt, formEndsAt, formClubId,
    formSponsorName, formSponsorLogo, formEventTier, formMinSubTier,
    formSalaryCap, formRewardStructure, editingEvent, adminId,
    resetForm, addToast, isFieldDisabled,
  ]);

  // -- Bulk actions ------------------------------------------------------------
  const handleBulk = useCallback(async () => {
    if (selected.size === 0 || !bulkStatus) return;
    setBulkLoading(true);
    try {
      const result = await bulkUpdateStatus(Array.from(selected), bulkStatus);
      const ok = result.results.filter(r => r.ok).length;
      const fail = result.results.filter(r => !r.ok).length;
      if (fail > 0) {
        addToast(`${ok} erfolgreich, ${fail} fehlgeschlagen`, 'error');
      } else {
        addToast(`${ok} Events aktualisiert`, 'success');
      }
      setSelected(new Set());
      setBulkStatus('');
      const [refreshed, newStats] = await Promise.all([
        getAllEventsAdmin(),
        getEventAdminStats(),
      ]);
      setEvents(refreshed as AdminEvent[]);
      setStats(newStats);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Fehler', 'error');
    } finally {
      setBulkLoading(false);
    }
  }, [selected, bulkStatus, addToast]);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortAsc(a => !a);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }, [sortField]);

  // -- Available bulk transitions (union of selected events' allowed transitions)
  const availableBulkTransitions = useMemo(() => {
    if (selected.size === 0) return [];
    const transitions = new Set<string>();
    const selectedArr = Array.from(selected);
    for (let i = 0; i < selectedArr.length; i++) {
      const ev = events.find(e => e.id === selectedArr[i]);
      if (ev) {
        const allowed = ALLOWED_TRANSITIONS[ev.status] ?? [];
        for (let j = 0; j < allowed.length; j++) transitions.add(allowed[j]);
      }
    }
    return Array.from(transitions);
  }, [selected, events]);

  // ==========================================================================
  // Loading state
  // ==========================================================================
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" />
      </div>
    );
  }

  // ==========================================================================
  // Error state
  // ==========================================================================
  if (error && events.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-white/40 mb-3">Fehler beim Laden</div>
        <Button
          variant="outline"
          onClick={() => { setError(false); setLoading(true); fetchEvents().finally(() => setLoading(false)); }}
          aria-label="Erneut versuchen"
        >
          Erneut versuchen
        </Button>
      </Card>
    );
  }

  // Helpers
  const prizePoolCents = bsdToCents(parseFloat(formPrizePool) || 0);

  return (
    <div className="space-y-5">
      {/* ===== 1. STATS BAR ===== */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <div className="text-xs text-white/40 mb-1">Aktive Events</div>
            <div className="text-xl font-black font-mono tabular-nums">{stats.activeCount}</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xs text-white/40 mb-1">Teilnehmer gesamt</div>
            <div className="text-xl font-black font-mono tabular-nums">{stats.totalParticipants}</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xs text-white/40 mb-1">Pool gesamt</div>
            <div className="text-xl font-black font-mono tabular-nums text-gold">
              {fmtScout(centsToBsd(stats.totalPool))} <span className="text-xs font-normal text-white/30">bCredits</span>
            </div>
          </Card>
        </div>
      )}

      {/* ===== 2. TOOLBAR ===== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Button
          variant="gold"
          onClick={openCreateModal}
          aria-label="Neues Event erstellen"
          className="min-h-[44px]"
        >
          <Plus className="size-4" aria-hidden="true" />
          Neues Event
        </Button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" aria-hidden="true" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Suche..."
            aria-label="Events durchsuchen"
            className={cn(INPUT_CLS, 'pl-9 min-h-[44px]')}
          />
        </div>
      </div>

      {/* ===== 3. FILTER BAR ===== */}
      <div className="flex flex-wrap gap-2">
        {/* Status */}
        <select
          aria-label="Filter: Status"
          value={filters.status.length === 1 ? filters.status[0] : ''}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value ? [e.target.value] : [] }))}
          className={cn(SELECT_CLS, INTERACTIVE, 'w-auto')}
        >
          <option value="">Alle Status</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        {/* Type */}
        <select
          aria-label="Filter: Typ"
          value={filters.type.length === 1 ? filters.type[0] : ''}
          onChange={(e) => setFilters(f => ({ ...f, type: e.target.value ? [e.target.value] : [] }))}
          className={cn(SELECT_CLS, INTERACTIVE, 'w-auto')}
        >
          <option value="">Alle Typen</option>
          {EVENT_TYPES.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        {/* Club */}
        <select
          aria-label="Filter: Club"
          value={filters.clubId}
          onChange={(e) => setFilters(f => ({ ...f, clubId: e.target.value }))}
          className={cn(SELECT_CLS, INTERACTIVE, 'w-auto')}
        >
          <option value="">Alle Clubs</option>
          {clubs.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {/* Gameweek */}
        <select
          aria-label="Filter: Spieltag"
          value={filters.gameweek ?? ''}
          onChange={(e) => setFilters(f => ({ ...f, gameweek: e.target.value ? parseInt(e.target.value) : null }))}
          className={cn(SELECT_CLS, INTERACTIVE, 'w-auto')}
        >
          <option value="">Alle Spieltage</option>
          {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
            <option key={gw} value={gw}>Spieltag {gw}</option>
          ))}
        </select>
      </div>

      {/* ===== 4. SORT BAR ===== */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/30 mr-1">Sortierung:</span>
        {(Object.entries(SORT_LABELS) as [SortField, string][]).map(([field, label]) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            aria-label={`Sortieren nach ${label}`}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium min-h-[44px]',
              INTERACTIVE,
              sortField === field ? 'bg-gold/10 text-gold border border-gold/20' : 'text-white/40 bg-white/[0.02] border border-white/[0.06]',
            )}
          >
            {label}
            <ArrowUpDown className="size-3" aria-hidden="true" />
            {sortField === field && <span className="text-[10px]">{sortAsc ? '\u2191' : '\u2193'}</span>}
          </button>
        ))}
        <span className="ml-auto text-xs text-white/30">{events.length} Events</span>
      </div>

      {/* ===== 5. BULK ACTION BAR ===== */}
      {selected.size > 0 && (
        <Card className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-gold/20">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-4 text-gold" aria-hidden="true" />
            <span className="text-sm font-bold text-gold">{selected.size} ausgewaehlt</span>
          </div>
          <select
            aria-label="Bulk-Aktion: Status aendern"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className={cn(SELECT_CLS, INTERACTIVE, 'w-auto')}
          >
            <option value="">Status aendern...</option>
            {availableBulkTransitions.map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
            ))}
          </select>
          <Button
            variant="gold"
            size="sm"
            disabled={!bulkStatus || bulkLoading}
            loading={bulkLoading}
            onClick={handleBulk}
            aria-label="Aktion ausfuehren"
          >
            Ausfuehren
          </Button>
          <button
            onClick={() => { setSelected(new Set()); setBulkStatus(''); }}
            aria-label="Auswahl aufheben"
            className={cn('text-xs text-white/40 underline min-h-[44px] px-2', INTERACTIVE)}
          >
            Aufheben
          </button>
        </Card>
      )}

      {/* ===== 6. EVENT LIST ===== */}
      {sortedEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="size-12 mx-auto mb-4 text-white/20" aria-hidden="true" />
          <div className="text-white/30 mb-3">Keine Events gefunden</div>
          <Button
            variant="gold"
            onClick={openCreateModal}
            aria-label="Jetzt Event erstellen"
          >
            <Plus className="size-4" aria-hidden="true" />
            Jetzt Event erstellen
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedEvents.map(ev => {
            const sc = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.ended;
            const clubName = (ev.clubs as { name: string; slug: string } | null)?.name ?? 'Global';
            const isSelected = selected.has(ev.id);
            return (
              <Card
                key={ev.id}
                className={cn('p-3 md:p-4 transition-colors', isSelected && 'border-gold/30 bg-gold/[0.03]')}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <label className="flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(ev.id)}
                      aria-label={`Event auswaehlen: ${ev.name}`}
                      className="size-4 accent-gold cursor-pointer"
                    />
                  </label>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold truncate">{ev.name}</span>
                      <span className="text-xs text-white/30">{clubName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                      {ev.gameweek != null && (
                        <span className="font-mono tabular-nums">GW {ev.gameweek}</span>
                      )}
                      <span className="font-mono tabular-nums">
                        {ev.current_entries}/{ev.max_entries ?? '\u221E'}
                      </span>
                      <span className="font-mono tabular-nums text-gold/70">
                        {fmtScout(centsToBsd(ev.prize_pool))} bCredits
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <Chip className={cn(sc.bg, sc.text, sc.border, 'border flex-shrink-0')}>
                    {sc.label}
                  </Chip>

                  {/* Edit button */}
                  <button
                    onClick={() => openEditModal(ev)}
                    aria-label={`Event bearbeiten: ${ev.name}`}
                    className={cn(
                      'flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl',
                      INTERACTIVE,
                    )}
                  >
                    <Pencil className="size-4 text-white/40" aria-hidden="true" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== 7. CREATE / EDIT MODAL ===== */}
      <Modal
        open={modalOpen}
        title={editingEvent ? 'Event bearbeiten' : 'Neues Event erstellen'}
        onClose={() => { setModalOpen(false); resetForm(); }}
        size="lg"
      >
        <div className="space-y-4 p-4 md:p-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value.slice(0, 60))}
              placeholder="Event-Name"
              disabled={isFieldDisabled('name')}
              aria-label="Event-Name"
              className={cn(INPUT_CLS, 'min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed')}
            />
          </div>

          {/* Club */}
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Club</label>
            <select
              value={formClubId}
              onChange={(e) => setFormClubId(e.target.value)}
              disabled={!!editingEvent}
              aria-label="Club auswaehlen"
              className={cn(SELECT_CLS, 'disabled:opacity-40 disabled:cursor-not-allowed')}
            >
              <option value="">Global (kein Verein)</option>
              {clubs.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Type + Format */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Typ</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                disabled={isFieldDisabled('type')}
                aria-label="Event-Typ"
                className={cn(SELECT_CLS, 'disabled:opacity-40 disabled:cursor-not-allowed')}
              >
                <option value="bescout">BeScout</option>
                <option value="club">Club</option>
                <option value="sponsor">Sponsor</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Format</label>
              <select
                value={formFormat}
                onChange={(e) => setFormFormat(e.target.value)}
                disabled={isFieldDisabled('format')}
                aria-label="Event-Format"
                className={cn(SELECT_CLS, 'disabled:opacity-40 disabled:cursor-not-allowed')}
              >
                <option value="6er">6er</option>
                <option value="11er">11er</option>
              </select>
            </div>
          </div>

          {/* Event Tier + Min Sub */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Event-Tier</label>
              <select
                value={formEventTier}
                onChange={(e) => setFormEventTier(e.target.value as 'arena' | 'club' | 'user')}
                disabled={isFieldDisabled('event_tier')}
                aria-label="Event-Tier"
                className={cn(SELECT_CLS, 'disabled:opacity-40 disabled:cursor-not-allowed')}
              >
                <option value="arena">Arena</option>
                <option value="club">Club</option>
                <option value="user">User</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Min. Abo-Stufe</label>
              <select
                value={formMinSubTier}
                onChange={(e) => setFormMinSubTier(e.target.value)}
                disabled={isFieldDisabled('min_subscription_tier')}
                aria-label="Mindest-Abo-Stufe"
                className={cn(SELECT_CLS, 'disabled:opacity-40 disabled:cursor-not-allowed')}
              >
                <option value="">Keine (alle)</option>
                <option value="bronze">Bronze+</option>
                <option value="silber">Silber+</option>
                <option value="gold">Nur Gold</option>
              </select>
            </div>
          </div>

          {/* Salary Cap */}
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Salary Cap</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={formSalaryCap}
              onChange={(e) => setFormSalaryCap(e.target.value)}
              placeholder="Optional"
              disabled={isFieldDisabled('salary_cap')}
              aria-label="Salary Cap"
              className={cn(INPUT_CLS, 'min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed')}
            />
          </div>

          {/* Gameweek + Max Entries */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Spieltag</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="38"
                value={formGameweek}
                onChange={(e) => setFormGameweek(e.target.value)}
                placeholder="1-38"
                disabled={isFieldDisabled('gameweek')}
                aria-label="Spieltag"
                className={cn(INPUT_CLS, 'min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed')}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Max. Teilnehmer</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formMaxEntries}
                onChange={(e) => setFormMaxEntries(e.target.value)}
                disabled={isFieldDisabled('max_entries')}
                aria-label="Maximale Teilnehmer"
                className={cn(INPUT_CLS, 'min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed')}
              />
            </div>
          </div>

          {/* Entry Fee + Prize Pool */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Startgebuehr (bCredits)</label>
              <input
                type="number"
                inputMode="numeric"
                step="0.01"
                min="0"
                value={formEntryFee}
                onChange={(e) => setFormEntryFee(e.target.value)}
                disabled={isFieldDisabled('entry_fee')}
                aria-label="Startgebuehr"
                className={cn(INPUT_CLS, 'min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed')}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Preisgeld (bCredits)</label>
              <input
                type="number"
                inputMode="numeric"
                step="0.01"
                min="0"
                value={formPrizePool}
                onChange={(e) => setFormPrizePool(e.target.value)}
                disabled={isFieldDisabled('prize_pool')}
                aria-label="Preisgeld"
                className={cn(INPUT_CLS, 'min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed')}
              />
            </div>
          </div>

          {/* Reward Structure */}
          <RewardStructureEditor
            value={formRewardStructure}
            onChange={setFormRewardStructure}
            prizePool={prizePoolCents}
            disabled={isRewardEditorDisabled}
          />

          {/* Start / Lock / End times */}
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Startzeit</label>
            <input
              type="datetime-local"
              value={formStartsAt}
              onChange={(e) => setFormStartsAt(e.target.value)}
              disabled={isFieldDisabled('starts_at')}
              aria-label="Startzeit"
              className={cn(INPUT_CLS, 'min-h-[44px] text-white [color-scheme:dark] disabled:opacity-40 disabled:cursor-not-allowed')}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Lock-Zeit</label>
            <input
              type="datetime-local"
              value={formLocksAt}
              onChange={(e) => setFormLocksAt(e.target.value)}
              disabled={isFieldDisabled('locks_at')}
              aria-label="Lock-Zeit"
              className={cn(INPUT_CLS, 'min-h-[44px] text-white [color-scheme:dark] disabled:opacity-40 disabled:cursor-not-allowed')}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Endzeit</label>
            <input
              type="datetime-local"
              value={formEndsAt}
              onChange={(e) => setFormEndsAt(e.target.value)}
              disabled={isFieldDisabled('ends_at')}
              aria-label="Endzeit"
              className={cn(INPUT_CLS, 'min-h-[44px] text-white [color-scheme:dark] disabled:opacity-40 disabled:cursor-not-allowed')}
            />
          </div>

          {/* Sponsor fields (conditional) */}
          {formType === 'sponsor' && (
            <div className="space-y-3 p-3 bg-gold/5 border border-gold/15 rounded-xl">
              <div className="text-xs font-bold text-gold/70 uppercase">Sponsor-Daten</div>
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Sponsor-Name</label>
                <input
                  type="text"
                  value={formSponsorName}
                  onChange={(e) => setFormSponsorName(e.target.value.slice(0, 40))}
                  placeholder="Sponsor-Name"
                  disabled={isFieldDisabled('sponsor_name')}
                  aria-label="Sponsor-Name"
                  className={cn(INPUT_CLS, 'min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed')}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Sponsor-Logo URL</label>
                <input
                  type="url"
                  value={formSponsorLogo}
                  onChange={(e) => setFormSponsorLogo(e.target.value)}
                  placeholder="https://..."
                  disabled={isFieldDisabled('sponsor_logo')}
                  aria-label="Sponsor-Logo URL"
                  className={cn(INPUT_CLS, 'min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed')}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {formName && formStartsAt && (
            <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/50">Startgebuehr</span>
                <span className="font-mono font-bold tabular-nums">
                  {parseFloat(formEntryFee) > 0 ? `${fmtScout(parseFloat(formEntryFee))} bCredits` : 'Kostenlos'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Preisgeld</span>
                <span className="font-mono font-bold text-gold tabular-nums">
                  {fmtScout(parseFloat(formPrizePool) || 0)} bCredits
                </span>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            variant="gold"
            fullWidth
            onClick={handleSubmit}
            disabled={saving || !formName || !formStartsAt || !formLocksAt || !formEndsAt}
            loading={saving}
            aria-label={editingEvent ? 'Event speichern' : 'Event erstellen'}
          >
            {editingEvent ? 'Speichern' : 'Event erstellen'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// -- Helpers -------------------------------------------------------------------
function toDatetimeLocal(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}
