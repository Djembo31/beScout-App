/**
 * React Query invalidation helpers — mirrors legacy cache.ts invalidate* functions.
 * Import these in mutation callbacks or fire-and-forget trade actions.
 */

import { queryClient } from '@/lib/queryClient';
import { qk } from './keys';

/** Invalidate caches affected by a trade action (narrowed — only affected player + user) */
export function invalidateTradeQueries(playerId: string, userId?: string): void {
  // Always invalidate global order book so enriched players / floor prices update
  queryClient.invalidateQueries({ queryKey: qk.orders.all });
  queryClient.invalidateQueries({ queryKey: qk.orders.buy });
  if (playerId) {
    queryClient.invalidateQueries({ queryKey: qk.players.byId(playerId) });
    queryClient.invalidateQueries({ queryKey: qk.orders.byPlayer(playerId) });
    queryClient.invalidateQueries({ queryKey: qk.trades.byPlayer(playerId) });
    queryClient.invalidateQueries({ queryKey: qk.holdings.holderCount(playerId) });
    queryClient.invalidateQueries({ queryKey: qk.offers.bids(playerId) });
  }
  if (userId) {
    queryClient.invalidateQueries({ queryKey: qk.holdings.byUser(userId) });
    queryClient.invalidateQueries({ queryKey: qk.transactions.byUser(userId, 10) });
    if (playerId) {
      queryClient.invalidateQueries({ queryKey: qk.holdings.qty(userId, playerId) });
    }
  }
}

/** Invalidate caches affected by social/reputation actions */
export function invalidateSocialQueries(userId: string): void {
  queryClient.invalidateQueries({ queryKey: qk.userStats.byUser(userId) });
  queryClient.invalidateQueries({ queryKey: qk.social.followerCount(userId) });
  queryClient.invalidateQueries({ queryKey: qk.social.followingCount(userId) });
  queryClient.invalidateQueries({ queryKey: qk.social.feed(userId) });
}

/** Invalidate caches affected by research actions */
export function invalidateResearchQueries(userId?: string): void {
  queryClient.invalidateQueries({ queryKey: ['research'] });
  if (userId) {
    queryClient.invalidateQueries({ queryKey: qk.transactions.byUser(userId, 10) });
  }
}

/** Invalidate caches affected by community poll actions */
export function invalidatePollQueries(userId?: string): void {
  queryClient.invalidateQueries({ queryKey: ['polls'] });
  if (userId) {
    queryClient.invalidateQueries({ queryKey: qk.transactions.byUser(userId, 10) });
  }
}

/** Invalidate caches affected by notification actions */
export function invalidateNotificationQueries(userId: string): void {
  queryClient.invalidateQueries({ queryKey: qk.notifications.byUser(userId) });
  queryClient.invalidateQueries({ queryKey: qk.notifications.unread(userId) });
}

/** Invalidate caches affected by club data changes */
export function invalidateClubQueries(clubId?: string): void {
  if (clubId) {
    queryClient.invalidateQueries({ queryKey: qk.votes.byClub(clubId) });
    queryClient.invalidateQueries({ queryKey: qk.events.byClub(clubId) });
    queryClient.invalidateQueries({ queryKey: qk.players.byClub(clubId) });
  }
}

/** Invalidate community-related caches */
export function invalidateCommunityQueries(): void {
  queryClient.invalidateQueries({ queryKey: ['posts'] });
  queryClient.invalidateQueries({ queryKey: ['bounties'] });
  queryClient.invalidateQueries({ queryKey: ['votes'] });
  queryClient.invalidateQueries({ queryKey: ['polls'] });
}

/** Invalidate fantasy/event-related caches */
export function invalidateFantasyQueries(userId?: string, clubId?: string): void {
  queryClient.invalidateQueries({ queryKey: qk.events.all });
  queryClient.invalidateQueries({ queryKey: qk.events.leagueGw });
  if (clubId) {
    queryClient.invalidateQueries({ queryKey: qk.events.activeGw(clubId) });
  }
  if (userId) {
    queryClient.invalidateQueries({ queryKey: qk.events.joinedIds(userId) });
    queryClient.invalidateQueries({ queryKey: qk.events.enteredIds(userId) });
    queryClient.invalidateQueries({ queryKey: qk.events.usage(userId) });
    queryClient.invalidateQueries({ queryKey: qk.events.holdingLocks(userId) });
    queryClient.invalidateQueries({ queryKey: qk.holdings.byUser(userId) });
  }
}

/** Invalidate player detail-related caches (narrowed — only affected player + user) */
export function invalidatePlayerDetailQueries(playerId: string, userId?: string): void {
  queryClient.invalidateQueries({ queryKey: qk.orders.byPlayer(playerId) });
  queryClient.invalidateQueries({ queryKey: qk.trades.byPlayer(playerId) });
  queryClient.invalidateQueries({ queryKey: qk.pbt.byPlayer(playerId) });
  queryClient.invalidateQueries({ queryKey: qk.scoring.gwScores(playerId) });
  queryClient.invalidateQueries({ queryKey: qk.players.byId(playerId) });
  queryClient.invalidateQueries({ queryKey: qk.holdings.holderCount(playerId) });
  queryClient.invalidateQueries({ queryKey: qk.offers.bids(playerId) });
  queryClient.invalidateQueries({ queryKey: qk.ipos.byPlayer(playerId) });
  if (userId) {
    queryClient.invalidateQueries({ queryKey: qk.holdings.byUser(userId) });
    queryClient.invalidateQueries({ queryKey: qk.holdings.qty(userId, playerId) });
    queryClient.invalidateQueries({ queryKey: qk.transactions.byUser(userId, 10) });
  }
}
