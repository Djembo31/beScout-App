/**
 * Batch 18: i18n key extraction
 * - InstallPrompt: PWA install banner
 * - TourOverlay: onboarding tour navigation
 * - FeedbackModal: feedback form
 * - CreateCommunityPollModal: poll creation form
 * - SentimentGauge: buy/sell labels
 * - DPCSupplyRing: supply distribution labels
 * - SponsorBanner: placement labels
 * - SpieltagSelector: aria-labels
 * - ReferralCard: referral section
 * - ProfileView: wallet + score section
 * - ResearchCard: unlock button text
 * - ui/index.tsx: Modal close aria-label (already in common.closeLabel)
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
// COMMON NAMESPACE (shared labels)
// ============================================

const commonDE = {
  backLabel: 'Zurück',
  skipLabel: 'Überspringen',
  nextLabel: 'Weiter',
  doneLabel: 'Fertig',
  copyLabel: 'Kopieren',
  refreshLabel: 'Aktualisieren',
  pageLabel: 'Seite',
  prevGameweek: 'Vorheriger Spieltag',
  nextGameweek: 'Nächster Spieltag',
};

const commonTR = {
  backLabel: 'Geri',
  skipLabel: 'Atla',
  nextLabel: 'İleri',
  doneLabel: 'Tamam',
  copyLabel: 'Kopyala',
  refreshLabel: 'Yenile',
  pageLabel: 'Sayfa',
  prevGameweek: 'Önceki Hafta',
  nextGameweek: 'Sonraki Hafta',
};

for (const [k, v] of Object.entries(commonDE)) addIfMissing(de, 'common', k, v);
for (const [k, v] of Object.entries(commonTR)) addIfMissing(tr, 'common', k, v);

// ============================================
// PWA NAMESPACE (InstallPrompt)
// ============================================

const pwaDE = {
  installTitle: 'App installieren',
  installSubtitle: 'BeScout auf deinem Homescreen',
  installBtn: 'Installieren',
};

const pwaTR = {
  installTitle: 'Uygulamayı Yükle',
  installSubtitle: 'BeScout ana ekranında',
  installBtn: 'Yükle',
};

for (const [k, v] of Object.entries(pwaDE)) addIfMissing(de, 'pwa', k, v);
for (const [k, v] of Object.entries(pwaTR)) addIfMissing(tr, 'pwa', k, v);

// ============================================
// FEEDBACK NAMESPACE (FeedbackModal)
// ============================================

const feedbackDE = {
  title: 'Feedback senden',
  typeBug: 'Bug melden',
  typeFeature: 'Feature-Wunsch',
  typeOther: 'Sonstiges',
  placeholderBug: 'Beschreibe den Bug — was hast du erwartet, was ist passiert?',
  placeholderFeature: 'Welches Feature wünschst du dir und warum?',
  placeholderOther: 'Was möchtest du uns mitteilen?',
  messageLabel: 'Feedback-Nachricht',
  submitBtn: 'Feedback senden',
  successToast: 'Danke für dein Feedback!',
  errorToast: 'Feedback konnte nicht gesendet werden.',
};

const feedbackTR = {
  title: 'Geri Bildirim Gönder',
  typeBug: 'Hata Bildir',
  typeFeature: 'Özellik İsteği',
  typeOther: 'Diğer',
  placeholderBug: 'Hatayı açıkla — ne bekliyordun, ne oldu?',
  placeholderFeature: 'Hangi özelliği istiyorsun ve neden?',
  placeholderOther: 'Bize ne söylemek istersin?',
  messageLabel: 'Geri bildirim mesajı',
  submitBtn: 'Geri Bildirim Gönder',
  successToast: 'Geri bildirimin için teşekkürler!',
  errorToast: 'Geri bildirim gönderilemedi.',
};

for (const [k, v] of Object.entries(feedbackDE)) addIfMissing(de, 'feedback', k, v);
for (const [k, v] of Object.entries(feedbackTR)) addIfMissing(tr, 'feedback', k, v);

// ============================================
// COMMUNITY NAMESPACE (CreateCommunityPollModal)
// ============================================

const communityDE = {
  pollTitle: 'Neue Umfrage',
  pollQuestionLabel: 'Frage',
  pollQuestionPlaceholder: 'z.B. Wer sollte Kapitän werden?',
  pollDescriptionLabel: 'Beschreibung (optional)',
  pollDescriptionPlaceholder: 'Mehr Kontext zur Umfrage...',
  pollOptionsLabel: 'Optionen (2-4)',
  pollAddOption: 'Option hinzufügen',
  pollPriceLabel: 'Preis ($SCOUT)',
  pollPriceHint: '70% gehen an dich, 30% Plattform',
  pollDurationLabel: 'Laufzeit',
  pollDuration1d: '1 Tag',
  pollDuration3d: '3 Tage',
  pollDuration7d: '7 Tage',
  pollSubmitBtn: 'Umfrage erstellen',
  pollErrorQuestion: 'Frage: mind. 5 Zeichen ({count}/5)',
  pollErrorOptions: 'Mind. 2 Optionen erforderlich',
  pollErrorPrice: 'Preis: 1-10.000 $SCOUT',
  rumorCatRumor: 'Gerücht',
  rumorCatInsider: 'Insider',
  rumorCatSource: 'Quelle',
};

const communityTR = {
  pollTitle: 'Yeni Anket',
  pollQuestionLabel: 'Soru',
  pollQuestionPlaceholder: 'Örn. Kaptan kim olmalı?',
  pollDescriptionLabel: 'Açıklama (isteğe bağlı)',
  pollDescriptionPlaceholder: 'Anket hakkında daha fazla bilgi...',
  pollOptionsLabel: 'Seçenekler (2-4)',
  pollAddOption: 'Seçenek ekle',
  pollPriceLabel: 'Fiyat ($SCOUT)',
  pollPriceHint: '%70 sana, %30 platform',
  pollDurationLabel: 'Süre',
  pollDuration1d: '1 Gün',
  pollDuration3d: '3 Gün',
  pollDuration7d: '7 Gün',
  pollSubmitBtn: 'Anket Oluştur',
  pollErrorQuestion: 'Soru: min. 5 karakter ({count}/5)',
  pollErrorOptions: 'Min. 2 seçenek gerekli',
  pollErrorPrice: 'Fiyat: 1-10.000 $SCOUT',
  rumorCatRumor: 'Söylenti',
  rumorCatInsider: 'İç Bilgi',
  rumorCatSource: 'Kaynak',
};

for (const [k, v] of Object.entries(communityDE)) addIfMissing(de, 'community', k, v);
for (const [k, v] of Object.entries(communityTR)) addIfMissing(tr, 'community', k, v);

// ============================================
// PLAYER NAMESPACE (SentimentGauge + DPCSupplyRing)
// ============================================

const playerDE = {
  buysSentiment: 'Käufe',
  sellsSentiment: 'Verkäufe',
  sentimentAria: 'Marktstimmung: {pct}% {label}',
  supplyAria: 'DPC Verteilung: {sold} von {supply} verkauft',
  supplySold: 'von {supply} verkauft',
  supplyReserved: 'Reserviert',
  supplyAvailable: 'Verfügbar',
  supplyOtherHolders: 'Andere Holder',
  supplyYouOwn: 'Du besitzt',
};

const playerTR = {
  buysSentiment: 'Alışlar',
  sellsSentiment: 'Satışlar',
  sentimentAria: 'Piyasa duyarlılığı: %{pct} {label}',
  supplyAria: 'DPC Dağılımı: {sold} / {supply} satıldı',
  supplySold: '{supply} içinden satıldı',
  supplyReserved: 'Rezerve',
  supplyAvailable: 'Mevcut',
  supplyOtherHolders: 'Diğer Sahipler',
  supplyYouOwn: 'Senin',
};

for (const [k, v] of Object.entries(playerDE)) addIfMissing(de, 'player', k, v);
for (const [k, v] of Object.entries(playerTR)) addIfMissing(tr, 'player', k, v);

// ============================================
// SPONSOR NAMESPACE (SponsorBanner)
// ============================================

const sponsorDE = {
  presentedBy: 'Präsentiert von',
  sponsoredBy: 'Gesponsert von',
  partner: 'Partner',
  sponsorPlaceholder: 'Sponsor-Fläche',
};

const sponsorTR = {
  presentedBy: 'Sunan',
  sponsoredBy: 'Sponsor',
  partner: 'Partner',
  sponsorPlaceholder: 'Sponsor Alanı',
};

for (const [k, v] of Object.entries(sponsorDE)) addIfMissing(de, 'sponsor', k, v);
for (const [k, v] of Object.entries(sponsorTR)) addIfMissing(tr, 'sponsor', k, v);

// ============================================
// AIRDROP NAMESPACE (ReferralCard)
// ============================================

const airdropDE = {
  inviteFriends: 'Freunde einladen',
  invitedCount: '{count} eingeladen',
  shareLink: 'Link teilen',
  referralShareText: 'Komm zu BeScout — DPC-Trading, Fantasy & mehr für Fußball-Fans!',
};

const airdropTR = {
  inviteFriends: 'Arkadaşlarını Davet Et',
  invitedCount: '{count} davet edildi',
  shareLink: 'Bağlantı paylaş',
  referralShareText: 'BeScout\'a katıl — Futbol fanları için DPC işlemleri, Fantasy ve daha fazlası!',
};

for (const [k, v] of Object.entries(airdropDE)) addIfMissing(de, 'airdrop', k, v);
for (const [k, v] of Object.entries(airdropTR)) addIfMissing(tr, 'airdrop', k, v);

// ============================================
// PROFILE NAMESPACE (ProfileView wallet/score)
// ============================================

const profileDE = {
  walletTitle: 'Guthaben',
  walletAvailable: 'Verfügbares Guthaben',
  depositBtn: 'Einzahlen',
  scoutScoreTitle: 'Scout Score',
  pointsLabel: 'Pkt',
  rankLabel2: 'Rang #{rank}',
  unlockFor: 'Freischalten für {price} $SCOUT',
};

const profileTR = {
  walletTitle: 'Bakiye',
  walletAvailable: 'Kullanılabilir bakiye',
  depositBtn: 'Yatır',
  scoutScoreTitle: 'Scout Puanı',
  pointsLabel: 'Puan',
  rankLabel2: 'Sıra #{rank}',
  unlockFor: '{price} $SCOUT ile aç',
};

for (const [k, v] of Object.entries(profileDE)) addIfMissing(de, 'profile', k, v);
for (const [k, v] of Object.entries(profileTR)) addIfMissing(tr, 'profile', k, v);

// ============================================
// WRITE
// ============================================

fs.writeFileSync(DE_PATH, JSON.stringify(de, null, 2) + '\n', 'utf8');
fs.writeFileSync(TR_PATH, JSON.stringify(tr, null, 2) + '\n', 'utf8');

const totalKeys = Object.keys(commonDE).length + Object.keys(pwaDE).length +
  Object.keys(feedbackDE).length + Object.keys(communityDE).length +
  Object.keys(playerDE).length + Object.keys(sponsorDE).length +
  Object.keys(airdropDE).length + Object.keys(profileDE).length;
console.log(`✅ Batch 18: ${totalKeys} keys added to de.json + tr.json`);
console.log(`   common: ${Object.keys(commonDE).length} keys`);
console.log(`   pwa: ${Object.keys(pwaDE).length} keys`);
console.log(`   feedback: ${Object.keys(feedbackDE).length} keys`);
console.log(`   community: ${Object.keys(communityDE).length} keys`);
console.log(`   player: ${Object.keys(playerDE).length} keys`);
console.log(`   sponsor: ${Object.keys(sponsorDE).length} keys`);
console.log(`   airdrop: ${Object.keys(airdropDE).length} keys`);
console.log(`   profile: ${Object.keys(profileDE).length} keys`);
