#!/usr/bin/env node
// TR-Locale String Audit
// Parst qa-screenshots/synthetic/profile-c-tr-locale/tr-strings.txt
// Detektiert: DE-Leaks, EN-Leaks, Securities-Glossar-Violations, Gluecksspiel-Vokabular.
// Output: Markdown-Report mit kategorisierten Findings.

import fs from 'node:fs';
import path from 'node:path';

const DUMP_PATH = process.argv[2] ?? 'qa-screenshots/synthetic/profile-c-tr-locale/tr-strings.txt';
const REPORT_PATH = process.argv[3] ?? 'qa-screenshots/synthetic/profile-c-tr-locale/audit-report.md';

if (!fs.existsSync(DUMP_PATH)) {
  console.error(`[audit-tr-strings] Dump not found: ${DUMP_PATH}`);
  console.error('Run `pnpm run test:synthetic` first to generate it.');
  process.exit(1);
}

const raw = fs.readFileSync(DUMP_PATH, 'utf-8');
const lines = raw.split(/\r?\n/);

// ── Detector-Datenbank ───────────────────────────────────────────────────
// Wörter die in einem TR-Locale-String HARTE DE-Leaks signalisieren.
// Kein "und" / "der" / "ist" allein (FP bei Namen) — nur starke Marker.
const DE_LEAK_WORDS = [
  // Verben
  'steigend', 'fallend', 'gestiegen', 'gefallen',
  'gestartet', 'beendet', 'läuft',
  'gewonnen', 'verloren', 'gewinnt', 'verliert',
  // Adjektive
  'starker', 'stark', 'schwach', 'gut', 'besten', 'bester',
  'konstant', 'unterschätzt', 'unterschaetzt', 'überbewertet',
  'gerechtfertigt', 'angemessen', 'teuer', 'günstig',
  // Substantive (häufig in Community-Posts)
  'Spieler', 'Mannschaft', 'Leistung', 'Analyse', 'Bewertung',
  'Performer', 'Markt', 'Position', 'Trend',
  'Saison', 'Spiel', 'Tor', 'Vorlage',
  // Connectors + Common
  'einer der', 'eine der', 'einer', 'einem',
  'Wie war', 'Wie ist', 'Wer baut',
  'pro Position', 'bei Sivasspor', 'vom Markt',
  // Länder (User-Facing — MUST be TR)
  'Deutschland', 'Türkei', 'England', 'Spanien', 'Italien', 'Frankreich',
  'Griechenland', 'Portugal', 'Niederlande', 'Belgien',
  // Anglizismen die DE-Context anzeigen
  'Meisterschaft', 'Spotlight',
];

// Englisch — in TR-Locale nicht OK außer bei echten Fachtermini (LIVE/FINAL passt manchmal)
const EN_LEAK_WORDS = [
  'Find', 'undervalued', 'Search', 'Player', 'Players',
  'Name', 'Club', 'Team', 'Status',
  'DOUBTFUL', 'QUESTIONABLE',
  // "LIVE" ist zweideutig — manchmal als Fachterm OK; wir flaggen aber für Review
  'LIVE',
  // Trading-Fachbegriffe die user-facing NICHT EN bleiben dürfen
  'Buy', 'Sell', 'Bid', 'Ask', 'Order',
];

// Securities-Terminologie (business.md, AR-17, Journey #3+4) — user-facing VERBOTEN
const SECURITIES_VIOLATIONS = [
  { pattern: /\bIPO\b/i, rule: 'IPO → "Kulüp Satışı" (AR-7)' },
  { pattern: /\bOrderbuch\b/i, rule: 'Orderbuch → "Teklif Derinliği"' },
  { pattern: /\bPortfolio\b/i, rule: 'Portfolio → "Koleksiyon" / "Kadro"' },
  { pattern: /\bTrader\b/i, rule: 'Trader → "Koleksiyoncu" / "Scout" (Seeds erlaubt Ausnahme)' },
  { pattern: /\bMarktwert steigt\b/i, rule: 'Marktwert-Kausalitaet (SPK-Red-Flag)' },
  { pattern: /am Erfolg beteilig/i, rule: 'Gewinn-Beteiligung (SPK-Red-Flag)' },
  { pattern: /Handle clever/i, rule: 'Spekulations-Strategie (SPK-Red-Flag)' },
];

// Gluecksspiel-Vokabular (business.md, StGB §284, MASAK)
const GAMBLING_VIOLATIONS = [
  // DE-Variante (sollte in kein Locale user-facing)
  { pattern: /\bPreis(geld|pool|gewinn)\b/i, rule: 'Preis/-geld/-pool → "Reward" / "Ödül" (StGB §284)' },
  { pattern: /\bPrämie\b/i, rule: 'Prämie → "Reward" / "Ödül"' },
  { pattern: /\bGewinner\b/i, rule: 'Gewinner → "Top-Platzierung" / "Üst Sıralama"' },
  { pattern: /\bgewinnen\b/i, rule: 'gewinnen → "sammeln" / "topla"' },
  { pattern: /\bGewinn\b/i, rule: 'Gewinn → "Reward" / "Ödül"' },
  // TR-Variante (kazan* ist MASAK §4 Abs.1 e Red-Flag)
  { pattern: /\bkazan(?!ç)/i, rule: 'kazan* → "topla" / "al" / "elde et" (MASAK §4 Abs.1 e)' },
];

