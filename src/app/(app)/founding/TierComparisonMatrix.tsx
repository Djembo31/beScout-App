'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { FOUNDING_PASS_TIERS, FOUNDING_PASS_LIMITS } from '@/lib/foundingPasses';
import { centsToBsd } from '@/lib/services/players';
import type { FoundingPassTier } from '@/types';

const FEE_DISCOUNT_BPS: Record<FoundingPassTier, number> = {
  fan: 25,
  scout: 50,
  pro: 75,
  founder: 100,
};

type ExtraKey =
  | 'founding.extraAccess'
  | 'founding.extraBadge'
  | 'founding.extraIpoEarly'
  | 'founding.extraBetaFeatures'
  | 'founding.extraPrivateChannel'
  | 'founding.extraGenesisBadge'
  | 'founding.extraDirectLine'
  | 'founding.extraFoundersWall';

const ALL_EXTRAS_ORDERED: ExtraKey[] = [
  'founding.extraAccess',
  'founding.extraBadge',
  'founding.extraIpoEarly',
  'founding.extraBetaFeatures',
  'founding.extraPrivateChannel',
  'founding.extraGenesisBadge',
  'founding.extraDirectLine',
  'founding.extraFoundersWall',
];

const TIER_HEADER_COLOR: Record<FoundingPassTier, string> = {
  fan: 'text-sky-400',
  scout: 'text-emerald-400',
  pro: 'text-purple-400',
  founder: 'text-gold',
};

export function TierComparisonMatrix() {
  const t = useTranslations('founding');

  return (
    <Card surface="base" className="p-4 md:p-6 mb-8">
      <div className="mb-4">
        <h2 className="text-base md:text-lg font-black text-white mb-1">{t('compareTitle')}</h2>
        <p className="text-xs md:text-sm text-white/60">{t('compareSubtitle')}</p>
      </div>

      <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
        <table className="w-full min-w-[480px] text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-bg-main py-3 pr-3 text-left text-xs font-medium text-white/50 uppercase tracking-wide"
              >
                {t('compareFeature')}
              </th>
              {FOUNDING_PASS_TIERS.map((td) => (
                <th
                  key={td.tier}
                  scope="col"
                  className={cn(
                    'py-3 px-2 text-center text-xs font-black uppercase tracking-wide',
                    TIER_HEADER_COLOR[td.tier],
                  )}
                >
                  {td.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Meta-Row: Preis */}
            <tr className="border-t border-white/[0.06]">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-bg-main py-2.5 pr-3 text-left text-white/70 font-normal"
              >
                {t('comparePrice')}
              </th>
              {FOUNDING_PASS_TIERS.map((td) => (
                <td
                  key={td.tier}
                  className="py-2.5 px-2 text-center text-white font-mono tabular-nums text-xs md:text-sm"
                >
                  {td.priceLabel}
                </td>
              ))}
            </tr>

            {/* Meta-Row: Credits */}
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-bg-main py-2.5 pr-3 text-left text-white/70 font-normal"
              >
                {t('compareCredits')}
              </th>
              {FOUNDING_PASS_TIERS.map((td) => (
                <td
                  key={td.tier}
                  className="py-2.5 px-2 text-center text-gold font-mono tabular-nums text-xs md:text-sm"
                >
                  {fmtScout(centsToBsd(td.bcreditsCents))}
                </td>
              ))}
            </tr>

            {/* Meta-Row: Migration Bonus */}
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-bg-main py-2.5 pr-3 text-left text-white/70 font-normal"
              >
                {t('compareMigrationBonus')}
              </th>
              {FOUNDING_PASS_TIERS.map((td) => (
                <td
                  key={td.tier}
                  className="py-2.5 px-2 text-center text-white/90 font-mono tabular-nums text-xs md:text-sm"
                >
                  +{td.migrationBonusPct}%
                </td>
              ))}
            </tr>

            {/* Meta-Row: Fee Discount */}
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-bg-main py-2.5 pr-3 text-left text-white/70 font-normal"
              >
                {t('compareFeeDiscount')}
              </th>
              {FOUNDING_PASS_TIERS.map((td) => (
                <td
                  key={td.tier}
                  className="py-2.5 px-2 text-center text-white/90 font-mono tabular-nums text-xs md:text-sm"
                >
                  -{FEE_DISCOUNT_BPS[td.tier]} bps
                </td>
              ))}
            </tr>

            {/* Meta-Row: Limit */}
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-bg-main py-2.5 pr-3 text-left text-white/70 font-normal"
              >
                {t('compareLimit')}
              </th>
              {FOUNDING_PASS_TIERS.map((td) => (
                <td
                  key={td.tier}
                  className="py-2.5 px-2 text-center text-white/60 font-mono tabular-nums text-xs md:text-sm"
                >
                  {FOUNDING_PASS_LIMITS[td.tier].toLocaleString()}
                </td>
              ))}
            </tr>

            {/* Group-Header */}
            <tr>
              <th
                colSpan={1 + FOUNDING_PASS_TIERS.length}
                scope="colgroup"
                className="sticky left-0 z-10 bg-bg-main pt-5 pb-2 pr-3 text-left text-[10px] uppercase tracking-wider text-white/40 font-bold"
              >
                {t('compareExtras')}
              </th>
            </tr>

            {/* Feature-Rows: Extras */}
            {ALL_EXTRAS_ORDERED.map((extraKey) => {
              const localizedLabel = t(extraKey.replace('founding.', '') as 'extraAccess');
              return (
                <tr key={extraKey}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-bg-main py-2.5 pr-3 text-left text-white/80 font-normal"
                  >
                    {localizedLabel}
                  </th>
                  {FOUNDING_PASS_TIERS.map((td) => {
                    const has = td.extras.includes(extraKey);
                    return (
                      <td
                        key={td.tier}
                        className="py-2.5 px-2 text-center"
                      >
                        {has ? (
                          <Check
                            className={cn('inline-block size-4', TIER_HEADER_COLOR[td.tier])}
                            aria-label={t('compareIncluded')}
                          />
                        ) : (
                          <span className="text-white/20" aria-label={t('compareNotIncluded')}>
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
