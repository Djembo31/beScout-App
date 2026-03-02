#!/usr/bin/env node
/**
 * Batch 11: Add i18n keys for remaining hardcoded German strings
 * Files: FantasyContent, SpieltagTab, home page, AirdropScoreCard, PostCard,
 *        CommunityResearchTab, profile/[handle]/page, FollowListModal,
 *        PlayerContent, TipButton, ProfileActivityTab, player/index.tsx
 *
 * Run: node scripts/add-i18n-keys-batch11.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = {
  de: path.join(__dirname, '..', 'messages', 'de.json'),
  tr: path.join(__dirname, '..', 'messages', 'tr.json'),
};

const KEYS = {
  fantasy: {
    errorGeneric: { de: 'Fehler: {error}', tr: 'Hata: {error}' },
    unknownError: { de: 'Unbekannter Fehler', tr: 'Bilinmeyen hata' },
    joinedSuccess: { de: 'Erfolgreich angemeldet für „{name}"!', tr: '„{name}" etkinliğine başarıyla katıldın!' },
    leftEvent: { de: 'Vom Event „{name}" abgemeldet.', tr: '„{name}" etkinliğinden ayrıldın.' },
    refundNote: { de: '{amount} $SCOUT zurückerstattet.', tr: '{amount} $SCOUT iade edildi.' },
    newEventDefault: { de: 'Neues Event', tr: 'Yeni Etkinlik' },
    tabFixtures: { de: 'Paarungen', tr: 'Maçlar' },
    tabFixturesShort: { de: 'Spiele', tr: 'Maçlar' },
    tabEventsShort: { de: 'Events', tr: 'Etkinlik' },
    tabJoined: { de: 'Mitmachen', tr: 'Katıl' },
    tabJoinedShort: { de: 'Aktiv', tr: 'Aktif' },
    tabResults: { de: 'Ergebnisse', tr: 'Sonuçlar' },
    tabResultsShort: { de: 'Ergebnis', tr: 'Sonuç' },
  },
  spieltag: {
    lineups: { de: 'Aufstellungen', tr: 'Kadrolar' },
    playersTab: { de: 'Spieler', tr: 'Oyuncular' },
    noPlayerData: { de: 'Keine Spielerdaten verfügbar', tr: 'Oyuncu verisi mevcut değil' },
    notSimulated: { de: 'Spiel noch nicht simuliert — Aufstellungen werden nach Simulation angezeigt', tr: 'Maç henüz simüle edilmedi — Kadrolar simülasyondan sonra gösterilecek' },
  },
  home: {
    entryLabel: { de: 'Eintritt: ', tr: 'Giriş: ' },
    entryFree: { de: 'Gratis', tr: 'Ücretsiz' },
    prizeMoney: { de: 'Preisgeld', tr: 'Ödül havuzu' },
  },
  airdrop: {
    tierBronze: { de: 'Bronze', tr: 'Bronz' },
    tierSilber: { de: 'Silber', tr: 'Gümüş' },
    tierGold: { de: 'Gold', tr: 'Altın' },
    tierDiamond: { de: 'Diamond', tr: 'Elmas' },
    barScoutRang: { de: 'Scout Rang', tr: 'Scout Sıralaması' },
    barMastery: { de: 'DPC Mastery', tr: 'DPC Ustalığı' },
    barActivity: { de: 'Aktivität', tr: 'Aktivite' },
    barTrading: { de: 'Trading', tr: 'Al-Sat' },
    barResearch: { de: 'Research', tr: 'Araştırma' },
    barReferral: { de: 'Referral', tr: 'Davet' },
    scoreBreakdown: { de: 'Score-Aufschlüsselung', tr: 'Skor dağılımı' },
    foundingMultiplier: { de: 'Founding {n}x', tr: 'Kurucu {n}x' },
    aboMultiplier: { de: 'Abo {n}x', tr: 'Abonelik {n}x' },
    airdropComingSoon: { de: '$SCOUT Airdrop — Coming Soon', tr: '$SCOUT Airdrop — Çok Yakında' },
    rankOf: { de: 'von {total}', tr: '{total} içinden' },
  },
  community: {
    subscriberExclusive: { de: 'Exklusiv für Abonnenten', tr: 'Abonelere özel' },
    subscriberContent: { de: 'Dieser Inhalt ist exklusiv für Abonnenten dieses Scouts verfügbar...', tr: 'Bu içerik sadece bu Scout\'un abonelerine özeldir...' },
    exclusiveTag: { de: 'Exklusiv', tr: 'Özel' },
    noReportsFilter: { de: 'Keine Berichte mit diesem Filter', tr: 'Bu filtreyle rapor bulunamadı' },
    noReportsYet: { de: 'Noch keine Research-Berichte', tr: 'Henüz araştırma raporu yok' },
    tryOtherFilter: { de: 'Probiere einen anderen Filter.', tr: 'Başka bir filtre dene.' },
    writeFirstReport: { de: 'Schreibe den ersten Bericht und verdiene $SCOUT!', tr: 'İlk raporu yaz ve $SCOUT kazan!' },
    writeFirstReportBtn: { de: 'Ersten Bericht schreiben', tr: 'İlk raporu yaz' },
    resetFilters: { de: 'Filter zurücksetzen', tr: 'Filtreleri sıfırla' },
    sortNewest: { de: 'Neueste', tr: 'En yeni' },
    sortTopRated: { de: 'Top bewertet', tr: 'En iyi puan' },
    sortMostSold: { de: 'Meistverkauft', tr: 'En çok satılan' },
  },
  profile: {
    followingTitle: { de: 'Folgt', tr: 'Takip ettikleri' },
    noFollowersYet: { de: 'Noch keine Follower.', tr: 'Henüz takipçi yok.' },
    followsNobody: { de: 'Folgt niemandem.', tr: 'Kimseyi takip etmiyor.' },
    profileNotFound: { de: 'Profil @{handle} nicht gefunden.', tr: 'Profil @{handle} bulunamadı.' },
    backToOwnProfile: { de: 'Zurück zum eigenen Profil', tr: 'Kendi profiline dön' },
    recentActivity: { de: 'Letzte Aktivität', tr: 'Son aktivite' },
  },
  player: {
    couldNotLoadProfiles: { de: 'Profilnamen konnten nicht geladen werden', tr: 'Profil adları yüklenemedi' },
    l5Tooltip: { de: 'Letzte 5 Spiele Performance (0–100)', tr: 'Son 5 maç performansı (0–100)' },
    l15Tooltip: { de: 'Letzte 15 Spiele Performance (0–100)', tr: 'Son 15 maç performansı (0–100)' },
  },
  tips: {
    sendError: { de: 'Fehler beim Senden', tr: 'Gönderme hatası' },
  },
};

let totalAdded = 0;

for (const [locale, filePath] of Object.entries(LOCALES)) {
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const [ns, keys] of Object.entries(KEYS)) {
    if (!json[ns]) json[ns] = {};
    for (const [key, vals] of Object.entries(keys)) {
      if (json[ns][key] === undefined) {
        json[ns][key] = vals[locale];
        totalAdded++;
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`✓ ${locale}.json updated`);
}

console.log(`\nTotal keys added: ${totalAdded}`);
