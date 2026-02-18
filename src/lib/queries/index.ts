/**
 * Barrel re-export — all React Query hooks in one import.
 * Usage: import { usePlayers, useHoldings, useEnrichedPlayers } from '@/lib/queries';
 */

export { qk } from './keys';
export { usePlayers, usePlayerById } from './players';
export { useHoldings } from './holdings';
export { useAllOpenOrders } from './orders';
export { useEnrichedPlayers, enrichPlayersWithData } from './enriched';
export { useFollowingFeed, useFollowerCount, useFollowingCount, useFollowingIds } from './social';
export { useEvents } from './events';
export { useUserStats } from './stats';
export { useRecentGlobalTrades, useTopTraders } from './trades';
export { useTransactions, useLeaderboard, usePosts, useDpcOfWeek, useScoutMissions, useMissionProgress } from './misc';
export { useActiveIpos } from './ipos';
export { useTrendingPlayers } from './trending';
export { useAllPriceHistories } from './priceHist';
export { useWatchlist } from './watchlist';
export { useIncomingOffers } from './offers';
export { useClubVotes } from './votes';
export { useResearchPosts } from './research';
export { useActiveBounties } from './bounties';
export { useCommunityPolls } from './polls';
export { useSponsor } from './sponsors';
export { useClubFixtures } from './fixtures';
export { useContentTips } from './tips';
export { useIsSubscribedToScout, useSubscribedScoutIds } from './scoutSubscriptions';
export {
  invalidateTradeQueries,
  invalidateSocialQueries,
  invalidateResearchQueries,
  invalidatePollQueries,
  invalidateNotificationQueries,
  invalidateClubQueries,
  invalidateCommunityQueries,
} from './invalidation';
