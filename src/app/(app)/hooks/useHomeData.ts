import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useFollowedClubs } from '@/lib/hooks/useFollowedClubs';
import { useLeagueScope } from '@/features/shared/store/leagueScopeStore';
import { centsToBsd } from '@/lib/services/players';
import {
  usePlayers,
  useEvents,
  useTrendingPlayers,
  useHomeDashboard,
  usePlayerPriceChanges7d,
  qk,
} from '@/lib/queries';
import { useLineupWithPlayers } from '@/features/fantasy/queries/lineups';
import { useWildcardBalance } from '@/features/fantasy/queries/events';
import { useChallengeHistory } from '@/lib/queries/dailyChallenge';
import { useHasFreeBoxToday } from '@/lib/queries/mysteryBox';
import { useLoginStreak } from '@/lib/queries/streaks';
import { openMysteryBox } from '@/lib/services/mysteryBox';
import { newIdempotencyKey } from '@/lib/idempotency';
import { getRetentionContext } from '@/lib/retentionEngine';
import { getStreakBenefits } from '@/lib/streakBenefits';
import { STREAK_KEY, getStoryMessage, pickScopedEvent, pickNextScopedEvent } from '@/components/home/helpers';
import { useTranslations } from 'next-intl';
import type { DbEvent, DpcHolding, Pos } from '@/types';

type HeroMode = 'manager' | 'scout' | 'cta-new';

