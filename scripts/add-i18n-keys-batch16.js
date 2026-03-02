/**
 * Batch 16: i18n key extraction
 * - ProfileOverviewTab: EARNING_TYPES + section headers + trade labels + date locale
 * - CommunityResearchTab: RESEARCH_CATEGORIES + UI strings
 * - ScoutMissionCard: action buttons + criteria labels
 * - TradingCardFrame: stat labels + flip hint
 * - RadarChart: stat label keys for buildPlayerRadarAxes
 */
const fs = require('fs');
const path = require('path');

const DE_PATH = path.join(__dirname, '..', 'messages', 'de.json');
const TR_PATH = path.join(__dirname, '..', 'messages', 'tr.json');

const de = JSON.parse(fs.readFileSync(DE_PATH, 'utf8'));
const tr = JSON.parse(fs.readFileSync(TR_PATH, 'utf8'));

function addIfMissing(obj, ns, key, value) {
  if (!obj[ns]) obj[ns] = {};
  if (!(key in obj[ns])) {
    obj[ns][key] = value;
  }
}

// ============================================
// PROFILE NAMESPACE
// ============================================

const profileDE = {
  playersLabel: 'Spieler',
  earnings: 'Verdienste',
  earningReports: 'Berichte',
  earningBounties: 'Bounties',
  earningFantasy: 'Fantasy',
  earningPolls: 'Umfragen',
  earningMissions: 'Missionen',
  earningStreaks: 'Streaks',
  earningPbt: 'PBT',
  earningTips: 'Scout-Tipps',
  earningSubscription: 'Beratervertrag',
  earningCreatorFund: 'Creator Fund',
  earningAdRevenue: 'Werbeanteil',
  researchEarnings: 'Research-Einnahmen',
  scoutEarned: '$SCOUT verdient',
  salesLabel: 'Verkäufe',
  reportsCount: 'Berichte',
  topPositions: 'Top Positionen',
  recentTrades: 'Letzte Trades',
  tradesCount: '{count} Trades',
  tradeBuy: 'Kauf',
  tradeSell: 'Verkauf',
  showLessTrades: 'Weniger anzeigen',
  showAllTrades: 'Alle {count} anzeigen',
  fantasyResults: 'Fantasy-Ergebnisse',
  bestRank: 'Bester Rang',
  wonLabel: 'Gewonnen',
  rankLabel: 'Rang',
  holdingsTitle: 'Bestände',
  noHoldings: 'Noch keine DPCs im Portfolio',
  goToMarket: 'Zum Marktplatz',
};

const profileTR = {
  playersLabel: 'Oyuncular',
  earnings: 'Kazançlar',
  earningReports: 'Raporlar',
  earningBounties: 'Ödüller',
  earningFantasy: 'Fantasy',
  earningPolls: 'Anketler',
  earningMissions: 'Görevler',
  earningStreaks: 'Seriler',
  earningPbt: 'PBT',
  earningTips: 'Scout İpuçları',
  earningSubscription: 'Danışmanlık',
  earningCreatorFund: 'İçerik Fonu',
  earningAdRevenue: 'Reklam Payı',
  researchEarnings: 'Araştırma Gelirleri',
  scoutEarned: '$SCOUT kazanıldı',
  salesLabel: 'Satışlar',
  reportsCount: 'Raporlar',
  topPositions: 'En İyi Pozisyonlar',
  recentTrades: 'Son İşlemler',
  tradesCount: '{count} İşlem',
  tradeBuy: 'Alış',
  tradeSell: 'Satış',
  showLessTrades: 'Daha az göster',
  showAllTrades: 'Tümünü göster ({count})',
  fantasyResults: 'Fantasy Sonuçları',
  bestRank: 'En İyi Sıra',
  wonLabel: 'Kazanılan',
  rankLabel: 'Sıra',
  holdingsTitle: 'Varlıklar',
  noHoldings: 'Portföyde henüz DPC yok',
  goToMarket: 'Pazara Git',
};

for (const [k, v] of Object.entries(profileDE)) addIfMissing(de, 'profile', k, v);
for (const [k, v] of Object.entries(profileTR)) addIfMissing(tr, 'profile', k, v);

