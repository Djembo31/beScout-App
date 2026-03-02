/**
 * Batch 9: i18n keys for EventCard, EventCommunityTab, CreateEventModal, HistoryTab, CreatePredictionModal
 * Run: node scripts/add-i18n-keys-batch9.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = {
  de: path.join(__dirname, '..', 'messages', 'de.json'),
  tr: path.join(__dirname, '..', 'messages', 'tr.json'),
};

// Keys to add per namespace
const KEYS = {
  fantasy: {
    // EventCard
    eventScored: { de: 'Ausgewertet', tr: 'Değerlendirildi' },
    eventJoined: { de: 'Nimmt teil', tr: 'Katılıyor' },
    removeFavorite: { de: 'Aus Favoriten entfernen', tr: 'Favorilerden kaldır' },
    addFavorite: { de: 'Zu Favoriten hinzufügen', tr: 'Favorilere ekle' },
    freeEntry: { de: 'Kostenlos', tr: 'Ücretsiz' },
    entryLabel: { de: 'Teilnahme', tr: 'Katılım' },
    prizeLabel: { de: 'Prize', tr: 'Ödül' },
    playersCountLabel: { de: 'Spieler', tr: 'Oyuncular' },
    modeLeague: { de: 'Liga', tr: 'Lig' },
    modeTournament: { de: 'Turnier', tr: 'Turnuva' },
    tierGold: { de: 'Gold', tr: 'Gold' },
    tierSilber: { de: 'Silber', tr: 'Gümüş' },
    tierBronze: { de: 'Bronze', tr: 'Bronz' },
    yourRank: { de: 'Dein Rang', tr: 'Sıralaman' },
    resultsBtn: { de: 'Ergebnisse', tr: 'Sonuçlar' },
    lineupBtn: { de: 'Aufstellung', tr: 'Kadro' },
    runningBtn: { de: 'Läuft', tr: 'Devam ediyor' },
    joinBtn: { de: 'Beitreten', tr: 'Katıl' },
    statusLive: { de: 'LIVE', tr: 'CANLI' },
    statusLateReg: { de: 'Late Reg', tr: 'Geç Kayıt' },
    statusRegistering: { de: 'Anmelden', tr: 'Kayıt' },
    statusUpcoming: { de: 'Bald', tr: 'Yakında' },
    countdownStarted: { de: 'Gestartet', tr: 'Başladı' },

    // EventCommunityTab
    timeNow: { de: 'Jetzt', tr: 'Şimdi' },
    phasePreview: { de: 'Vorschau', tr: 'Önizleme' },
    phasePreviewHint: { de: 'Teile deine Predictions und Lineup-Tipps!', tr: 'Tahminlerini ve kadro ipuçlarını paylaş!' },
    phaseLive: { de: 'Live', tr: 'Canlı' },
    phaseLiveHint: { de: 'Diskutiere die laufenden Performances!', tr: 'Devam eden performansları tartış!' },
    phaseReview: { de: 'Auswertung', tr: 'Değerlendirme' },
    phaseReviewHint: { de: 'Analysiere die Ergebnisse und Spielerbewertungen!', tr: 'Sonuçları ve oyuncu değerlendirmelerini analiz et!' },
    catOpinion: { de: 'Meinung', tr: 'Görüş' },
    catPrediction: { de: 'Prediction', tr: 'Tahmin' },
    catAnalysis: { de: 'Analyse', tr: 'Analiz' },
    composeLabel: { de: 'Beitrag verfassen', tr: 'Gönderi yaz' },
    placeholderEnded: { de: 'Was denkst du über die Ergebnisse?', tr: 'Sonuçlar hakkında ne düşünüyorsun?' },
    placeholderRunning: { de: 'Wie laufen die Spieler?', tr: 'Oyuncular nasıl oynuyor?' },
    placeholderDefault: { de: 'Teile deine Prediction...', tr: 'Tahminini paylaş...' },
    sendHint: { de: 'Enter zum Senden, Shift+Enter für neue Zeile', tr: 'Göndermek için Enter, yeni satır için Shift+Enter' },
    loadingDiscussion: { de: 'Lade Diskussion...', tr: 'Tartışma yükleniyor...' },
    noPostsYet: { de: 'Noch keine Beiträge', tr: 'Henüz gönderi yok' },
    beFirstToPost: { de: 'Sei der Erste und starte die Diskussion!', tr: 'İlk sen ol ve tartışmayı başlat!' },
    replyCount: { de: '{count, plural, =1 {Antwort} other {Antworten}}', tr: '{count, plural, =1 {Yanıt} other {Yanıtlar}}' },
    deletePostLabel: { de: 'Beitrag löschen', tr: 'Gönderiyi sil' },

    // CreateEventModal
    createEventTitle: { de: 'Community Event erstellen', tr: 'Topluluk Etkinliği Oluştur' },
    cancelBtn: { de: 'Abbrechen', tr: 'İptal' },
    createEventBtn: { de: 'Event erstellen', tr: 'Etkinlik Oluştur' },
    eventNameRequired: { de: 'Event-Name muss mindestens 3 Zeichen lang sein.', tr: 'Etkinlik adı en az 3 karakter olmalıdır.' },
    eventNameLabel: { de: 'Event-Name', tr: 'Etkinlik Adı' },
    eventNamePlaceholder: { de: 'z.B. Meine Private Liga', tr: 'örn. Özel Ligim' },
    descriptionLabel: { de: 'Beschreibung', tr: 'Açıklama' },
    descriptionPlaceholder: { de: 'Beschreibe dein Event...', tr: 'Etkinliğini açıkla...' },
    modeLabel: { de: 'Modus', tr: 'Mod' },
    formatSix: { de: '6er Lineup', tr: "6'lı Kadro" },
    formatEleven: { de: '11er Lineup', tr: "11'li Kadro" },
    buyInLabel: { de: 'Teilnahmegebühr ($SCOUT)', tr: 'Katılım Ücreti ($SCOUT)' },
    buyInPilotHint: { de: 'Pilot: immer 0 $SCOUT (regulatorisch)', tr: 'Pilot: her zaman 0 $SCOUT (düzenleyici)' },
    maxParticipantsLabel: { de: 'Max. Teilnehmer', tr: 'Maks. Katılımcı' },
    privateEvent: { de: 'Privates Event', tr: 'Özel Etkinlik' },
    privateEventHint: { de: 'Nur mit Einladungslink beitreten', tr: 'Sadece davet linki ile katılım' },
    previewSection: { de: 'Vorschau', tr: 'Önizleme' },
    prizeMoney: { de: 'Preisgeld', tr: 'Ödül Havuzu' },
    creatorFee: { de: 'Deine Fee (5%)', tr: 'Komisyonun (%5)' },
    formatLabel: { de: 'Format', tr: 'Format' },

    // HistoryTab
    wonScout: { de: 'Gewonnene $SCOUT', tr: 'Kazanılan $SCOUT' },
    seasonPoints: { de: 'Season Punkte', tr: 'Sezon Puanları' },
    performanceTitle: { de: 'Performance', tr: 'Performans' },
    winsLabel: { de: 'Siege', tr: 'Galibiyetler' },
    topTen: { de: 'Top 10', tr: 'İlk 10' },
    bestPlacement: { de: 'Beste Platzierung', tr: 'En İyi Sıralama' },
    eventsPlayedLabel: { de: 'Events gespielt', tr: 'Oynanan Etkinlikler' },
    statisticsTitle: { de: 'Statistiken', tr: 'İstatistikler' },
    avgPointsLabel: { de: 'Avg. Punkte', tr: 'Ort. Puan' },
    avgRankLabel: { de: 'Avg. Rang', tr: 'Ort. Sıralama' },
    totalRewards: { de: 'Total Prämien', tr: 'Toplam Ödüller' },
    seasonLeaderboard: { de: 'Saison-Rangliste', tr: 'Sezon Sıralaması' },
    managerCount: { de: '{count} Manager', tr: '{count} Menajer' },
    noSeasonData: { de: 'Noch keine Saison-Daten', tr: 'Henüz sezon verisi yok' },
    thManager: { de: 'Manager', tr: 'Menajer' },
    thEvents: { de: 'Events', tr: 'Etkinlikler' },
    thWins: { de: 'Siege', tr: 'Galibiyet' },
    thPoints: { de: 'Punkte', tr: 'Puan' },
    thReward: { de: 'Prämie', tr: 'Ödül' },
    youLabel: { de: '(Du)', tr: '(Sen)' },
    eventsAndWins: { de: '{events} Events · {wins} Siege', tr: '{events} Etkinlik · {wins} Galibiyet' },
    eventHistory: { de: 'Event-Verlauf', tr: 'Etkinlik Geçmişi' },
    eventHistoryCount: { de: '{count} Events', tr: '{count} Etkinlik' },
    noScoredEvents: { de: 'Noch keine ausgewerteten Events', tr: 'Henüz değerlendirilmiş etkinlik yok' },
    joinEventHint: { de: 'Tritt einem Event bei und warte auf die Auswertung.', tr: 'Bir etkinliğe katıl ve değerlendirmeyi bekle.' },
    thEvent: { de: 'Event', tr: 'Etkinlik' },
    thGw: { de: 'GW', tr: 'HF' },
    thRank: { de: 'Rang', tr: 'Sıra' },
    participantsLabel: { de: 'Teilnehmer', tr: 'Katılımcı' },
    ptsLabel: { de: 'Pkt', tr: 'Puan' },
  },
  predictions: {
    genericError: { de: 'Fehler', tr: 'Hata' },
    networkError: { de: 'Netzwerkfehler', tr: 'Ağ hatası' },
    matchLabel: { de: 'Match', tr: 'Maç' },
  },
};

let totalAdded = 0;

for (const [locale, filePath] of Object.entries(LOCALES)) {
  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  for (const [namespace, keys] of Object.entries(KEYS)) {
    if (!json[namespace]) json[namespace] = {};

    for (const [key, values] of Object.entries(keys)) {
      if (!json[namespace][key]) {
        json[namespace][key] = values[locale];
        totalAdded++;
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
  console.log(`Updated ${locale}.json`);
}

console.log(`\nTotal keys added: ${totalAdded}`);
