/**
 * BeScout - All Types
 * Single Source of Truth
 */

// ============================================
// PLAYER TYPES
// ============================================

export type Pos = 'GK' | 'DEF' | 'MID' | 'ATT';

const VALID_POS = new Set<string>(['GK', 'DEF', 'MID', 'ATT']);
/** Safely cast an unknown string to Pos, falling back to 'MID' */
export function toPos(value: string | null | undefined): Pos {
  return VALID_POS.has(value ?? '') ? (value as Pos) : 'MID';
}
export type PlayerStatus = 'fit' | 'injured' | 'suspended' | 'doubtful';
export type Trend = 'UP' | 'DOWN' | 'FLAT';
export type IPOStatus = 'none' | 'announced' | 'early_access' | 'open' | 'ended' | 'cancelled';
export type IPOType = 'fixed' | 'tiered' | 'dutch';
export type FeedbackType = 'bug' | 'feature' | 'sonstiges';
export type PostCategory = 'Analyse' | 'Prediction' | 'Meinung' | 'News';

export type Player = {
  id: string;
  ticket: number;
  first: string;
  last: string;
  name?: string;
  club: string;
  clubId?: string;
  league?: string;
  pos: Pos;
  status: PlayerStatus;
  age: number;
  country: string;
  contractMonthsLeft: number;
  marketValue?: number; // Marktwert in € (für Success Fee Tier)
  perf: { l5: number; l15: number; trend: Trend };
  stats: { matches: number; goals: number; assists: number };
  prices: { lastTrade: number; change24h: number; floor?: number; ipoPrice?: number; history7d?: number[] };
  dpc: { supply: number; float: number; circulation: number; onMarket: number; owned: number };
  pbt?: { // Player Bound Treasury
    balance: number;
    lastInflow?: number;
    sources?: { trading: number; votes: number; content: number; ipo: number };
  };
  ipo: { status: IPOStatus; progress?: number; price?: number };
  listings: Listing[];
  topOwners: Owner[];
  sponsored?: boolean;
  successFeeCap?: number;  // in BSD (cents → BSD conversion)
  isLiquidated?: boolean;
};

export type Listing = {
  id: string;
  sellerId: string;
  sellerName: string;
  price: number;
  qty?: number;
  expiresAt: number;
  verified?: boolean;
  sellerLevel?: number;
};

export type Owner = {
  id: string;
  name: string;
  level: number;
  owned: number;
  acceptance: number;
  verified?: boolean;
};

// ============================================
// MARKET TYPES
// ============================================

export type MarketTab = 'transferlist' | 'allplayers' | 'livesales' | 'watchlist' | 'offers' | 'mysquad';

export type DpcHolding = {
  id: string;
  playerId: string;
  player: string;
  club: string;
  pos: Pos;
  qty: number;
  avgBuy: number;
  floor: number;
  change24h: number;
  listedByUser: number;
  ticket: number;
  age: number;
  perfL5: number;
  matches: number;
  goals: number;
  assists: number;
};

// ============================================
// RESEARCH TYPES
// ============================================

export type ResearchCall = 'Bullish' | 'Bearish' | 'Neutral';
export type ResearchHorizon = '24h' | '7d' | 'Season';
export type ResearchOutcome = 'correct' | 'incorrect';
export type ResearchCategory = 'Spieler-Analyse' | 'Transfer-Empfehlung' | 'Taktik' | 'Saisonvorschau' | 'Scouting-Report';

