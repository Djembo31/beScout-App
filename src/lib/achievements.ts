// ============================================
// Achievement Definitions
// DB-first with hardcoded fallback
// ============================================

import type { AchievementCategory, DbAchievementDefinition } from '@/types';

export type { AchievementCategory };

export type AchievementDef = {
  key: string;
  label: string;
  description: string;
  /** Phase 3 (2026-04-14): TR-Übersetzungen. NULL fällt auf label/description. */
  label_tr: string | null;
  description_tr: string | null;
  icon: string;
  category: AchievementCategory;
  featured: boolean;
};

// ── Hardcoded fallback (used when DB is unreachable) ──

const FEATURED_FALLBACK: AchievementDef[] = [
  { key: 'first_trade', label: 'Erster Deal', description: 'Ersten Scout Card Trade abgeschlossen', label_tr: 'İlk Anlaşma', description_tr: 'İlk Scout Card ticaretini tamamladın', icon: '🤝', category: 'trading', featured: true },
  { key: '10_trades', label: 'Aktiver Händler', description: '10 Trades abgeschlossen', label_tr: 'Aktif Tüccar', description_tr: '10 ticaret tamamlandı', icon: '📊', category: 'trading', featured: true },
  { key: '100_trades', label: 'Trading-Legende', description: '100 Trades abgeschlossen', label_tr: 'Ticaret Efsanesi', description_tr: '100 ticaret tamamlandı', icon: '👑', category: 'trading', featured: true },
  { key: 'portfolio_10000', label: 'Profi-Sammler', description: 'Sammlung über 10.000 Credits', label_tr: 'Profesyonel Koleksiyoncu', description_tr: '10.000 Credits üstü koleksiyon', icon: '🏦', category: 'trading', featured: true },
  { key: 'smart_money', label: 'Smart Money', description: '5 erfolgreiche Trades in Folge', label_tr: 'Akıllı Para', description_tr: 'Arka arkaya 5 başarılı işlem', icon: '🧠', category: 'trading', featured: true },
  { key: 'first_event', label: 'Debüt', description: 'Erstes Fantasy-Event gespielt', label_tr: 'İlk Maç', description_tr: 'İlk fantezi etkinlik oynandı', icon: '⚽', category: 'manager', featured: true },
  { key: '20_events', label: 'Veteran', description: '20 Fantasy-Events gespielt', label_tr: 'Tecrübeli', description_tr: '20 fantezi etkinlik oynandı', icon: '🏆', category: 'manager', featured: true },
  { key: 'event_winner', label: 'Champion', description: 'Top-Platzierung in einem Fantasy-Event erreicht', label_tr: 'Şampiyon', description_tr: 'Bir fantezi etkinlikte üst sıralamaya ulaşıldı', icon: '🥇', category: 'manager', featured: true },
  { key: 'podium_3x', label: 'Dauergast', description: '3x auf dem Podium gelandet', label_tr: 'Podyum Müdavimi', description_tr: '3 kez podyuma çıkıldı', icon: '🎖️', category: 'manager', featured: true },
  { key: 'gold_standard', label: 'Gold Standard', description: 'Gold-Rang in Manager erreicht', label_tr: 'Altın Standart', description_tr: "Menajer'de Altın rütbeye ulaşıldı", icon: '⭐', category: 'manager', featured: true },
  { key: 'first_post', label: 'Erste Meinung', description: 'Ersten Community-Post geschrieben', label_tr: 'İlk Görüş', description_tr: 'İlk topluluk gönderisi yazıldı', icon: '✍️', category: 'scout', featured: true },
  { key: 'first_research', label: 'Analyst', description: 'Erste Research-Analyse veröffentlicht', label_tr: 'Analist', description_tr: 'İlk araştırma analizi yayınlandı', icon: '🔬', category: 'scout', featured: true },
  { key: '10_upvotes', label: 'Meinungsführer', description: '10 Upvotes auf Posts erhalten', label_tr: 'Kanaat Önderi', description_tr: 'Gönderilerde 10 beğeni alındı', icon: '🔥', category: 'scout', featured: true },
  { key: 'scout_network', label: 'Scout-Netzwerk', description: '25 Follower erreicht', label_tr: 'İzci Ağı', description_tr: '25 takipçiye ulaşıldı', icon: '🌐', category: 'scout', featured: true },
  { key: 'complete_scout', label: 'Complete Scout', description: 'In allen 3 Dimensionen Silber+', label_tr: 'Tam İzci', description_tr: '3 boyutta da Gümüş+', icon: '💎', category: 'scout', featured: true },
];

