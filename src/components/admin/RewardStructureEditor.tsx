'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { RewardTier } from '@/types';

// -- Templates ---------------------------------------------------------------
const TEMPLATES: { key: string; tiers: RewardTier[] }[] = [
  { key: 'top3', tiers: [{ rank: 1, pct: 50 }, { rank: 2, pct: 30 }, { rank: 3, pct: 20 }] },
  { key: 'top5', tiers: [{ rank: 1, pct: 40 }, { rank: 2, pct: 25 }, { rank: 3, pct: 15 }, { rank: 4, pct: 12 }, { rank: 5, pct: 8 }] },
  { key: 'winner', tiers: [{ rank: 1, pct: 100 }] },
  { key: 'top10', tiers: [{ rank: 1, pct: 30 }, { rank: 2, pct: 20 }, { rank: 3, pct: 15 }, { rank: 4, pct: 10 }, { rank: 5, pct: 8 }, { rank: 6, pct: 5 }, { rank: 7, pct: 4 }, { rank: 8, pct: 3 }, { rank: 9, pct: 3 }, { rank: 10, pct: 2 }] },
];

const TEMPLATE_I18N: Record<string, string> = {
  top3: 'rewardTemplate_top3',
  top5: 'rewardTemplate_top5',
  winner: 'rewardTemplate_winner',
  top10: 'rewardTemplate_top10',
};

// -- Shared button classes ---------------------------------------------------
const BTN_BASE = 'transition-all hover:bg-white/[0.05] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none';

// -- Component ---------------------------------------------------------------
type Props = {
  value: RewardTier[] | null;
  onChange: (tiers: RewardTier[]) => void;
  disabled?: boolean;
  prizePool?: number; // cents
};

export default function RewardStructureEditor({ value, onChange, disabled, prizePool }: Props) {
  const t = useTranslations('admin');
  const tiers = value ?? [];
  const sum = tiers.reduce((s, tier) => s + tier.pct, 0);
  const sumValid = sum === 100;

  // -- Handlers ----------------------------------------------------------------
  function applyTemplate(template: RewardTier[]) {
    onChange(template.map((tier) => ({ ...tier })));
  }

  function updatePct(index: number, pct: number) {
    const next = tiers.map((tier, i) => (i === index ? { ...tier, pct } : { ...tier }));
    onChange(next);
  }

  function removeRank(index: number) {
    const next = tiers.filter((_, i) => i !== index);
    // Re-number ranks sequentially
    onChange(next.map((tier, i) => ({ ...tier, rank: i + 1 })));
  }

  function addRank() {
    const nextRank = tiers.length > 0 ? Math.max(...tiers.map((t) => t.rank)) + 1 : 1;
    onChange([...tiers.map((t) => ({ ...t })), { rank: nextRank, pct: 0 }]);
  }

  // -- Render ------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Header */}
      <h3 className="text-sm font-black text-white/70 uppercase tracking-wider">
        {t('rewardStructure')}
      </h3>

      {/* Template quick-select */}
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.key}
            type="button"
            disabled={disabled}
            aria-label={`Vorlage: ${t(TEMPLATE_I18N[tmpl.key])}`}
            onClick={() => applyTemplate(tmpl.tiers)}
            className={cn(
              BTN_BASE,
              'min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl',
              'border border-white/10 bg-white/[0.02] text-sm text-white/70',
            )}
          >
            {t(TEMPLATE_I18N[tmpl.key])}
          </button>
        ))}
      </div>

      {/* Rank rows */}
      {tiers.length > 0 && (
        <div className="space-y-2">
          {tiers.map((tier, i) => (
            <div
              key={tier.rank}
              className="flex items-center gap-3 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2"
            >
              {/* Rank label */}
              <span className="text-sm text-white/50 min-w-[56px]">
                {t('rewardRank')} {tier.rank}
              </span>

              {/* Percentage input */}
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={tier.pct}
                  disabled={disabled}
                  aria-label={`Prozent fuer Rang ${tier.rank}`}
                  onChange={(e) => updatePct(i, Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className={cn(
                    'w-20 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-right',
                    'font-mono tabular-nums text-sm text-white',
                    'focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                />
                <span className="text-sm text-white/40">%</span>
              </div>

              {/* Prize preview */}
              {prizePool != null && prizePool > 0 && (
                <span className="text-xs font-mono tabular-nums text-gold/70 min-w-[72px] text-right">
                  {fmtScout(centsToBsd(Math.round((prizePool * tier.pct) / 100)))} $S
                </span>
              )}

              {/* Remove button */}
              <button
                type="button"
                disabled={disabled}
                aria-label={`Rang ${tier.rank} entfernen`}
                onClick={() => removeRank(i)}
                className={cn(
                  BTN_BASE,
                  'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white/30 hover:text-red-400',
                )}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add rank button */}
      <button
        type="button"
        disabled={disabled}
        aria-label="Rang hinzufuegen"
        onClick={addRank}
        className={cn(
          BTN_BASE,
          'min-h-[44px] min-w-[44px] w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl',
          'border border-dashed border-white/10 text-sm text-white/40',
        )}
      >
        <Plus size={16} />
        {t('rewardAddRank')}
      </button>

      {/* Sum indicator */}
      {tiers.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-white/40">
            {t('rewardSum')}
          </span>
          <span
            className={cn(
              'text-sm font-mono tabular-nums font-bold',
              sumValid ? 'text-green-500' : 'text-red-400',
            )}
          >
            {sum}%
            {!sumValid && (
              <span className="ml-2 text-xs font-normal text-red-400/70">
                ({t('rewardMust100')})
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
