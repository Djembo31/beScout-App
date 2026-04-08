/**
 * Barrel re-export — all React Query hooks in one import.
 * Usage: import { usePlayers, useHoldings, useEnrichedPlayers } from '@/lib/queries';
 */

export { qk } from './keys';
export { usePlayers, usePlayerNames } from './players';
export { useHoldings } from './holdings';
export { useAllOpenOrders, useAllOpenBuyOrders } from './orders';
export { useEnrichedPlayers, enrichPlayersWithData } from './enriched';
export { useFollowingFeed, useFollowerCount, useFollowingCount, useFollowingIds, useUserSocialStats } from './social';
export { useEvents, useJoinedEventIds } from './events';
export { useUserStats } from './stats';
export { useTransactions, useWildcardHistory, useLeaderboard, usePosts, useScoutMissions, useMissionProgress, useClubSubscription } from './misc';
export { useActiveIpos } from './ipos';
export { useTrendingPlayers } from './trending';
export { useAllPriceHistories } from './priceHist';
export { useWatchlist, useMostWatchedPlayers } from './watchlist';
export { useIncomingOffers } from './offers';
export { useClubVotes } from './votes';
export { useResearchPosts } from './research';
export { useActiveBounties } from './bounties';
export { useCommunityPolls } from './polls';
export { useSponsor } from './sponsors';
export { useSponsorStats } from './sponsorStats';
export { useClubFixtures } from './fixtures';
export { useScoutScores, useScoreRoadClaims } from './gamification';
export { useDpcMastery, useUserMasteryAll } from './mastery';
export { useAirdropLeaderboard, useAirdropStats } from './airdrop';
export { usePredictions, usePredictionCount, usePredictionStats, usePredictionFixtures, useCreatePrediction, useHasAnyPrediction } from './predictions';
export { usePlayerScoutingSummaries, useTopScouts, useScoutingStats, useClubPrestige, useGlobalTopScouts } from './scouting';
export { useMissionHints } from './missions';
export {
  invalidateTradeQueries,
  invalidateSocialQueries,
  invalidateResearchQueries,
  invalidatePollQueries,
  invalidateNotificationQueries,
  invalidateClubQueries,
  invalidateCommunityQueries,
} from './invalidation';
