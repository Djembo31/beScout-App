'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { StreakMilestone } from '@/lib/retentionEngine';

interface StreakMilestoneBannerProps {
  milestone: StreakMilestone;
  className?: string;
}

export default function StreakMilestoneBanner({ milestone, className = '' }: StreakMilestoneBannerProps) {
  const tc = useTranslations('common');
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/10 via-orange-500/10 to-gold/10 p-4 ${className}`}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.08),transparent_70%)]" />

      <div className="relative flex items-center gap-3">
        <span className="text-3xl" role="img" aria-hidden="true">
          {milestone.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-black text-gold">{milestone.labelDe}</div>
          <div className="text-sm text-white/60">{milestone.benefitDe}</div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors active:scale-[0.97] shrink-0"
          aria-label={tc('close')}
        >
          <X className="size-4 text-white/30" />
        </button>
      </div>
    </div>
  );
}
