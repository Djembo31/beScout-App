import { useState, useMemo, useEffect, useCallback } from 'react';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { centsToBsd } from '@/lib/services/players';
import { logSupabaseError } from '@/lib/supabaseErrors';
import {
  usePlayers,
  useHoldings,
  useEvents,
  useUserStats,
  useTrendingPlayers,
  qk,
} from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';
import { useChallengeHistory } from '@/lib/queries/dailyChallenge';
import { useUserTickets } from '@/lib/queries/tickets';
import { openMysteryBox } from '@/lib/services/mysteryBox';
import { getPlayerPriceChanges7d } from '@/lib/services/players';
import { useHighestPass } from '@/lib/queries/foundingPasses';
import { getRetentionContext } from '@/lib/retentionEngine';
import { getStreakBenefits } from '@/lib/streakBenefits';
import { updateLoginStreak, STREAK_KEY, getStoryMessage } from '@/components/home/helpers';
import { useTranslations } from 'next-intl';
import type { DpcHolding, Pos } from '@/types';

export function useHomeData() {
  const { user, profile, loading } = useUser();
  const { addToast } = useToast();
  const { followedClubs } = useClub();
  const name = profile?.display_name || displayName(user);
  const firstName = name.split(' ')[0];
  const uid = user?.id;

  // ── UI State ──
  const [streak, setStreak] = useState(0);
  const [shieldsRemaining, setShieldsRemaining] = useState<number | null>(null);
  const [belowFoldReady, setBelowFoldReady] = useState(false);
  const [showMysteryBox, setShowMysteryBox] = useState(false);

  // ── Deferred Loading ──
  useEffect(() => {
    const timer = setTimeout(() => setBelowFoldReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // ── Streak Benefits ──
  const streakBenefits = useMemo(() => getStreakBenefits(streak), [streak]);

  // ── React Query ──
  const { data: players = [], isLoading: playersLoading, isError: playersError } = usePlayers();
  const { data: rawHoldings = [] } = useHoldings(uid);
  const { data: events = [] } = useEvents();
  const { data: userStats = null } = useUserStats(uid);
  const { data: trendingPlayers = [] } = useTrendingPlayers(5);

  // ── Gamification v5 Hooks ──
  const { data: challengeHistory = [] } = useChallengeHistory(uid, belowFoldReady);
  const { data: ticketData = null } = useUserTickets(uid, belowFoldReady);
  const { data: highestPass } = useHighestPass(uid, belowFoldReady);

  // ── Holdings Transform ──
  const holdings = useMemo<DpcHolding[]>(() =>
    rawHoldings.filter((h) => h.player != null).map((h) => ({
      id: h.id,
      playerId: h.player_id,
      player: `${h.player.first_name} ${h.player.last_name}`,
      club: h.player.club,
      pos: h.player.position as Pos,
      qty: h.quantity,
      avgBuy: centsToBsd(h.avg_buy_price),
      floor: centsToBsd(h.player.floor_price),
      change24h: Number(h.player.price_change_24h),
      listedByUser: 0,
      ticket: h.player.shirt_number ?? 0,
      age: h.player.age ?? 0,
      perfL5: h.player.perf_l5 ?? 0,
      matches: h.player.matches ?? 0,
      goals: h.player.goals ?? 0,
      assists: h.player.assists ?? 0,
      imageUrl: h.player.image_url ?? null,
    })),
    [rawHoldings]
  );

  // ── Login Streak + Mission Tracking ──
  const tg = useTranslations('gamification');
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    setStreak(updateLoginStreak());

    import('@/lib/services/streaks').then(({ recordLoginStreak }) => {
      recordLoginStreak(userId).then(result => {
        if (cancelled) return;
        setStreak(result.streak);
        setShieldsRemaining(result.shields_remaining);
        localStorage.setItem(STREAK_KEY, JSON.stringify({ current: result.streak, lastDate: new Date().toISOString().slice(0, 10) }));
        if (result.daily_tickets) {
          addToast(`+${result.daily_tickets} Tickets`, 'info');
        }
        if (result.milestone_reward > 0 && result.milestone_label) {
          addToast(result.milestone_label, 'success');
        }
        if (result.shield_used) {
          addToast(tg('streak.shieldUsed') + ` ${tg('streak.shieldsRemaining', { count: result.shields_remaining })}`, 'success');
        }
      }).catch(err => logSupabaseError('[Home] Login streak record failed', err));
    }).catch(err => console.error('[Home] Streaks module load failed:', err));

    return () => { cancelled = true; };
  }, [user]);

  // ── Derived Data ──
  const portfolioValue = useMemo(() => holdings.reduce((s, h) => s + h.qty * h.floor, 0), [holdings]);
  const portfolioCost = useMemo(() => holdings.reduce((s, h) => s + h.qty * h.avgBuy, 0), [holdings]);
  const pnl = portfolioValue - portfolioCost;
  const pnlPct = portfolioCost > 0 ? (pnl / portfolioCost) * 100 : 0;

  const activeIPOs = useMemo(() => players.filter((p) => p.ipo.status === 'open' || p.ipo.status === 'early_access'), [players]);

  const nextEvent = useMemo(() => {
    const active = events.filter(e => e.status === 'registering' || e.status === 'late-reg' || e.status === 'running');
    active.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    return active[0] ?? null;
  }, [events]);

  const storyMessage = useMemo(
    () => getStoryMessage(holdings, pnl, pnlPct, activeIPOs, nextEvent),
    [holdings, pnl, pnlPct, activeIPOs, nextEvent]
  );

  const retention = useMemo(() => {
    if (!profile?.created_at) return null;
    return getRetentionContext({
      createdAt: profile.created_at,
      streakDays: streak,
      userStats,
      holdingsCount: holdings.length,
      eventsJoined: userStats?.events_count ?? 0,
      challengesCompleted: challengeHistory.length,
      postsCount: userStats?.votes_cast ?? 0,
      followedClubs: followedClubs.length,
    });
  }, [profile?.created_at, streak, userStats, holdings.length, challengeHistory.length, followedClubs.length]);

  const spotlightType = useMemo(() => {
    if (activeIPOs.length > 0) return 'ipo' as const;
    if (nextEvent) return 'event' as const;
    if (holdings.length > 0 && holdings.some(h => h.change24h !== 0)) return 'topMover' as const;
    if (trendingPlayers.length > 0) return 'trending' as const;
    return 'cta' as const;
  }, [activeIPOs, nextEvent, holdings, trendingPlayers]);

  const trendingWithPlayers = useMemo(() => {
    return trendingPlayers
      .map(tp => ({ tp, player: players.find(p => p.id === tp.playerId) }))
      .filter((item): item is { tp: typeof trendingPlayers[0]; player: NonNullable<typeof item.player> } => !!item.player)
      .slice(0, 5);
  }, [trendingPlayers, players]);

  // Top Movers: 7d price changes for user's holdings (RPC-backed)
  const [topMovers, setTopMovers] = useState<{ playerId: string; player: string; club: string; change24h: number }[]>([]);
  useEffect(() => {
    if (holdings.length < 2) { setTopMovers([]); return; }
    const playerIds = holdings.map(h => h.playerId);
    let cancelled = false;
    getPlayerPriceChanges7d(playerIds, 3).then(changes => {
      if (cancelled) return;
      setTopMovers(changes.map(c => {
        const h = holdings.find(h => h.playerId === c.player_id);
        return {
          playerId: c.player_id,
          player: h?.player ?? '',
          club: h?.club ?? '',
          change24h: Number(c.change_pct),
        };
      }));
    }).catch(err => logSupabaseError('[Home] 7d price changes failed', err));
    return () => { cancelled = true; };
  }, [holdings]);

  const hasGlobalMovers = useMemo(() => {
    return players.some(p => p.prices.change24h !== 0 && !p.isLiquidated);
  }, [players]);

  const showQuickActions = !!uid;
  const isEventLive = nextEvent?.status === 'running';

  // ── Actions ──
  const handleOpenMysteryBox = useCallback(async (free?: boolean) => {
    if (!uid) return null;
    const result = await openMysteryBox(free);
    if (result.ok) {
      // Always invalidate tickets
      queryClient.invalidateQueries({ queryKey: qk.tickets.balance(uid) });
      // Conditional invalidation based on reward type
      if (result.rewardType === 'cosmetic') {
        queryClient.invalidateQueries({ queryKey: qk.cosmetics.user(uid) });
      }
      if (result.rewardType === 'equipment') {
        queryClient.invalidateQueries({ queryKey: qk.equipment.inventory(uid) });
      }
      if (result.rewardType === 'bcredits') {
        queryClient.invalidateQueries({ queryKey: qk.wallet.all });
      }
      const effectiveCost = free ? 0 : Math.max(1, 15 - (streakBenefits.mysteryBoxTicketDiscount ?? 0));
      if (free) {
        // Daily cadence — mark today as claimed so the gate closes until tomorrow.
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem('bescout-free-box-day', today);
      }
      return {
        id: crypto.randomUUID(),
        rarity: result.rarity!,
        reward_type: result.rewardType!,
        tickets_amount: result.ticketsAmount ?? null,
        cosmetic_id: result.cosmeticKey ?? null,
        equipment_type: result.equipmentType ?? null,
        equipment_rank: result.equipmentRank ?? null,
        bcredits_amount: result.bcreditsAmount ?? null,
        ticket_cost: effectiveCost,
        opened_at: new Date().toISOString(),
        // Pass-through for display (not persisted in MysteryBoxResult type)
        equipment_name_de: result.equipmentNameDe,
        equipment_name_tr: result.equipmentNameTr,
        equipment_position: result.equipmentPosition,
      } as import('@/types').MysteryBoxResult & {
        equipment_name_de?: string;
        equipment_name_tr?: string;
        equipment_position?: string;
      };
    }
    return null;
  }, [uid, streakBenefits.mysteryBoxTicketDiscount]);

  return {
    // Auth
    user, uid, profile, loading, firstName,
    // Streak
    streak, shieldsRemaining, streakBenefits,
    // Market data
    players, playersLoading, playersError,
    holdings, activeIPOs, trendingPlayers, trendingWithPlayers,
    topMovers, hasGlobalMovers,
    // Portfolio
    portfolioValue, portfolioCost, pnl, pnlPct,
    // Events
    events, nextEvent, isEventLive,
    // Gamification
    userStats,
    challengeHistory, ticketData, highestPass,
    showMysteryBox, setShowMysteryBox,
    handleOpenMysteryBox,
    // Derived
    storyMessage, spotlightType, retention, showQuickActions,
    belowFoldReady, followedClubs,
  };
}
