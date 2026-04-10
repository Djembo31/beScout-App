'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Settings, UserPlus, UserMinus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, Button, CosmeticAvatar, InfoTooltip } from '@/components/ui';
import { RadarChart } from '@/components/profile/RadarChart';
import { getStrengthLabel, getAutoBadges } from '@/lib/scoutReport';
import { getGesamtRang } from '@/lib/gamification';
import type { Profile, DbUserStats, AuthorTrackRecord } from '@/types';

// ============================================
// PROPS
// ============================================

interface ScoutCardProps {
  profile: Profile;
  userStats: DbUserStats | null;
  trackRecord: AuthorTrackRecord | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  followLoading: boolean;
  currentStreak: number;
  clubSubscription: { tier: string; clubName: string } | null;
  foundingPassTier: string | null;
  portfolioPnlPct: number;
  avgFantasyRank?: number;
  totalFantasyParticipants?: number;
  researchCount?: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function ScoutCard({
  profile,
  userStats,
  trackRecord,
  followersCount,
  followingCount,
  isFollowing,
  isSelf,
  onFollow,
  onUnfollow,
  followLoading,
  currentStreak,
  clubSubscription,
  foundingPassTier,
  portfolioPnlPct,
  avgFantasyRank,
  totalFantasyParticipants,
  researchCount = 0,
  onFollowersClick,
  onFollowingClick,
  className,
}: ScoutCardProps) {
  const t = useTranslations('profile');
  const tg = useTranslations('gamification');
  const locale = useLocale();
  const numLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';
  const [bioExpanded, setBioExpanded] = useState(false);

  // ── Scores ──
  const scores = {
    manager_score: userStats?.manager_score ?? 0,
    trading_score: userStats?.trading_score ?? 0,
    scout_score: userStats?.scout_score ?? 0,
  };

  // ── Strength label ──
  const strengthLabel = getStrengthLabel(scores);

  // ── Gesamt-Rang ──
  const rang = getGesamtRang({
    trader_score: scores.trading_score,
    manager_score: scores.manager_score,
    analyst_score: scores.scout_score,
  });

  // ── Auto badges ──
  const badges = getAutoBadges({
    trackRecord: trackRecord
      ? { hitRate: trackRecord.hitRate, totalCalls: trackRecord.totalCalls }
      : null,
    avgFantasyRank,
    totalFantasyParticipants,
    currentStreak,
    clubSubscription,
    foundingPassTier,
    portfolioPnlPct,
    followersCount,
    isSelf,
  });

  // ── Bio ──
  const bio = profile.bio;
  const bioIsLong = (bio?.length ?? 0) > 100;

  return (
    <Card surface="elevated" className={cn('p-5', className)}>
      {/* ── Avatar + Identity ── */}
      <div className="flex items-center gap-3.5">
        {/* Avatar */}
        <CosmeticAvatar
          avatarUrl={profile.avatar_url}
          displayName={profile.display_name ?? profile.handle}
          size={48}
        />

        {/* Name + Handle */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-black text-white">
              {profile.display_name ?? profile.handle}
            </h2>
          </div>
          <p className="truncate text-[13px] text-white/40">@{profile.handle}</p>
        </div>
      </div>

      {/* ── Strength Label ── */}
      <p className="mt-3 text-center text-[13px] font-bold text-gold">
        {t(strengthLabel)}
      </p>

      {/* ── Bio ── */}
      {bio && (
        <div className="mt-2">
          <p
            className={cn(
              'text-[13px] text-white/60 leading-relaxed',
              !bioExpanded && bioIsLong && 'line-clamp-2',
            )}
          >
            {bio}
          </p>
          {bioIsLong && (
            <button
              type="button"
              onClick={() => setBioExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-gold hover:text-gold/80 transition-colors"
            >
              {bioExpanded ? (
                <>
                  {t('lessBio')} <ChevronUp className="size-3" />
                </>
              ) : (
                <>
                  {t('moreBio')} <ChevronDown className="size-3" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Radar Chart ── */}
      <div className="mt-4 flex justify-center">
        <RadarChart
          scores={{
            manager: scores.manager_score,
            trader: scores.trading_score,
            analyst: scores.scout_score,
          }}
        />
      </div>

      {/* ── Gesamt-Rang ── */}
      <Link href="/rankings" className="mt-3 flex items-center justify-center gap-1 group">
        <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider group-hover:text-gold/50 transition-colors">BeScout Liga</span>
        <span className="text-white/20 mx-0.5">|</span>
        <span className={cn('text-sm font-black', rang.color)}>
          {tg(`rang.${rang.i18nKey}`)}
        </span>
        {userStats && userStats.rank > 0 && (
          <span className="text-sm text-white/40">
            {' '}— #{(userStats.rank).toLocaleString(numLocale)}
          </span>
        )}
        <InfoTooltip text={tg('dimensionTooltip')} />
      </Link>

      {/* ── Auto Badges ── */}
      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge.type}
              className="px-2.5 py-1.5 rounded-lg bg-gold/[0.08] border border-gold/20 text-[10px] font-bold text-gold"
            >
              {t(badge.labelKey, badge.params)}
            </span>
          ))}
        </div>
      )}

      {/* ── Stats Ribbon ── */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-white/40">
        {onFollowersClick ? (
          <button
            type="button"
            onClick={onFollowersClick}
            aria-label={t('followers')}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-white/60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a] rounded-lg transition-colors"
          >
            <span className="font-bold text-white/60">{followersCount.toLocaleString(numLocale)}</span>{' '}
            {t('followers')}
          </button>
        ) : (
          <span>
            <span className="font-bold text-white/60">{followersCount.toLocaleString(numLocale)}</span>{' '}
            {t('followers')}
          </span>
        )}
        <span aria-hidden="true" className="text-white/10">·</span>
        {onFollowingClick ? (
          <button
            type="button"
            onClick={onFollowingClick}
            aria-label={t('following')}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-white/60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a] rounded-lg transition-colors"
          >
            <span className="font-bold text-white/60">{followingCount.toLocaleString(numLocale)}</span>{' '}
            {t('following')}
          </button>
        ) : (
          <span>
            <span className="font-bold text-white/60">{followingCount.toLocaleString(numLocale)}</span>{' '}
            {t('following')}
          </span>
        )}
        <span aria-hidden="true" className="text-white/10">·</span>
        <span>
          <span className="font-bold text-white/60">{(userStats?.trades_count ?? 0).toLocaleString(numLocale)}</span>{' '}
          {t('filterTrades')}
        </span>
        {researchCount > 0 && (
          <>
            <span aria-hidden="true" className="text-white/10">·</span>
            <span>
              <span className="font-bold text-white/60">{researchCount.toLocaleString(numLocale)}</span>{' '}
              {t('researchPosts')}
            </span>
          </>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="mt-4">
        {isSelf ? (
          <Link href="/profile/settings" className="block">
            <Button variant="outline" size="sm" fullWidth>
              <Settings className="size-4" />
              {t('settings')}
            </Button>
          </Link>
        ) : isFollowing ? (
          <Button
            variant="outline"
            size="sm"
            fullWidth
            loading={followLoading}
            onClick={onUnfollow}
          >
            <UserMinus className="size-4" />
            {t('unfollow')}
          </Button>
        ) : (
          <Button
            variant="gold"
            size="sm"
            fullWidth
            loading={followLoading}
            onClick={onFollow}
          >
            <UserPlus className="size-4" />
            {t('follow')}
          </Button>
        )}
      </div>
    </Card>
  );
}