export function useHomeData() {
  const { user, profile, loading } = useUser();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { data: followedClubs = [] } = useFollowedClubs();
  const { leagueId: scopedLeagueId, hydrated: leagueScopeHydrated } = useLeagueScope();
  const name = profile?.display_name || displayName(user);
  const firstName = name.split(' ')[0];
  const uid = user?.id;

  // ── UI State ──
  // Source-of-truth login streak (Server-Authority via RPC).
  // Replaces legacy `updateLoginStreak()` localStorage-only Pattern.
  const { streak, data: streakData } = useLoginStreak(uid);
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
  const { data: events = [] } = useEvents();
  const { data: trendingPlayers = [] } = useTrendingPlayers(5);

  // Slice 109: 4 per-user queries (holdings + user_stats + tickets + highest_pass)
  // consolidated into a single `get_home_dashboard_v1` RPC. Primes individual
  // query caches so TopBar / SideNav / etc. stay warm without extra roundtrips.
  const { data: dashboard } = useHomeDashboard(uid);
  const rawHoldings = dashboard?.holdings ?? [];
  const userStats = dashboard?.user_stats ?? null;
  const ticketData = dashboard?.tickets ?? null;
  const highestPass = dashboard?.highest_pass ?? null;

  // ── Gamification v5 Hooks ──
  const { data: challengeHistory = [] } = useChallengeHistory(uid, belowFoldReady);
  // Slice 266: isLoading-Guard pflicht (Pre-Review F-04) — Mystery-Box-Slot
  // darf nicht 1 Frame zu früh rendern wenn React-Query noch resolved.
  const { hasFreeBoxToday, isLoading: hasFreeBoxLoading } = useHasFreeBoxToday(uid);

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

  // ── Login Streak Side-Effects (Toasts + localStorage Mirror) ──
  // `useLoginStreak` Hook (oben) ist Source-of-truth fuer den `streak` Wert.
  // Hier nur noch one-shot Side-Effects ausloesen wenn frische Server-Antwort kommt
  // (already_today=false), und localStorage-Mirror fuer Cross-Page Read updaten.
  const tg = useTranslations('gamification');
  useEffect(() => {
    if (!streakData) return;
    setShieldsRemaining(streakData.shields_remaining);
    try {
      localStorage.setItem(
        STREAK_KEY,
        JSON.stringify({ current: streakData.streak, lastDate: new Date().toISOString().slice(0, 10) }),
      );
    } catch (err) { console.error('[Home] localStorage streak mirror failed:', err); }
    if (streakData.already_today) return;  // Side-Effects nur bei erstem Daily-Hit
    if (streakData.daily_tickets) {
      addToast(`+${streakData.daily_tickets} Tickets`, 'info');
    }
    if (streakData.milestone_reward > 0 && streakData.milestone_label) {
      addToast(streakData.milestone_label, 'success');
    }
    if (streakData.shield_used) {
      addToast(tg('streak.shieldUsed') + ` ${tg('streak.shieldsRemaining', { count: streakData.shields_remaining })}`, 'success');
    }
  }, [streakData, addToast, tg]);

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

  // ── Slice 262 (D63 Hero-State-Matrix): scoped active event for heroMode + ManagerBlock ──
  const scopedActiveEvent = useMemo(() => {
    if (!scopedLeagueId || !leagueScopeHydrated) return null;
    return pickScopedEvent(events as DbEvent[], scopedLeagueId);
  }, [events, scopedLeagueId, leagueScopeHydrated]);

  // ── Slice 263 (D63 Phase 1 Abschluss): next upcoming event in scoped league for ScoutHero ManagerPill ──
  const nextScopedEvent = useMemo(() => {
    if (!scopedLeagueId || !leagueScopeHydrated) return null;
    return pickNextScopedEvent(events as DbEvent[], scopedLeagueId);
  }, [events, scopedLeagueId, leagueScopeHydrated]);

  const heroMode: HeroMode = useMemo(() => {
    if (scopedActiveEvent) return 'manager';
    if (holdings.length > 0) return 'scout';
    return 'cta-new';
  }, [scopedActiveEvent, holdings.length]);

  // Lineup status for ManagerBlock (skipped when heroMode !== 'manager')
  const { data: lineupWithPlayers } = useLineupWithPlayers(scopedActiveEvent?.id, uid);

  // Slice 264b — Wildcard balance for ManagerBlock Wildcard-Pill (Optional-Hint)
  const { data: wildcardBalanceData = 0 } = useWildcardBalance(uid, scopedLeagueId ?? undefined);
  const wildcardBalance = wildcardBalanceData ?? 0;

  const hasLineup = Boolean(lineupWithPlayers && (lineupWithPlayers.players?.length ?? 0) > 0);
  const captainSlot = lineupWithPlayers?.lineup?.captain_slot ?? null;
  const captainPlayer = useMemo(() => {
    if (!captainSlot || !lineupWithPlayers?.players) return null;
    return lineupWithPlayers.players.find((p) => p.slotKey === captainSlot) ?? null;
  }, [captainSlot, lineupWithPlayers]);
  // EC-11 defense: if captainSlot set but player not resolved → treat as no-captain
  const hasCaptain = Boolean(captainPlayer);
  const captainName = captainPlayer
    ? `${captainPlayer.player.firstName} ${captainPlayer.player.lastName}`.trim()
    : null;
  const gw = scopedActiveEvent?.gameweek ?? 1;

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

  // Slice 266 (D63 Phase 3) — Multi-Slot Spotlight Engine.
  const isEventLive = nextEvent?.status === 'running';
  // (Re-Order F-fix: isEventLive deklariert VOR spotlightSlots-useMemo, das es konsumiert.)
  //
  // Cascade-Order (höchste prio first):
  //   1. liveScore   wenn isEventLive (running event) — Time-sensitive Live-Pulse
  //   2. mysteryBox  wenn !hasFreeBoxLoading && hasFreeBoxToday  — Daily-Driver-Discovery (D63 Cross-Persona-#1)
  //   3. ipo         wenn activeIPOs.length > 0 — limited-time
  //   4. topMover    wenn holdings have change24h !== 0 — portfolio-Signal
  //   5. trending    wenn trendingPlayers.length > 0 — Discovery
  //
  // Multi-Slot zeigt max 2 Cards (Mobile-393px-above-fold-Constraint, Pre-Review F-09).
  // Tertiary fällt raus.
  type SlotType = 'liveScore' | 'mysteryBox' | 'ipo' | 'topMover' | 'trending';

  const spotlightSlots = useMemo<{ primary: SlotType | null; secondary: SlotType | null }>(() => {
    const active: SlotType[] = [];
    if (isEventLive) active.push('liveScore');
    if (!hasFreeBoxLoading && hasFreeBoxToday) active.push('mysteryBox');
    if (activeIPOs.length > 0) active.push('ipo');
    if (holdings.length > 0 && holdings.some(h => h.change24h !== 0)) active.push('topMover');
    if (trendingPlayers.length > 0) active.push('trending');
    return {
      primary: active[0] ?? null,
      secondary: active[1] ?? null,
    };
  }, [isEventLive, hasFreeBoxLoading, hasFreeBoxToday, activeIPOs, holdings, trendingPlayers]);

  // Legacy `spotlightType` für page.tsx Sidebar-Sektionen (Slice 266 F-01 explizite Mapping-Tabelle):
  //   - liveScore → 'event'   (Sidebar-NextEvent unterdrückt: Spotlight zeigt Live-Hint)
  //   - mysteryBox → 'cta'    (keine korrespondierende Sidebar-Sektion)
  //   - ipo / topMover / trending → 1:1
  //   - null → 'cta'
  const spotlightType = useMemo(() => {
    const p = spotlightSlots.primary;
    if (p === 'liveScore') return 'event' as const;
    if (p === 'ipo') return 'ipo' as const;
    if (p === 'topMover') return 'topMover' as const;
    if (p === 'trending') return 'trending' as const;
    return 'cta' as const;
  }, [spotlightSlots.primary]);

  const trendingWithPlayers = useMemo(() => {
    return trendingPlayers
      .map(tp => ({ tp, player: players.find(p => p.id === tp.playerId) }))
      .filter((item): item is { tp: typeof trendingPlayers[0]; player: NonNullable<typeof item.player> } => !!item.player)
      .slice(0, 5);
  }, [trendingPlayers, players]);

  // Top Movers: 7d price changes for user's holdings (Slice 268b — TanStack-cached).
  //
  // Replaces the legacy useState/useEffect+cancelled-flag pattern with
  // `usePlayerPriceChanges7d` (queries/players.ts). Battery-Drain-Fix per
  // D63 Cross-Persona-Top-Finding #3: 5-min staleTime + dedup + retry.
  // Stable playerIds reference is required so the cache key stays consistent
  // across re-renders (Spec §9 F-07).
  const playerIds = useMemo(() => holdings.map(h => h.playerId), [holdings]);
  const { data: priceChanges } = usePlayerPriceChanges7d(playerIds, 3);

  const topMovers = useMemo(
    () =>
      (priceChanges ?? []).map(c => {
        const h = holdings.find(h => h.playerId === c.player_id);
        return {
          playerId: c.player_id,
          player: h?.player ?? '',
          club: h?.club ?? '',
          change24h: Number(c.change_pct),
        };
      }),
    [priceChanges, holdings],
  );

  const hasGlobalMovers = useMemo(() => {
    return players.some(p => p.prices.change24h !== 0 && !p.isLiquidated);
  }, [players]);

  const showQuickActions = !!uid;

  // ── Actions ──
  const handleOpenMysteryBox = useCallback(async (free?: boolean) => {
    if (!uid) return null;
    // Slice 178f: per-attempt idempotency-key. Network-retry via ConfirmDialog
    // kommt mit same key zurueck → RPC returnt cached response, keine double-deduct.
    const result = await openMysteryBox(free, newIdempotencyKey('mb.open'));
    if (!result.ok) {
      // Surface the real RPC error — the modal catches and displays it.
      throw new Error(result.error ?? 'Unknown error');
    }
    // Always invalidate tickets + home dashboard (tickets live on dashboard payload)
    queryClient.invalidateQueries({ queryKey: qk.tickets.balance(uid) });
    queryClient.invalidateQueries({ queryKey: qk.homeDashboard.byUser(uid) });
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
    if (free) {
      // Close the daily gate by refetching the server-authoritative count.
      queryClient.invalidateQueries({ queryKey: qk.mysteryBox.freeBoxToday(uid) });
    }
    const effectiveCost = free ? 0 : Math.max(1, 15 - (streakBenefits.mysteryBoxTicketDiscount ?? 0));
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
      // Pass-through display fields — populated only on freshly opened boxes
      // (not on persisted `mystery_box_results` rows).
      equipment_name_de: result.equipmentNameDe,
      equipment_name_tr: result.equipmentNameTr,
      equipment_position: result.equipmentPosition,
      cosmetic_key: result.cosmeticKey,
    } satisfies import('@/types').MysteryBoxResult;
  }, [uid, streakBenefits.mysteryBoxTicketDiscount, queryClient]);

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
    handleOpenMysteryBox, hasFreeBoxToday,
    // Derived
    storyMessage, spotlightType, spotlightSlots, retention, showQuickActions,
    belowFoldReady, followedClubs,
    // Slice 262 — Hero-Mode + Manager-Block inputs
    heroMode, gw, hasLineup, hasCaptain, captainName,
    // Slice 263 — Doppel-Identität-Pills inputs
    nextScopedEvent,
    // Slice 264 — ActionRequiredStack inputs (Primitives entkoppelt vom DbEvent-Type)
    locksAtIso: scopedActiveEvent?.locks_at ?? null,
    scopedActiveEventStatus: scopedActiveEvent?.status ?? null,
    // Slice 264b — Wildcard-Pill (Optional-Hint in ManagerBlock)
    wildcardBalance,
  };
}
