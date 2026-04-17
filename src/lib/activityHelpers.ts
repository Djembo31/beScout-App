import type { DbTransaction } from '@/types';

export function getActivityIcon(type: string): string {
  if (type === 'trade_buy' || type === 'buy') return 'CircleDollarSign';
  if (type === 'trade_sell' || type === 'sell') return 'CircleDollarSign';
  if (type === 'ipo_buy') return 'CircleDollarSign';
  if (type === 'offer_buy' || type === 'offer_sell') return 'CircleDollarSign';
  if (type === 'offer_lock') return 'Lock';
  if (type === 'offer_unlock') return 'Unlock';
  if (type === 'entry_fee') return 'Trophy';
  if (type === 'entry_refund') return 'Trophy';
  if (type === 'fantasy_reward' || type === 'reward') return 'Award';
  if (type === 'fantasy_join') return 'Trophy';
  if (type === 'vote_fee') return 'Users';
  if (type === 'deposit') return 'Zap';
  if (type === 'welcome_bonus') return 'Gift';
  if (type === 'tier_bonus') return 'Award';
  if (type === 'research_unlock') return 'FileText';
  if (type === 'research_earning' || type === 'research_earn') return 'FileText';
  if (type === 'poll_vote_cost') return 'Vote';
  if (type === 'poll_earning' || type === 'poll_earn') return 'Vote';
  if (type === 'event_entry_unlock') return 'Trophy';
  if (type === 'scout_subscription') return 'Users';
  if (type === 'mission_reward') return 'Target';
  if (type === 'bounty_cost') return 'Target';
  if (type === 'bounty_reward') return 'Target';
  if (type === 'pbt_liquidation') return 'Banknote';
  if (type === 'streak_bonus' || type === 'streak_reward') return 'Flame';
  if (type === 'tip_receive') return 'Coins';
  if (type === 'scout_subscription_earning') return 'Users';
  if (type === 'creator_fund_payout') return 'Coins';
  if (type === 'ad_revenue_payout') return 'Banknote';
  if (type === 'subscription') return 'Users';
  if (type === 'admin_adjustment') return 'Settings';
  if (type === 'tip_send') return 'Coins';
  if (type === 'offer_execute') return 'CircleDollarSign';
  return 'Activity';
}

export function getActivityColor(type: string): string {
  if (type === 'trade_buy' || type === 'buy') return 'text-gold bg-gold/10';
  if (type === 'trade_sell' || type === 'sell') return 'text-green-500 bg-green-500/10';
  if (type === 'ipo_buy') return 'text-gold bg-gold/10';
  if (type === 'offer_buy') return 'text-gold bg-gold/10';
  if (type === 'offer_sell') return 'text-green-500 bg-green-500/10';
  if (type === 'offer_lock') return 'text-amber-400 bg-amber-400/10';
  if (type === 'offer_unlock') return 'text-sky-400 bg-sky-400/10';
  if (type === 'entry_fee') return 'text-purple-400 bg-purple-400/10';
  if (type === 'entry_refund') return 'text-emerald-400 bg-emerald-400/10';
  if (type === 'fantasy_reward' || type === 'reward') return 'text-emerald-400 bg-emerald-400/10';
  if (type === 'fantasy_join') return 'text-purple-400 bg-purple-400/10';
  if (type === 'vote_fee') return 'text-amber-400 bg-amber-400/10';
  if (type === 'deposit') return 'text-sky-400 bg-sky-400/10';
  if (type === 'welcome_bonus') return 'text-emerald-400 bg-emerald-400/10';
  if (type === 'tier_bonus') return 'text-gold bg-gold/10';
  if (type === 'research_unlock') return 'text-purple-400 bg-purple-400/10';
  if (type === 'research_earning' || type === 'research_earn') return 'text-green-500 bg-green-500/10';
  if (type === 'poll_vote_cost') return 'text-amber-400 bg-amber-400/10';
  if (type === 'poll_earning' || type === 'poll_earn') return 'text-green-500 bg-green-500/10';
  if (type === 'event_entry_unlock') return 'text-emerald-400 bg-emerald-400/10';
  if (type === 'scout_subscription') return 'text-amber-400 bg-amber-400/10';
  if (type === 'mission_reward') return 'text-gold bg-gold/10';
  if (type === 'bounty_cost') return 'text-amber-400 bg-amber-400/10';
  if (type === 'bounty_reward') return 'text-green-500 bg-green-500/10';
  if (type === 'pbt_liquidation') return 'text-gold bg-gold/10';
  if (type === 'streak_bonus' || type === 'streak_reward') return 'text-orange-400 bg-orange-400/10';
  if (type === 'tip_receive') return 'text-emerald-400 bg-emerald-400/10';
  if (type === 'scout_subscription_earning') return 'text-gold bg-gold/10';
  if (type === 'creator_fund_payout') return 'text-green-500 bg-green-500/10';
  if (type === 'ad_revenue_payout') return 'text-green-500 bg-green-500/10';
  if (type === 'subscription') return 'text-gold bg-gold/10';
  if (type === 'admin_adjustment') return 'text-purple-400 bg-purple-400/10';
  if (type === 'tip_send') return 'text-rose-400 bg-rose-400/10';
  if (type === 'offer_execute') return 'text-gold bg-gold/10';
  return 'text-white/50 bg-white/5';
}

