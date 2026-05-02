'use client';

/**
 * Slice 262 — Home Hero-Mode-Detection: ManagerBlock
 *
 * Manager-Hub-Component fuer aktive GW. Wird vom HomeStoryHeader
 * als Dispatcher gerendert wenn heroMode === 'manager'.
 *
 * Stateless-Component (Slice 254 Heal-v2 Pattern, kein Liga-Pin-Risk).
 * Sub-Header firstName + Tier-Badge + Streak/Shield-Pills (Identity-Continuity).
 * Hero-Headline "Spieltag {gw}" als primaerer Hero-Identifier (F-05, kein neuer Greeting-Key).
 * Lineup-Pill + Captain-Pill (cascading: Captain hidden bis Lineup gesetzt — F-04).
 *
 * Spec: worklog/specs/262-hero-mode-detection-manager-block.md
 */

import { memo } from 'react';
import Link from 'next/link';
import { Flame, Shield, UserCheck, Crown, AlertCircle, ArrowUpRight, ChartLine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TierBadge } from '@/components/ui/TierBadge';
import { fmtScout, cn } from '@/lib/utils';
import type { DbUserStats } from '@/types';

export interface ManagerBlockProps {
  firstName: string;
  streak: number;
  shieldsRemaining: number | null;
  userStats: DbUserStats | null;
  gw: number;
  hasLineup: boolean;
  hasCaptain: boolean;
  captainName: string | null;
  // Slice 263 — ScoutPill Cross-Identity (re-add holdingsCount as Show-Gate after Slice-262 P2-2 removal)
  portfolioValue: number;
  pnlPct: number;
  holdingsCount: number;
}

function ManagerBlockInner({
  firstName,
  streak,
  shieldsRemaining,
  userStats,
  gw,
  hasLineup,
  hasCaptain,
  captainName,
  portfolioValue,
  pnlPct,
  holdingsCount,
}: ManagerBlockProps) {
  const t = useTranslations('home.manager');
  const tg = useTranslations('gamification');
  const pnlPositive = pnlPct >= 0;

  return (
    <div>
      {/* ━━━ SUB-HEADER — firstName + TierBadge + Streak/Shield Pills (Identity-Continuity) ━━━ */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-semibold">
            {firstName}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {userStats?.tier && <TierBadge tier={userStats.tier} size="md" />}
          {streak >= 2 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-400/20 anim-fade shadow-[0_0_12px_rgba(249,115,22,0.15)]">
              <Flame className="size-5 text-orange-400 motion-safe:animate-pulse" aria-hidden="true" />
              <span className="text-base font-black text-orange-300 font-mono tabular-nums">{streak}</span>
            </div>
          )}
          {shieldsRemaining != null && shieldsRemaining > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-sky-500/10 border border-sky-400/20 anim-fade"
              title={tg('streak.shieldHint')}
            >
              <Shield className="size-3.5 text-sky-400" aria-hidden="true" />
              <span className="text-xs font-black text-sky-300">{shieldsRemaining}</span>
            </div>
          )}
        </div>
      </div>

      {/* ━━━ HERO HEADLINE — "Spieltag {gw}" (primaerer Hero-Identifier) ━━━ */}
      <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-3 text-balance">
        <span className="font-mono tabular-nums gold-glow">{t('gwLabel', { n: gw })}</span>
        <span className="text-gold">.</span>
      </h1>

      {/* ━━━ PILL-REIHE — Lineup + Captain (cascading) ━━━ */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        {/* Lineup-Pill */}
        {hasLineup ? (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-vivid-green/15 border border-vivid-green/30 min-h-[44px]">
            <UserCheck className="size-4 text-vivid-green shrink-0" aria-hidden="true" />
            <span className="text-sm font-bold text-vivid-green">{t('lineupSet')}</span>
          </div>
        ) : (
          <Link
            href="/fantasy?tab=lineup"
            prefetch={false}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border min-h-[44px]',
              'bg-gold/10 border-gold/30 hover:bg-gold/15 transition-colors',
              'gold-pulse-bg motion-safe:animate-pulse motion-reduce:animate-none',
            )}
          >
            <span className="text-sm font-bold text-gold">{t('lineupCta')}</span>
            <ArrowUpRight className="size-4 text-gold shrink-0" aria-hidden="true" />
          </Link>
        )}

        {/* Captain-Pill — HIDDEN wenn !hasLineup (F-04 cascading) */}
        {hasLineup && (
          hasCaptain && captainName ? (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-vivid-green/15 border border-vivid-green/30 min-h-[44px]">
              <Crown className="size-4 text-vivid-green shrink-0" aria-hidden="true" />
              <span className="text-sm font-bold text-vivid-green">
                {t('captainSet', { name: captainName })}
              </span>
            </div>
          ) : (
            <Link
              href="/fantasy?tab=lineup"
              prefetch={false}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl border min-h-[44px]',
                'bg-yellow-500/10 border-yellow-400/30 hover:bg-yellow-500/15 transition-colors',
              )}
            >
              <AlertCircle className="size-4 text-yellow-300 shrink-0" aria-hidden="true" />
              <span className="text-sm font-bold text-yellow-200">{t('captainCta')}</span>
            </Link>
          )
        )}

        {/* Slice 263 — ScoutPill (Cross-Identity Pill) — visible only when holdings > 0 */}
        {holdingsCount > 0 && (
          <Link
            href="/manager?tab=kader"
            prefetch={false}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] transition-colors min-h-[44px]"
          >
            <ChartLine className="size-4 text-white/60 shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold text-white/55 uppercase tracking-wide">{t('scoutPillLabel')}</span>
            <span className="font-mono font-bold text-sm text-white tabular-nums">{fmtScout(portfolioValue)}</span>
            <span className="text-white/30 text-xs">CR</span>
            <span className={cn('font-mono font-bold text-sm tabular-nums', pnlPositive ? 'text-vivid-green' : 'text-vivid-red')}>
              {pnlPositive ? '+' : ''}{pnlPct.toFixed(1)}%
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

export default memo(ManagerBlockInner);