const HIDDEN_FALLBACK: AchievementDef[] = [
  { key: '50_trades', label: 'Profi-Händler', description: '50 Trades abgeschlossen', label_tr: 'Profesyonel Tüccar', description_tr: '50 işlem tamamlandı', icon: '💼', category: 'trading', featured: false },
  { key: 'portfolio_1000', label: 'Sammler', description: 'Sammlung über 1.000 Credits', label_tr: 'Koleksiyoncu', description_tr: '1.000 Credits üstü koleksiyon', icon: '💰', category: 'trading', featured: false },
  { key: 'diverse_5', label: 'Diversifiziert', description: '5 verschiedene Spieler in der Sammlung', label_tr: 'Çeşitlendirilmiş', description_tr: 'Koleksiyonda 5 farklı oyuncu', icon: '🎯', category: 'trading', featured: false },
  { key: 'diverse_15', label: 'Kader-Sammler', description: '15 verschiedene Spieler in der Sammlung', label_tr: 'Kadro Koleksiyoncusu', description_tr: 'Koleksiyonda 15 farklı oyuncu', icon: '🏟️', category: 'trading', featured: false },
  { key: 'sell_order', label: 'Erstverkauf', description: 'Ersten Sell-Order erstellt', label_tr: 'İlk Satış', description_tr: 'İlk satış emri oluşturuldu', icon: '🏷️', category: 'trading', featured: false },
  { key: 'diamond_hands', label: 'Diamond Hands', description: 'Scout Card 30 Tage gehalten ohne zu verkaufen', label_tr: 'Elmas Eller', description_tr: "Scout Card'yi satmadan 30 gün tutma", icon: '💎', category: 'trading', featured: false },
  { key: '3_events', label: 'Spieltag-Fan', description: '3 Fantasy-Events gespielt', label_tr: 'Maç Günü Hayranı', description_tr: '3 fantezi etkinlik oynandı', icon: '📅', category: 'manager', featured: false },
  { key: '5_events', label: 'Stammgast', description: '5 Fantasy-Events gespielt', label_tr: 'Devamlı Müşteri', description_tr: '5 fantezi etkinlik oynandı', icon: '🎮', category: 'manager', featured: false },
  { key: 'verified', label: 'Verifiziert', description: 'Profil verifiziert', label_tr: 'Doğrulanmış', description_tr: 'Profil doğrulandı', icon: '✅', category: 'scout', featured: false },
  { key: 'research_sold', label: 'Bestseller', description: 'Erste Research-Analyse verkauft', label_tr: 'Çok Satan', description_tr: 'İlk araştırma analizi satıldı', icon: '💎', category: 'scout', featured: false },
  { key: '5_followers', label: 'Aufsteiger', description: '5 Follower erreicht', label_tr: 'Yükselen Yıldız', description_tr: '5 takipçiye ulaşıldı', icon: '📢', category: 'scout', featured: false },
  { key: '10_followers', label: 'Influencer', description: '10 Follower erreicht', label_tr: 'Influencer', description_tr: '10 takipçiye ulaşıldı', icon: '🌟', category: 'scout', featured: false },
  { key: '50_followers', label: 'Community-Star', description: '50 Follower erreicht', label_tr: 'Topluluk Yıldızı', description_tr: '50 takipçiye ulaşıldı', icon: '✨', category: 'scout', featured: false },
  { key: 'first_vote', label: 'Mitbestimmer', description: 'Erste Abstimmung abgegeben', label_tr: 'Oy Veren', description_tr: 'İlk oy kullanıldı', icon: '🗳️', category: 'scout', featured: false },
  { key: '10_votes', label: 'Demokrat', description: '10 Abstimmungen abgegeben', label_tr: 'Demokrat', description_tr: '10 oy kullanıldı', icon: '🏛️', category: 'scout', featured: false },
  { key: 'first_bounty', label: 'Club Scout', description: 'Erste Bounty abgeschlossen', label_tr: 'Kulüp Scoutu', description_tr: 'İlk görev tamamlandı', icon: '🎯', category: 'scout', featured: false },
  { key: 'scout_specialist', label: 'Scout-Spezialist', description: '10 Scouting-Reports mit Ø 4.0+ Bewertung', label_tr: 'Keşif Uzmanı', description_tr: 'Ø 4.0+ değerlendirmeyle 10 keşif raporu', icon: '🔭', category: 'scout', featured: false },
  { key: 'founding_scout', label: 'Founding Scout', description: 'Unter den ersten 50 Scouts auf BeScout', label_tr: 'Kurucu Scout', description_tr: "BeScout'un ilk 50 scoutu arasında", icon: '🌟', category: 'scout', featured: false },
];

