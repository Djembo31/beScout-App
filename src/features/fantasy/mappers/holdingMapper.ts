import type { UserDpcHolding } from '../types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import { getClub } from '@/lib/clubs';
import { getLeague } from '@/lib/leagues';

/** Map DB holding row to local UserDpcHolding shape */
export function dbHoldingToUserDpcHolding(h: HoldingWithPlayer): UserDpcHolding {
  // Resolve league via player.club_id → clubs.league → leagues (client-side cache)
  const clubLookup = h.player?.club_id ? getClub(h.player.club_id) : null;
  const league = clubLookup?.league ? getLeague(clubLookup.league) : undefined;

  return {
    id: h.player_id,
    first: h.player?.first_name ?? '',
    last: h.player?.last_name ?? '',
    pos: h.player?.position ?? 'MID',
    club: h.player?.club ?? '',
    clubId: h.player?.club_id ?? null,
    leagueShort: league?.short,
    leagueLogoUrl: league?.logoUrl ?? undefined,
    leagueCountry: league?.country,
    dpcOwned: h.quantity,
    eventsUsing: 0,
    dpcAvailable: h.quantity,
    activeEventIds: [],
    isLocked: false,
    lastScore: h.player?.perf_l5 ?? undefined,
    avgScore: h.player?.perf_l15 ?? undefined,
    perfL5: h.player?.perf_l5 ?? 0,
    perfL15: h.player?.perf_l15 ?? 0,
    matches: h.player?.matches ?? 0,
    goals: h.player?.goals ?? 0,
    assists: h.player?.assists ?? 0,
    status: (h.player?.status as UserDpcHolding['status']) ?? 'fit',
    imageUrl: h.player?.image_url ?? null,
    ticket: h.player?.shirt_number ?? 0,
    floorPrice: h.player?.floor_price ?? 0,
  };
}
