#!/usr/bin/env node
/**
 * Batch 14: i18n keys for scattered UI strings + service notifications
 * Run: node scripts/add-i18n-keys-batch14.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = {
  de: path.join(__dirname, '..', 'messages', 'de.json'),
  tr: path.join(__dirname, '..', 'messages', 'tr.json'),
};

const KEYS = {
  fantasy: {
    // ErgebnisseTab + MitmachenTab
    rankOfParticipants: { de: 'Platz {rank} / {participants} — {score} Punkte', tr: '{rank}. sıra / {participants} — {score} Puan' },
    scoredRankOf: { de: '{score} Punkte · Platz {rank} / {participants}', tr: '{score} Puan · {rank}. sıra / {participants}' },
  },
  community: {
    // Poll vote counts
    votesCount: { de: '{count} Stimmen', tr: '{count} Oy' },
    voteCountSingular: { de: '{count} Stimme', tr: '{count} Oy' },
    endsAt: { de: 'Endet {date}', tr: '{date} tarihinde bitiyor' },
    clubNewsLabel: { de: 'Club-Nachricht', tr: 'Kulüp haberi' },
  },
  profile: {
    memberSince: { de: 'Mitglied seit {date}', tr: '{date} tarihinden beri üye' },
    verifiedScout: { de: 'Verifizierter Scout', tr: 'Doğrulanmış Scout' },
    callsProgress: { de: '{n}/5 Calls', tr: '{n}/5 Değerlendirme' },
  },
  gamification: {
    pointsLabel: { de: 'Punkte', tr: 'Puan' },
  },
  notifications: {
    // Event notifications (scoring.ts)
    eventScoredTitle: { de: 'Ergebnisse für {name} sind da!', tr: '{name} sonuçları açıklandı!' },
    eventScoredBody: { de: 'Dein Platz: #{rank} mit {score} Punkten', tr: 'Sıralamanız: #{rank}, {score} Puan ile' },
    fantasyRewardTitle: { de: 'Platz #{rank} bei {name}', tr: '{name} etkinliğinde #{rank}. sıra' },
    fantasyRewardBody: { de: 'Du hast {score} Punkte erzielt!', tr: '{score} Puan kazandın!' },
    // Event started (events.ts)
    eventStartedTitle: { de: 'Event gestartet!', tr: 'Etkinlik başladı!' },
    eventStartedBody: { de: '{name} ist jetzt live — die Punkte zählen!', tr: '{name} şimdi canlı — puanlar sayılıyor!' },
    // Poll vote (communityPolls.ts)
    newVoteTitle: { de: 'Neue Stimme', tr: 'Yeni oy' },
    newVoteBody: { de: 'Jemand hat bei "{question}" abgestimmt', tr: 'Biri "{question}" anketinde oy kullandı' },
    // Liquidation (liquidation.ts)
    liquidationTitle: { de: 'DPC liquidiert', tr: 'DPC tasfiye edildi' },
    liquidationWithSF: { de: 'Du hast {total} $SCOUT erhalten ({pbt} PBT + {sf} Community Bonus).', tr: '{total} $SCOUT aldın ({pbt} PBT + {sf} Topluluk Bonusu).' },
    liquidationPBTOnly: { de: 'Du hast {total} $SCOUT aus der PBT-Ausschüttung erhalten.', tr: 'PBT dağıtımından {total} $SCOUT aldın.' },
    // Offers (offers.ts)
    newOfferTitle: { de: 'Neues Angebot', tr: 'Yeni teklif' },
    newOfferBody: { de: 'Du hast ein neues Angebot erhalten', tr: 'Yeni bir teklif aldın' },
    counterOfferTitle: { de: 'Gegenangebot', tr: 'Karşı teklif' },
    counterOfferBody: { de: 'Du hast ein Gegenangebot erhalten', tr: 'Bir karşı teklif aldın' },
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