// Hardcoded combined (used as fallback + by checkAndUnlockAchievements)
export const ACHIEVEMENTS: AchievementDef[] = [...FEATURED_FALLBACK, ...HIDDEN_FALLBACK];

// ── DB-first helpers ──

function dbToAchievementDef(row: DbAchievementDefinition): AchievementDef {
  return {
    key: row.key,
    label: row.title,
    description: row.description,
    label_tr: row.title_tr,
    description_tr: row.description_tr,
    icon: row.icon,
    category: row.category,
    featured: row.featured,
  };
}

/**
 * Resolve achievement label for the given locale, with DE fallback when `label_tr`
 * is NULL (robust — analog J7-AR-54 `resolveMissionTitle` + J11 `resolveEquipmentName`).
 *
 * Consumers pass `useLocale()` from next-intl.
 *
 * Phase 3 (2026-04-14): Previously AchievementsSection rendered `ach.label` directly →
 * TR-User sah "Erster Deal/Aktiver Händler/..." obwohl `title_tr` in
 * `achievement_definitions` gefüllt ist. Dieser Helper ist die Single Source of Truth.
 */
export function resolveAchievementLabel(
  def: Pick<AchievementDef, 'label' | 'label_tr'>,
  locale: string,
): string {
  if (locale === 'tr' && def.label_tr) return def.label_tr;
  return def.label;
}

/**
 * Resolve achievement description for the given locale, with DE fallback when
 * `description_tr` is NULL.
 */
export function resolveAchievementDescription(
  def: Pick<AchievementDef, 'description' | 'description_tr'>,
  locale: string,
): string {
  if (locale === 'tr' && def.description_tr) return def.description_tr;
  return def.description;
}

let _dbCache: AchievementDef[] | null = null;
let _dbCacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5min

/** Fetch active achievements from DB, fallback to hardcoded */
export async function fetchAchievements(): Promise<AchievementDef[]> {
  if (_dbCache && Date.now() - _dbCacheTs < CACHE_TTL) return _dbCache;

  const { supabase } = await import('@/lib/supabaseClient');
  const { data, error } = await supabase
    .from('achievement_definitions')
    .select('*')
    .eq('active', true)
    .order('sort_order');

  if (error || !data || data.length === 0) {
    console.error('[Achievements] DB fetch failed, using fallback:', error?.message);
    return ACHIEVEMENTS;
  }

  _dbCache = (data as DbAchievementDefinition[]).map(dbToAchievementDef);
  _dbCacheTs = Date.now();
  return _dbCache;
}

/** Invalidate cache (call after admin edits) */
export function invalidateAchievementCache(): void {
  _dbCache = null;
  _dbCacheTs = 0;
}

// ── Sync helpers (used by components that can't await) ──

export function getAchievementDef(key: string): AchievementDef | undefined {
  // Check cache first, then fallback
  if (_dbCache) return _dbCache.find(a => a.key === key);
  return ACHIEVEMENTS.find(a => a.key === key);
}

export function getAchievementsByCategory(category: AchievementCategory): AchievementDef[] {
  const source = _dbCache ?? ACHIEVEMENTS;
  return source.filter(a => a.category === category);
}

export function getFeaturedAchievements(): AchievementDef[] {
  const source = _dbCache ?? ACHIEVEMENTS;
  return source.filter(a => a.featured);
}

export function getHiddenAchievements(): AchievementDef[] {
  const source = _dbCache ?? ACHIEVEMENTS;
  return source.filter(a => !a.featured);
}
