import type { DbTransaction } from '@/types';

export function getActivityIcon(type: string): string {
  if (type === 'trade_buy' || type === 'buy') return 'CircleDollarSign';
  if (type === 'trade_sell' || type === 'sell') return 'CircleDollarSign';
  if (type === 'ipo_buy') return 'CircleDollarSign';
  if (type === 'entry_fee') return 'Trophy';
  if (type === 'entry_refund') return 'Trophy';
  if (type === 'fantasy_reward' || type === 'reward') return 'Award';
  if (type === 'vote_fee') return 'Users';
  if (type === 'deposit') return 'Zap';
  if (type === 'research_unlock') return 'FileText';
  if (type === 'research_earning') return 'FileText';
  if (type === 'poll_vote_cost') return 'Vote';
  if (type === 'poll_earning') return 'Vote';
  if (type === 'mission_reward') return 'Target';
  if (type === 'bounty_cost') return 'Target';
  if (type === 'bounty_reward') return 'Target';
  if (type === 'pbt_liquidation') return 'Banknote';
  if (type === 'streak_bonus') return 'Flame';
  return 'Activity';
}

export function getActivityColor(type: string): string {
  if (type === 'trade_buy' || type === 'buy') return 'text-gold bg-gold/10';
  if (type === 'trade_sell' || type === 'sell') return 'text-green-500 bg-green-500/10';
  if (type === 'ipo_buy') return 'text-gold bg-gold/10';
  if (type === 'entry_fee') return 'text-purple-400 bg-purple-400/10';
  if (type === 'entry_refund') return 'text-emerald-400 bg-emerald-400/10';
  if (type === 'fantasy_reward' || type === 'reward') return 'text-emerald-400 bg-emerald-400/10';
  if (type === 'vote_fee') return 'text-amber-400 bg-amber-400/10';
  if (type === 'deposit') return 'text-sky-400 bg-sky-400/10';
  if (type === 'research_unlock') return 'text-purple-400 bg-purple-400/10';
  if (type === 'research_earning') return 'text-green-500 bg-green-500/10';
  if (type === 'poll_vote_cost') return 'text-amber-400 bg-amber-400/10';
  if (type === 'poll_earning') return 'text-green-500 bg-green-500/10';
  if (type === 'mission_reward') return 'text-gold bg-gold/10';
  if (type === 'bounty_cost') return 'text-amber-400 bg-amber-400/10';
  if (type === 'bounty_reward') return 'text-green-500 bg-green-500/10';
  if (type === 'pbt_liquidation') return 'text-gold bg-gold/10';
  if (type === 'streak_bonus') return 'text-orange-400 bg-orange-400/10';
  return 'text-white/50 bg-white/5';
}

/** Returns an i18n key for the activity namespace. Callers translate via t(key). */
export function getActivityLabelKey(type: string): string {
  if (type === 'trade_buy' || type === 'buy') return 'tradeBuy';
  if (type === 'trade_sell' || type === 'sell') return 'tradeSell';
  if (type === 'ipo_buy') return 'ipoBuy';
  if (type === 'entry_fee') return 'entryFee';
  if (type === 'entry_refund') return 'entryRefund';
  if (type === 'fantasy_reward' || type === 'reward') return 'fantasyReward';
  if (type === 'vote_fee') return 'voteFee';
  if (type === 'deposit') return 'deposit';
  if (type === 'research_unlock') return 'researchUnlock';
  if (type === 'research_earning') return 'researchEarning';
  if (type === 'poll_vote_cost') return 'pollVoteCost';
  if (type === 'poll_earning') return 'pollEarning';
  if (type === 'mission_reward') return 'missionReward';
  if (type === 'bounty_cost') return 'bountyCost';
  if (type === 'bounty_reward') return 'bountyReward';
  if (type === 'pbt_liquidation') return 'pbtLiquidation';
  if (type === 'streak_bonus') return 'streakBonus';
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
