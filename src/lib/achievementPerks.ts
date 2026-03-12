// ============================================
// Achievement Perks — Real rewards on unlock
// ============================================

export type AchievementPerkType = 'cosmetic_unlock' | 'bsd_bonus' | 'feature_unlock' | 'multiplier';

export type AchievementPerk = {
  type: AchievementPerkType;
  cosmeticKey?: string;      // for cosmetic_unlock
  amountCents?: number;      // for bsd_bonus
  feature?: string;          // for feature_unlock
  multiplierTarget?: string; // for multiplier
  multiplierValue?: number;  // for multiplier
  labelDe: string;
  labelTr: string;
};

export const ACHIEVEMENT_PERKS: Record<string, AchievementPerk> = {
  first_trade: {
    type: 'cosmetic_unlock',
    cosmeticKey: 'title_trader',
    labelDe: 'Titel "Trader" freigeschaltet',
    labelTr: '"Trader" unvanı kilidi açıldı',
  },
  '10_trades': {
    type: 'bsd_bonus',
    amountCents: 10000,
    labelDe: '+100 bCredits Bonus',
    labelTr: '+100 bCredits bonus',
  },
  '100_trades': {
    type: 'cosmetic_unlock',
    cosmeticKey: 'frame_trading_legend',
    labelDe: 'Rahmen "Trading-Legende" freigeschaltet',
    labelTr: '"Trading Efsanesi" çerçevesi kilidi açıldı',
  },
  first_event: {
    type: 'feature_unlock',
    feature: 'chips',
    labelDe: 'Chip-System freigeschaltet',
    labelTr: 'Chip sistemi kilidi açıldı',
  },
  event_winner: {
    type: 'cosmetic_unlock',
    cosmeticKey: 'title_champion',
    labelDe: 'Titel "Champion" + Gold-Rahmen freigeschaltet',
    labelTr: '"Şampiyon" unvanı + altın çerçeve kilidi açıldı',
  },
  first_research: {
    type: 'feature_unlock',
    feature: 'research_pricing',
    labelDe: 'Research-Preise setzen freigeschaltet',
    labelTr: 'Araştırma fiyatlandırma kilidi açıldı',
  },
  complete_scout: {
    type: 'bsd_bonus',
    amountCents: 50000,
    labelDe: '+500 bCredits + Legendärer Badge',
    labelTr: '+500 bCredits + efsanevi rozet',
  },
  founding_scout: {
    type: 'multiplier',
    multiplierTarget: 'airdrop',
    multiplierValue: 1.5,
    labelDe: 'Permanenter 1.5x Airdrop-Multiplikator',
    labelTr: 'Kalıcı 1.5x Airdrop çarpanı',
  },
};

/** Get perk for an achievement key, or null if no perk defined */
export function getAchievementPerk(achievementKey: string): AchievementPerk | null {
  return ACHIEVEMENT_PERKS[achievementKey] ?? null;
}

/** Check if a feature is unlocked by achievements */
export function isFeatureUnlockedByAchievement(
  feature: string,
  unlockedKeys: string[],
): boolean {
  return Object.entries(ACHIEVEMENT_PERKS).some(
    ([key, perk]) => perk.type === 'feature_unlock' && perk.feature === feature && unlockedKeys.includes(key),
  );
}
