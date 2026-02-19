'use client';

import { useTranslations } from 'next-intl';
import { MASTERY_LEVEL_LABELS, MASTERY_XP_THRESHOLDS } from '@/lib/services/mastery';

interface DpcMasteryCardProps {
  mastery: {
    level: number;
    xp: number;
    hold_days: number;
    fantasy_uses: number;
    content_count: number;
  };
}

export default function DpcMasteryCard({ mastery }: DpcMasteryCardProps) {
  const t = useTranslations('player');

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider">DPC Mastery</span>
          <span className="px-2 py-0.5 rounded-lg bg-[#FFD700]/15 text-[#FFD700] text-[10px] font-black border border-[#FFD700]/25">
            Lv {mastery.level} — {MASTERY_LEVEL_LABELS[mastery.level]}
          </span>
        </div>
        <span className="text-[10px] font-mono text-white/30">
          {mastery.xp} / {mastery.level < 5 ? MASTERY_XP_THRESHOLDS[mastery.level] : 'MAX'} XP
        </span>
      </div>
      {mastery.level < 5 && (
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FFD700]/40 to-[#FFD700]/20 transition-all"
            style={{ width: `${Math.min((mastery.xp / MASTERY_XP_THRESHOLDS[mastery.level]) * 100, 100)}%` }}
          />
        </div>
      )}
      <div className="flex gap-4 mt-2 text-[10px] text-white/40">
        <span>{mastery.hold_days}d {t('mastery.held')}</span>
        <span>{mastery.fantasy_uses}x Fantasy</span>
        <span>{mastery.content_count}x Content</span>
      </div>
    </div>
  );
}
