'use client';

/**
 * Slice 261 — Home Layer 0: Gameweek-Status-Bar
 *
 * Persistente GW-Awareness above-the-fold im Hero.
 * Stateless-Component (Slice 254 Heal-v2 Pattern, kein Liga-Pin-Risk).
 * Mountet INNERHALB HomeStoryHeader-Edge-zu-Edge-Wrapper, non-sticky
 * (TopBar bleibt sticky drüber, P0-1 Fix).
 *
 * State-Sources (alle existing):
 *   useUser() · useLeagueScope() (SSOT) · useEvents() (DbEvent[])
 *
 * Spec: worklog/specs/261-gameweek-status-bar.md
 */

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/AuthProvider';
import { useLeagueScope } from '@/features/shared/store/leagueScopeStore';
import { useEvents } from '@/lib/queries';
import { getLeague } from '@/lib/leagues';
import { cn } from '@/lib/utils';
import { getTimeUntil, pickScopedEvent, URGENT_THRESHOLD_MS } from './helpers';
import type { DbEvent } from '@/types';

function GameweekStatusBarInner() {
  const t = useTranslations('home.gwBar');
  const { user } = useUser();
  const { leagueId, leagueName, hydrated } = useLeagueScope();
  const { data: events = [] } = useEvents();

  // Skeleton-Reserve while leagueScope hydrating — avoid Layout-Shift (P1-1).
  if (!hydrated) {
    return (
      <div
        className="h-11 lg:h-12 mb-4 rounded-lg bg-white/[0.03] animate-pulse motion-reduce:animate-none"
        aria-label={t('skeletonAriaLabel')}
      />
    );
  }

  // Top-level guards
  if (!user || !leagueId) return null;

  const barEvent = pickScopedEvent(events as DbEvent[], leagueId);
  if (!barEvent || !barEvent.starts_at) return null;

  const isRunning = barEvent.status === 'running';
  const timeIso = isRunning ? barEvent.ends_at : barEvent.starts_at;
  const remainingMs = timeIso ? Math.max(0, new Date(timeIso).getTime() - Date.now()) : 0;
  const isUrgent = !isRunning && remainingMs > 0 && remainingMs < URGENT_THRESHOLD_MS;

  const league = leagueName ? getLeague(leagueName) : null;
  const leagueLogoUrl = league?.logoUrl ?? null;
  const leagueDisplayName = league?.short ?? leagueName;
  const gw = barEvent.gameweek ?? 1;

  const countdown = remainingMs === 0 && !isRunning
    ? t('deadlinePassedFallback')
    : getTimeUntil(timeIso ?? null);

  return (
    <Link
      href="/fantasy"
      prefetch={false}
      aria-label={t('linkAriaLabel')}
      className={cn(
        'flex items-center gap-2 mb-4 px-3 py-2.5 lg:py-3 rounded-lg border min-h-[44px] lg:min-h-[48px]',
        'transition-colors',
        isUrgent || isRunning
          ? 'bg-gold/10 border-gold/30 gold-pulse-bg motion-safe:animate-pulse motion-reduce:animate-none'
          : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.06]',
      )}
    >
      {leagueLogoUrl ? (
        <Image
          src={leagueLogoUrl}
          alt=""
          width={20}
          height={20}
          className="size-5 object-contain shrink-0"
        />
      ) : (
        <div className="size-5 shrink-0 rounded bg-white/10" aria-hidden="true" />
      )}

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-black tracking-wide tabular-nums shrink-0">
          {t('label', { n: gw })}
        </span>
        {leagueDisplayName && (
          <span className="text-xs text-white/50 truncate">
            · {leagueDisplayName}
          </span>
        )}
      </div>

      {isRunning ? (
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="animate-ping motion-reduce:animate-none absolute inline-flex size-full rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-gold" />
          </span>
          <span className="text-[10px] font-black uppercase text-gold tracking-wider">
            {t('live')}
          </span>
        </span>
      ) : (
        <span
          className={cn(
            'flex items-center gap-1 shrink-0 text-xs font-mono font-bold tabular-nums',
            isUrgent ? 'text-red-400' : 'text-white/60',
          )}
          aria-live="polite"
        >
          <Clock className="size-3.5" aria-hidden="true" />
          {countdown}
        </span>
      )}
    </Link>
  );
}

export default memo(GameweekStatusBarInner);