// ============================================
// COMMUNITY NAMESPACE
// ============================================

const communityDE = {
  researchHub: 'Research Hub',
  reportsFiltered: '{shown} von {total} Berichten',
  reportsCountLabel: '{count} Berichte',
  writeReport: 'Bericht schreiben',
  catPlayerAnalysis: 'Spieler-Analyse',
  catTransferRec: 'Transfer-Empfehlung',
  catTactics: 'Taktik',
  catSeasonPreview: 'Saisonvorschau',
  catScoutingReport: 'Scouting-Report',
  missionTierRequired: '{tier} nötig',
  missionCompleted: 'Abgeschlossen',
  missionClaimReward: 'Belohnung abholen',
  missionSubmitPlayer: 'Spieler einreichen',
  criteriaAge: 'Alter ≤ {value}',
  criteriaPosition: 'Position: {value}',
  criteriaL5: 'L5 ≥ {value}',
  criteriaGoals: 'Tore ≥ {value}',
  criteriaAssists: 'Assists ≥ {value}',
  criteriaCS: 'CS ≥ {value}',
  criteriaFloor: 'Floor ≤ {value}',
};

const communityTR = {
  researchHub: 'Araştırma Merkezi',
  reportsFiltered: '{total} rapordan {shown}',
  reportsCountLabel: '{count} Rapor',
  writeReport: 'Rapor Yaz',
  catPlayerAnalysis: 'Oyuncu Analizi',
  catTransferRec: 'Transfer Önerisi',
  catTactics: 'Taktik',
  catSeasonPreview: 'Sezon Önizleme',
  catScoutingReport: 'Keşif Raporu',
  missionTierRequired: '{tier} gerekli',
  missionCompleted: 'Tamamlandı',
  missionClaimReward: 'Ödülü Al',
  missionSubmitPlayer: 'Oyuncu Gönder',
  criteriaAge: 'Yaş ≤ {value}',
  criteriaPosition: 'Pozisyon: {value}',
  criteriaL5: 'L5 ≥ {value}',
  criteriaGoals: 'Gol ≥ {value}',
  criteriaAssists: 'Asist ≥ {value}',
  criteriaCS: 'CS ≥ {value}',
  criteriaFloor: 'Floor ≤ {value}',
};

for (const [k, v] of Object.entries(communityDE)) addIfMissing(de, 'community', k, v);
for (const [k, v] of Object.entries(communityTR)) addIfMissing(tr, 'community', k, v);

// ============================================
// PLAYER NAMESPACE
// ============================================

const playerDE = {
  statGoals: 'Tore',
  statAssists: 'Assists',
  statMatches: 'Spiele',
  statL5: 'L5',
  statL15: 'L15',
  statCS: 'CS',
  statBonus: 'Bonus',
  statMinutes: 'Minuten',
  statTrend: 'Trend',
  statFloor: 'Floor',
  tapToFlip: 'Tippen zum Drehen',
};

const playerTR = {
  statGoals: 'Gol',
  statAssists: 'Asist',
  statMatches: 'Maçlar',
  statL5: 'L5',
  statL15: 'L15',
  statCS: 'CS',
  statBonus: 'Bonus',
  statMinutes: 'Dakika',
  statTrend: 'Trend',
  statFloor: 'Floor',
  tapToFlip: 'Çevirmek için dokun',
};

for (const [k, v] of Object.entries(playerDE)) addIfMissing(de, 'player', k, v);
for (const [k, v] of Object.entries(playerTR)) addIfMissing(tr, 'player', k, v);

// ============================================
// WRITE
// ============================================

fs.writeFileSync(DE_PATH, JSON.stringify(de, null, 2) + '\n', 'utf8');
fs.writeFileSync(TR_PATH, JSON.stringify(tr, null, 2) + '\n', 'utf8');

const totalKeys = Object.keys(profileDE).length + Object.keys(communityDE).length + Object.keys(playerDE).length;
console.log(`✅ Batch 16: ${totalKeys} keys added to de.json + tr.json`);
console.log(`   profile: ${Object.keys(profileDE).length} keys`);
console.log(`   community: ${Object.keys(communityDE).length} keys`);
console.log(`   player: ${Object.keys(playerDE).length} keys`);
