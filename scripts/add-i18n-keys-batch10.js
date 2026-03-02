/**
 * Batch 10: i18n keys for PlayerHero, DiscoveryCard, PriceChart,
 * ClubSwitcher, CreatePostModal, CreateResearchModal, AdminContent
 *
 * Run: node scripts/add-i18n-keys-batch10.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = ['de', 'tr'];

const KEYS = {
  // ── player namespace (PlayerHero + PriceChart) ─────────────
  player: {
    hero: {
      watchlist:      { de: 'Watchlist',                          tr: 'İzleme Listesi' },
      moreOptions:    { de: 'Mehr Optionen',                     tr: 'Diğer Seçenekler' },
      ipo:            { de: 'ERSTVERKAUF',                        tr: 'İLK SATIŞ' },
      scoutsCount:    { de: '{count} Scouts',                     tr: '{count} Scout' },
      yourDpc:        { de: 'Du: {count} DPC',                    tr: 'Sen: {count} DPC' },
      clubSaleFixed:  { de: 'Club Sale \u00B7 Festpreis',        tr: 'Kul\u00FCp Sat\u0131\u015F\u0131 \u00B7 Sabit Fiyat' },
      floorCheapest:  { de: 'Floor \u00B7 g\u00FCnstigstes Angebot', tr: 'Taban \u00B7 en ucuz teklif' },
      removeAlert:    { de: 'Alert entfernen',                    tr: 'Alarm\u0131 kald\u0131r' },
      alertBtn:       { de: 'Alert',                              tr: 'Alarm' },
      close:          { de: 'Schlie\u00DFen',                     tr: 'Kapat' },
    },
    priceHistory:      { de: 'Preisverlauf',                      tr: 'Fiyat Ge\u00E7mi\u015Fi' },
    priceHistoryChart: { de: 'Preisverlauf-Chart',                tr: 'Fiyat Ge\u00E7mi\u015Fi Grafi\u011Fi' },
  },

  // ── market namespace (DiscoveryCard) ───────────────────────
  market: {
    discoveryDealLabel:    { de: 'Wert!',              tr: 'F\u0131rsat!' },
    discoveryNewLabel:     { de: 'Neu',                tr: 'Yeni' },
    discoveryListingLabel: { de: 'Am Markt',           tr: 'Piyasada' },
    discoveryGoalsSuffix:  { de: 'T',                  tr: 'G' },
    discoveryAssistsSuffix:{ de: 'A',                  tr: 'A' },
    discoveryMatchesSuffix:{ de: 'Sp',                 tr: 'M' },
    discoveryAgeSuffix:    { de: 'J.',                 tr: 'Y.' },
    discoveryIpoSold:      { de: '{pct}% verkauft',    tr: '%{pct} sat\u0131ld\u0131' },
    discoveryTradeCount:   { de: '{count}\u00D7 Trades',tr: '{count}\u00D7 \u0130\u015Flem' },
    discoverySellerCount:  { de: '{count} Seller',     tr: '{count} Sat\u0131c\u0131' },
  },

  // ── common namespace (ClubSwitcher) ────────────────────────
  common: {
    discoverClubs: { de: 'Clubs entdecken', tr: 'Kul\u00FCpleri Ke\u015Ffet' },
  },

  // ── community namespace (CreatePostModal) ──────────────────
  community: {
    newPost:            { de: 'Neuer Post',                            tr: 'Yeni G\u00F6nderi' },
    postBtn:            { de: 'Posten',                                tr: 'Payla\u015F' },
    minCharsPost:       { de: 'Mindestens 10 Zeichen ({count}/10)',    tr: 'En az 10 karakter ({count}/10)' },
    categoryLabel:      { de: 'Kategorie',                             tr: 'Kategori' },
    typeLabel:          { de: 'Art',                                    tr: 'T\u00FCr' },
    playerOptional:     { de: 'Spieler (optional)',                     tr: 'Oyuncu (iste\u011Fe ba\u011Fl\u0131)' },
    messageLabel:       { de: 'Nachricht',                              tr: 'Mesaj' },
    tagsLabel:          { de: 'Tags (kommagetrennt)',                   tr: 'Etiketler (virg\u00FClle ayr\u0131lm\u0131\u015F)' },
    messagePlaceholder: { de: 'Was denkst du?',                        tr: 'Ne d\u00FC\u015F\u00FCn\u00FCyorsun?' },
    tagsPlaceholder:    { de: 'z.B. Form, Value, Tactics',             tr: '\u00D6rn. Form, De\u011Fer, Taktik' },
    searchPlayer:       { de: 'Spieler suchen...',                     tr: 'Oyuncu ara...' },
    noPlayer:           { de: 'Kein Spieler',                          tr: 'Oyuncu yok' },
    noPlayerFound:      { de: 'Kein Spieler gefunden',                 tr: 'Oyuncu bulunamad\u0131' },
    removePlayer:       { de: 'Spieler entfernen',                     tr: 'Oyuncuyu kald\u0131r' },
    typeGeneral:        { de: 'Allgemein',                             tr: 'Genel' },
    typeGeneralDesc:    { de: 'Meinung, Analyse, News',                tr: 'G\u00F6r\u00FC\u015F, Analiz, Haberler' },
    typePlayerTake:     { de: 'Spieler-Take',                          tr: 'Oyuncu Yorumu' },
    typePlayerTakeDesc: { de: 'Dein Take zu einem Spieler',            tr: 'Bir oyuncu hakk\u0131ndaki g\u00F6r\u00FC\u015F\u00FCn' },
    typeRumor:          { de: 'Ger\u00FCcht',                          tr: 'S\u00F6ylenti' },
    typeRumorDesc:      { de: 'Transfer\u00ADger\u00FCcht oder Insider-Info', tr: 'Transfer s\u00F6ylentisi veya i\u00E7 bilgi' },
  },

  // ── research namespace (CreateResearchModal) ───────────────
  research: {
    removePlayer: { de: 'Spieler entfernen', tr: 'Oyuncuyu kald\u0131r' },
  },

  // ── admin namespace (AdminContent) ─────────────────────────
  admin: {
    fansCrm:    { de: 'Fans CRM',                   tr: 'Taraftar CRM' },
    clubAdmin:  { de: 'Club-Verwaltung',             tr: 'Kul\u00FCp Y\u00F6netimi' },
    backToClub: { de: 'Zur\u00FCck zur Club-Seite',  tr: 'Kul\u00FCp sayfas\u0131na d\u00F6n' },
  },
};

let totalAdded = 0;

for (const locale of LOCALES) {
  const filePath = path.join(__dirname, '..', 'messages', `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  for (const [ns, entries] of Object.entries(KEYS)) {
    if (!json[ns]) json[ns] = {};

    function addKeys(target, source) {
      for (const [key, val] of Object.entries(source)) {
        if (val && typeof val === 'object' && !val.de && !val.tr) {
          // Nested object (e.g., hero: { ... })
          if (!target[key]) target[key] = {};
          addKeys(target[key], val);
        } else {
          if (target[key] === undefined) {
            target[key] = val[locale];
            totalAdded++;
          }
        }
      }
    }

    addKeys(json[ns], entries);
  }

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
  console.log(`Updated ${locale}.json`);
}

console.log(`\nTotal keys added: ${totalAdded}`);
