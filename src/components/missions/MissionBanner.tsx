'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Target, Calendar, Check, ChevronDown, Gift, Clock, Shield, Loader2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, fmtScout } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { getUserMissions, claimMissionReward } from '@/lib/services/missions';
import { centsToBsd } from '@/lib/services/players';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
// Direct import from keys (NOT '@/lib/queries' barrel) to keep the test setup
// from pulling the whole supabase-coupled query graph (MissionBanner.test.tsx).
import { qk } from '@/lib/queries/keys';
import { queryClient } from '@/lib/queryClient';
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
  const { followedClubs } = useClub();
  const tm = useTranslations('missions');
  const te = useTranslations('errors');
  const [missions, setMissions] = useState<UserMissionWithDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null); // FIX-17 (J7F-14)
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null); // FIX-03 (J7F-06)
  const [expanded, setExpanded] = useState(false);

  const clubNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of followedClubs) m.set(c.id, c.name);
    return m;
  }, [followedClubs]);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;

    (async () => {
      try {
        const data = await getUserMissions(uid);
        if (!cancelled) {
          setMissions(data);
          setLoadError(null);
        }
      } catch (err) {
        // FIX-17 (J7F-14): error is now visible instead of silent. Service throws
        // an i18n key (mapErrorToKey result) — resolve via te('errors.<key>').
        if (!cancelled) {
          const key = mapErrorToKey(normalizeError(err));
          setLoadError(te(key));
          console.error('[MissionBanner] getUserMissions failed:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, te]);

  const handleClaim = useCallback(async (missionId: string) => {
    if (!user || claiming) return;
    setClaimError(null);
    setClaiming(missionId);
    try {
      const result = await claimMissionReward(user.id, missionId);
      if (result.success) {
        setMissions(prev => prev.map(m =>
          m.id === missionId ? { ...m, status: 'claimed', claimed_at: new Date().toISOString() } : m
        ));
        if (result.new_balance != null) setBalanceCents(result.new_balance);
        // FIX-05 (J7F-07): tickets badge in TopBar was stale until reload because
        // creditTickets is fire-and-forget (~1-2s lag) and React Query never
        // knew about the change. Invalidate after a short delay so the credit
        // RPC has time to commit.
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: qk.tickets.balance(user.id) });
          queryClient.invalidateQueries({ queryKey: qk.wallet.all });
          queryClient.invalidateQueries({ queryKey: qk.notifications.unread(user.id) });
        }, 1500);
      } else if (result.error) {
        // FIX-03 (J7F-06): service returns i18n KEY in `result.error`.
        setClaimError(te(result.error));
      }
    } catch (err) {
      // FIX-03 (J7F-06): unexpected throw still surfaces something.
      const key = mapErrorToKey(normalizeError(err));
      setClaimError(te(key));
      console.error('[MissionBanner] claim failed:', err);
    } finally {
      setClaiming(null);
    }
  }, [user, claiming, setBalanceCents, te]);

  // Total unclaimed rewards — must be before early return (hooks rules)
  const unclaimedReward = useMemo(() => {
    return missions
      .filter(m => m.status === 'active' || m.status === 'completed')
      .reduce((sum, m) => sum + Number(m.reward_cents), 0);
  }, [missions]);

  // Group: global vs club missions
  const { globalMissions, clubGroups } = useMemo(() => {
    const global: UserMissionWithDef[] = [];
    const byClub = new Map<string, UserMissionWithDef[]>();

    for (const m of missions) {
      const cid = m.definition.club_id;
      if (!cid) {
        global.push(m);
      } else {
        const arr = byClub.get(cid) ?? [];
        arr.push(m);
        byClub.set(cid, arr);
      }
    }

    return {
      globalMissions: global,
      clubGroups: Array.from(byClub.entries()).map(([clubId, items]) => ({
        clubId,
        clubName: clubNameMap.get(clubId) ?? 'Club',
        missions: items,
      })),
    };
  }, [missions, clubNameMap]);

  // FIX-13 + FIX-17 (J7F-14): proper Loading / Error / Empty / Content states.
  if (loading) {
    return (
      <div className="bg-surface-minimal border border-white/[0.06] rounded-2xl p-4 animate-pulse motion-reduce:animate-none">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-white/[0.04]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-white/[0.04]" />
            <div className="h-2 w-40 rounded bg-white/[0.04]" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3"
      >
        <AlertCircle className="size-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-red-300">{tm('title')}</div>
          <div className="text-xs text-red-300/70 mt-0.5">{loadError}</div>
        </div>
      </div>
    );
  }

  if (missions.length === 0) {
    // FIX-13 (J7F-14): empty state with helpful CTA instead of `return null`.
    return (
      <div className="bg-gold/[0.04] border border-gold/15 rounded-2xl p-4 flex items-start gap-3">
        <div className="size-9 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center flex-shrink-0">
          <Target className="size-5 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{tm('title')}</div>
          <div className="text-xs text-white/50 mt-0.5">{tm('noMissions')}</div>
        </div>
      </div>
    );
  }

  const dailyMissions = globalMissions.filter(m => m.definition.type === 'daily');
  const weeklyMissions = globalMissions.filter(m => m.definition.type === 'weekly');

  const totalCompleted = missions.filter(m => m.status === 'completed' || m.status === 'claimed').length;
  const dailyUnclaimed = dailyMissions.filter(m => m.status === 'active' || m.status === 'completed');
  const allDone = totalCompleted === missions.length;

  return (
    <div className="bg-gold/[0.04] border border-gold/15 rounded-2xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center">
            <Target className="size-5 text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm">{tm('title')}</span>
              {unclaimedReward > 0 && (
                // FIX-10 (J7F-09): "CR" abbreviation removed in favour of "Credits" wording
                // consistent with i18n. The "+" sign + tabular-nums keep the badge compact.
                <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded-full font-mono tabular-nums">
                  +{fmtScout(centsToBsd(unclaimedReward))}
                </span>
              )}
            </div>
            {/* FIX-11 (J7F-12): refactored hack-code conditional → clean conditional render */}
            <div className="text-[10px] text-white/40 flex items-center gap-1.5">
              <span>
                {totalCompleted}/{missions.length}{' '}
                {allDone ? tm('allDone') : tm('openCount', { count: missions.length - totalCompleted })}
              </span>
              {dailyUnclaimed.length > 0 && (
                <span className="flex items-center gap-0.5 text-gold/60">
                  <Clock className="size-2.5" aria-hidden="true" />
                  {getTimeUntilMidnight()}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown className={cn('size-4 text-white/30 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
      </button>

      {/* FIX-03 (J7F-06): claim error visible to user */}
      {claimError && (
        <div role="alert" className="mx-4 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertCircle className="size-4 text-red-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs text-red-300">{claimError}</span>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Global Daily Missions */}
          {dailyMissions.length > 0 && (
            <MissionSection
              type="daily"
              missions={dailyMissions}
              completedCount={dailyMissions.filter(m => m.status === 'completed' || m.status === 'claimed').length}
              claiming={claiming}
              onClaim={handleClaim}
              tm={tm}
            />
          )}

          {/* Global Weekly Missions */}
          {weeklyMissions.length > 0 && (
            <MissionSection
              type="weekly"
              missions={weeklyMissions}
              completedCount={weeklyMissions.filter(m => m.status === 'completed' || m.status === 'claimed').length}
              claiming={claiming}
              onClaim={handleClaim}
              tm={tm}
            />
          )}

          {/* Club-specific Missions */}
          {clubGroups.map(({ clubId, clubName, missions: clubMissions }) => (
            <div key={clubId}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="size-3.5 text-amber-400" />
                <span className="text-[10px] font-black uppercase text-amber-400">
                  {clubName}
                </span>
              </div>
              <div className="space-y-2">
                {clubMissions.map(m => (
                  <MissionRow key={m.id} mission={m} claiming={claiming} onClaim={handleClaim} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MissionRow({ mission: m, claiming, onClaim }: {
  mission: UserMissionWithDef;
  claiming: string | null;
  onClaim: (id: string) => void;
}) {
  const pct = Math.min(100, (m.progress / m.target_value) * 100);
  const isClaimed = m.status === 'claimed';
  const isCompleted = m.status === 'completed';
  const rewardBsd = fmtScout(centsToBsd(Number(m.reward_cents)));
  const isClaimingThis = claiming === m.id;
  // Disable while ANY claim is in-flight — prevents double-click-while-other-claim-pending.
  const disabled = claiming !== null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2.5 rounded-xl transition-colors',
        isClaimed ? 'bg-surface-minimal opacity-60' : 'bg-surface-subtle'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            'text-xs font-medium truncate',
            isClaimed && 'line-through text-white/40'
          )}>
            {m.definition.title}
          </span>
          <span className="text-[10px] font-mono tabular-nums text-white/40 shrink-0 ml-2">
            {m.progress}/{m.target_value}
          </span>
        </div>
        <div className="w-full h-1.5 bg-surface-base rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-colors',
              isClaimed ? 'bg-green-500/50' : isCompleted ? 'bg-gold' : 'bg-gold/60'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="shrink-0">
        {isClaimed ? (
          <div className="flex items-center gap-1 text-green-500">
            <Check className="size-3.5" aria-hidden="true" />
            <span className="text-[10px] font-bold font-mono tabular-nums">{rewardBsd}</span>
          </div>
        ) : isCompleted ? (
          <button
            onClick={() => onClaim(m.id)}
            disabled={disabled}
            aria-busy={isClaimingThis}
            className="flex items-center gap-1 min-h-[28px] min-w-[60px] px-2.5 py-1 bg-gold text-black text-[10px] font-black rounded-full hover:bg-gold/90 active:scale-[0.97] transition-colors disabled:opacity-50 disabled:cursor-wait justify-center"
          >
            {/* FIX-04 (J7F-04): Loader2 spinner instead of "..." for proper feedback on slow 4G */}
            {isClaimingThis ? (
              <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <>
                <Gift className="size-3" aria-hidden="true" />
                <span className="font-mono tabular-nums">+{rewardBsd}</span>
              </>
            )}
          </button>
        ) : (
          <span className="text-[10px] font-mono tabular-nums text-gold/60">+{rewardBsd}</span>
        )}
      </div>
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
        {missions.map(m => (
          <MissionRow key={m.id} mission={m} claiming={claiming} onClaim={onClaim} />
        ))}
      </div>
    </div>
  );
}
