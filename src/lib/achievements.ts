// ============================================
// Achievement Definitions
// ============================================

export type AchievementCategory = 'trading' | 'manager' | 'scout';

export type AchievementDef = {
  key: string;
  label: string;
  description: string;
  icon: string;
  category: AchievementCategory;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  // Trading
  { key: 'first_trade', label: 'Erster Deal', description: 'Ersten DPC-Trade abgeschlossen', icon: '🤝', category: 'trading' },
  { key: '10_trades', label: 'Aktiver Händler', description: '10 Trades abgeschlossen', icon: '📊', category: 'trading' },
  { key: '50_trades', label: 'Profi-Händler', description: '50 Trades abgeschlossen', icon: '💼', category: 'trading' },
  { key: '100_trades', label: 'Trading-Legende', description: '100 Trades abgeschlossen', icon: '👑', category: 'trading' },
  { key: 'portfolio_1000', label: 'Investor', description: 'Portfolio über 1.000 BSD', icon: '💰', category: 'trading' },
  { key: 'portfolio_10000', label: 'Großinvestor', description: 'Portfolio über 10.000 BSD', icon: '🏦', category: 'trading' },
  { key: 'diverse_5', label: 'Diversifiziert', description: '5 verschiedene Spieler im Portfolio', icon: '🎯', category: 'trading' },
  { key: 'diverse_15', label: 'Kader-Sammler', description: '15 verschiedene Spieler im Portfolio', icon: '🏟️', category: 'trading' },
  // Manager
  { key: 'first_event', label: 'Debüt', description: 'Erstes Fantasy-Event gespielt', icon: '⚽', category: 'manager' },
  { key: '5_events', label: 'Stammgast', description: '5 Fantasy-Events gespielt', icon: '🎮', category: 'manager' },
  { key: '20_events', label: 'Veterant', description: '20 Fantasy-Events gespielt', icon: '🏆', category: 'manager' },
  { key: 'event_winner', label: 'Champion', description: 'Ein Fantasy-Event gewonnen', icon: '🥇', category: 'manager' },
  { key: 'podium_3x', label: 'Dauergast', description: '3x auf dem Podium gelandet', icon: '🎖️', category: 'manager' },
  // Scout
  { key: '5_followers', label: 'Aufsteiger', description: '5 Follower erreicht', icon: '📢', category: 'scout' },
  { key: '10_followers', label: 'Influencer', description: '10 Follower erreicht', icon: '🌟', category: 'scout' },
  { key: '50_followers', label: 'Community-Star', description: '50 Follower erreicht', icon: '✨', category: 'scout' },
  { key: 'first_vote', label: 'Mitbestimmer', description: 'Erste Abstimmung abgegeben', icon: '🗳️', category: 'scout' },
  { key: '10_votes', label: 'Demokrat', description: '10 Abstimmungen abgegeben', icon: '🏛️', category: 'scout' },
  { key: 'first_bounty', label: 'Club Scout', description: 'Erste Bounty abgeschlossen', icon: '🎯', category: 'scout' },
];

export function getAchievementDef(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.key === key);
}

export function getAchievementsByCategory(category: AchievementCategory): AchievementDef[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}
