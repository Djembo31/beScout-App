/**
 * Batch 17: i18n key extraction
 * - SpieltagTab: modal/confirmation strings
 * - EventDetailModal: event detail labels + validation
 * - FantasyContent: toast messages
 * - ResearchCard: confirmation dialog
 * - market/page: link text
 * - aria-labels: Schließen, etc.
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
// SPIELTAG NAMESPACE (SpieltagTab modals)
// ============================================

const spieltagDE = {
  cancelBtn: 'Abbrechen',
  startGameweekBtn: 'Spieltag starten',
  finalizeTitle: 'Spieltag auswerten',
  finalizeDesc: 'Spieltag {gw} wird final ausgewertet. Folgendes passiert:',
  finalizeStep1: 'Events werden gescored und Rankings erstellt',
  finalizeStep1Simple: 'Events werden gescored und Ergebnisse stehen fest',
  finalizeStep2: 'Events für Spieltag {nextGw} werden automatisch erstellt',
  finalizeStep3: 'Spieltag wird auf {nextGw} vorgerückt',
  finalizeWarning: 'Dieser Schritt kann nicht rückgängig gemacht werden. Stelle sicher, dass alle Fixtures importiert sind.',
  finalizeNowBtn: 'Jetzt auswerten',
  importResult: '{fixtures} Fixtures, {scores} Scores',
  importError: 'Fehler: {message}',
  lineupLabel: 'Aufstellung',
  playersProgress: '{filled}/{total} Spieler',
};

const spieltagTR = {
  cancelBtn: 'İptal',
  startGameweekBtn: 'Haftayı Başlat',
  finalizeTitle: 'Haftayı Değerlendir',
  finalizeDesc: 'Hafta {gw} değerlendirilecek. Şunlar olacak:',
  finalizeStep1: 'Etkinlikler puanlanır ve sıralama oluşturulur',
  finalizeStep1Simple: 'Etkinlikler puanlanır ve sonuçlar belirlenir',
  finalizeStep2: 'Hafta {nextGw} için etkinlikler otomatik oluşturulur',
  finalizeStep3: 'Hafta {nextGw} olarak ilerletilir',
  finalizeWarning: 'Bu adım geri alınamaz. Tüm maçların içe aktarıldığından emin olun.',
  finalizeNowBtn: 'Şimdi Değerlendir',
  importResult: '{fixtures} Maç, {scores} Puan',
  importError: 'Hata: {message}',
  lineupLabel: 'Kadro',
  playersProgress: '{filled}/{total} Oyuncu',
};

for (const [k, v] of Object.entries(spieltagDE)) addIfMissing(de, 'spieltag', k, v);
for (const [k, v] of Object.entries(spieltagTR)) addIfMissing(tr, 'spieltag', k, v);

// ============================================
// FANTASY NAMESPACE (EventDetailModal + FantasyContent)
// ============================================

const fantasyDE = {
  eventDetails: 'Event-Details',
  entryLabel: 'Eintritt',
  entryFree: 'Kostenlos',
  prizePoolLabel: 'Preispool',
  formatLabel: 'Format',
  modeLeague: 'Liga',
  modeTournament: 'Turnier',
  minClubPlayersReq: 'Min. {count} {club}-Spieler erforderlich',
  eventEndedError: 'Anmeldung nicht möglich — Event ist beendet.',
  eventFullError: 'Event ist voll — maximale Teilnehmerzahl erreicht.',
  notEnoughScout: 'Nicht genug $SCOUT! Du brauchst {needed} $SCOUT, hast aber nur {balance}.',
  gameweekDone: 'Spieltag abgeschlossen! Nächster Spieltag wird geladen...',
};

const fantasyTR = {
  eventDetails: 'Etkinlik Detayları',
  entryLabel: 'Giriş',
  entryFree: 'Ücretsiz',
  prizePoolLabel: 'Ödül Havuzu',
  formatLabel: 'Format',
  modeLeague: 'Lig',
  modeTournament: 'Turnuva',
  minClubPlayersReq: 'Min. {count} {club} oyuncusu gerekli',
  eventEndedError: 'Kayıt mümkün değil — etkinlik sona erdi.',
  eventFullError: 'Etkinlik dolu — maksimum katılımcı sayısına ulaşıldı.',
  notEnoughScout: 'Yeterli $SCOUT yok! {needed} $SCOUT gerekli, bakiyen {balance}.',
  gameweekDone: 'Hafta tamamlandı! Sonraki hafta yükleniyor...',
};

for (const [k, v] of Object.entries(fantasyDE)) addIfMissing(de, 'fantasy', k, v);
for (const [k, v] of Object.entries(fantasyTR)) addIfMissing(tr, 'fantasy', k, v);

// ============================================
// COMMUNITY NAMESPACE (ResearchCard)
// ============================================

const communityDE = {
  unlockConfirm: 'Ja, freischalten',
  cancelBtn: 'Abbrechen',
};

const communityTR = {
  unlockConfirm: 'Evet, aç',
  cancelBtn: 'İptal',
};

for (const [k, v] of Object.entries(communityDE)) addIfMissing(de, 'community', k, v);
for (const [k, v] of Object.entries(communityTR)) addIfMissing(tr, 'community', k, v);

// ============================================
// MARKET NAMESPACE
// ============================================

const marketDE = {
  goToPlayer: 'Zum Spieler →',
};

const marketTR = {
  goToPlayer: 'Oyuncuya Git →',
};

for (const [k, v] of Object.entries(marketDE)) addIfMissing(de, 'market', k, v);
for (const [k, v] of Object.entries(marketTR)) addIfMissing(tr, 'market', k, v);

// ============================================
// COMMON NAMESPACE (shared aria-labels)
// ============================================

const commonDE = {
  closeLabel: 'Schließen',
};

const commonTR = {
  closeLabel: 'Kapat',
};

for (const [k, v] of Object.entries(commonDE)) addIfMissing(de, 'common', k, v);
for (const [k, v] of Object.entries(commonTR)) addIfMissing(tr, 'common', k, v);

// ============================================
// WRITE
// ============================================

fs.writeFileSync(DE_PATH, JSON.stringify(de, null, 2) + '\n', 'utf8');
fs.writeFileSync(TR_PATH, JSON.stringify(tr, null, 2) + '\n', 'utf8');

const totalKeys = Object.keys(spieltagDE).length + Object.keys(fantasyDE).length +
  Object.keys(communityDE).length + Object.keys(marketDE).length + Object.keys(commonDE).length;
console.log(`✅ Batch 17: ${totalKeys} keys added to de.json + tr.json`);
console.log(`   spieltag: ${Object.keys(spieltagDE).length} keys`);
console.log(`   fantasy: ${Object.keys(fantasyDE).length} keys`);
console.log(`   community: ${Object.keys(communityDE).length} keys`);
console.log(`   market: ${Object.keys(marketDE).length} keys`);
console.log(`   common: ${Object.keys(commonDE).length} keys`);
