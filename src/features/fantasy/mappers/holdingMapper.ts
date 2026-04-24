import type { UserDpcHolding } from '../types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import { getClub } from '@/lib/clubs';
import { getLeague } from '@/lib/leagues';
import { logSilentCatch } from '@/lib/observability/silentRejects';

/**
 * Map DB holding row to local UserDpcHolding shape.
 *
 * Slice 192: throws if h.player === null. Previously the mapper silently
 * filled defaults (pos:'MID', ticket:0, first/last:'', imageUrl:null) which
 * produced ghost rows in Aufstellen-Tab with #0/empty-name visible to user
 * (Anil-Screenshot 2026-04-24). Throwing here makes the bug visible in
 * Sentry + React-Query error-boundary instead of silent broken UI.
 *
 * Caller-Contract: getHoldings() filters NULL-player rows out before
 * returning to React Query. If you call this mapper directly with raw
 * Supabase data, ensure player !== null first.
 */
export function dbHoldingToUserDpcHolding(h: HoldingWithPlayer): UserDpcHolding {
  if (h.player == null) {
    // i18n-key (errors-frontend.md): error.message stays as resolvable key,
    // so consumer-side `mapErrorToKey + te()` produces translated UI message.
    // Diagnostic context goes to Sentry via logSilentCatch BEFORE the throw.
    logSilentCatch(
      'holdingMapper.ghostRow',
      new Error('h.player is NULL — PostgREST nested-select failure'),
      { playerId: h.player_id, quantity: h.quantity },
    );
    throw new Error('ghost_holding_row');
  }
  // Resolve league via player.club_id → clubs.league → leagues (client-side cache)
  const clubLookup = h.player.club_id ? getClub(h.player.club_id) : null;
  const league = clubLookup?.league ? getLeague(clubLookup.league) : undefined;

  return {
    id: h.player_id,
    first: h.player.first_name ?? '',
    last: h.player.last_name ?? '',
    pos: h.player.position ?? 'MID',
    club: h.player.club ?? '',
    clubId: h.player.club_id ?? null,
    leagueShort: league?.short,
    leagueLogoUrl: league?.logoUrl ?? undefined,
    leagueCountry: league?.country,
    dpcOwned: h.quantity,
    eventsUsing: 0,
    dpcAvailable: h.quantity,
    activeEventIds: [],
    isLocked: false,
    lastScore: h.player.perf_l5 ?? undefined,
    avgScore: h.player.perf_l15 ?? undefined,
    perfL5: h.player.perf_l5 ?? 0,
    perfL15: h.player.perf_l15 ?? 0,
    matches: h.player.matches ?? 0,
    goals: h.player.goals ?? 0,
    assists: h.player.assists ?? 0,
    status: (h.player.status as UserDpcHolding['status']) ?? 'fit',
    imageUrl: h.player.image_url ?? null,
    ticket: h.player.shirt_number ?? 0,
    floorPrice: h.player.floor_price ?? 0,
  };
}
