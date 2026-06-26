'use client';

import { useState } from 'react';
import { Plus, Loader2, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Dialog } from '@/components/ui';
import { useCreateUserEvent } from '@/features/fantasy/hooks/useCreateUserEvent';
import { FantasyDisclaimer } from '@/components/legal/FantasyDisclaimer';

// Slice 397 (E-4b): Belohnungs-Presets (Summe IMMER 100 → reward_structure_not_100 unerreichbar).
type RewardPreset = 'winner' | 'top3' | 'top5';
const REWARD_PRESETS: Record<RewardPreset, Array<{ rank: number; pct: number }>> = {
  winner: [{ rank: 1, pct: 100 }],
  top3: [{ rank: 1, pct: 50 }, { rank: 2, pct: 30 }, { rank: 3, pct: 20 }],
  top5: [
    { rank: 1, pct: 40 }, { rank: 2, pct: 25 }, { rank: 3, pct: 15 },
    { rank: 4, pct: 12 }, { rank: 5, pct: 8 },
  ],
};

/** Local Date → `YYYY-MM-DDTHH:mm` (datetime-local Input-Format). */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Slice 397 (E-4b): User-Event-Builder. Ersetzt den alten Phase-4-Mock.
 * Verkabelt `create_user_event` via useCreateUserEvent. Jeder eingeloggte User
 * darf erstellen (CEO 2026-06-26). Format ist serverseitig fix `6er` (RPC nimmt
 * keinen format-Param) → kein Format-Wähler (wäre eine Lüge). 11er-User-Events =
 * späterer RPC-Param.
 */
