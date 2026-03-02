/**
 * Batch 19: Service layer error keys
 * 17 new keys in the `errors` namespace
 *
 * Run: node scripts/add-i18n-keys-batch19.js
 */
const fs = require('fs');
const path = require('path');

const NEW_KEYS = {
  errors: {
    invalidQuantity: {
      de: 'Ungültige Menge.',
      tr: 'Geçersiz miktar.',
    },
    maxQuantityExceeded: {
      de: 'Maximale Kaufmenge überschritten.',
      tr: 'Maksimum satın alma miktarı aşıldı.',
    },
    playerNotFound: {
      de: 'Spieler nicht gefunden.',
      tr: 'Oyuncu bulunamadı.',
    },
    clubAdminRestricted: {
      de: 'Als Club-Admin darfst du keine DPCs deines eigenen Clubs handeln.',
      tr: 'Kulüp yöneticisi olarak kendi kulübünün DPC\'lerini işlem yapamazsın.',
    },
    noMatchingOrders: {
      de: 'Keine passenden Angebote verfügbar.',
      tr: 'Eşleşen teklif bulunamadı.',
    },
    invalidPrice: {
      de: 'Ungültiger Preis.',
      tr: 'Geçersiz fiyat.',
    },
    maxPriceExceeded: {
      de: 'Maximaler Preis überschritten.',
      tr: 'Maksimum fiyat aşıldı.',
    },
    eventNotFound: {
      de: 'Event nicht gefunden.',
      tr: 'Etkinlik bulunamadı.',
    },
    eventEnded: {
      de: 'Event ist beendet — Änderung nicht möglich.',
      tr: 'Etkinlik sona erdi — değişiklik yapılamaz.',
    },
    eventGameweekNotFound: {
      de: 'Event-Gameweek nicht gefunden.',
      tr: 'Etkinlik haftası bulunamadı.',
    },
    playerLockedRemove: {
      de: 'Spieler kann nicht entfernt werden — Spiel bereits gestartet.',
      tr: 'Oyuncu çıkarılamaz — maç başladı.',
    },
    playerLockedAdd: {
      de: 'Spieler kann nicht aufgestellt werden — sein Spiel hat bereits begonnen.',
      tr: 'Oyuncu eklenemez — maçı başladı.',
    },
    duplicatePlayer: {
      de: 'Jeder Spieler darf nur einmal aufgestellt werden.',
      tr: 'Her oyuncu yalnızca bir kez kadro\'ya alınabilir.',
    },
    lineupDeleteFailed: {
      de: 'Lineup konnte nicht gelöscht werden. Bitte Admin kontaktieren.',
      tr: 'Kadro silinemedi. Lütfen yöneticiyle iletişime geçin.',
    },
    walletError: {
      de: 'Wallet-Fehler. Bitte versuche es erneut.',
      tr: 'Cüzdan hatası. Lütfen tekrar deneyin.',
    },
    bountyCreateFailed: {
      de: 'Bounty-Erstellung fehlgeschlagen.',
      tr: 'Görev oluşturulamadı.',
    },
    bountyCancelFailed: {
      de: 'Stornierung fehlgeschlagen.',
      tr: 'İptal başarısız oldu.',
    },
  },
};

for (const locale of ['de', 'tr']) {
  const filePath = path.join(__dirname, '..', 'messages', `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const [ns, keys] of Object.entries(NEW_KEYS)) {
    if (!data[ns]) data[ns] = {};
    for (const [key, vals] of Object.entries(keys)) {
      if (!data[ns][key]) {
        data[ns][key] = vals[locale];
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`${locale}.json updated`);
}

console.log('Batch 19 done — 17 new error keys added');
