'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';
import { useTranslations } from 'next-intl';
import ScoreProgress from '@/components/profile/ScoreProgress';
import { Button } from '@/components/ui';
import type { DbUserStats, UserFantasyResult } from '@/types';

// ============================================
// MANAGER TAB — Fantasy performance overview
// ============================================

interface ManagerTabProps {
  userId: string;
  userStats: DbUserStats | null;
  fantasyResults: UserFantasyResult[];
  isSelf: boolean;
}

const MEDAL: Record<number, string> = { 1: '\u{1F947}', 2: '\u{1F948}', 3: '\u{1F949}' };

export default function ManagerTab({ userId: _userId, userStats, fantasyResults, isSelf }: ManagerTabProps) {
  const t = useTranslations('profile');

  const stats = useMemo(() => {
    if (fantasyResults.length === 0) return null;

    const ranks = fantasyResults.map(r => r.rank);
    const bestRank = Math.min(...ranks);
    const avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    const totalEarned = fantasyResults.reduce((a, r) => a + r.rewardAmount, 0);

    let gold = 0;
    let silver = 0;
    let bronze = 0;
    for (const r of fantasyResults) {
      if (r.rank === 1) gold++;
      else if (r.rank === 2) silver++;
      else if (r.rank === 3) bronze++;
    }

    return { bestRank, avgRank, totalEarned, gold, silver, bronze };
  }, [fantasyResults]);

  // Empty state
  if (fantasyResults.length === 0) {
    return (
      <div className="space-y-4">
        <ScoreProgress dimension="manager" score={userStats?.manager_score ?? 0} />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Trophy className="size-10 text-white/20 mb-3" />
          <p className="text-[14px] font-bold text-white/60">
            {isSelf ? t('managerEmpty') : t('managerEmptyPublic')}
          </p>
          {isSelf && (
            <>
              <p className="text-[12px] text-white/40 mt-1">{t('managerEmptyDesc')}</p>
              <Link href="/fantasy" className="mt-4">
                <Button variant="outline" size="sm">{t('goToEvents')}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const recent = fantasyResults.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* 1. Score Progress */}
      <ScoreProgress dimension="manager" score={userStats?.manager_score ?? 0} />

      {/* 2. Season Summary Card */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <h3 className="text-[13px] font-bold text-white/60 mb-3">{t('seasonBilanz')}</h3>

        {/* 4-stat grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatCell label={t('eventsPlayed')} value={String(fantasyResults.length)} />
          <StatCell label={t('bestRank')} value={stats ? `#${stats.bestRank}` : '\u2014'} />
          <StatCell label={t('avgRank')} value={stats ? `#${stats.avgRank.toFixed(1)}` : '\u2014'} />
          <StatCell label={t('totalEarned')} value={stats ? `${formatScout(stats.totalEarned)} bC` : '\u2014'} />
        </div>

        {/* Podium medals line */}
        {stats && (stats.gold > 0 || stats.silver > 0 || stats.bronze > 0) && (
          <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
            <span className="text-[11px] text-white/40 font-medium">{t('podiums')}</span>
            <div className="flex items-center gap-3 text-[13px] font-mono tabular-nums">
              <span>{MEDAL[1]}{stats.gold}</span>
              <span>{MEDAL[2]}{stats.silver}</span>
              <span>{MEDAL[3]}{stats.bronze}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Recent Events */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <h3 className="text-[13px] font-bold text-white/60 mb-3">{t('recentEvents')}</h3>
        <div className="space-y-2">
          {recent.map((r) => (
            <div key={r.eventId} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-white/80">
                {MEDAL[r.rank] && <span>{MEDAL[r.rank]}</span>}
                <span>
                  {r.gameweek != null ? `GW ${r.gameweek}` : ''}{r.gameweek != null && r.eventName ? ' \u00B7 ' : ''}{r.eventName}
                </span>
              </div>
              <div className="text-[11px] text-white/40 mt-0.5 font-mono tabular-nums">
                Score: {r.totalScore} &middot; Rank: #{r.rank} &middot; +{formatScout(r.rewardAmount)} bC
              </div>
            </div>
          ))}
        </div>

        {fantasyResults.length > 5 && (
          <button className="w-full text-center text-[12px] text-white/40 hover:text-white/60 mt-3 transition-colors">
            {t('allEvents')}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// STAT CELL — Small label + value block
// ============================================

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-xl bg-white/[0.03] text-center">
      <div className="text-[15px] font-bold font-mono tabular-nums text-white/90">{value}</div>
      <div className="text-[11px] text-white/40 mt-0.5">{label}</div>
    </div>
  );
}
