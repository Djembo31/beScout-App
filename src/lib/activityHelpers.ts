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
  if (type === 'trade_buy' || type === 'buy') return 'text-[#FFD700] bg-[#FFD700]/10';
  if (type === 'trade_sell' || type === 'sell') return 'text-[#22C55E] bg-[#22C55E]/10';
  if (type === 'ipo_buy') return 'text-[#FFD700] bg-[#FFD700]/10';
  if (type === 'entry_fee') return 'text-purple-400 bg-purple-400/10';
  if (type === 'entry_refund') return 'text-emerald-400 bg-emerald-400/10';
  if (type === 'fantasy_reward' || type === 'reward') return 'text-emerald-400 bg-emerald-400/10';
  if (type === 'vote_fee') return 'text-amber-400 bg-amber-400/10';
  if (type === 'deposit') return 'text-sky-400 bg-sky-400/10';
  if (type === 'research_unlock') return 'text-purple-400 bg-purple-400/10';
  if (type === 'research_earning') return 'text-[#22C55E] bg-[#22C55E]/10';
  if (type === 'poll_vote_cost') return 'text-amber-400 bg-amber-400/10';
  if (type === 'poll_earning') return 'text-[#22C55E] bg-[#22C55E]/10';
  if (type === 'mission_reward') return 'text-[#FFD700] bg-[#FFD700]/10';
  if (type === 'bounty_cost') return 'text-amber-400 bg-amber-400/10';
  if (type === 'bounty_reward') return 'text-[#22C55E] bg-[#22C55E]/10';
  if (type === 'pbt_liquidation') return 'text-[#FFD700] bg-[#FFD700]/10';
  if (type === 'streak_bonus') return 'text-orange-400 bg-orange-400/10';
  return 'text-white/50 bg-white/5';
}

export function getActivityLabel(tx: DbTransaction): string {
  if (tx.description) return tx.description;
  if (tx.type === 'trade_buy' || tx.type === 'buy') return 'DPC gekauft';
  if (tx.type === 'trade_sell' || tx.type === 'sell') return 'DPC verkauft';
  if (tx.type === 'ipo_buy') return 'IPO-Kauf';
  if (tx.type === 'entry_fee') return 'Event-Eintritt';
  if (tx.type === 'entry_refund') return 'Event-Erstattung';
  if (tx.type === 'fantasy_reward' || tx.type === 'reward') return 'Fantasy-Belohnung';
  if (tx.type === 'vote_fee') return 'Abstimmung';
  if (tx.type === 'deposit') return 'Einzahlung';
  if (tx.type === 'research_unlock') return 'Bericht freigeschaltet';
  if (tx.type === 'research_earning') return 'Bericht-Einnahme';
  if (tx.type === 'poll_vote_cost') return 'Umfrage-Teilnahme';
  if (tx.type === 'poll_earning') return 'Umfrage-Einnahme';
  if (tx.type === 'mission_reward') return 'Missions-Belohnung';
  if (tx.type === 'bounty_cost') return 'Bounty-Zahlung';
  if (tx.type === 'bounty_reward') return 'Bounty-Belohnung';
  if (tx.type === 'pbt_liquidation') return 'PBT-Ausschüttung';
  if (tx.type === 'streak_bonus') return 'Streak-Bonus';
  return tx.type;
}

export function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('de-DE');
}
