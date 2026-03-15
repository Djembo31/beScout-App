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
  /** Featured achievements are prominently shown, hidden ones appear on unlock */
  featured: boolean;
};

// ── 15 Featured (Kern) Achievements ──

const FEATURED: AchievementDef[] = [
  // Trading (5)
  { key: 'first_trade', label: 'Erster Deal', description: 'Ersten DPC-Trade abgeschlossen', icon: '🤝', category: 'trading', featured: true },
  { key: '10_trades', label: 'Aktiver Händler', description: '10 Trades abgeschlossen', icon: '📊', category: 'trading', featured: true },
  { key: '100_trades', label: 'Trading-Legende', description: '100 Trades abgeschlossen', icon: '👑', category: 'trading', featured: true },
  { key: 'portfolio_10000', label: 'Profi-Sammler', description: 'Kader über 10.000 $SCOUT', icon: '🏦', category: 'trading', featured: true },
  { key: 'smart_money', label: 'Smart Money', description: '5 erfolgreiche Trades in Folge', icon: '🧠', category: 'trading', featured: true },
  // Manager (5)
  { key: 'first_event', label: 'Debüt', description: 'Erstes Fantasy-Event gespielt', icon: '⚽', category: 'manager', featured: true },
  { key: '20_events', label: 'Veteran', description: '20 Fantasy-Events gespielt', icon: '🏆', category: 'manager', featured: true },
  { key: 'event_winner', label: 'Champion', description: 'Ein Fantasy-Event gewonnen', icon: '🥇', category: 'manager', featured: true },
  { key: 'podium_3x', label: 'Dauergast', description: '3x auf dem Podium gelandet', icon: '🎖️', category: 'manager', featured: true },
  { key: 'gold_standard', label: 'Gold Standard', description: 'Gold-Rang in Manager erreicht', icon: '⭐', category: 'manager', featured: true },
  // Scout (5)
  { key: 'first_post', label: 'Erste Meinung', description: 'Ersten Community-Post geschrieben', icon: '✍️', category: 'scout', featured: true },
  { key: 'first_research', label: 'Analyst', description: 'Erste Research-Analyse veröffentlicht', icon: '🔬', category: 'scout', featured: true },
  { key: '10_upvotes', label: 'Meinungsführer', description: '10 Upvotes auf Posts erhalten', icon: '🔥', category: 'scout', featured: true },
  { key: 'scout_network', label: 'Scout-Netzwerk', description: '25 Follower erreicht', icon: '🌐', category: 'scout', featured: true },
  { key: 'complete_scout', label: 'Complete Scout', description: 'In allen 3 Dimensionen Silber+', icon: '💎', category: 'scout', featured: true },
];

// ── 15 Hidden (Discovery) Achievements ──

const HIDDEN: AchievementDef[] = [
  // Trading
  { key: '50_trades', label: 'Profi-Händler', description: '50 Trades abgeschlossen', icon: '💼', category: 'trading', featured: false },
  { key: 'portfolio_1000', label: 'Sammler', description: 'Kader über 1.000 $SCOUT', icon: '💰', category: 'trading', featured: false },
  { key: 'diverse_5', label: 'Diversifiziert', description: '5 verschiedene Spieler im Portfolio', icon: '🎯', category: 'trading', featured: false },
  { key: 'diverse_15', label: 'Kader-Sammler', description: '15 verschiedene Spieler im Portfolio', icon: '🏟️', category: 'trading', featured: false },
  { key: 'sell_order', label: 'Erstverkauf', description: 'Ersten Sell-Order erstellt', icon: '🏷️', category: 'trading', featured: false },
  { key: 'diamond_hands', label: 'Diamond Hands', description: 'DPC 30 Tage gehalten ohne zu verkaufen', icon: '💎', category: 'trading', featured: false },
  // Manager
  { key: '3_events', label: 'Spieltag-Fan', description: '3 Fantasy-Events gespielt', icon: '📅', category: 'manager', featured: false },
  { key: '5_events', label: 'Stammgast', description: '5 Fantasy-Events gespielt', icon: '🎮', category: 'manager', featured: false },
  // Scout
  { key: 'verified', label: 'Verifiziert', description: 'Profil verifiziert', icon: '✅', category: 'scout', featured: false },
  { key: 'research_sold', label: 'Bestseller', description: 'Erste Research-Analyse verkauft', icon: '💎', category: 'scout', featured: false },
  { key: '5_followers', label: 'Aufsteiger', description: '5 Follower erreicht', icon: '📢', category: 'scout', featured: false },
  { key: '10_followers', label: 'Influencer', description: '10 Follower erreicht', icon: '🌟', category: 'scout', featured: false },
  { key: '50_followers', label: 'Community-Star', description: '50 Follower erreicht', icon: '✨', category: 'scout', featured: false },
  { key: 'first_vote', label: 'Mitbestimmer', description: 'Erste Abstimmung abgegeben', icon: '🗳️', category: 'scout', featured: false },
  { key: '10_votes', label: 'Demokrat', description: '10 Abstimmungen abgegeben', icon: '🏛️', category: 'scout', featured: false },
  { key: 'first_bounty', label: 'Club Scout', description: 'Erste Bounty abgeschlossen', icon: '🎯', category: 'scout', featured: false },
  { key: 'scout_specialist', label: 'Scout-Spezialist', description: '10 Scouting-Reports mit Ø 4.0+ Bewertung', icon: '🔭', category: 'scout', featured: false },
  { key: 'founding_scout', label: 'Founding Scout', description: 'Unter den ersten 50 Scouts auf BeScout', icon: '🌟', category: 'scout', featured: false },
];

export const ACHIEVEMENTS: AchievementDef[] = [...FEATURED, ...HIDDEN];

export function getAchievementDef(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.key === key);
}

export function getAchievementsByCategory(category: AchievementCategory): AchievementDef[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}

export function getFeaturedAchievements(): AchievementDef[] {
  return FEATURED;
}

export function getHiddenAchievements(): AchievementDef[] {
  return HIDDEN;
}
