/**
 * Batch 21: i18n keys for remaining UI component strings
 * - player badges, gameweek scores, spieltag, community, profile, fantasy, errors
 */
const fs = require('fs');
const path = require('path');

const DE_PATH = path.join(__dirname, '..', 'messages', 'de.json');
const TR_PATH = path.join(__dirname, '..', 'messages', 'tr.json');

const NEW_KEYS = {
  player: {
    de: {
      injured: 'Verletzt',
      suspended: 'Gesperrt',
      doubtful: 'Fraglich',
      liquidatedBadge: 'LIQUIDIERT',
      newIpo: 'Neu {progress}%',
      listed: 'Gelistet',
      gwScores: 'Spieltag-Bewertungen',
      noGwScores: 'Noch keine Spieltag-Bewertungen',
      individualRatings: 'Einzelbewertungen',
    },
    tr: {
      injured: 'Sakatlık',
      suspended: 'Cezalı',
      doubtful: 'Şüpheli',
      liquidatedBadge: 'LİKİDE',
      newIpo: 'Yeni {progress}%',
      listed: 'Listelendi',
      gwScores: 'Hafta Puanları',
      noGwScores: 'Henüz hafta puanı yok',
      individualRatings: 'Bireysel Puanlar',
    },
  },
  spieltag: {
    de: {
      substitutions: 'Einwechslungen',
    },
    tr: {
      substitutions: 'Oyuncu Değişiklikleri',
    },
  },
  community: {
    de: {
      clubVote: 'Club-Abstimmung',
    },
    tr: {
      clubVote: 'Kulüp Oylaması',
    },
  },
  profile: {
    de: {
      portfolioDev: 'Wertentwicklung',
      reports: 'Berichte',
    },
    tr: {
      portfolioDev: 'Değer Gelişimi',
      reports: 'Raporlar',
    },
  },
};

function merge(file, keys) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const lang = file.includes('tr.json') ? 'tr' : 'de';

  for (const [ns, langs] of Object.entries(keys)) {
    const translations = langs[lang];
    if (!translations) continue;
    if (!json[ns]) json[ns] = {};
    for (const [key, val] of Object.entries(translations)) {
      json[ns][key] = val;
    }
  }

  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`✅ ${path.basename(file)} updated`);
}

merge(DE_PATH, NEW_KEYS);
merge(TR_PATH, NEW_KEYS);
console.log('Done — batch 21 keys added.');
