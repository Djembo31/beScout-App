import { trackEvent } from '@/lib/posthog';

// Trading Events
export function trackTrade(action: 'buy_market' | 'buy_order' | 'buy_ipo' | 'sell_order' | 'cancel_order', properties: {
  playerId: string;
  playerName: string;
  quantity: number;
  priceCents: number;
}) {
  trackEvent(`trade_${action}`, properties);
}

// Fantasy Events
export function trackFantasy(action: 'join_event' | 'leave_event' | 'update_lineup', properties: {
  eventId: string;
  eventName: string;
  entryFeeCents?: number;
}) {
  trackEvent(`fantasy_${action}`, properties);
}

// Community Events
export function trackCommunity(action: 'create_post' | 'create_research' | 'unlock_research' | 'vote_post' | 'cast_vote' | 'create_poll', properties?: Record<string, unknown>) {
  trackEvent(`community_${action}`, properties);
}

// Social Events
export function trackSocial(action: 'follow' | 'unfollow', properties: {
  targetUserId: string;
}) {
  trackEvent(`social_${action}`, properties);
}

// Profile Events
export function trackProfile(action: 'update_profile' | 'upload_avatar' | 'view_public_profile', properties?: Record<string, unknown>) {
  trackEvent(`profile_${action}`, properties);
}

// Navigation Events
export function trackNavigation(action: 'search' | 'notification_click' | 'tab_switch', properties?: Record<string, unknown>) {
  trackEvent(`nav_${action}`, properties);
}
