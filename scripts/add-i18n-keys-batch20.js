/**
 * Batch 20: i18n keys for data constants + UI components
 * - activity namespace: transaction type labels + relative time
 * - roles namespace: admin role labels
 * - tour namespace: tour step titles + descriptions
 * - subscription namespace: tier labels + benefit strings
 */
const fs = require('fs');
const path = require('path');

const DE_PATH = path.join(__dirname, '..', 'messages', 'de.json');
const TR_PATH = path.join(__dirname, '..', 'messages', 'tr.json');

const NEW_KEYS = {
  activity: {
    de: {
      tradeBuy: 'DPC gekauft',
      tradeSell: 'DPC verkauft',
      ipoBuy: 'IPO-Kauf',
      entryFee: 'Event-Eintritt',
      entryRefund: 'Event-Erstattung',
      fantasyReward: 'Fantasy-Belohnung',
      voteFee: 'Abstimmung',
      deposit: 'Einzahlung',
      researchUnlock: 'Bericht freigeschaltet',
      researchEarning: 'Bericht-Einnahme',
      pollVoteCost: 'Umfrage-Teilnahme',
      pollEarning: 'Umfrage-Einnahme',
      missionReward: 'Missions-Belohnung',
      bountyCost: 'Bounty-Zahlung',
      bountyReward: 'Bounty-Belohnung',
      pbtLiquidation: 'PBT-Ausschüttung',
      streakBonus: 'Streak-Bonus',
      justNow: 'gerade eben',
    },
    tr: {
      tradeBuy: 'DPC satın alındı',
      tradeSell: 'DPC satıldı',
      ipoBuy: 'IPO alımı',
      entryFee: 'Etkinlik girişi',
      entryRefund: 'Etkinlik iadesi',
      fantasyReward: 'Fantezi ödülü',
      voteFee: 'Oylama',
      deposit: 'Yatırma',
      researchUnlock: 'Rapor açıldı',
      researchEarning: 'Rapor geliri',
      pollVoteCost: 'Anket katılımı',
      pollEarning: 'Anket geliri',
      missionReward: 'Görev ödülü',
      bountyCost: 'Bounty ödemesi',
      bountyReward: 'Bounty ödülü',
      pbtLiquidation: 'PBT dağıtımı',
      streakBonus: 'Seri bonusu',
      justNow: 'az önce',
    },
  },
  roles: {
    de: {
      owner: 'Eigentümer',
      admin: 'Verwalter',
      editor: 'Redakteur',
    },
    tr: {
      owner: 'Sahip',
      admin: 'Yönetici',
      editor: 'Editör',
    },
  },
  tour: {
    de: {
      balanceTitle: 'Dein Guthaben',
      balanceDescDesktop: 'Hier siehst du dein $SCOUT-Guthaben. Verdiene $SCOUT durch Trading, Fantasy-Turniere und Analysen.',
      balanceDescMobile: 'Hier siehst du dein $SCOUT-Guthaben. Verdiene $SCOUT durch Trading, Fantasy und Analysen.',
      searchTitle: 'Globale Suche',
      searchDesc: 'Finde Spieler, Research und andere Nutzer mit der Suche.',
      notificationsTitle: 'Benachrichtigungen',
      notificationsDesc: 'Trades, Fantasy-Ergebnisse und Community-Updates — alles auf einen Blick.',
      dashboardTitle: 'Dein Dashboard',
      dashboardDesc: 'Kader-Wert, Wertentwicklung und Spieler-Anzahl — deine wichtigsten Kennzahlen.',
      managerTitle: 'Manager Office',
      managerDescDesktop: 'Kaufe und verkaufe Digital Player Cards, verwalte dein Portfolio und finde IPOs.',
      managerDescMobile: 'Kaufe und verkaufe Digital Player Cards und verwalte dein Portfolio.',
      fantasyTitle: 'Fantasy Events',
      fantasyDesc: 'Stelle dein Lineup auf, tritt gegen andere an und gewinne $SCOUT-Preisgelder!',
    },
    tr: {
      balanceTitle: 'Bakiyen',
      balanceDescDesktop: 'Burada $SCOUT bakiyeni görürsün. Trading, fantezi turnuvaları ve analizlerle $SCOUT kazan.',
      balanceDescMobile: 'Burada $SCOUT bakiyeni görürsün. Trading, fantezi ve analizlerle $SCOUT kazan.',
      searchTitle: 'Genel Arama',
      searchDesc: 'Oyuncuları, araştırmaları ve diğer kullanıcıları bul.',
      notificationsTitle: 'Bildirimler',
      notificationsDesc: 'İşlemler, fantezi sonuçları ve topluluk güncellemeleri — hepsi bir arada.',
      dashboardTitle: 'Pano',
      dashboardDesc: 'Kadro değeri, değer gelişimi ve oyuncu sayısı — en önemli göstergelerin.',
      managerTitle: 'Menajer Ofisi',
      managerDescDesktop: 'Dijital Oyuncu Kartlarını al ve sat, portföyünü yönet ve IPO\'ları keşfet.',
      managerDescMobile: 'Dijital Oyuncu Kartlarını al ve sat, portföyünü yönet.',
      fantasyTitle: 'Fantezi Etkinlikler',
      fantasyDesc: 'Kadronuzu kur, rakiplerinizle yarış ve $SCOUT ödüllerini kazan!',
    },
  },
  subscription: {
    de: {
      bronze: 'Bronze',
      silber: 'Silber',
      gold: 'Gold',
      benefitBadge: 'Profil-Abzeichen',
      benefitVoteWeight: 'Stimmgewicht ×2 bei Votes',
      benefitTradingDiscount05: 'Trading-Rabatt (0.5%)',
      benefitAllBronze: 'Alle Bronze-Vorteile',
      benefitIpoEarlyAccess: 'IPO-Vorkaufsrecht (24h)',
      benefitExclusiveBounties: 'Exklusive Aufträge',
      benefitTradingDiscount1: 'Trading-Rabatt (1%)',
      benefitAllSilber: 'Alle Silber-Vorteile',
      benefitScoreBoost: 'Score Boost (+20%)',
      benefitPremiumFantasy: 'Premium Fantasy Events',
      benefitTradingDiscount15: 'Trading-Rabatt (1.5%)',
      renewalDisabled: 'Verlängerung deaktiviert',
      activeLabel: 'Aktiv',
      perMonth: '/Monat',
    },
    tr: {
      bronze: 'Bronz',
      silber: 'Gümüş',
      gold: 'Altın',
      benefitBadge: 'Profil rozeti',
      benefitVoteWeight: 'Oylarda ×2 oy ağırlığı',
      benefitTradingDiscount05: 'İşlem indirimi (%0,5)',
      benefitAllBronze: 'Tüm Bronz avantajları',
      benefitIpoEarlyAccess: 'IPO ön alım hakkı (24s)',
      benefitExclusiveBounties: 'Özel görevler',
      benefitTradingDiscount1: 'İşlem indirimi (%1)',
      benefitAllSilber: 'Tüm Gümüş avantajları',
      benefitScoreBoost: 'Skor artışı (+%20)',
      benefitPremiumFantasy: 'Premium Fantezi Etkinlikler',
      benefitTradingDiscount15: 'İşlem indirimi (%1,5)',
      renewalDisabled: 'Yenileme devre dışı',
      activeLabel: 'Aktif',
      perMonth: '/Ay',
    },
  },
};

function merge(file, keys) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const lang = file.includes('tr.json') ? 'tr' : 'de';

  for (const [ns, langs] of Object.entries(keys)) {
    const translations = langs[lang];
    if (!translations) continue;
    if (!json[ns]) json[ns] = {};
    for (const [key, val] of Object.entries(translations)) {
      json[ns][key] = val;
    }
  }

  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`✅ ${path.basename(file)} updated`);
}

merge(DE_PATH, NEW_KEYS);
merge(TR_PATH, NEW_KEYS);
console.log('Done — batch 20 keys added.');