export type DbResearchPost = {
  id: string;
  user_id: string;
  player_id: string | null;
  club_name: string | null;
  club_id: string | null;
  title: string;
  preview: string;
  content: string;
  tags: string[];
  category: string;
  call: ResearchCall;
  horizon: ResearchHorizon;
  price: number;           // BIGINT Cents
  unlock_count: number;
  total_earned: number;    // BIGINT Cents
  ratings_count: number;
  avg_rating: number;      // 0.00-5.00
  price_at_creation: number;     // BIGINT Cents — DPC last_price Snapshot
  price_at_resolution: number | null;
  outcome: ResearchOutcome | null;
  price_change_pct: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbResearchRating = {
  id: string;
  research_id: string;
  user_id: string;
  rating: number;           // 1-5
  created_at: string;
  updated_at: string;
};

export type DbResearchUnlock = {
  id: string;
  research_id: string;
  user_id: string;
  amount_paid: number;     // BIGINT Cents
  author_earned: number;   // BIGINT Cents
  platform_fee: number;    // BIGINT Cents
  created_at: string;
};

export type ResearchPostWithAuthor = DbResearchPost & {
  author_handle: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_level: number;
  author_verified: boolean;
  player_name?: string;
  player_position?: Pos;
  is_unlocked: boolean;
  is_own: boolean;
  user_rating: number | null;  // 1-5 if user has rated, null if not
};

export type AuthorTrackRecord = {
  totalCalls: number;       // all resolved posts
  correctCalls: number;
  incorrectCalls: number;
  pendingCalls: number;     // not yet resolved
  hitRate: number;          // 0-100 (%)
};

// ============================================
// FANTASY TYPES
// ============================================

export type LineupSlot = { pid: string; pos: Pos };

export type Lineup = {
  id: string;
  contestId: string;
  name: string;
  createdAt: string;
  locked: boolean;
  players: LineupSlot[];
  points?: number;
  rank?: number;
};

// ============================================
// CLUB TYPES
// ============================================

export type ClubAdminRole = 'owner' | 'admin' | 'editor';

export type DbClub = {
  id: string;
  slug: string;
  name: string;
  short: string;
  league: string;
  country: string;
  city: string | null;
  stadium: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  community_guidelines: string | null;
  active_gameweek: number;
  plan: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type ClubWithAdmin = DbClub & {
  is_admin: boolean;
  admin_role: ClubAdminRole | null;
};

export type DbClubAdmin = {
  id: string;
  club_id: string;
  user_id: string;
  role: ClubAdminRole;
  created_at: string;
};

export type Club = {
  id: string;
  slug: string;
  name: string;
  league: string;
  country: string;
  scouts: number;
  volume24h: number;
  activeVotes: number;
  totalPlayers: number;
  verified: boolean;
  primaryColor?: string;
  logoUrl?: string;
};

export type VoteStatus = 'Active' | 'Scheduled' | 'Ended';

export type Vote = {
  id: string;
  clubId: string;
  question: string;
  options: { id: string; label: string; votes: number; percentage: number }[];
  status: VoteStatus;
  endsIn?: string;
  totalVotes: number;
  costBsd: number;
};

export type ClubDashboardTopFan = {
  user_id: string;
  handle: string;
  avatar_url: string | null;
  total_score: number;
  holdings_count: number;
};

export type ClubDashboardStats = {
  ipo_revenue_cents: number;
  total_fans: number;
  top_fans: ClubDashboardTopFan[];
};

// ============================================
// PROFILE TYPES
// ============================================

export type ProfileTab = 'overview' | 'portfolio' | 'research' | 'posts' | 'activity' | 'settings';

export type Profile = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  favorite_club: string | null;
  favorite_club_id: string | null;
  language: 'de' | 'tr' | 'en';
  plan: string;
  level: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
};

// ============================================
// DATABASE ROW TYPES (match Supabase schema)
// ============================================

export type DbPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  position: 'GK' | 'DEF' | 'MID' | 'ATT';
  club: string;
  club_id: string | null;
  age: number | null;
  shirt_number: number | null;
  nationality: string | null;
  image_url: string | null;
  matches: number;
  goals: number;
  assists: number;
  clean_sheets: number;
  perf_l5: number;
  perf_l15: number;
  perf_season: number;
  dpc_total: number;
  dpc_available: number;
  floor_price: number;    // BIGINT in Cents — guenstigste User-Order oder ipo_price
  last_price: number;     // BIGINT in Cents
  ipo_price: number;      // BIGINT in Cents — fester Club/IPO-Preis
  price_change_24h: number;
  volume_24h: number;
  status: 'fit' | 'injured' | 'suspended' | 'doubtful' | null;
  success_fee_cap_cents: number | null;
  is_liquidated: boolean;
  created_at: string;
  updated_at: string;
};

export type DbWallet = {
  user_id: string;
  balance: number;         // BIGINT in Cents
  locked_balance: number;  // BIGINT in Cents
  created_at: string;
  updated_at: string;
};

export type DbHolding = {
  id: string;
  user_id: string;
  player_id: string;
  quantity: number;
  avg_buy_price: number;  // BIGINT in Cents
  created_at: string;
  updated_at: string;
};

export type DbOrder = {
  id: string;
  user_id: string;
  player_id: string;
  side: 'buy' | 'sell';
  price: number;          // BIGINT in Cents
  quantity: number;
  filled_qty: number;
  status: 'open' | 'partial' | 'filled' | 'cancelled';
  created_at: string;
  expires_at: string | null;
};

