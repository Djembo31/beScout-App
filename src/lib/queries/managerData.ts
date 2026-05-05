import { useQuery } from '@tanstack/react-query';
import {
  getRecentPlayerMinutes,
  getRecentPlayerScoresAndGameweeks,
  getNextFixturesByClub,
  type RecentScoreSlot,
} from '@/lib/services/fixtures';
import { getPlayerEventUsage } from '@/lib/services/lineups';
import { qk } from './keys';

/** Recent minutes per player (last 5 completed GWs) */
export function useRecentMinutes() {
  return useQuery({
    queryKey: qk.fixtures.recentMinutes,
    queryFn: getRecentPlayerMinutes,
    staleTime: 5 * 60 * 1000,
  });
}

/** Slice 270b — Combined-source Hook (1 RPC, shared cache via select-pattern).
 *  Konsumenten greifen entweder Scores- oder Gameweeks-Slice ab.
 */
function selectScoresMap(combined: Map<string, RecentScoreSlot[]>): Map<string, (number | null)[]> {
  const result = new Map<string, (number | null)[]>();
  combined.forEach((slots, pid) => {
    result.set(pid, slots.map(s => s.score));
  });
  return result;
}

function selectGameweeksMap(combined: Map<string, RecentScoreSlot[]>): Map<string, (number | null)[]> {
  const result = new Map<string, (number | null)[]>();
  combined.forEach((slots, pid) => {
    result.set(pid, slots.map(s => s.gameweek));
  });
  return result;
}

/** Recent GW scores per player (last 5 played GWs) */
export function useRecentScores() {
  return useQuery({
    queryKey: qk.fixtures.recentScores,
    queryFn: getRecentPlayerScoresAndGameweeks,
    select: selectScoresMap,
    staleTime: 5 * 60 * 1000,
  });
}

/** Slice 270b — Per-player recent gameweeks Map (replaces global Slice-198 useRecentScoreGameweeks).
 *  Used by FormBars tooltip to label each bar with its actual GW number per player.
 *  Shares cache with useRecentScores (1 RPC, 2 selectors).
 */
export function useRecentPlayerGameweeks() {
  return useQuery({
    queryKey: qk.fixtures.recentScores,
    queryFn: getRecentPlayerScoresAndGameweeks,
    select: selectGameweeksMap,
    staleTime: 5 * 60 * 1000,
  });
}

/** Next scheduled fixture per club */
export function useNextFixtures() {
  return useQuery({
    queryKey: qk.fixtures.nextByClub,
    queryFn: getNextFixturesByClub,
    staleTime: 10 * 60 * 1000,
  });
}

/** Which players are committed to active events */
export function usePlayerEventUsage(userId: string | undefined) {
  return useQuery({
    queryKey: qk.events.usage(userId ?? ''),
    queryFn: () => getPlayerEventUsage(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
