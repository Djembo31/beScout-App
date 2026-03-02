#!/usr/bin/env node
/**
 * Batch 12: i18n keys for EventDetailModal.tsx
 * Run: node scripts/add-i18n-keys-batch12.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = {
  de: path.join(__dirname, '..', 'messages', 'de.json'),
  tr: path.join(__dirname, '..', 'messages', 'tr.json'),
};

const KEYS = {
  fantasy: {
    modeLiga: { de: 'Liga', tr: 'Lig' },
    modeTurnier: { de: 'Turnier', tr: 'Turnuva' },
    resettingBtn: { de: 'Wird zurückgesetzt...', tr: 'Sıfırlanıyor...' },
    resetBtn: { de: 'Zurücksetzen', tr: 'Sıfırla' },
    tabOverview: { de: 'Übersicht', tr: 'Genel Bakış' },
    tabLineup: { de: 'Aufstellung', tr: 'Kadro' },
    tabRanking: { de: 'Rangliste', tr: 'Sıralama' },
    tabCommunity: { de: 'Community', tr: 'Topluluk' },
    descriptionLabel: { de: 'Beschreibung', tr: 'Açıklama' },
    arenaScoring: { de: 'Arena-Wertung', tr: 'Arena Puanlaması' },
    arenaDesc: { de: 'Deine Platzierung beeinflusst deinen BeScout Score. Top-Platzierungen geben Punkte, schlechte Platzierungen kosten Punkte!', tr: 'Sıralamanız BeScout Skorunuzu etkiler. Üst sıralara puan verilir, alt sıralardan puan düşer!' },
    synergyBonus: { de: 'Synergy Bonus +{pct}%', tr: 'Sinerji Bonusu +{pct}%' },
    showRanking: { de: 'Rangliste anzeigen', tr: 'Sıralamayı göster' },
    captainSet: { de: 'Kapitän: {name} (×1.5)', tr: 'Kaptan: {name} (×1.5)' },
    captainHint: { de: 'Doppelklick auf einen Spieler = Kapitän (×1.5 Score)', tr: 'Oyuncuya çift tıkla = Kaptan (×1.5 Puan)' },
    captainRemove: { de: 'Entfernen', tr: 'Kaldır' },
    captainLocked: { de: 'Gesperrt', tr: 'Kilitli' },
    backToRanking: { de: 'Zurück zur Rangliste', tr: 'Sıralamaya geri dön' },
    rankingLoading: { de: 'Rangliste wird geladen...', tr: 'Sıralama yükleniyor...' },
    noResultsYet: { de: 'Noch keine Ergebnisse', tr: 'Henüz sonuç yok' },
    scoringPending: { de: 'Die Auswertung steht noch aus.', tr: 'Değerlendirme henüz yapılmadı.' },
    scoredAt: { de: 'Ausgewertet am {date}', tr: '{date} tarihinde değerlendirildi' },
    confirmJoinTitle: { de: 'Teilnahme bestätigen', tr: 'Katılımı onayla' },
    entryFeeLabel: { de: 'Teilnahmegebühr', tr: 'Katılım ücreti' },
    formationLabel: { de: 'Formation', tr: 'Formasyon' },
    playersLabel: { de: 'Spieler', tr: 'Oyuncular' },
    playersDeployed: { de: '{count} aufgestellt', tr: '{count} dizildi' },
    captainLabel: { de: 'Kapitän', tr: 'Kaptan' },
    captainChosen: { de: 'Gewählt (2x Punkte)', tr: 'Seçildi (2x Puan)' },
    entryFeeNote: { de: 'Die Teilnahmegebühr wird sofort von deinem Wallet abgezogen. Bei Abmeldung vor Event-Start wird sie erstattet.', tr: 'Katılım ücreti cüzdanından hemen düşülür. Etkinlik başlamadan ayrılırsan iade edilir.' },
    confirming: { de: 'Wird angemeldet...', tr: 'Kaydediliyor...' },
    confirmBtn: { de: 'Bestätigen', tr: 'Onayla' },
    rankResult: { de: 'Platz {rank}', tr: '{rank}. sıra' },
    scored: { de: 'Ausgewertet', tr: 'Değerlendirildi' },
    viewResults: { de: 'Ergebnisse ansehen', tr: 'Sonuçları gör' },
    eventEndedPending: { de: 'Event beendet — Auswertung ausstehend', tr: 'Etkinlik bitti — Değerlendirme bekleniyor' },
    selectPos: { de: '{pos} wählen', tr: '{pos} seç' },
    availableCount: { de: '{count} verfügbar', tr: '{count} mevcut' },
    searchPlayerPlaceholder: { de: 'Spieler suchen...', tr: 'Oyuncu ara...' },
    noPosAvailable: { de: 'Keine {pos} verfügbar', tr: 'Hiç {pos} mevcut değil' },
    buyPlayer: { de: 'Spieler kaufen', tr: 'Oyuncu satın al' },
    closePickerLabel: { de: 'Spielerauswahl schließen', tr: 'Oyuncu seçimini kapat' },
    posGK: { de: 'Torwart', tr: 'Kaleci' },
    posDEF: { de: 'Verteidiger', tr: 'Defans' },
    posMID: { de: 'Mittelfeldspieler', tr: 'Orta saha' },
    posATT: { de: 'Angreifer', tr: 'Forvet' },
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
