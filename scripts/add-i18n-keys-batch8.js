/**
 * Batch 8: UI shared components (common namespace) + Fantasy smaller files (fantasy namespace)
 * Run: node scripts/add-i18n-keys-batch8.js
 */
const fs = require('fs');
const path = require('path');

const COMMON_KEYS = {
  searchPlaceholder: { de: 'Suchen...', tr: 'Ara...' },
  searchClear: { de: 'Suche löschen', tr: 'Aramayı temizle' },
  allLoaded: { de: 'Alle geladen', tr: 'Hepsi yüklendi' },
  loadingEllipsis: { de: 'Laden...', tr: 'Yükleniyor...' },
  loadMore: { de: 'Mehr laden', tr: 'Daha fazla yükle' },
  allFilter: { de: 'Alle', tr: 'Tümü' },
  noData: { de: 'Keine Daten', tr: 'Veri yok' },
};

const FANTASY_KEYS = {
  // Shared across files
  gameweekN: { de: 'Spieltag {gw}', tr: 'Hafta {gw}' },
  prevGameweek: { de: 'Vorheriger Spieltag', tr: 'Önceki Hafta' },
  nextGameweek: { de: 'Nächster Spieltag', tr: 'Sonraki Hafta' },
  ended: { de: 'Beendet', tr: 'Bitti' },
  upcoming: { de: 'Kommend', tr: 'Yakında' },

  // GameweekSelector
  active: { de: 'AKTIV', tr: 'AKTİF' },

  // FixtureCard (spieltag)
  goalsCount: { de: '{count} {count, plural, =1 {Tor} other {Tore}}', tr: '{count} Gol' },

  // GoalTicker
  goalsThisWeek: { de: 'Tore dieser Woche', tr: 'Bu Haftanın Golleri' },

  // SpieltagHeader
  headerCurrent: { de: 'Aktuell', tr: 'Güncel' },
  headerPast: { de: 'Vergangen', tr: 'Geçmiş' },
  ofTotal: { de: 'von {total}', tr: '/ {total}' },
  statusOpen: { de: 'Offen', tr: 'Açık' },
  goalsAndGames: { de: '{goals} Tore · {games} Spiele', tr: '{goals} Gol · {games} Maç' },
  eventsAndGames: { de: '{events} Events · {games} Spiele', tr: '{events} Etkinlik · {games} Maç' },
  simulatedCount: { de: '{done}/{total} simuliert', tr: '{done}/{total} simüle edildi' },
  pastGameweek: { de: 'Vergangener Spieltag', tr: 'Geçmiş Hafta' },
  upcomingGameweek: { de: 'Kommender Spieltag', tr: 'Gelecek Hafta' },
  simulating: { de: 'Wird gestartet...', tr: 'Başlatılıyor...' },
  importData: { de: 'Daten importieren', tr: 'Verileri içe aktar' },
  startGameweek: { de: 'Spieltag starten', tr: 'Haftayı başlat' },
  seasonProgress: { de: 'Saison-Fortschritt', tr: 'Sezon İlerlemesi' },

  // TopScorerShowcase
  topScorer: { de: 'Top Scorer', tr: 'En İyi Oyuncular' },
  posFilterAll: { de: 'Alle', tr: 'Tümü' },
  noPlayersForPos: { de: 'Keine Spieler für diese Position', tr: 'Bu pozisyon için oyuncu yok' },

  // BestElevenShowcase
  bestOfWeek: { de: 'Top {n} der Woche', tr: "Haftanın En İyi {n}'i" },
  bestLabel: { de: 'Best {label}', tr: 'En İyi {label}' },
  poweredBy: { de: 'Powered by BeScout Fantasy', tr: 'BeScout Fantasy tarafından' },

  // TopspielCard
  topMatch: { de: 'Topspiel', tr: 'Öne Çıkan Maç' },
  matchUpcoming: { de: 'Kommend', tr: 'Yakında' },

  // GameweekTab
  allSimulated: { de: '{goals} Tore • Alle Spiele simuliert', tr: '{goals} Gol • Tüm maçlar simüle edildi' },
  partialSimulated: { de: '{done}/10 simuliert', tr: '{done}/10 simüle edildi' },
  notSimulated: { de: 'Noch nicht simuliert', tr: 'Henüz simüle edilmedi' },
  fixtureSimulated: { de: 'Simuliert', tr: 'Simüle Edildi' },
  fixturePlanned: { de: 'Geplant', tr: 'Planlandı' },
  fixtureDetails: { de: 'Details', tr: 'Detaylar' },
  noPlayerData: { de: 'Keine Spielerdaten verfügbar', tr: 'Oyuncu verisi mevcut değil' },
  noGamesForGw: { de: 'Keine Spiele für Spieltag {gw}', tr: 'Hafta {gw} için maç yok' },
  topScorerGw: { de: 'Top Scorer — Spieltag {gw}', tr: 'En İyi Oyuncular — Hafta {gw}' },
  pointsAbbr: { de: 'Pkt', tr: 'Puan' },
};

function addKeys(filePath, namespace, keys) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);
  if (!json[namespace]) json[namespace] = {};
  let added = 0;
  for (const [key, val] of Object.entries(keys)) {
    const lang = filePath.includes('/de.json') || filePath.includes('\\de.json') ? 'de' : 'tr';
    if (!json[namespace][key]) {
      json[namespace][key] = val[lang];
      added++;
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  return added;
}

const deFile = path.resolve(__dirname, '../messages/de.json');
const trFile = path.resolve(__dirname, '../messages/tr.json');

let totalAdded = 0;

// Common namespace
totalAdded += addKeys(deFile, 'common', COMMON_KEYS);
totalAdded += addKeys(trFile, 'common', COMMON_KEYS);
totalAdded += addKeys(deFile, 'fantasy', FANTASY_KEYS);
totalAdded += addKeys(trFile, 'fantasy', FANTASY_KEYS);

const totalKeys = Object.keys(COMMON_KEYS).length + Object.keys(FANTASY_KEYS).length;
console.log(`✓ Batch 8: ${totalAdded} keys added (${totalKeys} defined, 2 locales)`);