export type DbTrade = {
  id: string;
  player_id: string;
  buyer_id: string;
  seller_id: string | null;
  buy_order_id: string | null;
  sell_order_id: string | null;
  ipo_id: string | null;
  price: number;          // BIGINT in Cents
  quantity: number;
  platform_fee: number;
  pbt_fee: number;
  club_fee: number;
  executed_at: string;
};

export type UserTradeWithPlayer = {
  id: string;
  player_id: string;
  buyer_id: string;
  seller_id: string | null;
  price: number;
  quantity: number;
  platform_fee: number;
  pbt_fee: number;
  club_fee: number;
  executed_at: string;
  player_first_name: string;
  player_last_name: string;
  player_position: string;
};

export type DbEvent = {
  id: string;
  name: string;
  type: 'bescout' | 'club' | 'sponsor' | 'special';
  status: 'upcoming' | 'registering' | 'late-reg' | 'running' | 'scoring' | 'ended';
  format: string;
  gameweek: number | null;
  entry_fee: number;
  prize_pool: number;
  max_entries: number | null;
  current_entries: number;
  starts_at: string;
  locks_at: string;
  ends_at: string | null;
  scored_at: string | null;
  created_by: string | null;
  club_id: string | null;
  created_at: string;
};

export type DbLineup = {
  id: string;
  event_id: string;
  user_id: string;
  formation: string | null;
  slot_gk: string | null;
  slot_def1: string | null;
  slot_def2: string | null;
  slot_mid1: string | null;
  slot_mid2: string | null;
  slot_att: string | null;
  captain_slot: string | null;
  total_score: number | null;
  slot_scores: Record<string, number> | null;
  rank: number | null;
  reward_amount: number;
  submitted_at: string;
  locked: boolean;
  synergy_bonus_pct: number;
  synergy_details: SynergyDetail[] | null;
};

// ============================================
// SYNERGY TYPES
// ============================================

export type SynergyDetail = { type: 'club'; source: string; bonus_pct: number };

/** Client-side preview: detect club duos in lineup and calculate synergy bonus */
export function calculateSynergyPreview(clubs: string[]): { totalPct: number; details: SynergyDetail[] } {
  const counts = new Map<string, number>();
  for (const c of clubs) counts.set(c, (counts.get(c) || 0) + 1);
  const details: SynergyDetail[] = [];
  let totalPct = 0;
  Array.from(counts.entries()).forEach(([club, count]) => {
    if (count >= 2) {
      const pct = Math.min(5 * (count - 1), 15);
      details.push({ type: 'club', source: club, bonus_pct: pct });
      totalPct += pct;
    }
  });
  totalPct = Math.min(totalPct, 15);
  return { totalPct, details };
}

// ============================================
// SCORE TIER TYPES
// ============================================

export type ScoreTier = 'decisive' | 'strong' | 'good' | 'none';