// Bekannte False-Positives (whitelisted — nicht flaggen)
const WHITELIST_STRINGS = new Set([
  'QA Test Post von Bot', // Seed-Data
  'Scout Card', // Produkt-Name (EN-OK)
  'Founding Pass', 'Founder Pass', 'Fan Pass', 'Pro Pass', // Pass-Namen bewusst EN
  'Genesis Founder', 'Founding Member',
  'Scouting Zone', 'Scout Network',
  'BeScout', 'BeScout Liga', 'Jarvis QA',
  'Premier League', 'La Liga', 'Serie A', 'Bundesliga', '2. Bundesliga', // League-Names
  'Süper Lig', 'TFF 1. Lig',
  'Scouting', 'Airdrop', 'Topluluk', // Produkt-Bereiche (Nav)
  'Top 100', 'Top',
]);

const isWhitelisted = (str) => {
  for (const wl of WHITELIST_STRINGS) {
    if (str.includes(wl)) return true;
  }
  // Short strings (< 4 chars) skip — mostly codes/abbreviations
  if (str.trim().length < 4) return true;
  // Pure digits/numbers/codes
  if (/^[\d\s.,%+\-→×⚽⌘K|·]*$/.test(str)) return true;
  // Bot-Names like @bot001 or @trader07
  if (/^@\w+$/.test(str.trim())) return true;
  // Money-Format mit Suffix CR/$SCOUT
  if (/^[\d.,\s]+(CR|\$SCOUT)?$/.test(str.trim())) return true;
  return false;
};

// ── Parser ───────────────────────────────────────────────────────────────
// Format: `[route] text` oder standalone-lines (unprefixed gehören zum vorigen Context)
// Wir sammeln per Route + finden mehrzeilige Strings
const findings = {
  deLeaks: [],
  enLeaks: [],
  securities: [],
  gambling: [],
};

let currentRoute = 'unknown';
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith('#')) continue;

  // Route-Prefix
  const routeMatch = trimmed.match(/^\[(\w+)\]\s*(.*)$/);
  let content;
  if (routeMatch) {
    currentRoute = routeMatch[1];
    content = routeMatch[2];
  } else {
    content = trimmed;
  }

  if (!content || isWhitelisted(content)) continue;

  // DE-Leak-Detection
  for (const word of DE_LEAK_WORDS) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(content)) {
      findings.deLeaks.push({ route: currentRoute, text: content, match: word, lineNo: i + 1 });
      break; // one match per line enough
    }
  }

  // EN-Leak-Detection
  for (const word of EN_LEAK_WORDS) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (regex.test(content)) {
      findings.enLeaks.push({ route: currentRoute, text: content, match: word, lineNo: i + 1 });
      break;
    }
  }

  // Securities-Violations
  for (const { pattern, rule } of SECURITIES_VIOLATIONS) {
    if (pattern.test(content)) {
      findings.securities.push({ route: currentRoute, text: content, rule, lineNo: i + 1 });
      break;
    }
  }

  // Gambling-Violations
  for (const { pattern, rule } of GAMBLING_VIOLATIONS) {
    if (pattern.test(content)) {
      findings.gambling.push({ route: currentRoute, text: content, rule, lineNo: i + 1 });
      break;
    }
  }
}

// De-duplication (selbe Text-Route-Kombi)
const dedupe = (arr) => {
  const seen = new Set();
  return arr.filter((f) => {
    const key = `${f.route}|${f.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

findings.deLeaks = dedupe(findings.deLeaks);
findings.enLeaks = dedupe(findings.enLeaks);
findings.securities = dedupe(findings.securities);
findings.gambling = dedupe(findings.gambling);

// ── Report ───────────────────────────────────────────────────────────────
const totalFindings =
  findings.deLeaks.length +
  findings.enLeaks.length +
  findings.securities.length +
  findings.gambling.length;

const groupByRoute = (arr) => {
  const map = new Map();
  for (const f of arr) {
    if (!map.has(f.route)) map.set(f.route, []);
    map.get(f.route).push(f);
  }
  return map;
};

const renderGroup = (title, findingsArr, emojiMarker, matchLabel = 'Match') => {
  if (findingsArr.length === 0) return `### ${title} — OK (0 Treffer)\n\n`;
  let md = `### ${title} — ${findingsArr.length} Treffer ${emojiMarker}\n\n`;
  const grouped = groupByRoute(findingsArr);
  for (const [route, items] of [...grouped.entries()].sort()) {
    md += `**[${route}]** (${items.length})\n`;
    for (const item of items) {
      const reason = item.match ? `${matchLabel}: \`${item.match}\`` : item.rule;
      md += `- \`${item.text.replace(/`/g, "'").slice(0, 120)}\` — ${reason}\n`;
    }
    md += '\n';
  }
  return md;
};

