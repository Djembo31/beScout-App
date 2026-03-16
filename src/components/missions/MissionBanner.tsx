'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Target, Calendar, Check, ChevronDown, Gift, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, fmtScout } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { getUserMissions, claimMissionReward } from '@/lib/services/missions';
import { centsToBsd } from '@/lib/services/players';
import type { UserMissionWithDef, MissionType } from '@/types';

function getTimeUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const ms = midnight.getTime() - now.getTime();
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

function getDaysUntilEnd(endStr: string): number {
  const ms = new Date(endStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export default function MissionBanner() {
  const { user } = useUser();
  const { setBalanceCents } = useWallet();
  const tm = useTranslations('missions');
  const [missions, setMissions] = useState<UserMissionWithDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;

    (async () => {
      try {
        const data = await getUserMissions(uid);
        if (!cancelled) setMissions(data);
      } catch {
        // Silent — missions are not critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const handleClaim = useCallback(async (missionId: string) => {
    if (!user || claiming) return;
    setClaiming(missionId);
    try {
      const result = await claimMissionReward(user.id, missionId);
      if (result.success) {
        // Update missions locally
        setMissions(prev => prev.map(m =>
          m.id === missionId ? { ...m, status: 'claimed', claimed_at: new Date().toISOString() } : m
        ));
        if (result.new_balance != null) setBalanceCents(result.new_balance);
      }
    } catch {
      // Silent
    } finally {
      setClaiming(null);
    }
  }, [user, claiming, setBalanceCents]);

  // Total unclaimed rewards — must be before early return (hooks rules)
  const unclaimedReward = useMemo(() => {
    return missions
      .filter(m => m.status === 'active' || m.status === 'completed')
      .reduce((sum, m) => sum + Number(m.reward_cents), 0);
  }, [missions]);

  if (loading || missions.length === 0) return null;

  const dailyMissions = missions.filter(m => m.definition.type === 'daily');
  const weeklyMissions = missions.filter(m => m.definition.type === 'weekly');

  const dailyCompleted = dailyMissions.filter(m => m.status === 'completed' || m.status === 'claimed').length;
  const weeklyCompleted = weeklyMissions.filter(m => m.status === 'completed' || m.status === 'claimed').length;

  // Check if any mission has been claimed (then allow collapse)
  const hasClaimed = missions.some(m => m.status === 'claimed');

  // Urgency text
  const dailyUnclaimed = dailyMissions.filter(m => m.status === 'active' || m.status === 'completed');
  const weeklyPeriodEnd = weeklyMissions[0]?.period_end;

  return (
    <div className="bg-gold/[0.04] border border-gold/15 rounded-2xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center">
            <Target className="size-5 text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm">{tm('title')}</span>
              {unclaimedReward > 0 && (
                <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">
                  +{fmtScout(centsToBsd(unclaimedReward))} CR
                </span>
              )}
            </div>
            <div className="text-[10px] text-white/40 flex items-center gap-1.5">
              <span>{dailyCompleted}/{dailyMissions.length} {tm('dailyShort')} · {weeklyCompleted}/{weeklyMissions.length} {tm('weeklyShort')}</span>
              {dailyUnclaimed.length > 0 && (
                <span className="flex items-center gap-0.5 text-gold/60">
                  <Clock className="size-2.5" />
                  {getTimeUntilMidnight()}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown className={cn('size-4 text-white/30 transition-transform', expanded && 'rotate-180')} />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Daily Missions */}
          {dailyMissions.length > 0 && (
            <MissionSection
              type="daily"
              missions={dailyMissions}
              completedCount={dailyCompleted}
              claiming={claiming}
              onClaim={handleClaim}
              tm={tm}
            />
          )}

          {/* Weekly Missions */}
          {weeklyMissions.length > 0 && (
            <MissionSection
              type="weekly"
              missions={weeklyMissions}
              completedCount={weeklyCompleted}
              claiming={claiming}
              onClaim={handleClaim}
              tm={tm}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MissionSection({ type, missions, completedCount, claiming, onClaim, tm }: {
  type: MissionType;
  missions: UserMissionWithDef[];
  completedCount: number;
  claiming: string | null;
  onClaim: (id: string) => void;
  tm: ReturnType<typeof useTranslations>;
}) {
  const isDaily = type === 'daily';
  const periodEnd = missions[0]?.period_end;
  const remaining = missions.length - completedCount;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isDaily ? (
            <Target className="size-3.5 text-gold" />
          ) : (
            <Calendar className="size-3.5 text-purple-400" />
          )}
          <span className={cn('text-[10px] font-black uppercase', isDaily ? 'text-gold' : 'text-purple-400')}>
            {isDaily ? tm('dailyMissions') : tm('weeklyMissions')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {remaining > 0 && !isDaily && periodEnd && (
            <span className="text-[10px] text-purple-400/60 flex items-center gap-0.5">
              <Clock className="size-2.5" />
              {getDaysUntilEnd(periodEnd)}d
            </span>
          )}
          <span className="text-[10px] text-white/40">
            {completedCount === missions.length ? tm('allDone') : tm('openCount', { count: remaining })}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {missions.map(m => {
          const pct = Math.min(100, (m.progress / m.target_value) * 100);
          const isClaimed = m.status === 'claimed';
          const isCompleted = m.status === 'completed';
          const rewardBsd = fmtScout(centsToBsd(Number(m.reward_cents)));

          return (
            <div
              key={m.id}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-xl transition-colors',
                isClaimed ? 'bg-surface-minimal opacity-60' : 'bg-surface-subtle'
              )}
            >
              {/* Progress bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    'text-xs font-medium truncate',
                    isClaimed && 'line-through text-white/40'
                  )}>
                    {m.definition.title}
                  </span>
                  <span className="text-[10px] font-mono text-white/40 shrink-0 ml-2">
                    {m.progress}/{m.target_value}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-colors',
                      isClaimed ? 'bg-green-500/50' : isCompleted ? 'bg-gold' : 'bg-gold/60'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Reward / Claim button */}
              <div className="shrink-0">
                {isClaimed ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <Check className="size-3.5" />
                    <span className="text-[10px] font-bold">{rewardBsd}</span>
                  </div>
                ) : isCompleted ? (
                  <button
                    onClick={() => onClaim(m.id)}
                    disabled={claiming === m.id}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gold text-black text-[10px] font-black rounded-full hover:bg-gold/90 transition-colors disabled:opacity-50"
                  >
                    <Gift className="size-3" />
                    {claiming === m.id ? '...' : `+${rewardBsd}`}
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-gold/60">+{rewardBsd}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
