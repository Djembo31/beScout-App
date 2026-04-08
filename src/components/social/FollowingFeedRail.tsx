'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { UserPlus, Users, ArrowUp } from 'lucide-react';
import { useFollowingFeed } from '@/lib/queries/social';
import { formatTimeAgo } from '@/lib/utils';
import { Skeleton, ErrorState } from '@/components/ui';
import { SectionHeader } from '@/components/home/helpers';
import type { Player, ActivityFeedItem } from '@/types';

// Actions that have i18n labels (mirrors FEED_ACTIONS in social service + messages.feed.actions)
const KNOWN_ACTIONS = new Set([
  'trade_buy', 'trade_sell', 'research_create', 'post_create',
  'lineup_submit', 'follow', 'bounty_submit', 'bounty_create',
  'offer_create', 'offer_accept', 'poll_create', 'vote_create',
]);

type Props = {
  userId: string;
  players: Player[];
  limit?: number;
};

export default function FollowingFeedRail({ userId, players, limit = 5 }: Props) {
  const t = useTranslations('feed');
  const {
    data: feed,
    isLoading,
    isError,
    refetch,
    pendingCount,
    applyPending,
  } = useFollowingFeed(userId, limit);

  // Player lookup map for trade action enrichment
  const playerMap = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );

  // Filter to only actions we can render safely
  const visibleItems = useMemo(
    () => (feed ?? []).filter((i) => KNOWN_ACTIONS.has(i.action)),
    [feed],
  );

  // ─── Loading ───
  if (isLoading) {
    return (
      <div>
        <SectionHeader title={t('scoutActivity')} />
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-minimal border border-white/[0.06]"
            >
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (isError) {
    return (
      <div>
        <SectionHeader title={t('scoutActivity')} />
        <div className="mt-3">
          <ErrorState onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  // ─── Empty ───
  if (visibleItems.length === 0) {
    return (
      <div>
        <SectionHeader title={t('scoutActivity')} />
        <div className="mt-3 p-4 rounded-2xl bg-surface-minimal border border-white/10 text-center">
          <Users className="size-6 text-white/20 mx-auto mb-2" aria-hidden="true" />
          <p className="text-xs text-white/50 mb-3 text-pretty">{t('empty')}</p>
          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-400/20 text-xs font-bold text-sky-400 hover:bg-sky-500/15 active:scale-[0.97] transition-colors min-h-[44px]"
          >
            <UserPlus className="size-3.5" aria-hidden="true" />
            {t('emptyCta')}
          </Link>
        </div>
      </div>
    );
  }

  // ─── Populated ───
  return (
    <div>
      <SectionHeader title={t('scoutActivity')} />
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={applyPending}
          className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gold/10 border border-gold/30 text-xs font-bold text-gold hover:bg-gold/15 hover:border-gold/40 active:scale-[0.98] transition-colors min-h-[40px] focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
          aria-label={t('newActivities', { count: pendingCount })}
        >
          <ArrowUp className="size-3.5" aria-hidden="true" />
          {t('newActivities', { count: pendingCount })}
        </button>
      )}
      <div className="mt-3 space-y-2">
        {visibleItems.map((item) => (
          <FeedItemCard key={item.id} item={item} playerMap={playerMap} t={t} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Feed Item Card
// ============================================

type FeedItemCardProps = {
  item: ActivityFeedItem;
  playerMap: Map<string, Player>;
  t: ReturnType<typeof useTranslations>;
};

function FeedItemCard({ item, playerMap, t }: FeedItemCardProps) {
  const displayName = item.displayName || item.handle;
  const timeAgo = formatTimeAgo(item.createdAt, t('justNow'));
  const actionLabel = getActionLabel(item, playerMap, t);
  const initial = displayName[0]?.toUpperCase() ?? '?';

  return (
    <Link
      href={`/profile/${item.handle}`}
      className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-minimal border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10 transition-colors min-h-[44px]"
    >
      {item.avatarUrl ? (
        <Image
          src={item.avatarUrl}
          alt=""
          width={32}
          height={32}
          className="size-8 rounded-full object-cover shrink-0"
          unoptimized
        />
      ) : (
        <div className="size-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-white/40">{initial}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/80 truncate">
          <span className="font-bold">@{item.handle}</span>{' '}
          <span className="text-white/50">{actionLabel}</span>
        </div>
        <div className="text-[10px] text-white/30 tabular-nums mt-0.5">{timeAgo}</div>
      </div>
    </Link>
  );
}

// ============================================
// Action Label Resolver
// ============================================

function getActionLabel(
  item: ActivityFeedItem,
  playerMap: Map<string, Player>,
  t: ReturnType<typeof useTranslations>,
): string {
  const { action, metadata } = item;

  // Trade actions: resolve player name from map
  if (action === 'trade_buy' || action === 'trade_sell') {
    const playerId = metadata.playerId as string | undefined;
    const player = playerId ? playerMap.get(playerId) : undefined;
    if (player) {
      return t(`actions.${action}`, { player: `${player.first} ${player.last}` });
    }
    // Fallback: player not in current players list (filtered / older data)
    return t(`actions.${action}_generic`);
  }

  return t(`actions.${action}`);
}
