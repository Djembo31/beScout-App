'use client';

import { Modal } from '@/components/ui';
import { Confetti } from '@/components/ui/Confetti';
import { useTranslations } from 'next-intl';
import type { AchievementDef } from '@/lib/achievements';
import Link from 'next/link';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  trading: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/25' },
  manager: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/25' },
  scout: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25' },
};

export default function AchievementUnlockModal({
  achievement,
  open,
  onClose,
}: {
  achievement: AchievementDef;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('achievement');
  const cat = CATEGORY_COLORS[achievement.category] ?? CATEGORY_COLORS.trading;

  return (
    <>
      <Confetti active={open} />
      <Modal open={open} onClose={onClose} title={t('unlocked')}>
        <div className="text-center py-4">
          {/* Icon */}
          <div className="text-6xl mb-4 anim-scale-pop">{achievement.icon}</div>

          {/* Name */}
          <h3 className="text-xl font-black text-white mb-1">{achievement.label}</h3>
          <p className="text-sm text-white/50 mb-4">{achievement.description}</p>

          {/* Category badge */}
          <div className="flex justify-center mb-6">
            <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${cat.bg} ${cat.text} ${cat.border} border`}>
              {t(`category.${achievement.category}`)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white/60 hover:bg-white/10 transition-colors min-h-[44px]"
            >
              {t('continue')}
            </button>
            <Link
              href="/profile?tab=overview"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-sm font-bold text-[#FFD700] hover:bg-[#FFD700]/20 transition-colors flex items-center justify-center min-h-[44px]"
            >
              {t('viewAll')}
            </Link>
          </div>
        </div>
      </Modal>
    </>
  );
}
