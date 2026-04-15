// @vitest-environment node

/**
 * Compliance Wording Tests
 *
 * Verifies that locale files (messages/de.json, messages/tr.json) do NOT
 * contain legally prohibited financial terms used in a PROMOTIONAL context.
 *
 * IMPORTANT: Legal disclaimers that NEGATE forbidden terms are allowed and
 * even required (e.g., "ist keine Kryptowährung" = "is not a cryptocurrency").
 * These tests distinguish between promotional use (forbidden) and disclaimer
 * negation (allowed).
 *
 * Source of truth: .claude/rules/business.md — Wording-Compliance (KRITISCH)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively extract all string values from a nested JSON object */
function flattenStrings(obj: unknown): string[] {
  if (typeof obj === 'string') return [obj];
  if (Array.isArray(obj)) return obj.flatMap(flattenStrings);
  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj as Record<string, unknown>).flatMap(flattenStrings);
  }
  return [];
}

/** Load a locale JSON file and return all string values */
function loadLocaleText(locale: string): { raw: string[] } {
  const filePath = path.resolve(__dirname, '../../../../messages', `${locale}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const strings = flattenStrings(content);
  return { raw: strings };
}

/**
 * Check if a string is a legal disclaimer (negation context).
 * Disclaimers explicitly deny financial properties — these are REQUIRED
 * by compliance and must not be flagged as violations.
 */
function isDisclaimer(s: string): boolean {
  const lower = s.toLowerCase();
  // German disclaimer patterns
  if (lower.includes('kein finanzprodukt') || lower.includes('keine kryptowährung')) return true;
  if (lower.includes('gewährt keine renditen')) return true;
  if (lower.includes('keinen eigentumsanteil')) return true;
  if (lower.includes('keine garantie')) return true;
  if (lower.includes('kein e-geld')) return true;
  if (lower.includes('kein anspruch auf rücktausch')) return true;
  // Turkish disclaimer patterns
  if (lower.includes('finansal ürün değildir')) return true;
  if (lower.includes('kripto para birimi değildir')) return true;
  if (lower.includes('garantili bir değeri yoktur')) return true;
  if (lower.includes('garantili getiri yoktur')) return true;
  if (lower.includes('herhangi bir getiri, faiz veya temettü sağlamaz')) return true;
  return false;
}

/**
 * Find all strings that contain a forbidden term as a standalone word.
 * Uses word-boundary regex to avoid false positives like "gewinnen" matching "gewinn".
 * Excludes disclaimer strings (negation context).
 */
function findViolations(
  raw: string[],
  forbiddenTerms: { term: string; regex: RegExp }[]
): { term: string; examples: string[] }[] {
  const violations: { term: string; examples: string[] }[] = [];

  // Filter out disclaimer strings first
  const nonDisclaimer = raw.filter((s) => !isDisclaimer(s));

  for (const { term, regex } of forbiddenTerms) {
    const matches = nonDisclaimer.filter((s) => regex.test(s.toLowerCase()));
    if (matches.length > 0) {
      violations.push({ term, examples: matches.slice(0, 3) });
    }
  }

  return violations;
}

/**
 * Build a word-boundary regex for a forbidden term.
 * Uses Unicode-aware word boundaries via lookahead/lookbehind for
 * non-word chars or start/end of string.
 */
function termRegex(term: string): RegExp {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Use (?<!\w) and (?!\w) for word boundaries that work with Unicode
  return new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'i');
}

/**
 * Build a Turkish stem-regex that matches any kazan*-form (kazan, kazandı,
 * kazanıldı, kazanma, kazanır, kazançlar, ...). Uses lookbehind for
 * left word-boundary and allows any suffix on the right.
 */
function turkishStemRegex(stem: string): RegExp {
  const escaped = stem.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!\\w)${escaped}\\w*`, 'i');
}

/**
 * Build a regex that matches an arbitrary substring (no word-boundary).
 * Used for patterns that span multiple words (e.g. "Marktwert steigt").
 */
