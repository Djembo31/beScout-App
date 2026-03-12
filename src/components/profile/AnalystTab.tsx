'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { CheckCircle, XCircle, Clock, Shield, Star, Lock, FileText, Target, Vote, Coins, Search as SearchIcon, TrendingUp, Trophy, Award, Users, Zap } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';
import { getExpertBadges } from '@/lib/expertBadges';
import ScoreProgress from '@/components/profile/ScoreProgress';
import { useTranslations } from 'next-intl';
import type { DbUserStats, DbTransaction, ResearchPostWithAuthor, AuthorTrackRecord } from '@/types';

const PredictionStatsCard = dynamic(() => import('./PredictionStatsCard'), { ssr: false });

// ============================================
// TYPES
// ============================================

interface AnalystTabProps {
  userId: string;
  userStats: DbUserStats | null;
  trackRecord: AuthorTrackRecord | null;
  myResearch: ResearchPostWithAuthor[];
  isSelf: boolean;
  transactions?: DbTransaction[];
}

// ============================================
// CONSTANTS
// ============================================

const CONTENT_EARNING_TYPES: { type: string; labelKey: string; icon: React.ElementType }[] = [
  { type: 'research_earning', labelKey: 'earningReports', icon: FileText },
  { type: 'bounty_reward', labelKey: 'earningBounties', icon: Target },
  { type: 'poll_earning', labelKey: 'earningPolls', icon: Vote },
  { type: 'tip_receive', labelKey: 'earningTips', icon: Coins },
];

const BADGE_ICONS: Record<string, React.ElementType> = {
  TrendingUp, Trophy, Search: SearchIcon, Award, Users, Zap,
};

// ============================================
// CALL DIRECTION ICON
// ============================================

function CallIcon({ call }: { call: string }) {
  if (call === 'Bullish') return <span className="text-green-500 font-bold text-sm" aria-label="Bullish">▲</span>;
  if (call === 'Bearish') return <span className="text-red-400 font-bold text-sm" aria-label="Bearish">▼</span>;
  return <span className="text-white/40 text-sm" aria-label="Neutral">●</span>;
}

// ============================================
// RATING STARS
// ============================================

function RatingStars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-px text-[11px]" aria-label={`${rating.toFixed(1)} von 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn('size-2.5', i < full ? 'text-gold fill-gold' : 'text-white/15')}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

// ============================================
// ANALYST TAB
// ============================================

