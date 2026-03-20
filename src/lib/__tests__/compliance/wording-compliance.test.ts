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
});