function phraseRegex(phrase: string): RegExp {
  const escaped = phrase.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

// ---------------------------------------------------------------------------
// Forbidden term definitions with word-boundary matching
// ---------------------------------------------------------------------------

/** English forbidden terms — must not appear in any locale */
const FORBIDDEN_EN = [
  'investment',
  'roi',
  'return on investment',
  'ownership',
  'guaranteed returns',
  'cryptocurrency',
  'blockchain token',
].map((t) => ({ term: t, regex: termRegex(t) }));

/**
 * German forbidden terms — standalone nouns only.
 * Note: "gewinn" is excluded because German "gewinnen" (to win) and
 * "Gewinner" (winner) are gaming terms, not financial.
 * "profit" (EN) is excluded from DE check because "profitierst" means "benefit from".
 */
const FORBIDDEN_DE = [
  'investition',
  'rendite',
  'dividende',
  'eigentum',
  'garantierte rendite',
  'kryptowährung',
].map((t) => ({ term: t, regex: termRegex(t) }));

/**
 * Turkish forbidden terms.
 * Note: "getiri" as standalone financial return is checked, but
 * "getirir" (verb: "brings") has a different suffix and won't match
 * due to word-boundary regex.
 */
const FORBIDDEN_TR = [
  'yatırım',
  'kâr',
  'getiri',
  'temettü',
  'sahiplik',
  'kripto para',
].map((t) => ({ term: t, regex: termRegex(t) }));

/** Forbidden "player share" variants — must NEVER appear in any locale */
const FORBIDDEN_PLAYER_SHARE = [
  'spieleranteil',
  'player share',
  'oyuncu payı',
].map((t) => ({ term: t, regex: termRegex(t) }));

/** Crypto/blockchain terms — checked across all locales, excluding disclaimers */
const FORBIDDEN_CRYPTO = [
  'cryptocurrency',
  'kryptowährung',
  'kripto para',
  'blockchain token',
  'blockchain-token',
].map((t) => ({ term: t, regex: termRegex(t) }));

/**
 * Turkish `kazan*`-family (gambling verb per business.md).
 * Covers: kazan, kazandın, kazandı, kazanıldı, kazanma, kazanır, kazançlar.
 * Note: `kazancı/kazanç` Substantivform is also caught by the stem-regex.
 */
const FORBIDDEN_TR_KAZAN = [
  { term: 'kazan*', regex: turkishStemRegex('kazan') },
];

/**
 * "Trader/Tüccar" role-detection — business.md Securities-Identity-Rule.
 *
 * SCOPE NOTE: This test guards against NEW role-framing inserts.
 * Existing `Trader`/`Tüccar` role-strings in profile.trader, achievements etc.
 * are tracked under a separate Phase-4 compliance-refactor ticket (role-rename
 * to `Scout`/`Koleksiyoncu` requires DB + achievement_key migration).
 *
 * We match ONLY explicit role-framing patterns: "als Trader", "olarak Tüccar",
 * or role-claim constructions like "du bist Trader".
 */
const FORBIDDEN_ROLE_TRADER = [
  // Claim-construction: "als Trader" / "als Tüccar" (DE)
  { term: 'als Trader', regex: /\bals\s+trader\b/i },
  { term: 'als Tüccar', regex: /\bals\s+tüccar\b/i },
  // Role-assignment: "Tüccar olarak" / "Trader olarak" (TR)
  { term: 'Trader olarak', regex: /\btrader\s+olarak\b/i },
  { term: 'Tüccar olarak', regex: /\btüccar\s+olarak\b/i },
  // "Du bist Trader" claim
  { term: 'bist Trader', regex: /\bbist\s+trader\b/i },
  { term: 'sen Tüccar', regex: /\bsen\s+tüccar\b/i },
];

/**
 * Reward-Kausalität patterns — Rendite-Kausalitätsbotschaften per business.md.
 * "Marktwert steigt → Fee steigt" suggests that rewards are tied to market value,
 * which is a financial-instrument signal. Also catches "am Erfolg beteiligen" and
 * "Handle clever" spekulations-framing.
 */
const FORBIDDEN_REWARD_CAUSALITY = [
  { term: 'Marktwert steigt', regex: phraseRegex('marktwert steigt') },
  { term: 'piyasa değeri artınca', regex: phraseRegex('piyasa değeri artınca') },
  { term: 'am Erfolg beteiligen', regex: phraseRegex('am erfolg beteilig') },
  { term: 'başarıya ortak', regex: phraseRegex('başarıya ortak') },
  { term: 'Handle clever', regex: phraseRegex('handle clever') },
  { term: 'akıllıca işlem', regex: phraseRegex('akıllıca işlem') },
];

/**
 * $SCOUT ticker in user-facing strings — Code-Variable/Admin OK, but
 * user-facing Values must say "Credits". The `$SCOUT` literal is specifically
 * forbidden in values of the `fantasy`/`home`/`welcome`/`community` namespaces.
 * We catch any `$SCOUT` substring in ANY value except the admin-facing block.
 *
 * Scope: User-facing = anything that is NOT in `bescoutAdmin` namespace.
 * Since we flatten all strings, we need an allowlist: admin-facing values
 * containing `$SCOUT` are allowed (per business.md IPO-rule analog).
 */
const FORBIDDEN_SCOUT_TICKER = [
  { term: '$SCOUT', regex: /\$SCOUT/ },
];

/**
 * Admin-facing $SCOUT values (per business.md: admin strings may retain `$SCOUT`).
 * These are hardcoded from the current bescoutAdmin namespace — if new admin
 * values are added, they must be allowlisted here.
 */
const ADMIN_SCOUT_ALLOWLIST = new Set([
  '$SCOUT Events',
  '$SCOUT als Waehrung fuer Fantasy Events aktivieren',
  '$SCOUT Events aktiviert',
  '$SCOUT Events deaktiviert',
  '$SCOUT Etkinlikler',
  'Fantasy etkinlikler icin $SCOUT para birimini etkinlestir',
  '$SCOUT etkinlikler etkinlestirildi',
  '$SCOUT etkinlikler devre disi birakildi',
]);

/**
 * "Prize / Prämien-Liga" patterns — gambling-vocabulary per business.md.
 * Checks for `prize` (EN), `prämie` (DE), `preisgeld`, `preispool`.
 * Note: "Preis" alone is ambiguous (e.g. "Marktpreis") — only flag the compound
 * forms like "Prämien-Liga", "Preispool", "Preisgeld".
 */
const FORBIDDEN_PRIZE = [
  { term: 'prize league', regex: termRegex('prize league') },
  { term: 'prize pool', regex: termRegex('prize pool') },
  { term: 'prämien-liga', regex: termRegex('prämien-liga') },
  { term: 'prämienliga', regex: termRegex('prämienliga') },
  { term: 'preisgeld', regex: termRegex('preisgeld') },
  { term: 'preispool', regex: termRegex('preispool') },
  { term: 'preis-pool', regex: termRegex('preis-pool') },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Compliance Wording', () => {
  const de = loadLocaleText('de');
  const tr = loadLocaleText('tr');

  // ─────────────────────────────────────────────────────
  // COMPL-de: German locale — no forbidden financial terms (outside disclaimers)
  // ─────────────────────────────────────────────────────
  it('COMPL-de: German locale contains no forbidden financial terms', () => {
    const allForbidden = [...FORBIDDEN_DE, ...FORBIDDEN_EN];
    const violations = findViolations(de.raw, allForbidden);

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  - "${v.term}" found in: ${v.examples.map((e) => `"${e}"`).join(', ')}`)
        .join('\n');
      expect.fail(
        `German locale (de.json) contains forbidden financial terms:\n${report}`
      );
    }
  });

  // ─────────────────────────────────────────────────────
  // COMPL-tr: Turkish locale — no forbidden financial terms (outside disclaimers)
  // ─────────────────────────────────────────────────────
  it('COMPL-tr: Turkish locale contains no forbidden financial terms', () => {
    const allForbidden = [...FORBIDDEN_TR, ...FORBIDDEN_EN];
    const violations = findViolations(tr.raw, allForbidden);

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  - "${v.term}" found in: ${v.examples.map((e) => `"${e}"`).join(', ')}`)
        .join('\n');
      expect.fail(
        `Turkish locale (tr.json) contains forbidden financial terms:\n${report}`
      );
    }
  });

  // ─────────────────────────────────────────────────────
  // COMPL-SCOUT: No locale may describe Scout Cards as "player shares"
  // ─────────────────────────────────────────────────────
  it('COMPL-SCOUT: No locale describes Scout Cards as player shares', () => {
    const allLocales = [
      { locale: 'de', data: de },
      { locale: 'tr', data: tr },
    ];

    const allViolations: string[] = [];

    for (const { locale, data } of allLocales) {
      const violations = findViolations(data.raw, FORBIDDEN_PLAYER_SHARE);
      for (const v of violations) {
        allViolations.push(
          `[${locale}] "${v.term}" found in: ${v.examples.map((e) => `"${e}"`).join(', ')}`
        );
      }
    }

    if (allViolations.length > 0) {
      expect.fail(
        `Scout Cards must not be described as player shares:\n${allViolations.map((v) => `  - ${v}`).join('\n')}`
      );
    }
  });

  // ─────────────────────────────────────────────────────
  // COMPL-CRYPTO: No locale may reference crypto/blockchain (outside disclaimers)
  // ─────────────────────────────────────────────────────
  it('COMPL-CRYPTO: No locale references cryptocurrency or blockchain tokens', () => {
    const allLocales = [
      { locale: 'de', data: de },
      { locale: 'tr', data: tr },
    ];

    const allViolations: string[] = [];

    for (const { locale, data } of allLocales) {
      const violations = findViolations(data.raw, FORBIDDEN_CRYPTO);
      for (const v of violations) {
        allViolations.push(
          `[${locale}] "${v.term}" found in: ${v.examples.map((e) => `"${e}"`).join(', ')}`
        );
      }
    }

    if (allViolations.length > 0) {
      expect.fail(
        `$SCOUT must not be described as cryptocurrency:\n${allViolations.map((v) => `  - ${v}`).join('\n')}`
      );
    }
  });

  // ─────────────────────────────────────────────────────
  // COMPL-tr-kazan: TR kazan*-family (gambling verb per business.md)
  // Catches: kazan, kazandın, kazandı, kazanıldı, kazanma, kazanır, kazançlar, kazancı.
  // Phase 3 Compliance — MASAK §4 Abs.1 e (Turkish gambling law).
  // ─────────────────────────────────────────────────────
  it('COMPL-tr-kazan: Turkish locale contains no kazan*-family verbs (gambling vocabulary)', () => {
    const violations = findViolations(tr.raw, FORBIDDEN_TR_KAZAN);

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  - "${v.term}" found in: ${v.examples.map((e) => `"${e}"`).join(', ')}`)
        .join('\n');
      expect.fail(
        `Turkish locale (tr.json) contains gambling-family kazan* verbs:\n${report}\n\n` +
        `Fix: Use "topla" (collect), "al" (take/receive), or "elde et" (obtain) per business.md.`
      );
    }
  });

  // ─────────────────────────────────────────────────────
  // COMPL-role-trader: "Trader/Tüccar" als Rolle (Securities-Identity)
  // business.md: Securities-Terminologie → "Sammler"/"Scout"/"Koleksiyoncu".
  // ─────────────────────────────────────────────────────
  it('COMPL-role-trader: No locale uses "Trader/Tüccar" as a role label', () => {
    const allLocales = [
      { locale: 'de', data: de },
      { locale: 'tr', data: tr },
    ];

    const allViolations: string[] = [];

    for (const { locale, data } of allLocales) {
      const violations = findViolations(data.raw, FORBIDDEN_ROLE_TRADER);
      for (const v of violations) {
        allViolations.push(
          `[${locale}] "${v.term}" found in: ${v.examples.map((e) => `"${e}"`).join(', ')}`
        );
      }
    }

    if (allViolations.length > 0) {
      expect.fail(
        `"Trader/Tüccar" as a role label is forbidden (SPK/MiCA signal):\n${allViolations.map((v) => `  - ${v}`).join('\n')}\n\n` +
        `Fix: Use "Sammler"/"Scout" (DE) or "Koleksiyoncu"/"Scout" (TR) per business.md.`
      );
    }
  });

  // ─────────────────────────────────────────────────────
  // COMPL-reward-causality: "Marktwert steigt → Bonus" (Rendite-Kausalität)
  // business.md: Financial-instrument signal — "Hoehe haengt von Markt-Bewertung ab"
  // neutralisiert die Kausalität.
  // ─────────────────────────────────────────────────────
  it('COMPL-reward-causality: No locale uses reward-causality patterns (Rendite-Kausalität)', () => {
    const allLocales = [
      { locale: 'de', data: de },
      { locale: 'tr', data: tr },
    ];

    const allViolations: string[] = [];

    for (const { locale, data } of allLocales) {
      const violations = findViolations(data.raw, FORBIDDEN_REWARD_CAUSALITY);
      for (const v of violations) {
        allViolations.push(
          `[${locale}] "${v.term}" found in: ${v.examples.map((e) => `"${e}"`).join(', ')}`
        );
      }
    }

    if (allViolations.length > 0) {
      expect.fail(
        `Reward-causality patterns are forbidden (Rendite-Kausalität signals):\n${allViolations.map((v) => `  - ${v}`).join('\n')}\n\n` +
        `Fix: Use neutral framing like "Die Hoehe haengt von Markt-Bewertung ab" per business.md.`
      );
    }
  });

  // ─────────────────────────────────────────────────────
  // COMPL-scout-ticker: $SCOUT in user-facing values (must be "Credits")
  // business.md: Code-intern bleiben Variable/DB-Column-Namen. Admin-facing darf
  // bleiben. User-facing Values → "Credits".
  // Allowlist: ADMIN_SCOUT_ALLOWLIST contains the current admin-namespace values.
  // ─────────────────────────────────────────────────────
  it('COMPL-scout-ticker: $SCOUT ticker must not appear in user-facing values', () => {
    const allLocales = [
      { locale: 'de', data: de },
      { locale: 'tr', data: tr },
    ];

    const allViolations: string[] = [];

    for (const { locale, data } of allLocales) {
      // Filter: allow admin-namespace values that intentionally retain $SCOUT.
      const userFacing = data.raw.filter((s) => !ADMIN_SCOUT_ALLOWLIST.has(s));
      const violations = findViolations(userFacing, FORBIDDEN_SCOUT_TICKER);
      for (const v of violations) {
        allViolations.push(
          `[${locale}] "${v.term}" found in: ${v.examples.map((e) => `"${e}"`).join(', ')}`
        );
      }
    }

    if (allViolations.length > 0) {
      expect.fail(
        `$SCOUT ticker is forbidden in user-facing strings (only admin namespace allowed):\n${allViolations.map((v) => `  - ${v}`).join('\n')}\n\n` +
        `Fix: Replace "$SCOUT" with "Credits" in user-facing values. If this is a new admin-facing string, ` +
        `add it to ADMIN_SCOUT_ALLOWLIST in wording-compliance.test.ts.`
      );
    }
  });

  // ─────────────────────────────────────────────────────
  // COMPL-prize: Prize-League / Prämien-Liga (Glücksspiel-Vokabel)
  // business.md: Prize/Prämie = Gluecksspiel-Terminologie → Reward/Belohnung.
  // ─────────────────────────────────────────────────────
  it('COMPL-prize: No locale uses prize-league / prämien-liga / preisgeld', () => {
    const allLocales = [
      { locale: 'de', data: de },
      { locale: 'tr', data: tr },
    ];

    const allViolations: string[] = [];

    for (const { locale, data } of allLocales) {
      const violations = findViolations(data.raw, FORBIDDEN_PRIZE);
      for (const v of violations) {
        allViolations.push(
          `[${locale}] "${v.term}" found in: ${v.examples.map((e) => `"${e}"`).join(', ')}`
        );
      }
    }

    if (allViolations.length > 0) {
      expect.fail(
        `Prize/Prämie-vocabulary is forbidden (gambling-terminology):\n${allViolations.map((v) => `  - ${v}`).join('\n')}\n\n` +
        `Fix: Use "Reward"/"Belohnung" (DE) or "Ödül" (TR) per business.md.`
      );
    }
  });
});