export default function AnalystTab({
  userId,
  userStats,
  trackRecord,
  myResearch,
  isSelf,
  transactions = [],
}: AnalystTabProps) {
  const tp = useTranslations('profile');
  const tg = useTranslations('gamification');

  // Aggregate content earnings (self only)
  const contentEarnings = useMemo(() => {
    if (!isSelf || transactions.length === 0) return null;
    const typeSet = new Set(CONTENT_EARNING_TYPES.map(e => e.type));
    const byType = new Map<string, number>();
    let total = 0;
    for (const tx of transactions) {
      if (typeSet.has(tx.type) && tx.amount > 0) {
        byType.set(tx.type, (byType.get(tx.type) ?? 0) + tx.amount);
        total += tx.amount;
      }
    }
    if (total === 0) return null;
    const maxAmount = Math.max(...Array.from(byType.values()));
    return { byType, total, maxAmount };
  }, [isSelf, transactions]);

  // Bounty stats from transactions
  const bountyStats = useMemo(() => {
    if (!isSelf || transactions.length === 0) return null;
    let count = 0;
    let total = 0;
    for (const tx of transactions) {
      if (tx.type === 'bounty_reward' && tx.amount > 0) {
        count++;
        total += tx.amount;
      }
    }
    return count > 0 ? { count, total } : null;
  }, [isSelf, transactions]);

  const researchSlice = myResearch.slice(0, 5);
  const hasTrackRecord = trackRecord && trackRecord.totalCalls > 0;
  const isEmpty = myResearch.length === 0 && !hasTrackRecord;

  // Empty state
  if (isEmpty) {
    return (
      <div className="space-y-6">
        {/* Score Progress */}
        <ScoreProgress dimension="analyst" score={userStats?.scout_score ?? 0} />

        <Card className="p-6 text-center">
          <FileText className="size-10 text-white/10 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-bold text-white/60 mb-1">
            {isSelf ? tp('analystEmpty') : tp('analystEmptyPublic')}
          </p>
          {isSelf && (
            <>
              <p className="text-[11px] text-white/40 mb-4">{tp('analystEmptyDesc')}</p>
              <Link href="/community">
                <Button size="sm">{tp('writeResearch')}</Button>
              </Link>
            </>
          )}
        </Card>

        {/* Expert Badges — always visible */}
        {userStats && <ExpertBadgesCard userStats={userStats} tp={tp} tg={tg} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Score Progress */}
      <ScoreProgress dimension="analyst" score={userStats?.scout_score ?? 0} />

      {/* 2. Track Record */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="size-5 text-emerald-400" aria-hidden="true" />
          <h3 className="font-black">{tp('trackRecord')}</h3>
        </div>

        {trackRecord && trackRecord.totalCalls >= 5 ? (
          <>
            {/* Large hit rate */}
            <div className="text-center mb-3">
              <div className={cn(
                'text-2xl font-mono font-black',
                trackRecord.hitRate >= 70 ? 'text-green-500' :
                trackRecord.hitRate >= 50 ? 'text-amber-400' : 'text-red-400'
              )}>
                {trackRecord.hitRate}%
              </div>
              <div className="text-[11px] text-white/40 mt-1">{tp('hitRateLabel')}</div>
            </div>

            {/* Breakdown */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-white/50">
              <span className="flex items-center gap-1">
                <CheckCircle className="size-3 text-green-500" aria-hidden="true" />
                {trackRecord.correctCalls} {tg('correct', { defaultMessage: 'Correct' })}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="size-3 text-red-400" aria-hidden="true" />
                {trackRecord.incorrectCalls} {tg('wrong', { defaultMessage: 'Wrong' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3 text-white/30" aria-hidden="true" />
                {trackRecord.pendingCalls} Pending
              </span>
            </div>

            {/* Verified badge */}
            {trackRecord.hitRate >= 60 && (
              <div className="flex justify-center mt-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-green-500/15 text-green-500 border border-green-500/25">
                  <CheckCircle className="size-3" aria-hidden="true" />
                  {tp('verifiedAnalyst')}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-white/50 mb-3">{tp('trackRecordProgress')}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
                  style={{ width: `${((trackRecord?.totalCalls ?? 0) / 5) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-white/40 font-mono tabular-nums flex-shrink-0">
                {trackRecord?.totalCalls ?? 0}/5
              </span>
            </div>
            <p className="text-[11px] text-white/40 mt-2">
              {tp('trackRecordRemaining', { remaining: 5 - (trackRecord?.totalCalls ?? 0) })}
            </p>
          </>
        )}
      </Card>

      {/* 3. Research Posts */}
      {researchSlice.length > 0 && (
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black">{tp('researchPosts')}</h3>
            {myResearch.length > 5 && (
              <Link href="/community" className="text-[11px] text-white/40 hover:text-white/60 transition-colors">
                {tp('allResearch')}
              </Link>
            )}
          </div>
          <div className="space-y-1">
            {researchSlice.map(post => (
              <Link key={post.id} href={`/community?post=${post.id}`}>
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                  {/* Call direction */}
                  <div className="flex-shrink-0 w-5 text-center">
                    <CallIcon call={post.call} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {post.player_name && (
                        <span className="text-[11px] font-bold text-white/70">{post.player_name}</span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-white/5 text-white/40 border border-white/[0.06]">
                        {post.horizon}
                      </span>
                    </div>
                    <div className="text-sm text-white/60 truncate">{post.title}</div>
                  </div>

                  {/* Rating + unlocks + earnings */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {post.ratings_count > 0 && <RatingStars rating={post.avg_rating} />}
                    <span className="text-[11px] text-white/30 font-mono tabular-nums">
                      {post.unlock_count}x
                    </span>
                    {isSelf && post.total_earned > 0 && (
                      <span className="text-[11px] text-green-500 font-mono font-bold tabular-nums">
                        +{formatScout(post.total_earned)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Prediction Stats */}
      <PredictionStatsCard userId={userId} />

      {/* 5. Content Earnings Breakdown (self only) */}
      {contentEarnings && (
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black">{tp('contentEarnings')}</h3>
            <span className="text-sm font-mono font-bold text-green-500">
              +{formatScout(contentEarnings.total)} bCredits
            </span>
          </div>
          <div className="space-y-2">
            {CONTENT_EARNING_TYPES.map(et => {
              const amount = contentEarnings.byType.get(et.type) ?? 0;
              if (amount === 0) return null;
              const ratio = contentEarnings.maxAmount > 0 ? (amount / contentEarnings.maxAmount) * 100 : 0;
              return (
                <div key={et.type} className="flex items-center gap-3">
                  <span className="text-[11px] text-white/50 w-20 flex-shrink-0">{tp(et.labelKey)}</span>
                  <div className="flex-1 h-4 rounded bg-white/[0.03] overflow-hidden">
                    <div
                      className="h-full rounded bg-gold/30 transition-[width] duration-500"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-white/60 font-mono font-bold tabular-nums w-20 text-right flex-shrink-0">
                    +{formatScout(amount)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
            <span className="text-[11px] text-white/40 font-bold">Total</span>
            <span className="text-sm font-mono font-bold text-green-500">
              +{formatScout(contentEarnings.total)} bCredits
            </span>
          </div>
        </Card>
      )}

      {/* 6. Bounty Summary (self only) */}
      {isSelf && bountyStats && (
        <Card className="p-4 md:p-6">
          <h3 className="font-black mb-3">{tp('bountyBilanz')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl bg-white/[0.03] text-center">
              <div className="text-[15px] font-bold font-mono tabular-nums text-white/90">
                {bountyStats.count}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">{tp('approvedLabel')}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] text-center">
              <div className="text-[15px] font-bold font-mono tabular-nums text-green-500">
                +{formatScout(bountyStats.total)}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">bCredits</div>
            </div>
          </div>
        </Card>
      )}

      {/* 7. Expert Badges */}
      {userStats && <ExpertBadgesCard userStats={userStats} tp={tp} tg={tg} />}
    </div>
  );
}

// ============================================
// EXPERT BADGES CARD (extracted for reuse in empty state)
// ============================================

function ExpertBadgesCard({
  userStats,
  tp,
  tg,
}: {
  userStats: DbUserStats;
  tp: ReturnType<typeof useTranslations>;
  tg: ReturnType<typeof useTranslations>;
}) {
  const badges = getExpertBadges(userStats);
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black">{tp('expertBadges')}</h3>
        <span className="text-[11px] text-white/40">
          {tp('badgesUnlocked', { count: earnedCount, total: badges.length })}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {badges.map(badge => {
          const IconComp = BADGE_ICONS[badge.icon] ?? Award;
          return (
            <div
              key={badge.key}
              className={cn(
                'relative flex items-center gap-3 p-3 rounded-xl border transition-colors',
                badge.earned
                  ? `${badge.bgColor} border`
                  : 'bg-white/[0.02] border-white/[0.06] opacity-50'
              )}
            >
              <div className={cn(
                'size-8 rounded-lg flex items-center justify-center flex-shrink-0',
                badge.earned ? badge.bgColor : 'bg-white/5'
              )}>
                {badge.earned
                  ? <IconComp className={cn('size-4', badge.color)} aria-hidden="true" />
                  : <Lock className="size-3.5 text-white/20" aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn('text-[11px] font-bold', badge.earned ? badge.color : 'text-white/30')}>
                  {tg(`badge.${badge.key}`)}
                </div>
                {!badge.earned && (
                  <div className="mt-1">
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white/20 transition-colors"
                        style={{ width: `${badge.progress}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-white/20 mt-0.5">{badge.progress}%</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