let report = `# TR-Locale Audit Report\n\n`;
report += `Erzeugt: ${new Date().toISOString()}\n`;
report += `Dump: \`${DUMP_PATH}\`\n`;
report += `Regel-Basis: \`.claude/rules/business.md\` (Kapitalmarkt-Glossar AR-17, Journey #3+4)\n\n`;

report += `## Zusammenfassung\n\n`;
report += `| Kategorie | Treffer | Severity |\n`;
report += `|-----------|---------|----------|\n`;
report += `| DE-Leaks in TR-Locale | ${findings.deLeaks.length} | ${findings.deLeaks.length > 0 ? 'HIGH — user-facing i18n-Bug' : 'OK'} |\n`;
report += `| EN-Leaks in TR-Locale | ${findings.enLeaks.length} | ${findings.enLeaks.length > 0 ? 'MEDIUM — Ausnahme bei Fachtermini' : 'OK'} |\n`;
report += `| Securities-Glossar | ${findings.securities.length} | ${findings.securities.length > 0 ? 'CRITICAL — SPK/MASAK Red-Flag' : 'OK'} |\n`;
report += `| Gluecksspiel-Vokabel | ${findings.gambling.length} | ${findings.gambling.length > 0 ? 'CRITICAL — StGB §284 / MASAK §4' : 'OK'} |\n`;
report += `| **TOTAL** | **${totalFindings}** | |\n\n`;

report += `## Hinweise für den TR-Reviewer\n\n`;
report += `1. **Vor dem Review**: Diesen Report durchlesen. Ich habe die offensichtlichsten Fehler bereits identifiziert.\n`;
report += `2. **Seed-Daten filtern**: Bot-Namen "Trader 07", "Scout 01" und "QA Test Post" sind DB-Seeds (nicht i18n). Hier nur prüfen ob die Seed-Namen selbst Compliance-kritisch sind.\n`;
report += `3. **Fachterm-Ausnahmen**: Pass-Namen (Founding Pass, Pro Pass), Liga-Namen (Premier League, La Liga), Scout Card = bewusst EN/Marke.\n`;
report += `4. **False-Positives**: DE-Wort-Detector matched auch auf TR-Worten die ähnlich aussehen — bitte je Treffer prüfen.\n\n`;

report += `## Findings\n\n`;
report += renderGroup('DE-Leaks in TR-Locale', findings.deLeaks, '🔴', 'DE-Wort');
report += renderGroup('EN-Leaks in TR-Locale', findings.enLeaks, '🟠', 'EN-Wort');
report += renderGroup('Securities-Glossar-Violations (SPK/MASAK)', findings.securities, '🚨', 'Regel');
report += renderGroup('Glücksspiel-Vokabular (StGB §284 / MASAK)', findings.gambling, '🚨', 'Regel');

report += `## Quick-Fix-Anleitung\n\n`;
report += `Für jeden Fund:\n`;
report += `1. **Quelle finden**: \`grep -rn "<text>" messages/tr.json src/\`\n`;
report += `2. **Wenn in messages/tr.json**: Übersetzen nach TR, Commit mit \`fix(i18n): tr — <text>\`.\n`;
report += `3. **Wenn in src/ hart-coded**: i18n-Key extrahieren + DE+TR-Version in messages/*.json.\n`;
report += `4. **Wenn in DB (Seed)**: Seed-Script in \`supabase/seeds/\` patchen (nicht produktiv-kritisch für Beta).\n\n`;

report += `## Reproduktion\n\n`;
report += `\`\`\`bash\n`;
report += `pnpm run test:synthetic       # re-generate tr-strings.txt\n`;
report += `pnpm run audit:tr-strings     # re-run this audit\n`;
report += `\`\`\`\n`;

fs.writeFileSync(REPORT_PATH, report, 'utf-8');

// ── Console Summary ──────────────────────────────────────────────────────
console.log(`\n✅ TR-Strings Audit complete`);
console.log(`   Dump: ${DUMP_PATH} (${lines.length} lines)`);
console.log(`   Report: ${REPORT_PATH}`);
console.log(`\n   DE-Leaks:        ${findings.deLeaks.length}`);
console.log(`   EN-Leaks:        ${findings.enLeaks.length}`);
console.log(`   Securities:      ${findings.securities.length}`);
console.log(`   Gluecksspiel:    ${findings.gambling.length}`);
console.log(`   TOTAL:           ${totalFindings}\n`);

// Exit non-zero bei CRITICAL findings (für CI-Integration)
const hasCritical = findings.securities.length > 0 || findings.gambling.length > 0;
if (hasCritical && process.argv.includes('--check')) {
  console.error('❌ CRITICAL findings — exit 1');
  process.exit(1);
}
