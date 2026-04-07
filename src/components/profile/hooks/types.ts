import type {
  ProfileTab, Profile, HoldingRow, DbTransaction, DbTicketTransaction,
  DbUserStats, ResearchPostWithAuthor, AuthorTrackRecord,
  UserTradeWithPlayer, UserFantasyResult, DbCreatorFundPayout,
} from '@/types';

export interface UseProfileDataParams {
  targetUserId: string;
  targetProfile: Profile;
  isSelf: boolean;
}

export interface ProfileDataResult {
  // Loading
  loading: boolean;
  dataError: boolean;
  retry: () => void;

  // Core data
  holdings: HoldingRow[];
  transactions: DbTransaction[];
  ticketTransactions: DbTicketTransaction[];
  userStats: DbUserStats | null;
  myResearch: ResearchPostWithAuthor[];
  trackRecord: AuthorTrackRecord | null;
  recentTrades: UserTradeWithPlayer[];
  fantasyResults: UserFantasyResult[];
  creatorPayouts: DbCreatorFundPayout[];
  clubSub: { tier: string; clubName: string } | null;

  // Derived
  portfolioPnlPct: number;
  avgFantasyRank: number | undefined;
  publicTransactions: DbTransaction[];
  scores: { manager_score: number; trading_score: number; scout_score: number };
  dimOrder: string[];

  // Tabs
  tab: ProfileTab;
  setTab: (tab: ProfileTab) => void;

  // Follow
  following: boolean;
  followLoading: boolean;
  followerCount: number;
  followingCount: number;
  handleFollow: () => Promise<void>;
  handleUnfollow: () => Promise<void>;

  // Stats refresh
  statsRefreshing: boolean;
  handleRefreshStats: () => Promise<void>;

  // Extras
  highestPass: string | null;
  streakDays: number;
}