/** Returns an i18n key for the activity namespace. Callers translate via t(key). */
export function getActivityLabelKey(type: string): string {
  if (type === 'trade_buy' || type === 'buy') return 'tradeBuy';
  if (type === 'trade_sell' || type === 'sell') return 'tradeSell';
  if (type === 'ipo_buy') return 'ipoBuy';
  if (type === 'offer_buy') return 'offerBuy';
  if (type === 'offer_sell') return 'offerSell';
  if (type === 'offer_lock') return 'offerLock';
  if (type === 'offer_unlock') return 'offerUnlock';
  if (type === 'entry_fee') return 'entryFee';
  if (type === 'entry_refund') return 'entryRefund';
  if (type === 'fantasy_reward' || type === 'reward') return 'fantasyReward';
  if (type === 'fantasy_join') return 'fantasyJoin';
  if (type === 'vote_fee') return 'voteFee';
  if (type === 'deposit') return 'deposit';
  if (type === 'welcome_bonus') return 'welcomeBonus';
  if (type === 'tier_bonus') return 'tierBonus';
  if (type === 'research_unlock') return 'researchUnlock';
  if (type === 'research_earning' || type === 'research_earn') return 'researchEarning';
  if (type === 'poll_vote_cost') return 'pollVoteCost';
  if (type === 'poll_earning' || type === 'poll_earn') return 'pollEarning';
  if (type === 'event_entry_unlock') return 'eventEntryUnlock';
  if (type === 'scout_subscription') return 'scoutSubscription';
  if (type === 'mission_reward') return 'missionReward';
  if (type === 'bounty_cost') return 'bountyCost';
  if (type === 'bounty_reward') return 'bountyReward';
  if (type === 'pbt_liquidation') return 'pbtLiquidation';
  if (type === 'streak_bonus' || type === 'streak_reward') return 'streakReward';
  if (type === 'tip_receive') return 'tipReceive';
  if (type === 'scout_subscription_earning') return 'subscriptionEarning';
  if (type === 'creator_fund_payout') return 'creatorPayout';
  if (type === 'ad_revenue_payout') return 'adRevenue';
  if (type === 'subscription') return 'subscription';
  if (type === 'admin_adjustment') return 'adminAdjustment';
  if (type === 'tip_send') return 'tipSend';
  if (type === 'offer_execute') return 'offerExecute';
  return type;
}

export function getRelativeTime(dateStr: string, justNowLabel = 'just now', locale = 'de-DE'): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return justNowLabel;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString(locale);
}
