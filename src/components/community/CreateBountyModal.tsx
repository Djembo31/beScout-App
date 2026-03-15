'use client';

import React, { useState } from 'react';
import { Target, Coins } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useWallet } from '@/components/providers/WalletProvider';
import { formatScout } from '@/lib/services/wallet';
import { useTranslations } from 'next-intl';

interface CreateBountyModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (params: {
    title: string;
    description: string;
    rewardCents: number;
    deadlineDays: number;
    maxSubmissions: number;
  }) => void;
  loading: boolean;
}

const DEADLINE_DAYS = [3, 7, 14, 30] as const;

const MIN_REWARD = 5000; // 50 bCredits in cents

export default function CreateBountyModal({ open, onClose, onSubmit, loading }: CreateBountyModalProps) {
  const t = useTranslations('community');
  const tc = useTranslations('common');
  const { balanceCents } = useWallet();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardScout, setRewardScout] = useState('');
  const [deadlineDays, setDeadlineDays] = useState(7);
  const [maxSubmissions, setMaxSubmissions] = useState(5);

  const rewardCents = Math.round((parseFloat(rewardScout) || 0) * 100);
  const availableCents = balanceCents ?? 0;
  const canAfford = rewardCents <= availableCents;
  const isValid = title.trim().length >= 5 && description.trim().length >= 20 && rewardCents >= MIN_REWARD && canAfford;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      rewardCents,
      deadlineDays,
      maxSubmissions,
    });
    // Reset form
    setTitle('');
    setDescription('');
    setRewardScout('');
    setDeadlineDays(7);
    setMaxSubmissions(5);
  };

  return (
    <Modal
      open={open}
      title={t('createBounty.title')}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Coins className="w-3.5 h-3.5 text-gold" />
            <span>{tc('balance')}: <span className="text-gold font-bold">{formatScout(availableCents)} bCredits</span></span>
          </div>
          <Button
            variant="gold"
            onClick={handleSubmit}
            loading={loading}
            disabled={!isValid}
          >
            {t('createBounty.submit')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('createBounty.titleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 200))}
            placeholder={t('createBounty.titlePlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 text-base"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('createBounty.descLabel')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
            rows={4}
            placeholder={t('createBounty.descPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 resize-none text-base"
          />
          <div className="text-[10px] text-white/30 mt-1">{description.length}/2000</div>
        </div>

        {/* Reward */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('createBounty.rewardLabel')}</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={rewardScout}
              aria-label={t('createBounty.rewardAmountAria')}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, '');
                setRewardScout(v);
              }}
              placeholder="50"
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 pr-20 text-base"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gold font-bold">bCredits</span>
          </div>
          {rewardCents > 0 && rewardCents < MIN_REWARD && (
            <div className="text-[10px] text-red-400 mt-1">{t('createBounty.minReward')}</div>
          )}
          {rewardCents > 0 && !canAfford && (
            <div className="text-[10px] text-red-400 mt-1">{t('createBounty.insufficientFunds')}</div>
          )}
        </div>

        {/* Deadline */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('createBounty.deadlineLabel')}</label>
          <div className="flex gap-2">
            {DEADLINE_DAYS.map(days => (
              <button
                key={days}
                onClick={() => setDeadlineDays(days)}
                className={cn('flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none', deadlineDays === days ? 'bg-gold/15 text-gold border-gold/30' : 'bg-surface-minimal text-white/40 border-white/10 hover:text-white/60')}
              >
                {t('createBounty.deadlineDays', { days })}
              </button>
            ))}
          </div>
        </div>

        {/* Max Submissions */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('createBounty.maxSubLabel')}</label>
          <div className="flex gap-2">
            {[3, 5, 10, 20].map(n => (
              <button
                key={n}
                onClick={() => setMaxSubmissions(n)}
                className={cn('flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors min-h-[44px]', maxSubmissions === n ? 'bg-gold/15 text-gold border-gold/30' : 'bg-surface-minimal text-white/40 border-white/10 hover:text-white/60')}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Escrow info */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
          <Target className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-white/50">
            {t('createBounty.escrowInfo')}
          </div>
        </div>
      </div>
    </Modal>
  );
}
