#!/usr/bin/env node
/**
 * Batch 13: i18n keys for EventDetailModal.tsx (remaining strings)
 * + EventTableRow.tsx + PostCard.tsx + PostReplies.tsx + global-error.tsx
 * Run: node scripts/add-i18n-keys-batch13.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = {
  de: path.join(__dirname, '..', 'messages', 'de.json'),
  tr: path.join(__dirname, '..', 'messages', 'tr.json'),
};

const KEYS = {
  fantasy: {
    // Confirm/Alert dialogs
    confirmResetMsg: { de: 'Event wirklich zurücksetzen? Scores, Ranks und Rewards werden gelöscht.', tr: 'Etkinlik gerçekten sıfırlansın mı? Skorlar, sıralamalar ve ödüller silinecek.' },
    resetSuccess: { de: 'Event wurde zurückgesetzt!', tr: 'Etkinlik sıfırlandı!' },
    resetFailed: { de: 'Reset fehlgeschlagen: {error}', tr: 'Sıfırlama başarısız: {error}' },
    errorShort: { de: 'Fehler: {msg}', tr: 'Hata: {msg}' },
    confirmLeaveMsg: { de: 'Möchtest du dich wirklich vom Event "{name}" abmelden?', tr: '"{name}" etkinliğinden gerçekten ayrılmak istiyor musun?' },
    leaveError: { de: 'Fehler beim Abmelden: {msg}', tr: 'Ayrılma hatası: {msg}' },
    incompleteLineupAlert: { de: 'Bitte stelle deine komplette Aufstellung auf!', tr: 'Lütfen tüm kadroyu kur!' },
    // Status badges
    statusScored: { de: 'Ausgewertet', tr: 'Değerlendirildi' },
    statusJoined: { de: 'Nimmt teil', tr: 'Katılıyor' },
    // Availability status
    statusFit: { de: 'Fit', tr: 'Fit' },
    statusInjured: { de: 'Verletzt', tr: 'Sakatlık' },
    statusSuspended: { de: 'Gesperrt', tr: 'Cezalı' },
    statusDoubtful: { de: 'Fraglich', tr: 'Şüpheli' },
    // Overview meta
    dpcPerSlotLabel: { de: 'DPC pro Slot', tr: 'Slot başına DPC' },
    startLabel: { de: 'Start', tr: 'Başlangıç' },
    participantsLabel: { de: 'Teilnehmer', tr: 'Katılımcılar' },
    unlimited: { de: 'unbegrenzt', tr: 'sınırsız' },
    // Requirements
    requirementsTitle: { de: 'Teilnahmebedingungen', tr: 'Katılım koşulları' },
    dpcPerSlotReq: { de: '{n} DPC pro Aufstellungsplatz', tr: 'Kadro yeri başına {n} DPC' },
    minDpcReq: { de: 'Min. {n} DPC gesamt', tr: 'Min. toplam {n} DPC' },
    minClubPlayersReq: { de: 'Min. {n} {club}-Spieler', tr: 'Min. {n} {club} oyuncusu' },
    minScoutLevelReq: { de: 'Scout Level {n}+', tr: 'Scout Seviye {n}+' },
    specificClubReq: { de: 'Nur {club}-Spieler', tr: 'Sadece {club} oyuncuları' },
    entryFeeReq: { de: 'Eintrittsgebühr: {n} $SCOUT', tr: 'Giriş ücreti: {n} $SCOUT' },
    rewardsTitle: { de: 'Rewards', tr: 'Ödüller' },
    // Participants
    participantsCount: { de: 'Teilnehmer ({count})', tr: 'Katılımcılar ({count})' },
    participantsCountMax: { de: 'Teilnehmer ({count} / {max})', tr: 'Katılımcılar ({count} / {max})' },
    topPlusYou: { de: 'Top 10 + Du', tr: 'İlk 10 + Sen' },
    noParticipantsYet: { de: 'Noch keine Teilnehmer. Sei der Erste!', tr: 'Henüz katılımcı yok. İlk sen ol!' },
    youLabel: { de: '(Du)', tr: '(Sen)' },
    moreParticipants: { de: '+ {n} weitere', tr: '+ {n} daha' },
    yourRankLabel: { de: 'Dein Rang', tr: 'Sıralamanız' },
    pointsLabel: { de: 'Punkte', tr: 'Puan' },
    // Lock banners
    eventEndedBanner: { de: 'Event beendet', tr: 'Etkinlik bitti' },
    partiallyLockedBanner: { de: 'Teilweise gesperrt — Spieler mit laufendem Spiel sind fixiert', tr: 'Kısmen kilitli — Maçı devam eden oyuncular sabit' },
    nextKickoffLabel: { de: 'Nächster Anstoß: {time}', tr: 'Sonraki başlama: {time}' },
    allRunningBanner: { de: 'Alle Spiele laufen — Aufstellung gesperrt', tr: 'Tüm maçlar devam ediyor — Kadro kilitli' },
    livePointsLabel: { de: 'Live-Punkte', tr: 'Canlı Puan' },
    livePtsCount: { de: '{total} Pkt ({scored}/{max} Spieler)', tr: '{total} Puan ({scored}/{max} Oyuncu)' },
    // Scored banners
    gwScoredResults: { de: 'Gameweek ausgewertet — Deine Ergebnisse:', tr: 'Gameweek değerlendirildi — Sonuçların:' },
    // Presets
    presetsLabel: { de: 'Vorlagen', tr: 'Şablonlar' },
    presetsTitle: { de: 'Aufstellungs-Vorlagen (max 5)', tr: 'Kadro şablonları (maks. 5)' },
    deletePresetLabel: { de: 'Vorlage löschen', tr: 'Şablonu sil' },
    noPresets: { de: 'Keine Vorlagen gespeichert', tr: 'Kayıtlı şablon yok' },
    presetNamePlaceholder: { de: 'Vorlagenname...', tr: 'Şablon adı...' },
    saveBtn: { de: 'Speichern', tr: 'Kaydet' },
    // Team Score Banner
    yourTeamScore: { de: 'Dein Teamscore', tr: 'Takım Puanın' },
    ptsShort: { de: 'Pkt', tr: 'Puan' },
    placementLabel: { de: 'Platzierung', tr: 'Sıralama' },
    rewardLabel: { de: 'Prämie', tr: 'Ödül' },
    // Post-game nudge
    strengthenPortfolio: { de: 'Portfolio stärken?', tr: 'Portföyünü güçlendir?' },
    portfolioHint: { de: 'Bessere Spieler = höhere Scores. Zum Marktplatz →', tr: 'Daha iyi oyuncular = daha yüksek puanlar. Pazara git →' },
    // Score breakdown
    scoreBreakdownLabel: { de: 'Einzelbewertungen', tr: 'Bireysel puanlar' },
    liveBreakdownLabel: { de: 'Live-Bewertungen', tr: 'Canlı değerlendirmeler' },
    // Lineup status
    lineupComplete: { de: 'Aufstellung vollständig — unten Teilnahme bestätigen!', tr: 'Kadro tamamlandı — aşağıdan katılımı onayla!' },
    playersSelected: { de: '{n}/{m} Spieler ausgewählt', tr: '{n}/{m} Oyuncu seçildi' },
    yourPlayers: { de: 'Deine Spieler', tr: 'Oyuncuların' },
    allDeployed: { de: 'Alle eingesetzt', tr: 'Tümü dizildi' },
    // Footer buttons
    eventFull: { de: 'Event voll', tr: 'Etkinlik dolu' },
    morePlayers: { de: 'Noch {n} Spieler aufstellen', tr: '{n} oyuncu daha diz' },
    confirmRegistration: { de: 'Anmeldung bestätigen', tr: 'Kaydı onayla' },
    joinAndPay: { de: 'Anmelden & {amount} $SCOUT zahlen', tr: 'Katıl ve {amount} $SCOUT öde' },
    leavingBtn: { de: 'Abmelden...', tr: 'Ayrılıyor...' },
    leaveBtn: { de: 'Abmelden', tr: 'Ayrıl' },
    editLineup: { de: 'Aufstellung ändern', tr: 'Kadroyu düzenle' },
    joinedLocked: { de: 'Nimmt teil — Aufstellung gesperrt', tr: 'Katılıyor — Kadro kilitli' },
    eventRunningClosed: { de: 'Event läuft — Anmeldung geschlossen', tr: 'Etkinlik devam ediyor — Kayıt kapalı' },
    // EventTableRow
    statusEnded: { de: 'Beendet', tr: 'Bitti' },
    statusRunning: { de: 'Läuft', tr: 'Devam ediyor' },
    statusLateReg: { de: 'Late Reg', tr: 'Geç kayıt' },
    freeLabel: { de: 'Kostenlos', tr: 'Ücretsiz' },
    removeFavorite: { de: 'Aus Favoriten entfernen', tr: 'Favorilerden kaldır' },
    addFavorite: { de: 'Zu Favoriten hinzufügen', tr: 'Favorilere ekle' },
    resultsBtn: { de: 'Ergebnisse', tr: 'Sonuçlar' },
    joinedBtn: { de: 'Nimmt teil', tr: 'Katılıyor' },
    lineupBtn: { de: 'Lineup', tr: 'Kadro' },
    runningBtn: { de: 'Läuft', tr: 'Devam ediyor' },
  },
  community: {
    // PostCard
    officialLabel: { de: 'Offiziell', tr: 'Resmi' },
    pinnedLabel: { de: 'Gepinnt', tr: 'Sabitlendi' },
    unpinAction: { de: 'Lösen', tr: 'Sabitlemeyi kaldır' },
    pinAction: { de: 'Anpinnen', tr: 'Sabitle' },
    deleteAction: { de: 'Löschen', tr: 'Sil' },
    adminDeleteAction: { de: 'Admin: Löschen', tr: 'Admin: Sil' },
    deleteConfirmMsg: { de: 'Post unwiderruflich löschen?', tr: 'Gönderiyi kalıcı olarak silmek istiyor musun?' },
    deleteConfirmYes: { de: 'Ja, löschen', tr: 'Evet, sil' },
    cancelAction: { de: 'Abbrechen', tr: 'İptal' },
    playerTakeLabel: { de: 'Spieler-Take', tr: 'Oyuncu Yorumu' },
    transferRumorLabel: { de: 'Gerücht', tr: 'Söylenti' },
    copiedLabel: { de: 'Kopiert!', tr: 'Kopyalandı!' },
    shareLabel: { de: 'Teilen', tr: 'Paylaş' },
    upvoteLabel: { de: 'Upvote', tr: 'Beğen' },
    removeUpvote: { de: 'Upvote entfernen', tr: 'Beğeniyi kaldır' },
    downvoteLabel: { de: 'Downvote', tr: 'Beğenme' },
    removeDownvote: { de: 'Downvote entfernen', tr: 'Beğenmemeyi kaldır' },
    postOptionsLabel: { de: 'Post-Optionen', tr: 'Gönderi seçenekleri' },
    // PostReplies
    noRepliesYet: { de: 'Noch keine Antworten — sei der Erste!', tr: 'Henüz yanıt yok — ilk sen ol!' },
    replyDeleteLabel: { de: 'Löschen', tr: 'Sil' },
    replyDeleteConfirm: { de: 'Löschen?', tr: 'Silinsin mi?' },
    replyYes: { de: 'Ja', tr: 'Evet' },
    replyNo: { de: 'Nein', tr: 'Hayır' },
    replyPlaceholder: { de: 'Antwort schreiben...', tr: 'Yanıt yaz...' },
    timeJust: { de: 'Jetzt', tr: 'Şimdi' },
  },
  common: {
    // global-error
    somethingWentWrong: { de: 'Etwas ist schiefgelaufen', tr: 'Bir şeyler yanlış gitti' },
    unexpectedError: { de: 'Ein unerwarteter Fehler ist aufgetreten.', tr: 'Beklenmeyen bir hata oluştu.' },
    retryBtn: { de: 'Erneut versuchen', tr: 'Tekrar dene' },
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
