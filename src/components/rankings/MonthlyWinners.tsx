'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, CosmeticAvatar } from '@/components/ui';
import { useMonthlyLigaWinners } from '@/lib/queries/gamification';
import { fmtScout } from '@/lib/utils';
import { Loader2, Crown, Medal } from 'lucide-react';

const RANK_COLORS = ['text-gold', 'text-slate-300', 'text-amber-600'] as const;
const DIM_LABELS: Record<string, { color: string }> = {
  overall: { color: 'text-gold' },
  trader: { color: 'text-sky-400' },
  manager: { color: 'text-purple-400' },
  analyst: { color: 'text-emerald-400' },
};

export function MonthlyWinners() {
  const t = useTranslations('rankings');
  const locale = useLocale();

  const { data: winners = [], isLoading } = useMonthlyLigaWinners();

  // Group winners by month
  const byMonth = new Map<string, typeof winners>();
  for (const w of winners) {
    const list = byMonth.get(w.month) ?? [];
    list.push(w);
    byMonth.set(w.month, list);
  }

  const months = Array.from(byMonth.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="size-4 text-gold" />
        <h2 className="text-sm font-black text-white">{t('monthlyWinners')}</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-white/30" />
        </div>
      ) : months.length === 0 ? (
        <div className="text-center py-6">
          <Medal className="size-8 text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-sm">{t('noData')}</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[480px] overflow-y-auto scrollbar-hide">
          {months.map(month => {
            const monthWinners = byMonth.get(month)!;
            const monthLabel = formatMonth(month, locale);

            // Group by dimension
            const byDim = new Map<string, typeof monthWinners>();
            for (const w of monthWinners) {
              const list = byDim.get(w.dimension) ?? [];
              list.push(w);
              byDim.set(w.dimension, list);
            }

            return (
              <div key={month}>
                <h3 className="text-[11px] font-bold text-white/50 uppercase mb-2">{monthLabel}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Array.from(byDim.entries()).map(([dim, dimWinners]) => (
                    <div key={dim} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <span className={cn('text-[10px] font-bold uppercase mb-2 block', DIM_LABELS[dim]?.color ?? 'text-white/50')}>
                        {t(dim as 'overall' | 'trader' | 'manager' | 'analyst')}
                      </span>
                      <div className="space-y-1">
                        {dimWinners.sort((a, b) => a.rank - b.rank).map(w => (
                          <Link
                            key={`${w.dimension}-${w.rank}`}
                            href={`/profile/${w.handle}`}
                            className="flex items-center gap-2 hover:bg-white/[0.04] rounded-lg px-1 py-1 transition-colors"
                          >
                            <span className={cn('w-4 text-[11px] font-mono font-bold', RANK_COLORS[w.rank - 1] ?? 'text-white/40')}>
                              {w.rank}
                            </span>
                            <CosmeticAvatar avatarUrl={w.avatar_url ?? null} displayName={w.display_name || w.handle || ''} size={22} />
                            <span className="text-[12px] font-bold text-white truncate flex-1">
                              {w.display_name || w.handle}
                            </span>
                            {w.reward_cents > 0 && (
                              <span className="text-[9px] font-mono tabular-nums text-emerald-400">
                                +{fmtScout(w.reward_cents)}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function formatMonth(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'de-DE', { month: 'long', year: 'numeric' });
}
