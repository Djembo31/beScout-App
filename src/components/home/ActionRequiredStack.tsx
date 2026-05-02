'use client';

/**
 * Slice 264 — Phase 2 Action-Layer: ActionRequiredStack
 * Slice 265 — StreakRiskCard ergänzt (Notification-only Card, kein Link)
 *
 * Rendert prominente Action-Cards für Pflicht-Actions (Lineup, Captain) plus
 * Streak-Risk-Erinnerung zwischen HomeStoryHeader und ScoutCardStats. Sichtbar
 * nur in Manager-Mode bei offener Action ODER at-risk Streak.
 *
 * Stateless-Component (Slice 254 Pattern) — alle Inputs als Primitive-Props
 * (entkoppelt vom DbEvent-Type, in Tests trivial mockbar).
 *
 * Specs: worklog/specs/264-action-required-stack.md, worklog/specs/265-streak-risk-card.md
 */

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { Users, Crown, ArrowRight, Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { getTimeUntil, URGENT_THRESHOLD_MS } from './helpers';
import type { DbEvent } from '@/types';

export interface ActionRequiredStackProps {
  heroMode: 'manager' | 'scout' | 'cta-new';
  gw: number;
  hasLineup: boolean;
  hasCaptain: boolean;
  locksAtIso: string | null;
  scopedActiveEventStatus: DbEvent['status'] | null;
  /** Slice 265 — Server-authoritative Login-Streak (useLoginStreak) */
  streak: number;
  /** Slice 265 — Shields verbleibend; null = useLoginStreak noch nicht resolved (defensive: kein at-risk) */
  shieldsRemaining: number | null;
}

function ActionRequiredStackInner({
  heroMode,
  gw,
  hasLineup,
  hasCaptain,
  locksAtIso,
  scopedActiveEventStatus,
  streak,
  shieldsRemaining,
}: ActionRequiredStackProps) {
  const t = useTranslations('home.actionStack');

  // Slice 265 — Streak-Risk derived (clientside, kein RPC).
  // Defensive: shieldsRemaining=null wird NICHT als at-risk interpretiert (F-04).
  const isStreakAtRisk = streak >= 7 && shieldsRemaining === 0;
  const isStreakUrgent = streak >= 14 && shieldsRemaining === 0;

  // Derived: countdownMs + isUrgent (memo'd weil Date.now() pro Render).
  const { countdownMs, countdown, isUrgent, isLocked } = useMemo(() => {
    if (!locksAtIso) return { countdownMs: 0, countdown: '', isUrgent: false, isLocked: false };
    const ms = Math.max(0, new Date(locksAtIso).getTime() - Date.now());
    const locked = scopedActiveEventStatus === 'running' && ms === 0;
    return {
      countdownMs: ms,
      countdown: getTimeUntil(locksAtIso),
      isUrgent: ms > 0 && ms < URGENT_THRESHOLD_MS,
      isLocked: locked,
    };
  }, [locksAtIso, scopedActiveEventStatus]);

  // Render-Branches (Spec §2.1, F-03 Render-Branch-Refactor)
  if (heroMode !== 'manager') return null;
  if (!locksAtIso && !isStreakAtRisk) return null;                      // F-03: off-GW + Streak ist auch valid
  if (hasLineup && hasCaptain && !isStreakAtRisk) return null;          // F-03: Streak overrides Lineup-done
  if (isLocked && !isStreakAtRisk) return null;                         // F-03: Streak-Card auch bei Lineup-Lock sichtbar

  const showLineup = !hasLineup && !isLocked && !!locksAtIso;
  const showCaptain = hasLineup && !hasCaptain && !isLocked && !!locksAtIso;
  const showStreak = isStreakAtRisk;

  return (
    <div className="space-y-3">
      {showLineup && (
        <Link
          href="/fantasy?tab=lineup"
          prefetch={false}
          aria-label={t('lineupCta')}
          className={cn(
            'flex items-center gap-3 px-4 py-3.5 rounded-2xl border min-h-[64px]',
            'transition-colors',
            isUrgent
              ? 'border-red-400/30 bg-red-500/[0.06] motion-safe:animate-pulse motion-reduce:animate-none'
              : 'border-gold/25 bg-gold/[0.04] hover:bg-gold/[0.06]',
          )}
        >
          <div className="size-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
            <Users className="size-5 text-gold" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-sm font-black uppercase tracking-wide text-white">
                {t('lineupTitle')}
              </span>
              {isUrgent && (
                <span className="px-2 py-0.5 rounded-md bg-red-500/15 border border-red-400/30 text-[10px] font-mono font-bold text-red-300 tabular-nums">
                  {t('urgentBadge', { countdown })}
                </span>
              )}
            </div>
            <span className="text-[12px] text-white/55">
              {t('lineupSubtitle', { n: gw, countdown })}
            </span>
          </div>
          <ArrowRight className="size-5 text-gold shrink-0" aria-hidden="true" />
        </Link>
      )}

      {showCaptain && (
        <Link
          href="/fantasy?tab=lineup"
          prefetch={false}
          aria-label={t('captainCta')}
          className={cn(
            'flex items-center gap-3 px-4 py-3.5 rounded-2xl border min-h-[64px]',
            'transition-colors',
            isUrgent
              ? 'border-red-400/30 bg-red-500/[0.06] motion-safe:animate-pulse motion-reduce:animate-none'
              : 'border-yellow-400/30 bg-yellow-500/[0.05] hover:bg-yellow-500/[0.08]',
          )}
        >
          <div className="size-10 rounded-xl bg-yellow-500/10 border border-yellow-400/20 flex items-center justify-center shrink-0">
            <Crown className="size-5 text-yellow-300" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-sm font-black uppercase tracking-wide text-white">
                {t('captainTitle')}
              </span>
              {isUrgent && (
                <span className="px-2 py-0.5 rounded-md bg-red-500/15 border border-red-400/30 text-[10px] font-mono font-bold text-red-300 tabular-nums">
                  {t('urgentBadge', { countdown })}
                </span>
              )}
            </div>
            <span className="text-[12px] text-white/55">{t('captainSubtitle')}</span>
          </div>
          <ArrowRight className="size-5 text-yellow-300 shrink-0" aria-hidden="true" />
        </Link>
      )}

      {showStreak && (
        <div
          role="status"
          aria-label={t('streakRiskAriaLabel', { streak })}
          className={cn(
            'flex items-center gap-3 px-4 py-3.5 rounded-2xl border min-h-[64px]',
            'transition-colors',
            isStreakUrgent
              ? 'border-red-400/30 bg-red-500/[0.06] motion-safe:animate-pulse motion-reduce:animate-none'
              : 'border-orange-400/30 bg-orange-500/[0.05]',
          )}
        >
          <div className="size-10 rounded-xl bg-orange-500/10 border border-orange-400/20 flex items-center justify-center shrink-0">
            <Flame className="size-5 text-orange-300" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-sm font-black uppercase tracking-wide text-white">
                {t('streakRiskTitle')}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-orange-500/15 border border-orange-400/30 text-[10px] font-mono font-bold text-orange-300 tabular-nums">
                {t('streakRiskBadge')}
              </span>
            </div>
            <span className="text-[12px] text-white/55">
              {t('streakRiskSubtitle', { streak })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ActionRequiredStackInner);
