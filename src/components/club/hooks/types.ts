import type { Player, Pos, PostWithAuthor, ResearchPostWithAuthor, ClubWithAdmin, Fixture, DbIpo, DbEvent, DbFanRanking } from '@/types';
import type { ClubPrestige } from '@/lib/services/club';

// ── Tab & Filter Types ──

export type ClubTab = 'uebersicht' | 'spieler' | 'spielplan' | 'mehr';

export type SpielerSort = 'perf' | 'price' | 'change';

export type SquadView = 'cards' | 'compact';

export interface ClubFilters {
  posFilter: Pos | 'ALL';
  sortBy: SpielerSort;
  spielerQuery: string;
}

// ── Hook Return Types ──

export interface ClubDataResult {
  // Core
  club: ClubWithAdmin | null | undefined;
  clubId: string | undefined;
  players: Player[];
  loading: boolean;
  dataError: boolean;
  notFound: boolean;

  // Derived stats
  totalVolume24h: number;
  totalDpcFloat: number;
  avgPerf: number;
  userClubDpc: number;
  userHoldingsQty: Record<string, number>;

  // Filtered & sorted
  filteredPlayers: Player[];
  posCounts: Record<string, number>;

  // Club-specific
  clubIpos: DbIpo[];
  clubEvents: DbEvent[];
  ownedPlayerIds: Set<string>;
  recentTrades: { id: string; player_name: string; price_cents: number; executed_at: string }[];
  formResults: ('W' | 'D' | 'L')[];
  clubFixtures: Fixture[];
  emptySections: number;
  showFeatureShowcase: boolean;

  // Content
  clubNews: PostWithAuthor[];
  clubResearch: ResearchPostWithAuthor[];

  // Gamification
  fanRanking: DbFanRanking | null | undefined;
  fanRankingLoading: boolean;

  // Prestige
  clubPrestige: ClubPrestige | undefined;

  // Social (raw data for actions hook)
  followerCountData: number;
  isFollowingData: boolean;
}

export interface ClubActionsResult {
  isFollowing: boolean;
  followerCount: number;
  followLoading: boolean;
  /**
   * Slice 151b — Type changed from `() => Promise<void>` to `() => void`.
   * handleFollow is now backed by useSafeMutation's safeTrigger — fire-and-forget
   * with internal pending-guard. Callers that `await handleFollow()` will still
   * compile (await on void resolves immediately) but have no observable effect.
   */
  handleFollow: () => void;
}
