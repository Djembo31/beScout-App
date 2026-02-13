'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Target, Calendar, Check, ChevronDown, Gift, Clock } from 'lucide-react';
import { cn, fmtBSD } from '@/lib/utils';
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
  const [missions, setMissions] = useState<UserMissionWithDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

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
    <div className="bg-gradient-to-r from-[#FFD700]/[0.06] to-purple-500/[0.04] border border-[#FFD700]/15 rounded-2xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => hasClaimed ? setExpanded(!expanded) : undefined}
        className={cn('w-full flex items-center justify-between p-4 text-left', !hasClaimed && 'cursor-default')}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFD700]/15 border border-[#FFD700]/25 flex items-center justify-center">
            <Target className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm">Missionen</span>
              {unclaimedReward > 0 && (
                <span className="text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded-full">
                  +{fmtBSD(centsToBsd(unclaimedReward))} BSD
                </span>
              )}
            </div>
            <div className="text-[10px] text-white/40 flex items-center gap-1.5">
              <span>{dailyCompleted}/{dailyMissions.length} Tages · {weeklyCompleted}/{weeklyMissions.length} Wochen</span>
              {dailyUnclaimed.length > 0 && (
                <span className="flex items-center gap-0.5 text-[#FFD700]/60">
                  <Clock className="w-2.5 h-2.5" />
                  {getTimeUntilMidnight()}
                </span>
              )}
            </div>
          </div>
        </div>
        {hasClaimed && (
          <ChevronDown className={cn('w-4 h-4 text-white/30 transition-transform', expanded && 'rotate-180')} />
        )}
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
            />
          )}
        </div>
      )}
    </div>
  );
}

function MissionSection({ type, missions, completedCount, claiming, onClaim }: {
  type: MissionType;
  missions: UserMissionWithDef[];
  completedCount: number;
  claiming: string | null;
  onClaim: (id: string) => void;
}) {
  const isDaily = type === 'daily';
  const periodEnd = missions[0]?.period_end;
  const remaining = missions.length - completedCount;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isDaily ? (
            <Target className="w-3.5 h-3.5 text-[#FFD700]" />
          ) : (
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
          )}
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: isDaily ? '#FFD700' : '#c084fc' }}>
            {isDaily ? 'Tages-Missionen' : 'Wochen-Missionen'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {remaining > 0 && !isDaily && periodEnd && (
            <span className="text-[10px] text-purple-400/60 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {getDaysUntilEnd(periodEnd)}d
            </span>
          )}
          <span className="text-[10px] text-white/40">
            {completedCount === missions.length ? 'Alle erledigt!' : `${remaining} offen`}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {missions.map(m => {
          const pct = Math.min(100, (m.progress / m.target_value) * 100);
          const isClaimed = m.status === 'claimed';
          const isCompleted = m.status === 'completed';
          const rewardBsd = fmtBSD(centsToBsd(Number(m.reward_cents)));

          return (
            <div
              key={m.id}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-xl transition-all',
                isClaimed ? 'bg-white/[0.02] opacity-60' : 'bg-white/[0.03]'
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
                      'h-full rounded-full transition-all',
                      isClaimed ? 'bg-[#22C55E]/50' : isCompleted ? 'bg-[#FFD700]' : 'bg-[#FFD700]/60'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Reward / Claim button */}
              <div className="shrink-0">
                {isClaimed ? (
                  <div className="flex items-center gap-1 text-[#22C55E]">
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">{rewardBsd}</span>
                  </div>
                ) : isCompleted ? (
                  <button
                    onClick={() => onClaim(m.id)}
                    disabled={claiming === m.id}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#FFD700] text-black text-[10px] font-black rounded-full hover:bg-[#FFD700]/90 transition-all disabled:opacity-50"
                  >
                    <Gift className="w-3 h-3" />
                    {claiming === m.id ? '...' : `+${rewardBsd}`}
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-[#FFD700]/60">+{rewardBsd}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
