'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { User, Settings, UserPlus, UserMinus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, Button } from '@/components/ui';
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
  className,
}: ScoutCardProps) {
  const t = useTranslations('profile');
  const tg = useTranslations('gamification');
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
        <div className="relative size-12 shrink-0 rounded-2xl bg-gold/10 border border-white/10 overflow-hidden">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name ?? profile.handle}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center size-full">
              <User className="size-5 text-white/40" />
            </div>
          )}
        </div>

        {/* Name + Handle + Level */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-black text-white">
              {profile.display_name ?? profile.handle}
            </h2>
            <span className="shrink-0 rounded-md bg-white/[0.06] border border-white/10 px-1.5 py-0.5 text-[11px] font-bold text-white/50">
              Lv.{profile.level}
            </span>
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
              className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-bold text-gold hover:text-gold/80 transition-colors"
            >
              {bioExpanded ? (
                <>
                  {t('bioLess')} <ChevronUp className="size-3" />
                </>
              ) : (
                <>
                  {t('bioMore')} <ChevronDown className="size-3" />
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
      <div className="mt-3 text-center">
        <span className={cn('text-sm font-black', rang.color)}>
          {tg(`rang.${rang.i18nKey}`)}
        </span>
        {userStats && userStats.rank > 0 && (
          <span className="text-sm text-white/40">
            {' '}— #{(userStats.rank).toLocaleString('de-DE')}
          </span>
        )}
      </div>

      {/* ── Auto Badges ── */}
      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge.type}
              className="px-2.5 py-1.5 rounded-lg bg-gold/[0.08] border border-gold/20 text-[11px] font-bold text-gold"
            >
              {t(badge.labelKey, badge.params)}
            </span>
          ))}
        </div>
      )}

      {/* ── Stats Ribbon ── */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-white/40">
        <span>
          <span className="font-bold text-white/60">{followersCount.toLocaleString('de-DE')}</span>{' '}
          {t('followers')}
        </span>
        <span aria-hidden="true" className="text-white/10">·</span>
        <span>
          <span className="font-bold text-white/60">{followingCount.toLocaleString('de-DE')}</span>{' '}
          {t('following')}
        </span>
        <span aria-hidden="true" className="text-white/10">·</span>
        <span>
          <span className="font-bold text-white/60">{(userStats?.trades_count ?? 0).toLocaleString('de-DE')}</span>{' '}
          Trades
        </span>
        <span aria-hidden="true" className="text-white/10">·</span>
        <span>
          <span className="font-bold text-white/60">{(userStats?.events_count ?? 0).toLocaleString('de-DE')}</span>{' '}
          Events
        </span>
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
