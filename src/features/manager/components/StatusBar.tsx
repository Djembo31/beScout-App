'use client';

import { Heart, Calendar, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import { cn, fmtScout } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface StatusBarProps {
  squadHealth: { fit: number; doubtful: number; injured: number };
  nextEvent: {
    name: string;
    format: '6er' | '11er';
    daysUntil: number;
    lockedCount: number;
  } | null;
  portfolioTrendPct: number;
  portfolioValueScout: number;
}

// ============================================
// SUB-COMPONENTS
// ============================================

function SquadHealthSection({ squadHealth }: { squadHealth: StatusBarProps['squadHealth'] }) {
  return (
    <div className="flex items-center gap-3 min-h-[44px]">
      <Heart size={16} className="text-white/40 flex-shrink-0" aria-hidden="true" />
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="font-mono tabular-nums text-white/70">{squadHealth.fit}</span>
          <span className="text-white/50 text-sm">fit</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span className="font-mono tabular-nums text-white/70">{squadHealth.doubtful}</span>
          <span className="text-white/50 text-sm">fraglich</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-500 flex-shrink-0" />
          <span className="font-mono tabular-nums text-white/70">{squadHealth.injured}</span>
          <span className="text-white/50 text-sm">verletzt</span>
        </span>
      </div>
    </div>
  );
}

function NextEventSection({ nextEvent }: { nextEvent: StatusBarProps['nextEvent'] }) {
  if (!nextEvent) {
    return (
      <div className="flex items-center gap-3 min-h-[44px]">
        <Calendar size={16} className="text-white/40 flex-shrink-0" aria-hidden="true" />
        <span className="text-white/50 text-sm">Kein Event geplant</span>
      </div>
    );
  }

  const isUrgent = nextEvent.daysUntil < 3;

  return (
    <div className="flex items-center gap-3 min-h-[44px]">
      <Calendar size={16} className="text-white/40 flex-shrink-0" aria-hidden="true" />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-white/70 text-sm font-medium truncate max-w-[120px]">
          {nextEvent.name}
        </span>
        <span className="text-white/40 text-sm">{nextEvent.format}</span>
        <span
          className={cn(
            'font-mono tabular-nums text-sm font-bold',
            isUrgent ? 'text-gold' : 'text-white/70'
          )}
        >
          {nextEvent.daysUntil}d
        </span>
        {nextEvent.lockedCount > 0 && (
          <span className="flex items-center gap-1 text-white/50 text-sm">
            <span className="font-mono tabular-nums">{nextEvent.lockedCount}</span>
            <Lock size={12} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}

function PortfolioTrendSection({
  trendPct,
  valueScout,
}: {
  trendPct: number;
  valueScout: number;
}) {
  const isPositive = trendPct >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-3 min-h-[44px]">
      <TrendIcon
        size={16}
        className={cn(
          'flex-shrink-0',
          isPositive ? 'text-emerald-400' : 'text-red-400'
        )}
        aria-hidden="true"
      />
      <div className="flex items-center gap-2">
        <span className="font-mono tabular-nums text-white/70 text-sm">
          {fmtScout(valueScout)}
        </span>
        <span
          className={cn(
            'font-mono tabular-nums text-sm font-bold',
            isPositive ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {isPositive ? '+' : ''}{trendPct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function StatusBar({
  squadHealth,
  nextEvent,
  portfolioTrendPct,
  portfolioValueScout,
}: StatusBarProps) {
  return (
    <div
      className={cn(
        'bg-white/[0.02] border border-white/10 rounded-2xl',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
        'px-4 py-3',
        'grid grid-cols-2 gap-x-4 gap-y-2',
        'lg:flex lg:items-center lg:justify-between'
      )}
    >
      {/* Row 1 on mobile: Health + Event | Single row on desktop */}
      <SquadHealthSection squadHealth={squadHealth} />
      <NextEventSection nextEvent={nextEvent} />

      {/* Row 2 on mobile: Portfolio (spans full width) | Inline on desktop */}
      <div className="col-span-2 lg:col-span-1 border-t border-white/[0.06] pt-2 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-4">
        <PortfolioTrendSection
          trendPct={portfolioTrendPct}
          valueScout={portfolioValueScout}
        />
      </div>
    </div>
  );
}
