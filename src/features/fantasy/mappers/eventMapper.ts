import type { EventStatus, FantasyEvent, LineupFormat } from '../types';
import type { DbEvent } from '@/types';
import { centsToBsd } from '@/lib/services/players';
import { getClub } from '@/lib/clubs';
import { getLeague } from '@/lib/leagues';

/** Derive actual event status from DB status — admin-controlled, no timestamp overrides */
export function deriveEventStatus(db: DbEvent): EventStatus {
  if (db.scored_at) return 'ended';
  const s = db.status;
  if (s === 'ended' || s === 'scoring') return 'ended';
  if (s === 'running') return 'running';
  if (s === 'registering' || s === 'late-reg') return s as EventStatus;
  return 'upcoming';
}

/** Map DB event to local FantasyEvent shape */
export function dbEventToFantasyEvent(db: DbEvent, joinedIds: Set<string>, userLineup?: { total_score: number | null; rank: number | null; reward_amount: number } | null): FantasyEvent {
  // Resolve league via club_id → clubs.league → leagues (client-side cache)
  const clubLookup = db.club_id ? getClub(db.club_id) : null;
  const league = clubLookup?.league ? getLeague(clubLookup.league) : undefined;

  return {
    id: db.id,
    name: db.name,
    description: `${db.name} – ${db.format} Format`,
    type: db.type === 'special' ? 'special' : db.type,
    mode: db.format === '11er' ? 'tournament' : 'league',
    status: deriveEventStatus(db),
    format: (db.format || '7er') as LineupFormat,
    gameweek: db.gameweek ?? 1,
    startTime: new Date(db.starts_at).getTime(),
    endTime: db.ends_at ? new Date(db.ends_at).getTime() : new Date(db.starts_at).getTime() + 259200000,
    lockTime: new Date(db.locks_at).getTime(),
    buyIn: db.currency === 'scout' ? centsToBsd(db.ticket_cost ?? db.entry_fee) : (db.ticket_cost ?? 0),
    entryFeeCents: db.ticket_cost ?? db.entry_fee,
    prizePool: centsToBsd(db.prize_pool),
    guaranteed: centsToBsd(db.prize_pool),
    participants: db.current_entries,
    maxParticipants: db.max_entries,
    entryType: 'single',
    speed: 'normal',
    sponsorName: db.sponsor_name ?? undefined,
    sponsorLogo: db.sponsor_logo ?? undefined,
    isPromoted: db.type === 'bescout' || db.type === 'sponsor',
    isFeatured: db.type === 'sponsor',
    isJoined: joinedIds.has(db.id),
    isInterested: false,
    // Slice 042: Postgres NUMERIC arrives as string ("470.00") via PostgREST.
    // Coerce to number explicitly — without this, downstream Math/sum fails silently.
    userRank: userLineup?.rank != null ? Number(userLineup.rank) : undefined,
    userPoints: userLineup?.total_score != null ? Number(userLineup.total_score) : undefined,
    userReward: userLineup?.reward_amount != null ? Number(userLineup.reward_amount) : undefined,
    scoredAt: db.scored_at,
    eventTier: db.event_tier ?? 'club',
    minSubscriptionTier: db.min_subscription_tier ?? null,
    salaryCap: db.salary_cap ? centsToBsd(db.salary_cap) : null,
    minScPerSlot: db.min_sc_per_slot ?? 1,
    wildcardsAllowed: db.wildcards_allowed ?? false,
    maxWildcardsPerLineup: db.max_wildcards_per_lineup ?? 0,
    requirements: { dpcPerSlot: db.min_sc_per_slot ?? 1 },
    rewards: [
      { rank: '1st', reward: 'Champion Badge' },
      { rank: 'Top 10', reward: 'Gold Frame' },
    ],
    rewardStructure: db.reward_structure ?? null,
    scope: db.scope ?? 'global',
    lineupSize: db.lineup_size ?? (db.format === '11er' || db.format === '11er-reserve' ? 11 : 7),
    ticketCost: db.ticket_cost ?? 0,
    currency: db.currency ?? 'tickets',
    isLigaEvent: db.is_liga_event ?? false,
    clubId: db.club_id ?? undefined,
    clubName: (db as Record<string, unknown>).clubs ? ((db as Record<string, unknown>).clubs as { name: string; logo_url: string | null }).name : undefined,
    clubLogo: (db as Record<string, unknown>).clubs ? ((db as Record<string, unknown>).clubs as { name: string; logo_url: string | null }).logo_url ?? undefined : undefined,
    leagueShort: league?.short,
    leagueLogoUrl: league?.logoUrl ?? undefined,
    leagueCountry: league?.country,
  };
}
