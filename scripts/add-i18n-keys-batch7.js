/**
 * Batch 7: Manager/Bestand i18n keys
 * Adds ~81 keys to the `market` namespace in de.json and tr.json
 */
const fs = require('fs');
const path = require('path');

const KEYS = {
  // ManagerBestandTab summary stats
  bestandSummaryPlayers: { de: "Spieler", tr: "Oyuncular" },
  bestandSummarySquadValue: { de: "Kaderwert", tr: "Kadro Değeri" },
  bestandSummaryPnl: { de: "G/V", tr: "K/Z" },
  bestandSummaryActivity: { de: "Aktivität", tr: "Aktivite" },
  bestandSummaryNone: { de: "Keine", tr: "Yok" },

  // Shared listing/offer counts (BestandPlayerRow + ManagerBestandTab)
  bestandListedCount: { de: "{count} gelistet", tr: "{count} listelenmiş" },
  bestandOfferCount: { de: "{count, plural, =1 {1 Angebot} other {{count} Angebote}}", tr: "{count} Teklif" },
  bestandNotListed: { de: "Nicht gelistet", tr: "Listelenmemiş" },
  bestandNoOffer: { de: "Kein Angebot", tr: "Teklif yok" },
  bestandAvailableCount: { de: "{count} verfügbar", tr: "{count} mevcut" },
  bestandAvailableShort: { de: "{count} verfüg.", tr: "{count} mev." },

  // Stat abbreviations (BestandPlayerRow + ManagerKaderTab)
  statMatchesAbbr: { de: "S", tr: "M" },
  statGoalsAbbr: { de: "T", tr: "G" },
  statAssistsAbbr: { de: "A", tr: "A" },
  bestandBuyPrice: { de: "EK", tr: "AF" },
  bestandFloor: { de: "Floor", tr: "Floor" },
  bestandAgeYears: { de: "J.", tr: "Y." },
  bestandSell: { de: "Verkaufen", tr: "Sat" },
  bestandInLineup: { de: "In Aufstellung", tr: "Dizilişte" },

  // Kader Tab (ManagerKaderTab)
  kaderPosGk: { de: "Torwart", tr: "Kaleci" },
  kaderPosDef: { de: "Verteidiger", tr: "Defans" },
  kaderPosMid: { de: "Mittelfeldspieler", tr: "Orta Saha" },
  kaderPosAtt: { de: "Angreifer", tr: "Forvet" },
  kaderAllTab: { de: "Alle", tr: "Tümü" },
  kaderSearchPlaceholder: { de: "Spieler suchen...", tr: "Oyuncu ara..." },
  kaderSearchLabel: { de: "Spieler suchen", tr: "Oyuncu ara" },
  kaderPickTitle: { de: "Wähle deinen {pos}", tr: "{pos} seç" },
  kaderYourSquad: { de: "Dein Kader ({count})", tr: "Kadron ({count})" },
  kaderSortValue: { de: "Wert", tr: "Değer" },
  kaderSortNameLabel: { de: "Name", tr: "İsim" },
  kaderNoOwnedPos: { de: "Keine eigenen {pos}-Spieler", tr: "Kendi {pos} oyuncun yok" },
  kaderNoPlayersFound: { de: "Keine Spieler gefunden", tr: "Oyuncu bulunamadı" },
  kaderBuyPlayers: { de: "Spieler kaufen", tr: "Oyuncu satın al" },
  kaderNoPlayersYet: { de: "Noch keine Spieler im Kader", tr: "Henüz kadroda oyuncu yok" },
  kaderPresetsLabel: { de: "Vorlagen", tr: "Şablonlar" },
  kaderPresetNameLabel: { de: "Vorlagenname", tr: "Şablon adı" },
  kaderSavePreset: { de: "Speichern", tr: "Kaydet" },
  kaderDeletePreset: { de: "Vorlage {name} löschen", tr: "{name} şablonunu sil" },
  kaderNoPresets: { de: "Noch keine Vorlagen", tr: "Henüz şablon yok" },
  kaderResetLabel: { de: "Aufstellung zurücksetzen", tr: "Dizilişi sıfırla" },
  kaderReset: { de: "Reset", tr: "Sıfırla" },
  kaderClose: { de: "Schließen", tr: "Kapat" },
  kaderPickPos: { de: "{pos} wählen", tr: "{pos} seç" },
  kaderAvailableCount: { de: "{count} verfügbar", tr: "{count} mevcut" },
  kaderNoOwnedPosAlt: { de: "Du besitzt keine {pos}", tr: "{pos} oyuncun yok" },
  kaderAllPlayers: { de: "Alle Spieler ({count})", tr: "Tüm Oyuncular ({count})" },
  kaderEmptyDesc: { de: "Verpflichte Spieler über Scouting oder Transferliste", tr: "Scouting veya transfer listesi üzerinden oyuncu al" },
  kaderEventUsage: { de: "In {count} aktiven Event(s) aufgestellt", tr: "{count} aktif etkinlikte dizilişte" },

  // Compare Card (ComparePlayerCard)
  compareMatches: { de: "Spiele", tr: "Maç" },
  compareGoals: { de: "Tore", tr: "Gol" },
  compareAssists: { de: "Assists", tr: "Asist" },

  // Squad Summary (SquadSummaryStats)
  summarySquadValue: { de: "Kaderwert:", tr: "Kadro Değeri:" },
  summaryLineup: { de: "Aufstellung:", tr: "Diziliş:" },
  summaryPerf: { de: "Perf:", tr: "Perf:" },

  // Sell Modal (BestandSellModal)
  sellModalTitle: { de: "DPC verkaufen", tr: "DPC sat" },
  sellListing: { de: "Wird gelistet...", tr: "Listeleniyor..." },
  sellListCta: { de: "{qty}× für {price} $SCOUT listen", tr: "{qty}× {price} $SCOUT'a listele" },
  sellListSuccess: { de: "{qty}× für {price} $SCOUT gelistet", tr: "{qty}× {price} $SCOUT'a listelendi" },
  sellError: { de: "Fehler", tr: "Hata" },
  sellMyListings: { de: "Meine Listings", tr: "Listelerim" },
  sellNetShort: { de: "Netto", tr: "Net" },
  sellCancel: { de: "Stornieren", tr: "İptal et" },
  sellIncomingOffers: { de: "Eingehende Angebote", tr: "Gelen Teklifler" },
  sellOfferText: { de: "bietet", tr: "teklif ediyor" },
  sellViewOffer: { de: "Ansehen", tr: "Görüntüle" },
  sellPricePlaceholder: { de: "Preis pro DPC", tr: "DPC başına fiyat" },
  sellQuickSelect: { de: "Schnellwahl:", tr: "Hızlı seçim:" },
  sellGross: { de: "Brutto:", tr: "Brüt:" },
  sellFee: { de: "Gebühr:", tr: "Komisyon:" },
  sellNetLabel: { de: "Netto:", tr: "Net:" },
  sellAllListed: { de: "Alle DPCs sind bereits gelistet", tr: "Tüm DPC'ler zaten listelenmiş" },

  // Club Group (BestandClubGroup)
  bestandPlayersCount: { de: "{count} Spieler", tr: "{count} Oyuncu" },

  // Status Pills (bestandHelpers)
  statusFitShort: { de: "Fit", tr: "Fit" },
  statusInjuredShort: { de: "Verl.", tr: "Sak." },
  statusSuspendedShort: { de: "Gesp.", tr: "Cez." },
  statusDoubtfulShort: { de: "Fragl.", tr: "Şüp." },

  // Market Badges (bestandHelpers)
  badgeActiveIpo: { de: "Aktive IPO", tr: "Aktif IPO" },
  badgeOnTransferList: { de: "Auf Transferliste", tr: "Transfer Listesinde" },
  badgeIncomingOffers: { de: "Eingehende Angebote", tr: "Gelen Teklifler" },

  // BestandToolbar (missing aria-labels)
  bestandSortLabel: { de: "Sortieren nach", tr: "Sıralama" },
  bestandFilterLabel: { de: "Filter anzeigen", tr: "Filtreleri göster" },
};

function addKeys(locale) {
  const filePath = path.join(__dirname, '..', 'messages', `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (!data.market) data.market = {};

  let added = 0;
  for (const [key, vals] of Object.entries(KEYS)) {
    if (!data.market[key]) {
      data.market[key] = vals[locale];
      added++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`${locale}.json: ${added} keys added to market namespace`);
}

addKeys('de');
addKeys('tr');
console.log(`Total keys defined: ${Object.keys(KEYS).length}`);
