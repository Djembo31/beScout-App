import type { UserFantasyResult } from '@/types';

export type HistoryTimeFilter = 'all' | '30d' | '90d' | 'season';
export type HistoryStatusFilter = 'all' | 'top3' | 'top10' | 'other';
export type HistorySort = 'date' | 'score' | 'rank' | 'reward';

const DAY_MS = 86400000;

/**
 * Apply time filter to results. `season` returns all (no cutoff yet — would
 * need a season-start anchor).
 */
export function applyTimeFilter(
  results: UserFantasyResult[],
  filter: HistoryTimeFilter,
  now: number = Date.now(),
): UserFantasyResult[] {
  if (filter === 'all' || filter === 'season') return results;
  const cutoff = filter === '30d' ? now - 30 * DAY_MS : now - 90 * DAY_MS;
  return results.filter((r) => {
    if (!r.eventDate) return false;
    return new Date(r.eventDate).getTime() >= cutoff;
  });
}

/** Apply status filter (rank-based). */
export function applyStatusFilter(
  results: UserFantasyResult[],
  filter: HistoryStatusFilter,
): UserFantasyResult[] {
  if (filter === 'all') return results;
  return results.filter((r) => {
    if (filter === 'top3') return r.rank > 0 && r.rank <= 3;
    if (filter === 'top10') return r.rank > 0 && r.rank <= 10;
    if (filter === 'other') return r.rank > 10;
    return true;
  });
}

/**
 * Sort results in-place by chosen criterion. Returns a NEW array
 * (immutable contract for React state).
 */
export function sortResults(
  results: UserFantasyResult[],
  sort: HistorySort,
): UserFantasyResult[] {
  const arr = [...results];
  arr.sort((a, b) => {
    switch (sort) {
      case 'score':
        return b.totalScore - a.totalScore;
      case 'rank':
        return (a.rank || 9999) - (b.rank || 9999);
      case 'reward':
        return (b.rewardAmount ?? 0) - (a.rewardAmount ?? 0);
      case 'date':
      default:
        return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
    }
  });
  return arr;
}

/**
 * Detect lineup format from a DbLineup-like object's filled slot count.
 * 7er = 7 slots (gk + 2 def + 2 mid + 2 att variants).
 * 11er = 11 slots (gk + 4 def + 3 mid + 3 att, with up to def4/mid4/att3).
 */
export function detectLineupFormat(filledSlotCount: number): '7er' | '11er' {
  return filledSlotCount > 7 ? '11er' : '7er';
}