export const SCORE_TIER_CONFIG: Record<Exclude<ScoreTier, 'none'>, { label: string; labelDe: string; minScore: number; color: string; bg: string; border: string; bonusCents: number }> = {
  decisive: { label: 'Decisive', labelDe: 'Entscheidend', minScore: 120, color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/20', border: 'border-[#FFD700]/40', bonusCents: 500 },
  strong:   { label: 'Strong', labelDe: 'Stark', minScore: 100, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40', bonusCents: 300 },
  good:     { label: 'Good', labelDe: 'Gut', minScore: 80, color: 'text-sky-400', bg: 'bg-sky-500/20', border: 'border-sky-500/40', bonusCents: 100 },
};

export function getScoreTier(score: number): ScoreTier {
  if (score >= 120) return 'decisive';
  if (score >= 100) return 'strong';
  if (score >= 80) return 'good';
  return 'none';
}

// ============================================
// FAN TIER TYPES (Liga System)
// ============================================

export type FanTier = 'Rookie' | 'Amateur' | 'Profi' | 'Elite' | 'Legende' | 'Ikone';

export const FAN_TIER_THRESHOLDS: { tier: FanTier; minScore: number }[] = [
  { tier: 'Ikone', minScore: 5000 },
  { tier: 'Legende', minScore: 3000 },
  { tier: 'Elite', minScore: 1500 },
  { tier: 'Profi', minScore: 500 },
  { tier: 'Amateur', minScore: 100 },
  { tier: 'Rookie', minScore: 0 },
];

export const FAN_TIER_STYLES: Record<FanTier, { color: string; bg: string; border: string; icon: string }> = {
  Rookie:  { color: 'text-zinc-400', bg: 'bg-zinc-500/20', border: 'border-zinc-500/40', icon: '🌱' },
  Amateur: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40', icon: '⚡' },
  Profi:   { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/40', icon: '🏅' },
  Elite:   { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40', icon: '💎' },
  Legende: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', icon: '👑' },
  Ikone:   { color: 'text-yellow-300', bg: 'bg-yellow-400/20', border: 'border-yellow-400/40', icon: '🌟' },
};

export function getFanTier(totalScore: number): FanTier {
  for (const t of FAN_TIER_THRESHOLDS) {
    if (totalScore >= t.minScore) return t.tier;
  }
  return 'Rookie';
}

export type UserFantasyResult = {
  eventId: string;
  eventName: string;
  gameweek: number | null;
  eventDate: string;
  totalScore: number;
  rank: number;
  rewardAmount: number; // cents
};

export type DbTransaction = {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  reference_id: string | null;
  description: string | null;
  created_at: string;
};

// ============================================
// IPO DATABASE TYPES
// ============================================

export type DbIpo = {
  id: string;
  player_id: string;
  status: 'announced' | 'early_access' | 'open' | 'ended' | 'cancelled';
  format: IPOType;
  price: number;              // BIGINT Cents
  price_min: number | null;   // Dutch
  price_max: number | null;   // Dutch
  tiers: { price: number; quantity: number; sold: number }[] | null;
  total_offered: number;
  sold: number;
  max_per_user: number;
  member_discount: number;
  starts_at: string;
  ends_at: string;
  early_access_ends_at: string | null;
  season: number;
  created_at: string;
  updated_at: string;
};

export type DbIpoPurchase = {
  id: string;
  ipo_id: string;
  user_id: string;
  quantity: number;
  price: number;              // Cents per DPC
  platform_fee: number;
  pbt_fee: number;
  club_fee: number;
  purchased_at: string;
};

// ============================================
// PBT (Player Bound Treasury) TYPES
// ============================================

export type DbPbtTreasury = {
  player_id: string;
  balance: number;            // BIGINT Cents
  trading_inflow: number;
  ipo_inflow: number;
  votes_inflow: number;
  content_inflow: number;
  last_inflow_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbPbtTransaction = {
  id: string;
  player_id: string;
  source: 'trading' | 'ipo' | 'votes' | 'content';
  amount: number;
  balance_after: number;
  trade_id: string | null;
  description: string | null;
  created_at: string;
};

export type DbFeeConfig = {
  id: string;
  club_name: string | null;
  club_id: string | null;
  trade_fee_bps: number;
  trade_platform_bps: number;
  trade_pbt_bps: number;
  trade_club_bps: number;
  ipo_club_bps: number;
  ipo_platform_bps: number;
  ipo_pbt_bps: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================
// COMMUNITY POLL TYPES
// ============================================

export type CommunityPollStatus = 'active' | 'ended' | 'cancelled';

export type DbCommunityPoll = {
  id: string;
  created_by: string;
  question: string;
  description: string | null;
  options: { label: string; votes: number }[];
  status: CommunityPollStatus;
  total_votes: number;
  cost_bsd: number;        // BIGINT Cents
  creator_earned: number;  // BIGINT Cents
  starts_at: string;
  ends_at: string;
  created_at: string;
};

export type DbCommunityPollVote = {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
  amount_paid: number;
  creator_share: number;
  platform_share: number;
  created_at: string;
};

export type CommunityPollWithCreator = DbCommunityPoll & {
  creator_handle: string;
  creator_display_name: string | null;
  creator_avatar_url: string | null;
};

// ============================================
// GAMEWEEK SCORE TYPES
// ============================================

export type DbPlayerGameweekScore = {
  id: string;
  player_id: string;
  gameweek: number;
  score: number;
  created_at: string;
};

// ============================================
// LEADERBOARD TYPES
// ============================================

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalScore: number;
  rewardAmount: number;
};

// ============================================
// REPUTATION & SOCIAL TYPES
// ============================================

export type DbUserStats = {
  user_id: string;
  trading_score: number;
  manager_score: number;
  scout_score: number;
  total_score: number;
  trades_count: number;
  trading_volume_cents: number;
  portfolio_value_cents: number;
  holdings_diversity: number;
  events_count: number;
  avg_rank: number;
  best_rank: number;
  total_rewards_cents: number;
  followers_count: number;
  following_count: number;
  votes_cast: number;
  achievements_count: number;
  rank: number;
  tier: FanTier;
  updated_at: string;
};

export type DbUserFollow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type DbUserAchievement = {
  id: string;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
};

export type DbClubVote = {
  id: string;
  club_name: string;
  club_id: string | null;
  question: string;
  options: { label: string; votes: number }[];
  status: 'active' | 'scheduled' | 'ended' | 'cancelled';
  total_votes: number;
  cost_bsd: number;
  starts_at: string;
  ends_at: string;
  created_by: string | null;
  created_at: string;
};

export type DbVoteEntry = {
  id: string;
  vote_id: string;
  user_id: string;
  option_index: number;
  amount_paid: number;
  created_at: string;
};

export type PostType = 'general' | 'player_take' | 'transfer_rumor';

export type DbPost = {
  id: string;
  user_id: string;
  player_id: string | null;
  club_name: string | null;
  club_id: string | null;
  content: string;
  tags: string[];
  category: string;  // PostCategory — 'Analyse' | 'Prediction' | 'Meinung' | 'News' | 'Gerücht'
  post_type: PostType;
  upvotes: number;
  downvotes: number;
  replies_count: number;
  is_pinned: boolean;
  parent_id: string | null;
  event_id: string | null;
  rumor_source: string | null;
  rumor_club_target: string | null;
  created_at: string;
};

export type DbPostVote = {
  id: string;
  post_id: string;
  user_id: string;
  vote_type: number; // +1 or -1
  created_at: string;
};

export type DbFeedback = {
  id: string;
  user_id: string;
  type: FeedbackType;
  message: string;
  page_url: string | null;
  created_at: string;
};

export type PostWithAuthor = DbPost & {
  author_handle: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_level: number;
  author_verified: boolean;
  player_name?: string;
  player_position?: Pos;
};

export type LeaderboardUser = {
  rank: number;
  userId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  verified: boolean;
  totalScore: number;
  tradingScore: number;
  managerScore: number;
  scoutScore: number;
  followersCount: number;
};

// Level tiers
export type LevelTier = {
  name: string;
  minLevel: number;
  maxLevel: number;
  color: string;
};

export const LEVEL_TIERS: LevelTier[] = [
  { name: 'Rookie', minLevel: 1, maxLevel: 5, color: 'text-zinc-400' },
  { name: 'Amateur', minLevel: 6, maxLevel: 15, color: 'text-blue-400' },
  { name: 'Profi', minLevel: 16, maxLevel: 30, color: 'text-green-400' },
  { name: 'Elite', minLevel: 31, maxLevel: 50, color: 'text-purple-400' },
  { name: 'Legende', minLevel: 51, maxLevel: 75, color: 'text-amber-400' },
  { name: 'Ikone', minLevel: 76, maxLevel: 100, color: 'text-yellow-300' },
];

export function getLevelTier(level: number): LevelTier {
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (level >= LEVEL_TIERS[i].minLevel) return LEVEL_TIERS[i];
  }
  return LEVEL_TIERS[0];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationType = 'research_unlock' | 'research_rating' | 'follow' | 'fantasy_reward' | 'poll_vote' | 'reply' | 'system' | 'trade' | 'bounty_submission' | 'bounty_approved' | 'bounty_rejected' | 'pbt_liquidation' | 'offer_received' | 'offer_accepted' | 'offer_rejected' | 'offer_countered' | 'dpc_of_week' | 'tier_promotion' | 'price_alert' | 'mission_reward';

export type DbNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  reference_id: string | null;
  reference_type: string | null;
  read: boolean;
  created_at: string;
};

// ============================================
// MISSIONS
// ============================================

export type MissionType = 'daily' | 'weekly';
export type MissionStatus = 'active' | 'completed' | 'claimed' | 'expired';
export type MissionTrackingType = 'transaction' | 'stat' | 'manual';

export type DbMissionDefinition = {
  id: string;
  key: string;
  type: MissionType;
  title: string;
  description: string;
  icon: string;
  target_value: number;
  reward_cents: number;
  tracking_type: MissionTrackingType;
  tracking_config: Record<string, unknown>;
  active: boolean;
  created_at: string;
};

export type DbUserMission = {
  id: string;
  user_id: string;
  mission_id: string;
  period_start: string;
  period_end: string;
  progress: number;
  target_value: number;
  reward_cents: number;
  status: MissionStatus;
  completed_at: string | null;
  claimed_at: string | null;
  created_at: string;
};

export type UserMissionWithDef = DbUserMission & {
  definition: DbMissionDefinition;
};

export const fmtBSD = (n: number) => n.toLocaleString('de-DE');

// ============================================
// BOUNTIES
// ============================================

export type BountyStatus = 'open' | 'closed' | 'cancelled';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export type DbBounty = {
  id: string;
  club_id: string;
  club_name: string;
  created_by: string;
  title: string;
  description: string;
  reward_cents: number;
  deadline_at: string;
  max_submissions: number;
  player_id: string | null;
  position: string | null;
  status: BountyStatus;
  submission_count: number;
  created_at: string;
  updated_at: string;
};

export type BountyWithCreator = DbBounty & {
  creator_handle: string;
  creator_display_name: string | null;
  creator_avatar_url: string | null;
  player_name?: string | null;
  player_position?: string | null;
  has_user_submitted?: boolean;
};

export type DbBountySubmission = {
  id: string;
  bounty_id: string;
  user_id: string;
  title: string;
  content: string;
  status: SubmissionStatus;
  admin_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reward_paid: number;
  created_at: string;
  updated_at: string;
};

export type BountySubmissionWithUser = DbBountySubmission & {
  user_handle: string;
  user_display_name: string | null;
  user_avatar_url: string | null;
};

export type BountySubmissionWithBounty = DbBountySubmission & {
  bounty_title: string;
  bounty_reward_cents: number;
};

// ============================================
// LIQUIDATION
// ============================================

export type DbLiquidationEvent = {
  id: string;
  player_id: string;
  club_id: string;
  triggered_by: string;
  pbt_balance_cents: number;
  success_fee_cents: number;
  distributed_cents: number;
  holder_count: number;
  created_at: string;
};

export type DbLiquidationPayout = {
  id: string;
  liquidation_id: string;
  user_id: string;
  dpc_quantity: number;
  payout_cents: number;
  created_at: string;
};

// ============================================
// FIXTURE TYPES
// ============================================

export type FixtureStatus = 'scheduled' | 'simulated';

export type DbFixture = {
  id: string;
  gameweek: number;
  home_club_id: string;
  away_club_id: string;
  home_score: number | null;
  away_score: number | null;
  status: FixtureStatus;
  played_at: string | null;
  created_at: string;
};

export type DbFixturePlayerStat = {
  id: string;
  fixture_id: string;
  player_id: string;
  club_id: string;
  minutes_played: number;
  goals: number;
  assists: number;
  clean_sheet: boolean;
  goals_conceded: number;
  yellow_card: boolean;
  red_card: boolean;
  saves: number;
  bonus: number;
  fantasy_points: number;
};

export type Fixture = DbFixture & {
  home_club_name: string;
  home_club_short: string;
  away_club_name: string;
  away_club_short: string;
  home_club_primary_color: string | null;
  away_club_primary_color: string | null;
};

export type FixturePlayerStat = DbFixturePlayerStat & {
  player_first_name: string;
  player_last_name: string;
  player_position: string;
  club_short: string;
};

export type SimulateResult = {
  success: boolean;
  gameweek?: number;
  fixtures_simulated?: number;
  player_stats_created?: number;
  error?: string;
};

export type GameweekStatus = {
  gameweek: number;
  total: number;
  simulated: number;
  is_complete: boolean;
};

// ============================================
// STREAK TYPES
// ============================================

export type StreakResult = {
  success: boolean;
  current_streak: number;
  longest_streak: number;
  rewards_given: { milestone: number; reward_cents: number }[];
};

// ============================================
// OFFER TYPES
// ============================================

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired' | 'cancelled';
export type OfferSide = 'buy' | 'sell';

export type DbOffer = {
  id: string;
  player_id: string;
  sender_id: string;
  receiver_id: string | null;
  side: OfferSide;
  price: number;          // BIGINT Cents
  quantity: number;
  status: OfferStatus;
  counter_offer_id: string | null;
  message: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type OfferWithDetails = DbOffer & {
  player_first_name: string;
  player_last_name: string;
  player_position: Pos;
  player_club: string;
  sender_handle: string;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
  receiver_handle: string | null;
  receiver_display_name: string | null;
};

// ============================================
// PROFILE SUMMARY (for follower lists etc.)
// ============================================

export type ProfileSummary = {
  userId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  totalScore: number;
};

// ============================================
// PWA
// ============================================

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}
