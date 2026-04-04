'use client';

import { useTranslations } from 'next-intl';
import {
  Users2, BarChart3, Briefcase, TrendingUp, Users,
  Shield, Award, Star,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { fmtScout, cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import type { PrestigeTier } from '@/lib/services/club';

// ── Prestige Config (shared with ClubHero) ──
export const PRESTIGE_CONFIG: Record<PrestigeTier, { icon: typeof Star; color: string; bg: string; labelKey: string }> = {
  starter: { icon: Shield, color: 'text-white/30', bg: 'bg-white/5', labelKey: 'prestigeStarter' },
  aktiv: { icon: Shield, color: 'text-white/60', bg: 'bg-white/10', labelKey: 'prestigeAktiv' },
  engagiert: { icon: Award, color: 'text-green-500', bg: 'bg-green-500/10', labelKey: 'prestigeEngagiert' },
  vorbildlich: { icon: Star, color: 'text-gold', bg: 'bg-gold/10', labelKey: 'prestigeVorbildlich' },
};

type ClubStatsBarProps = {
  totalVolume24h: number;
  totalDpcFloat: number;
  avgPerf: number;
  followerCount: number;
  playerCount: number;
  clubColor: string;
  formResults: ('W' | 'D' | 'L')[];
  prestigeTier?: PrestigeTier;
};

export function ClubStatsBar({
  totalVolume24h,
  totalDpcFloat,
  avgPerf,
  followerCount,
  playerCount,
  clubColor,
  formResults,
  prestigeTier,
}: ClubStatsBarProps) {
  const t = useTranslations('club');

  const scoutsCount = useCountUp(followerCount, 600);
  const volumeCount = useCountUp(totalVolume24h, 800, 0);

  const secondary = [
    { label: t('dpcFloat'), value: totalDpcFloat.toLocaleString(), icon: Briefcase },
    { label: t('avgPerfL5'), value: avgPerf.toFixed(1), icon: TrendingUp },
    { label: t('players'), value: playerCount.toString(), icon: Users },
  ];

  return (
    <div className="lg:hidden space-y-3">
      {/* Primary stats — big */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 hover:border-white/20 transition-colors" style={{ borderColor: `${clubColor}25` }}>
          <div className="flex items-center gap-2 mb-1">
            <Users2 className="size-5" style={{ color: clubColor }} />
            <span className="text-xs text-white/50">{t('scouts')}</span>
          </div>
          <div className="text-2xl md:text-3xl font-mono font-black tabular-nums" style={{ color: clubColor }}>
            <span ref={scoutsCount.ref}>{scoutsCount.value.toLocaleString()}</span>
          </div>
        </Card>
        <Card className="p-4 hover:border-white/20 transition-colors border-gold/15">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="size-5 text-gold" />
            <span className="text-xs text-white/50">{t('volume24h')}</span>
          </div>
          <div className="text-2xl md:text-3xl font-mono font-black tabular-nums text-gold">
            <span ref={volumeCount.ref}>{fmtScout(volumeCount.value)}</span>
            <span className="text-sm text-white/40 ml-1">Credits</span>
          </div>
        </Card>
      </div>

      {/* Secondary stats + Form — compact row */}
      <div className="flex items-center gap-3">
        {secondary.map((stat, i) => (
          <div key={i} className="flex-1 flex items-center gap-2 p-2.5 bg-surface-base border border-divider rounded-xl">
            <stat.icon className="size-4 text-white/30 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-mono font-bold tabular-nums text-sm text-white/80">{stat.value}</div>
              <div className="text-[10px] text-white/30">{stat.label}</div>
            </div>
          </div>
        ))}
        {/* Form streak */}
        {formResults.length > 0 && (
          <div className="flex-shrink-0 flex items-center gap-2 p-2.5 bg-surface-base border border-divider rounded-xl">
            <div className="flex items-center gap-1">
              {formResults.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    'size-6 rounded-full flex items-center justify-center text-[9px] font-black ring-1 ring-white/10',
                    r === 'W' && 'bg-green-500 text-black',
                    r === 'D' && 'bg-yellow-500 text-black',
                    r === 'L' && 'bg-red-500 text-white',
                  )}
                >
                  {r === 'W' ? 'S' : r === 'D' ? 'U' : 'N'}
                </div>
              ))}
            </div>
            <div className="text-[10px] text-white/30 hidden md:block">Form</div>
          </div>
        )}
        {/* Prestige Badge */}
        {prestigeTier && (() => {
          const cfg = PRESTIGE_CONFIG[prestigeTier];
          const Icon = cfg.icon;
          return (
            <div className={cn('flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-divider', cfg.bg)}>
              <Icon className={cn('size-4', cfg.color)} />
              <div className="min-w-0">
                <div className={cn('text-sm font-bold', cfg.color)}>{t(cfg.labelKey)}</div>
                <div className="text-[10px] text-white/30">{t('prestige')}</div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
