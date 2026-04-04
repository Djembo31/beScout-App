'use client';

import React, { useState } from 'react';
import { Plus, Trophy, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useClubChallenges, useCreateChallenge } from '@/lib/queries/clubChallenges';
import { useToast } from '@/components/providers/ToastProvider';
import type { ClubWithAdmin } from '@/types';
import type { ClubChallenge } from '@/lib/services/clubChallenges';

const CHALLENGE_TYPES: ClubChallenge['type'][] = ['event_participation', 'poll_vote', 'fantasy_top_n', 'custom'];

const TYPE_LABELS: Record<ClubChallenge['type'], string> = {
  event_participation: 'Event-Teilnahme',
  poll_vote: 'Abstimmung',
  fantasy_top_n: 'Fantasy Top N',
  custom: 'Benutzerdefiniert',
};

export default function FanChallengesTab({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('admin');
  const { addToast } = useToast();
  const { data: challenges, isLoading } = useClubChallenges(club.id);
  const createMutation = useCreateChallenge();

  // Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ClubChallenge['type']>('custom');
  const [fanRankPoints, setFanRankPoints] = useState('10');
  const [cosmeticRewardKey, setCosmeticRewardKey] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('custom');
    setFanRankPoints('10');
    setCosmeticRewardKey('');
    setStartsAt('');
    setEndsAt('');
  };

  const handleCreate = async () => {
    if (!title.trim() || !startsAt || !endsAt) return;

    try {
      await createMutation.mutateAsync({
        clubId: club.id,
        data: {
          title: title.trim(),
          description: description.trim() || null,
          type,
          referenceId: null,
          fanRankPoints: parseInt(fanRankPoints, 10) || 10,
          cosmeticRewardKey: cosmeticRewardKey.trim() || null,
          startsAt,
          endsAt,
        },
      });
      addToast(t('challengeCreated'), 'success');
      setModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('[FanChallenges] create error:', err);
      addToast(t('challengeCreateError'), 'error');
    }
  };

  const activeChallenges = (challenges ?? []).filter(c => c.status === 'active');
  const endedChallenges = (challenges ?? []).filter(c => c.status === 'ended');

  const canSubmit = title.trim().length >= 3 && startsAt && endsAt && !createMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold" />
          <h2 className="text-lg font-black">{t('challenges')}</h2>
        </div>
        <Button variant="gold" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          {t('challengeCreate')}
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (challenges ?? []).length === 0 && (
        <Card className="p-8 text-center">
          <Trophy className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <div className="text-sm text-white/40">{t('challengeEmpty')}</div>
        </Card>
      )}

      {/* Active challenges */}
      {activeChallenges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white/60 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {t('challengeActive')} ({activeChallenges.length})
          </h3>
          <div className="space-y-2">
            {activeChallenges.map(ch => (
              <ChallengeRow key={ch.id} challenge={ch} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Ended challenges */}
      {endedChallenges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white/60 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            {t('challengeEnded')} ({endedChallenges.length})
          </h3>
          <div className="space-y-2">
            {endedChallenges.map(ch => (
              <ChallengeRow key={ch.id} challenge={ch} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('challengeCreate')}>
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-white/50 mb-1">{t('challengeTitle')}</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('challengeTitle')}
              className="w-full bg-surface-base border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
              maxLength={120}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-white/50 mb-1">{t('challengeDesc')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('challengeDesc')}
              className="w-full h-20 bg-surface-base border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-gold/40"
              maxLength={500}
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-white/50 mb-1">{t('challengeType')}</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ClubChallenge['type'])}
              className="w-full bg-surface-base border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/40"
            >
              {CHALLENGE_TYPES.map(ct => (
                <option key={ct} value={ct} className="bg-bg-main">
                  {TYPE_LABELS[ct]}
                </option>
              ))}
            </select>
          </div>

          {/* Fan Rank Points */}
          <div>
            <label className="block text-xs text-white/50 mb-1">{t('challengeReward', { points: fanRankPoints })}</label>
            <input
              type="number"
              inputMode="numeric"
              value={fanRankPoints}
              onChange={e => setFanRankPoints(e.target.value)}
              min={1}
              max={1000}
              className="w-full bg-surface-base border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/40"
            />
          </div>

          {/* Cosmetic Reward Key (optional) */}
          <div>
            <label className="block text-xs text-white/50 mb-1">{t('challengeCosmeticKey')}</label>
            <input
              type="text"
              value={cosmeticRewardKey}
              onChange={e => setCosmeticRewardKey(e.target.value)}
              placeholder="z.B. badge_gold_fan"
              className="w-full bg-surface-base border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">{t('challengeStartsAt')}</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={e => setStartsAt(e.target.value)}
                className="w-full bg-surface-base border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/40"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">{t('challengeEndsAt')}</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={e => setEndsAt(e.target.value)}
                className="w-full bg-surface-base border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
            <Button
              variant="gold"
              size="sm"
              disabled={!canSubmit}
              onClick={handleCreate}
            >
              {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {t('challengeCreate')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Single challenge row */
function ChallengeRow({ challenge, t }: { challenge: ClubChallenge; t: (key: string, values?: Record<string, string | number>) => string }) {
  const isActive = challenge.status === 'active';
  const startDate = new Date(challenge.startsAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const endDate = new Date(challenge.endsAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <Card className={cn(
      'p-4',
      isActive ? 'border-gold/20 bg-gold/[0.04]' : 'opacity-60',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{challenge.title}</div>
          {challenge.description && (
            <div className="text-xs text-white/40 mt-0.5 line-clamp-2">{challenge.description}</div>
          )}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-white/40">
            <span>{TYPE_LABELS[challenge.type]}</span>
            <span>{startDate} - {endDate}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={cn(
            'px-2 py-0.5 rounded-lg text-[10px] font-bold',
            isActive
              ? 'bg-green-500/15 text-green-400 border border-green-500/20'
              : 'bg-surface-base text-white/40 border border-white/10',
          )}>
            {isActive ? t('challengeActive') : t('challengeEnded')}
          </span>
          <span className="text-xs font-mono text-gold">{t('challengeReward', { points: challenge.fanRankPoints })}</span>
        </div>
      </div>
    </Card>
  );
}
