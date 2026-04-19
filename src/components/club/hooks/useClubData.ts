import { useState, useEffect, useMemo } from 'react';
import { dbToPlayers, centsToBsd } from '@/lib/services/players';
import { resolveExpiredResearch, getResearchPosts } from '@/lib/services/research';
import { useClubBySlug } from '@/lib/queries/misc';
import { usePlayersByClub } from '@/lib/queries/players';
import { useClubFollowerCount, useIsFollowingClub } from '@/lib/queries/social';
import { useHoldings } from '@/lib/queries/holdings';
import { useClubFixtures } from '@/lib/queries/fixtures';
import { useClubPrestige } from '@/lib/queries/scouting';
import { useActiveIpos } from '@/lib/queries/ipos';
import { useEvents } from '@/lib/queries/events';
import { useClubRecentTrades } from '@/lib/queries/trades';
import { useFanRanking } from '@/lib/queries/fanRanking';
import { getPosts } from '@/lib/services/posts';
import { getFixtureResult } from '@/components/club/FixtureCards';
import type { Pos, PostWithAuthor, ResearchPostWithAuthor } from '@/types';
import type { ClubFilters, ClubDataResult } from './types';

interface UseClubDataParams {
  slug: string;
  userId: string | undefined;
  filters: ClubFilters;
}