export const CreateEventModal = ({
  isOpen,
  onClose,
  defaultGameweek,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultGameweek: number;
  onCreated?: () => void;
}) => {
  const t = useTranslations('fantasy');
  const { create, isPending } = useCreateUserEvent(() => {
    onCreated?.();
  });

  const [name, setName] = useState('');
  const [entryFeeCredits, setEntryFeeCredits] = useState(10);
  const [gameweek, setGameweek] = useState(defaultGameweek);
  const [locksAtLocal, setLocksAtLocal] = useState(() =>
    toLocalInput(new Date(Date.now() + 48 * 3600 * 1000)),
  );
  const [rewardPreset, setRewardPreset] = useState<RewardPreset>('top3');
  const [minEntries, setMinEntries] = useState<string>('');
  const [maxEntries, setMaxEntries] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setEntryFeeCredits(10);
    setGameweek(defaultGameweek);
    setLocksAtLocal(toLocalInput(new Date(Date.now() + 48 * 3600 * 1000)));
    setRewardPreset('top3');
    setMinEntries('');
    setMaxEntries('');
    setError(null);
  };

  const handleClose = () => {
    if (isPending) return;
    reset();
    onClose();
  };

  const handleCreate = async () => {
    setError(null);

    // Client-Validierung VOR RPC (Server-Rejects als 2. Netz).
    if (name.trim().length < 3) {
      setError(t('eventNameRequired'));
      return;
    }
    if (entryFeeCredits < 0 || !Number.isFinite(entryFeeCredits)) {
      setError(t('userEventEntryFeeInvalid'));
      return;
    }
    const locksAtDate = new Date(locksAtLocal);
    if (Number.isNaN(locksAtDate.getTime()) || locksAtDate.getTime() <= Date.now()) {
      setError(t('userEventLocksPast'));
      return;
    }
    const minN = minEntries.trim() === '' ? null : Number(minEntries);
    const maxN = maxEntries.trim() === '' ? null : Number(maxEntries);
    if (minN != null && (!Number.isInteger(minN) || minN < 1)) {
      setError(t('userEventMinInvalid'));
      return;
    }
    if (minN != null && maxN != null && minN > maxN) {
      setError(t('userEventMinGtMax'));
      return;
    }

    const ok = await create({
      name: name.trim(),
      entryFeeCents: Math.round(entryFeeCredits) * 100, // ganze Credits → cents (NIT#1, S397-Review)
      gameweek,
      locksAt: locksAtDate.toISOString(),
      rewardStructure: REWARD_PRESETS[rewardPreset],
      minEntries: minN,
      maxEntries: maxN,
      leagueId: null, // offenes Event; Liga-Bindung = späterer Slice.
    });

    if (ok) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog
      open={isOpen}
      title={t('createEventTitle')}
      onClose={handleClose}
      preventClose={isPending}
      footer={
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isPending} className="flex-1">
            {t('cancelBtn')}
          </Button>
          <Button variant="gold" onClick={handleCreate} disabled={isPending || name.trim().length < 3} className="flex-1">
            {isPending
              ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              : <Plus className="size-4" aria-hidden="true" />}
            {isPending ? t('userEventCreating') : t('createEventBtn')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="create-event-name" className="block text-sm font-medium mb-2">{t('eventNameLabel')} *</label>
          <input
            id="create-event-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('eventNamePlaceholder')}
            maxLength={100}
            className="w-full px-4 py-2.5 bg-surface-base border border-white/10 rounded-xl focus:outline-none focus:border-gold/40"
          />
        </div>

        {/* Eintritt + Spieltag */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="create-event-entryfee" className="block text-sm font-medium mb-2">{t('userEventEntryFeeLabel')}</label>
            <input
              id="create-event-entryfee"
              type="number"
              inputMode="numeric"
              value={entryFeeCredits}
              onChange={(e) => setEntryFeeCredits(Number(e.target.value))}
              min={0}
              step={1}
              className="w-full px-4 py-2.5 bg-surface-base border border-white/10 rounded-xl focus:outline-none focus:border-gold/40 font-mono tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="create-event-gameweek" className="block text-sm font-medium mb-2">{t('userEventGameweekLabel')}</label>
            <input
              id="create-event-gameweek"
              type="number"
              inputMode="numeric"
              value={gameweek}
              onChange={(e) => setGameweek(Number(e.target.value))}
              min={defaultGameweek}
              max={38}
              className="w-full px-4 py-2.5 bg-surface-base border border-white/10 rounded-xl focus:outline-none focus:border-gold/40 font-mono tabular-nums"
            />
          </div>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-white/40 -mt-2">
          <Info className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          {t('userEventEntryFeeHint')}
        </p>

        {/* Anmeldeschluss */}
        <div>
          <label htmlFor="create-event-locks" className="block text-sm font-medium mb-2">{t('userEventLocksAtLabel')}</label>
          <input
            id="create-event-locks"
            type="datetime-local"
            value={locksAtLocal}
            onChange={(e) => setLocksAtLocal(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-base border border-white/10 rounded-xl focus:outline-none focus:border-gold/40"
          />
        </div>

        {/* Belohnungsverteilung */}
        <div>
          <label htmlFor="create-event-reward" className="block text-sm font-medium mb-2">{t('userEventRewardLabel')}</label>
          <select
            id="create-event-reward"
            value={rewardPreset}
            onChange={(e) => setRewardPreset(e.target.value as RewardPreset)}
            className="w-full px-4 py-2.5 bg-surface-base border border-white/10 rounded-xl focus:outline-none focus:border-gold/40"
          >
            <option value="winner">{t('userEventRewardWinner')}</option>
            <option value="top3">{t('userEventRewardTop3')}</option>
            <option value="top5">{t('userEventRewardTop5')}</option>
          </select>
        </div>

        {/* Min / Max Teilnehmer */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="create-event-min" className="block text-sm font-medium mb-2">{t('userEventMinEntriesLabel')}</label>
            <input
              id="create-event-min"
              type="number"
              inputMode="numeric"
              value={minEntries}
              onChange={(e) => setMinEntries(e.target.value)}
              min={1}
              placeholder={t('userEventOptionalPlaceholder')}
              className="w-full px-4 py-2.5 bg-surface-base border border-white/10 rounded-xl focus:outline-none focus:border-gold/40 font-mono tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="create-event-max" className="block text-sm font-medium mb-2">{t('userEventMaxEntriesLabel')}</label>
            <input
              id="create-event-max"
              type="number"
              inputMode="numeric"
              value={maxEntries}
              onChange={(e) => setMaxEntries(e.target.value)}
              min={1}
              placeholder={t('userEventOptionalPlaceholder')}
              className="w-full px-4 py-2.5 bg-surface-base border border-white/10 rounded-xl focus:outline-none focus:border-gold/40 font-mono tabular-nums"
            />
          </div>
        </div>

        {/* Erstell-Gebühr-Hinweis (Transparenz vor Money-Aktion) */}
        <p className="text-xs text-white/40">{t('userEventCreateFeeHint')}</p>

        {/* Compliance Disclaimer (AR-33) — Money-Schritt */}
        <FantasyDisclaimer variant="inline" />
      </div>
    </Dialog>
  );
};
