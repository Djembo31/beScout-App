// ============================================
// Fantasy Types (local to Fantasy feature)
// ============================================

export type EventType = 'bescout' | 'special' | 'club' | 'sponsor' | 'creator';
export type EventMode = 'tournament' | 'league';
export type EventStatus = 'registering' | 'late-reg' | 'running' | 'upcoming' | 'ended';
export type LineupFormat = '6er' | '11er' | '11er-reserve';
export type FantasyTab = 'spieltag' | 'events' | 'predictions' | 'history';
export type EventDetailTab = 'overview' | 'lineup' | 'leaderboard' | 'community';
export type ViewMode = 'cards' | 'table';

export type Gameweek = {
  id: string;
  number: number;
  label: string;
  dateRange: string;
  status: 'past' | 'current' | 'upcoming';
  lockTime: number;
};

export type LeagueCategory = {
  id: string;
  name: string;
  icon: string;
  count: number;
  group?: 'user' | 'type';
};

export type FantasyEvent = {
  id: string;
  name: string;
  description: string;
  type: EventType;
  mode: EventMode;
  status: EventStatus;
  format: LineupFormat;
  clubId?: string;
  clubName?: string;
  clubLogo?: string;
  sponsorName?: string;
  sponsorLogo?: string;
  creatorId?: string;
  creatorName?: string;
  leagueId?: string;
  leagueName?: string;
  gameweek?: number;
  startTime: number;
  endTime: number;
  lockTime: number;
  lateRegUntil?: number;
  buyIn: number;
  entryFeeCents: number;
  prizePool: number;
  guaranteed?: number;
  participants: number;
  maxParticipants: number | null;
  entryType: 'single' | 'multi' | 'reentry';
  speed: 'normal' | 'turbo' | 'hyper';
  isPromoted: boolean;
  isFeatured: boolean;
  isJoined: boolean;
  isInterested: boolean;
  userRank?: number;
  userPoints?: number;
  scoredAt?: string | null;
  userReward?: number; // reward_amount in Cents
  eventTier: 'arena' | 'club' | 'user';
  minSubscriptionTier?: string | null;
  requirements: {
    dpcPerSlot?: number;
    minDpc?: number;
    minClubPlayers?: number;
    minScoutLevel?: number;
    specificClub?: string;
  };
  rewards: { rank: string; reward: string }[];
};

export type LineupPlayer = {
  playerId: string;
  position: string;
  slot: number;
  isLocked: boolean;
  lockedInEvent?: string;
};

export type UserDpcHolding = {
  id: string;
  first: string;
  last: string;
  pos: string;
  club: string;
  clubLogo?: string;
  dpcOwned: number;
  eventsUsing: number;
  dpcAvailable: number;
  activeEventIds: string[];
  isLocked: boolean;
  lastScore?: number;
  avgScore?: number;
  perfL5: number;
  perfL15: number;
  matches: number;
  goals: number;
  assists: number;
  status: 'fit' | 'injured' | 'suspended' | 'doubtful';
};

export type LineupPreset = {
  name: string;
  formation: string;
  playerIds: string[];
};

export type ScoredLineupData = {
  eventId: string;
  eventName: string;
  gameweek: number;
  rank: number;
  totalParticipants: number;
  points: number;
  rewardCents: number;
  formation: string;
  players: import('@/lib/services/lineups').LineupSlotPlayer[];
};