export function useClubData({ slug, userId, filters }: UseClubDataParams): ClubDataResult {
  const { posFilter, sortBy, spielerQuery } = filters;

  // ── React Query Hooks ──
  const { data: club, isLoading: clubLoading, isError: clubError } = useClubBySlug(slug, userId);
  const clubId = club?.id;
  const { data: dbPlayersRaw = [], isLoading: playersLoading, isError: playersError } = usePlayersByClub(clubId, true);
  const { data: followerCountData = 0 } = useClubFollowerCount(clubId);
  const { data: isFollowingData = false } = useIsFollowingClub(userId, clubId);
  const { data: dbHoldings = [] } = useHoldings(userId);
  const { data: clubFixtures = [] } = useClubFixtures(clubId);
  const { data: clubPrestige } = useClubPrestige(clubId);
  const { data: activeIpos = [] } = useActiveIpos();
  const { data: allEvents = [] } = useEvents();
  const { data: clubTradesRaw = [] } = useClubRecentTrades(clubId, 5);
  const { data: fanRanking, isLoading: fanRankingLoading } = useFanRanking(userId, clubId);

  // Resolve expired research (fire-and-forget)
  useEffect(() => {
    resolveExpiredResearch().catch(err => console.error('[Club] Resolve expired research failed:', err));
  }, []);

  // ── Club News & Research (manual fetches) ──
  const [clubNews, setClubNews] = useState<PostWithAuthor[]>([]);
  const [clubResearch, setClubResearch] = useState<ResearchPostWithAuthor[]>([]);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    getPosts({ clubId, postType: 'club_news', limit: 3 }).then(news => {
      if (!cancelled) setClubNews(news);
    }).catch(err => console.error('[Club] News fetch:', err));
    return () => { cancelled = true; };
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    getResearchPosts({ clubId, limit: 5 }).then(posts => {
      if (!cancelled) setClubResearch(posts);
    }).catch(err => console.error('[Club] Research fetch:', err));
    return () => { cancelled = true; };
  }, [clubId]);

  // ── Derived Data ──
  const players = useMemo(() => dbToPlayers(dbPlayersRaw), [dbPlayersRaw]);

  const userHoldingsQty = useMemo(() => {
    if (!clubId || dbHoldings.length === 0) return {};
    const clubPlayerIds = new Set(dbPlayersRaw.map((p) => p.id));
    const holdingsMap: Record<string, number> = {};
    dbHoldings.forEach((h) => {
      if (clubPlayerIds.has(h.player_id)) {
        holdingsMap[h.player_id] = h.quantity;
      }
    });
    return holdingsMap;
  }, [dbHoldings, dbPlayersRaw, clubId]);

  const totalVolume24h = useMemo(
    () => centsToBsd(dbPlayersRaw.reduce((sum, p) => sum + p.volume_24h, 0)),
    [dbPlayersRaw]
  );

  const totalDpcFloat = useMemo(
    () => dbPlayersRaw.reduce((sum, p) => sum + p.dpc_total, 0),
    [dbPlayersRaw]
  );

  const avgPerf = useMemo(() => {
    if (dbPlayersRaw.length === 0) return 0;
    return dbPlayersRaw.reduce((sum, p) => sum + Number(p.perf_l5), 0) / dbPlayersRaw.length;
  }, [dbPlayersRaw]);

  const userClubDpc = useMemo(
    () => Object.values(userHoldingsQty).reduce((sum, q) => sum + q, 0),
    [userHoldingsQty]
  );

  const recentTrades = useMemo(() =>
    clubTradesRaw.map(tr => ({
      id: tr.id,
      player_name: `${(tr.player as unknown as { first_name: string; last_name: string }).first_name} ${(tr.player as unknown as { first_name: string; last_name: string }).last_name}`,
      price_cents: tr.price,
      executed_at: tr.executed_at,
    })),
    [clubTradesRaw]
  );

  const filteredPlayers = useMemo(() => {
    let filtered = posFilter === 'ALL' ? players : players.filter((p) => p.pos === posFilter);
    if (spielerQuery) {
      const q = spielerQuery.toLowerCase();
      filtered = filtered.filter(p => `${p.first} ${p.last}`.toLowerCase().includes(q));
    }
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'perf') return b.perf.l5 - a.perf.l5;
      if (sortBy === 'price') return b.prices.lastTrade - a.prices.lastTrade;
      return b.prices.change24h - a.prices.change24h;
    });
    return filtered;
  }, [players, posFilter, sortBy, spielerQuery]);

  const posCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: players.length, GK: 0, DEF: 0, MID: 0, ATT: 0 };
    players.forEach((p) => { counts[p.pos]++; });
    return counts;
  }, [players]);

  const formResults = useMemo(() => {
    if (!clubId) return [];
    return clubFixtures
      .filter(f => f.status === 'simulated' || f.status === 'finished')
      .slice(-5)
      .map(f => getFixtureResult(f, clubId))
      .filter((r): r is 'W' | 'D' | 'L' => r !== null);
  }, [clubFixtures, clubId]);

  const clubIpos = useMemo(() => {
    const playerIds = new Set(dbPlayersRaw.map(p => p.id));
    return activeIpos.filter(ipo => playerIds.has(ipo.player_id));
  }, [activeIpos, dbPlayersRaw]);

  const ownedPlayerIds = useMemo(() => new Set(Object.keys(userHoldingsQty)), [userHoldingsQty]);

  const clubEvents = useMemo(() => {
    if (!clubId) return [];
    return allEvents.filter(e => e.club_id === clubId);
  }, [allEvents, clubId]);

  const emptySections = useMemo(() => {
    return [
      clubIpos.length === 0,
      clubEvents.length === 0,
      recentTrades.length === 0,
    ].filter(Boolean).length;
  }, [clubIpos, clubEvents, recentTrades]);

  const showFeatureShowcase = emptySections >= 2;

  // ── Loading / Error States ──
  const loading = !!(clubLoading || (clubId && playersLoading));
  const dataError = clubError || playersError;
  const notFound = !clubLoading && !club;

  return {
    club, clubId, players, loading, dataError, notFound,
    totalVolume24h, totalDpcFloat, avgPerf, userClubDpc, userHoldingsQty,
    filteredPlayers, posCounts,
    clubIpos, clubEvents, ownedPlayerIds, recentTrades, formResults,
    clubFixtures, emptySections, showFeatureShowcase,
    clubNews, clubResearch,
    fanRanking, fanRankingLoading,
    clubPrestige,
    followerCountData, isFollowingData,
  };
}
