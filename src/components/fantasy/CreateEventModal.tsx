'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
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
  const [format, setFormat] = useState<LineupFormat>('6er');
  const [buyIn, setBuyIn] = useState(0);
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      buyIn,
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

  const creatorFee = Math.round(buyIn * maxParticipants * 0.05);
  const prizePool = buyIn * maxParticipants - creatorFee;

  return (
    <Modal
      open={isOpen}
      title={t('createEventTitle')}
      onClose={onClose}
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
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-gold/40"
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
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-gold/40 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="create-event-mode" className="block text-sm font-medium mb-2">{t('modeLabel')}</label>
            <select
              id="create-event-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as EventMode)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-gold/40"
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
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-gold/40"
            >
              <option value="6er">{t('formatSix')}</option>
              <option value="11er">{t('formatEleven')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="create-event-buyin" className="block text-sm font-medium mb-2">{t('buyInLabel')}</label>
            <input
              id="create-event-buyin"
              type="number"
              inputMode="numeric"
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              min={0}
              max={0}
              disabled
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-gold/40 opacity-50"
            />
            <div className="text-[10px] text-white/30 mt-1">{t('buyInPilotHint')}</div>
          </div>
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
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-gold/40"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl">
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

        <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
          <div className="text-sm text-white/60 mb-2">{t('previewSection')}</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="font-mono font-bold text-lg text-gold tabular-nums">{buyIn} $SCOUT</div>
              <div className="text-[10px] text-white/40">{t('entryLabel')}</div>
            </div>
            <div>
              <div className="font-mono font-bold text-lg text-purple-400 tabular-nums">{prizePool} $SCOUT</div>
              <div className="text-[10px] text-white/40">{t('prizeMoney')}</div>
            </div>
            <div>
              <div className="font-mono font-bold text-lg text-white/60 tabular-nums">{creatorFee} $SCOUT</div>
              <div className="text-[10px] text-white/40">{t('creatorFee')}</div>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};
