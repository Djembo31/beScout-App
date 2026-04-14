'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import { PAID_FANTASY_ENABLED } from '@/lib/featureFlags';
import type { FantasyEvent, EventMode, LineupFormat } from './types';

export const CreateEventModal = ({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (event: Partial<FantasyEvent>) => void;
}) => {
  const t = useTranslations('fantasy');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<EventMode>('tournament');
  const [format, setFormat] = useState<LineupFormat>('7er');
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AR-31 (J4): PAID_FANTASY_ENABLED=false in Beta. buyIn + Fee-Preview
  // + Creator-Fee-Berechnung sind Phase-4-Features (NICHT BAUEN).
  // Feld + Preview-Block werden im Render-Block nur bei aktivem Flag gerendert.
  const [buyIn] = useState(0); // hardcoded 0 — kein Setter in Beta noetig.

  const canSubmit = name.trim().length >= 3;

  const handleCreate = () => {
    setError(null);
    if (!canSubmit) {
      setError(t('eventNameRequired'));
      return;
    }
    onCreate({
      name,
      description,
      mode,
      format,
      buyIn: PAID_FANTASY_ENABLED ? buyIn : 0,
      maxParticipants,
      type: 'creator',
      status: 'registering',
      creatorName: 'Du',
      creatorId: 'user1',
    });
    onClose();
    setName('');
    setDescription('');
    setError(null);
  };

  // Creator-Fee nur in Phase 4 relevant (AR-38). In Beta bleibt Preview-Block versteckt.
  const creatorFee = PAID_FANTASY_ENABLED ? Math.round(buyIn * maxParticipants * 0.05) : 0;
  const prizePool = PAID_FANTASY_ENABLED ? (buyIn * maxParticipants - creatorFee) : 0;

  return (
    <Modal
      open={isOpen}
      title={t('createEventTitle')}
      onClose={onClose}
      // TODO(J4 FIX-02): CreateEventModal hat aktuell keinen async Pending-State
      // (onCreate ist synchroner Parent-Call). preventClose={false} ist bewusst gesetzt.
      // Sobald Event-Creation zu einer async Mutation wird (Phase 4 Paid-Fantasy),
      // hier `preventClose={creating}` nachruesten — analog BuyConfirmModal Pattern.
      preventClose={false}
      footer={
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t('cancelBtn')}
          </Button>
          <Button variant="gold" onClick={handleCreate} disabled={!canSubmit} className="flex-1">
            <Plus className="size-4" aria-hidden="true" />
            {t('createEventBtn')}
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

        <div>
          <label htmlFor="create-event-desc" className="block text-sm font-medium mb-2">{t('descriptionLabel')}</label>
          <textarea
            id="create-event-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            rows={3}
            maxLength={500}
            className="w-full px-4 py-2.5 bg-surface-base border border-white/10 rounded-xl focus:outline-none focus:border-gold/40 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="create-event-mode" className="block text-sm font-medium mb-2">{t('modeLabel')}</label>
            <select
              id="create-event-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as EventMode)}
              className="w-full px-4 py-2.5 bg-surface-base border border-white/10 rounded-xl focus:outline-none focus:border-gold/40"
            >
              <option value="tournament">{t('modeTournament')}</option>
              <option value="league">{t('modeLeague')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="create-event-format" className="block text-sm font-medium mb-2">{t('formatLabel')}</label>
            <select
              id="create-event-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as LineupFormat)}
              className="w-full px-4 py-2.5 bg-surface-base border border-white/10 rounded-xl focus:outline-none focus:border-gold/40"
            >
              <option value="7er">{t('formatSeven')}</option>
              <option value="11er">{t('formatEleven')}</option>
            </select>
          </div>
        </div>

        <div className={cn('grid gap-4', PAID_FANTASY_ENABLED ? 'grid-cols-2' : 'grid-cols-1')}>
          {/* AR-31: buyIn-Feld nur in Phase 4 (PAID_FANTASY_ENABLED=true). */}
          {PAID_FANTASY_ENABLED && (
            <div>
              <label htmlFor="create-event-buyin" className="block text-sm font-medium mb-2">{t('buyInLabel')}</label>
              <input
                id="create-event-buyin"
                type="number"
                inputMode="numeric"
                value={buyIn}
                readOnly
                min={0}
                max={0}
                disabled
                className="w-full px-4 py-2.5 bg-surface-base border border-white/10 rounded-xl focus:outline-none focus:border-gold/40 opacity-50"
              />
              <div className="text-xs text-white/30 mt-1">{t('buyInPilotHint')}</div>
            </div>
          )}
          <div>
            <label htmlFor="create-event-max" className="block text-sm font-medium mb-2">{t('maxParticipantsLabel')}</label>
            <input
              id="create-event-max"
              type="number"
              inputMode="numeric"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              min={2}
              max={500}
              className="w-full px-4 py-2.5 bg-surface-base border border-white/10 rounded-xl focus:outline-none focus:border-gold/40"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-surface-minimal rounded-xl">
          <div>
            <div className="font-medium">{t('privateEvent')}</div>
            <div className="text-xs text-white/50">{t('privateEventHint')}</div>
          </div>
          <button
            role="switch"
            aria-checked={isPrivate}
            aria-label={t('privateEvent')}
            onClick={() => setIsPrivate(!isPrivate)}
            className={cn('w-12 h-6 rounded-full transition-colors', isPrivate ? 'bg-gold' : 'bg-white/20')}
          >
            <div className={cn('size-5 rounded-full bg-white shadow-md transform transition-transform', isPrivate ? 'translate-x-6' : 'translate-x-0.5')} />
          </button>
        </div>

        {/* AR-31+38: Preview-Section mit Entry/PrizePool/CreatorFee nur in Phase 4. */}
        {PAID_FANTASY_ENABLED && (
          <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
            <div className="text-sm text-white/60 mb-2">{t('previewSection')}</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="font-mono font-bold text-lg text-gold tabular-nums">{buyIn} CR</div>
                <div className="text-xs text-white/40">{t('entryLabel')}</div>
              </div>
              <div>
                <div className="font-mono font-bold text-lg text-purple-400 tabular-nums">{prizePool} CR</div>
                <div className="text-xs text-white/40">{t('prizeMoney')}</div>
              </div>
              <div>
                <div className="font-mono font-bold text-lg text-white/60 tabular-nums">{creatorFee} CR</div>
                <div className="text-xs text-white/40">{t('creatorFee')}</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
