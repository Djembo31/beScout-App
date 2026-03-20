// @vitest-environment node

/**
 * Turkish Unicode Handling Tests — TURK-01 to TURK-10
 *
 * Verifies that Turkish characters (İ/ı/Ş/ş/Ç/ç/Ğ/ğ/Ö/ö/Ü/ü) are handled
 * correctly in both JavaScript and the database. This is a documented bug class:
 * `'İ'.toLowerCase()` in JS yields `'i\u0307'` not `'i'`.
 *
 * All tests are READ-ONLY — they only SELECT, never mutate.
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local — try cwd first, then walk up to find it (worktree support)
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Worktree: .env.local is in the main repo root
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    dir = path.dirname(dir);
    const candidate = path.join(dir, '.env.local');
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      break;
    }
  }
}

let sb: SupabaseClient;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

// ─────────────────────────────────────────────────────────
// Helper: NFD normalization to strip Turkish diacritics
// ─────────────────────────────────────────────────────────
function normalizeTurkish(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
    .replace(/ı/g, 'i')             // dotless i -> i
    .replace(/İ/g, 'I')             // capital İ -> I
    .toLowerCase();
}

describe('Turkish Unicode Handling', () => {
  // ─────────────────────────────────────────────────────
  // TURK-01: Document the İ/I JavaScript problem
  // ─────────────────────────────────────────────────────
  it('TURK-01: İ.toLowerCase() does NOT produce plain "i" in JavaScript', () => {
    // This documents the core bug: Turkish İ (U+0130) lowercases to
    // i + combining dot above (U+0069 U+0307), NOT plain 'i' (U+0069)
    const turkishCapitalI = 'İ'; // U+0130 LATIN CAPITAL LETTER I WITH DOT ABOVE
    const lowered = turkishCapitalI.toLowerCase();

    // The lowercased result is NOT 'i' — it's 'i' + combining dot above
    expect(lowered).not.toBe('i');
    expect(lowered.length).toBeGreaterThanOrEqual(2); // multi-codeunit

    // But plain ASCII 'I' lowercases normally
    expect('I'.toLowerCase()).toBe('i');

    // The dotless ı (U+0131) also does NOT lowercase to 'i'
    const dotlessI = 'ı';
    expect(dotlessI.toLowerCase()).not.toBe('i');
    expect(dotlessI.toLowerCase()).toBe('ı'); // stays as-is
  });

  // ─────────────────────────────────────────────────────
  // TURK-02: NFD normalization strips Turkish diacritics
  // ─────────────────────────────────────────────────────
  it('TURK-02: NFD normalization strips Turkish diacritics to ASCII', () => {
    // Turkish special chars → expected ASCII after normalization
    const cases: [string, string][] = [
      ['Şahin', 'sahin'],
      ['Çelik', 'celik'],
      ['Güneş', 'gunes'],
      ['Özdemir', 'ozdemir'],
      ['Ünal', 'unal'],
      ['İlhan', 'ilhan'],
      ['Yıldız', 'yildiz'],
      ['Ağaoğlu', 'agaoglu'],
    ];

    for (const [input, expected] of cases) {
      const result = normalizeTurkish(input);
      expect(result, `normalizeTurkish('${input}') should be '${expected}'`).toBe(expected);
    }
  });

  // ─────────────────────────────────────────────────────
  // TURK-03: Players with İ in last_name are findable
  // ─────────────────────────────────────────────────────
  it('TURK-03: Players with İ in last_name are findable via ilike', async () => {
    const { data, error } = await sb
      .from('players')
      .select('id, first_name, last_name')
      .ilike('last_name', '%İ%')
      .limit(20);

    expect(error).toBeNull();

    if (!data || data.length === 0) {
      // TFF 1. Lig has many Turkish names — but skip gracefully if empty
      console.warn('TURK-03: No players found with İ in last_name — table may be empty');
      return;
    }

    // Every returned player should actually have İ in last_name
    for (const p of data) {
      expect(
        p.last_name.includes('İ') || p.last_name.includes('i̇'),
        `Player ${p.first_name} ${p.last_name} should contain İ`
      ).toBe(true);
    }
  });

  // ─────────────────────────────────────────────────────
  // TURK-04: Players with ı in first_name are findable
  // ─────────────────────────────────────────────────────
  it('TURK-04: Players with ı (dotless i) in first_name are findable via ilike', async () => {
    const { data, error } = await sb
      .from('players')
      .select('id, first_name, last_name')
      .ilike('first_name', '%ı%')
      .limit(20);

    expect(error).toBeNull();

    if (!data || data.length === 0) {
      console.warn('TURK-04: No players found with ı in first_name — table may be empty');
      return;
    }

    expect(data.length).toBeGreaterThan(0);

    // Verify the returned names actually contain dotless ı
    for (const p of data) {
      expect(
        p.first_name.toLowerCase().includes('ı'),
        `Player ${p.first_name} ${p.last_name}: first_name should contain ı`
      ).toBe(true);
    }
  });

  // ─────────────────────────────────────────────────────
  // TURK-05: Search with ş finds players
  // ─────────────────────────────────────────────────────
  it('TURK-05: Search with ş finds players in first_name or last_name', async () => {
    const { data, error } = await sb
      .from('players')
      .select('id, first_name, last_name')
      .or('last_name.ilike.%ş%,first_name.ilike.%ş%')
      .limit(20);

    expect(error).toBeNull();

    if (!data || data.length === 0) {
      console.warn('TURK-05: No players found with ş — table may be empty');
      return;
    }

    expect(data.length).toBeGreaterThan(0);

    // Verify at least one of first_name/last_name contains ş
    for (const p of data) {
      const hasS =
        p.first_name.toLowerCase().includes('ş') ||
        p.last_name.toLowerCase().includes('ş');
      expect(
        hasS,
        `Player ${p.first_name} ${p.last_name}: should contain ş`
      ).toBe(true);
    }
  });

  // ─────────────────────────────────────────────────────
  // TURK-06: Club names with Turkish chars are intact
  // ─────────────────────────────────────────────────────
  it('TURK-06: Club names with Turkish characters are intact in DB', async () => {
    const { data, error } = await sb
      .from('clubs')
      .select('id, name, slug')
      .limit(50);

    expect(error).toBeNull();

    if (!data || data.length === 0) {
      console.warn('TURK-06: No clubs found — table may be empty');
      return;
    }

    // Check that Turkish chars survived storage (no mojibake)
    const turkishChars = /[İıŞşÇçĞğÖöÜü]/;
    const clubsWithTurkish = data.filter((c) => turkishChars.test(c.name));

    // TFF 1. Lig clubs should have Turkish characters in their names
    // e.g. Sakaryaspor, Göztepe, Ankaragücü, etc.
    if (clubsWithTurkish.length === 0) {
      // Some clubs might not have special chars, but at least verify no corruption
      for (const c of data) {
        // Names should not contain replacement character U+FFFD
        expect(c.name).not.toContain('\uFFFD');
        // Names should not be empty
        expect(c.name.length).toBeGreaterThan(0);
      }
    } else {
      // Verify the Turkish chars are proper Unicode, not garbled
      for (const c of clubsWithTurkish) {
        expect(c.name).not.toContain('\uFFFD');
        // Verify name is valid UTF-8 (no lone surrogates)
        expect(c.name).toBe(c.name.normalize('NFC'));
      }
    }
  });

  // ─────────────────────────────────────────────────────
  // TURK-07: Profile handles should be ASCII-normalized
  // ─────────────────────────────────────────────────────
  it('TURK-07: Profile handles should NOT contain raw Turkish İ/ı characters', async () => {
    const { data, error } = await sb
      .from('profiles')
      .select('id, handle')
      .not('handle', 'is', null)
      .limit(200);

    expect(error).toBeNull();

    if (!data || data.length === 0) {
      console.warn('TURK-07: No profiles with handles found — table may be empty');
      return;
    }

    // Handles should be ASCII-safe (lowercase alphanumeric + hyphens/underscores)
    // Raw Turkish chars in handles would break URL routing and @mentions
    const turkishSpecialChars = /[İıŞşÇçĞğÖöÜü]/;
    const violations = data.filter((p) => turkishSpecialChars.test(p.handle));

    expect(
      violations,
      `Found ${violations.length} profiles with Turkish chars in handle: ${violations
        .slice(0, 5)
        .map((v) => `${v.handle}`)
        .join(', ')}`
    ).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // TURK-08: Player name sort is consistent
  // ─────────────────────────────────────────────────────
  it('TURK-08: Player name sort is consistent (no null/empty breaks)', async () => {
    // Verify DB can sort Turkish names without errors, and that
    // no null/empty values break the ORDER BY clause
    const { data, error } = await sb
      .from('players')
      .select('id, first_name, last_name')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .limit(100);

    expect(error).toBeNull();

    if (!data || data.length === 0) {
      console.warn('TURK-08: No players found — table may be empty');
      return;
    }

    // Main assertion: sort query succeeded without error (above)
    // and returned valid data
    expect(data.length).toBeGreaterThan(0);

    // Verify no NULL last_names exist (first_name can be empty for
    // single-name players like Brazilian "Amilton")
    const nullLastNames = data.filter(
      (p) => p.last_name === null || p.last_name === undefined
    );
    expect(
      nullLastNames,
      `Found ${nullLastNames.length} players with null last_name`
    ).toHaveLength(0);

    // Verify all names are valid strings (not corrupted)
    for (const p of data) {
      expect(typeof p.last_name).toBe('string');
      expect(typeof p.first_name).toBe('string');
      // No mojibake
      expect(p.last_name).not.toContain('\uFFFD');
      expect(p.first_name).not.toContain('\uFFFD');
    }
  });

  // ─────────────────────────────────────────────────────
  // TURK-09: Search "i" and "İ" both return results
  // ─────────────────────────────────────────────────────
  it('TURK-09: Search input "i" matches players AND search "İ" also returns results', async () => {
    // Search with lowercase ASCII 'i'
    const { data: iResults, error: iErr } = await sb
      .from('players')
      .select('id, first_name, last_name')
      .or('first_name.ilike.%i%,last_name.ilike.%i%')
      .limit(10);

    expect(iErr).toBeNull();

    // Search with Turkish İ
    const { data: bigIResults, error: bigIErr } = await sb
      .from('players')
      .select('id, first_name, last_name')
      .or('first_name.ilike.%İ%,last_name.ilike.%İ%')
      .limit(10);

    expect(bigIErr).toBeNull();

    if ((!iResults || iResults.length === 0) && (!bigIResults || bigIResults.length === 0)) {
      console.warn('TURK-09: No players found for either search — table may be empty');
      return;
    }

    // Both searches should return results in a Turkish football league
    expect(
      (iResults?.length ?? 0),
      'Search with "i" should find players in a Turkish league'
    ).toBeGreaterThan(0);

    expect(
      (bigIResults?.length ?? 0),
      'Search with "İ" should find players in a Turkish league'
    ).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────
  // TURK-10: Fixture data preserves club references
  // ─────────────────────────────────────────────────────
  it('TURK-10: Fixture data preserves club references (join test)', async () => {
    // Query fixtures with their club FK joins to verify integrity
    // and that Turkish club names survive the join
    const { data, error } = await sb
      .from('fixtures')
      .select(`
        id,
        gameweek,
        home_club_id,
        away_club_id,
        home_club:clubs!fixtures_home_club_id_fkey(id, name),
        away_club:clubs!fixtures_away_club_id_fkey(id, name)
      `)
      .not('home_club_id', 'is', null)
      .not('away_club_id', 'is', null)
      .limit(10);

    expect(error).toBeNull();

    if (!data || data.length === 0) {
      console.warn('TURK-10: No fixtures with club references found — table may be empty');
      return;
    }

    for (const f of data) {
      // FK IDs should be present
      expect(f.home_club_id).toBeTruthy();
      expect(f.away_club_id).toBeTruthy();

      // Joined club records should exist and have names
      const homeClub = f.home_club as unknown as { id: string; name: string } | null;
      const awayClub = f.away_club as unknown as { id: string; name: string } | null;

      if (homeClub) {
        expect(homeClub.name.length).toBeGreaterThan(0);
        expect(homeClub.name).not.toContain('\uFFFD'); // no mojibake
      }
      if (awayClub) {
        expect(awayClub.name.length).toBeGreaterThan(0);
        expect(awayClub.name).not.toContain('\uFFFD'); // no mojibake
      }
    }
  });
});
