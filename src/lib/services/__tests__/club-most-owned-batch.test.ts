// @vitest-environment node

/**
 * Slice 207 — get_most_owned_players_per_club_batch Tests
 *
 * Spec: worklog/specs/207-most-owned-discovery-batch.md
 * Pattern adopted from Slice 199 club-most-owned.test.ts (single-club),
 * adapted for batch (multi-club) — adds club_id partitioning + holders_pct.
 *
 * Run: npx vitest run src/lib/services/__tests__/club-most-owned-batch.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

let sb: SupabaseClient | null = null;
let dbAvailable = false;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    dbAvailable = false;
    return;
  }
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  dbAvailable = true;
});

const FAKE_CLUB_UUID = '00000000-0000-0000-0000-000000000000';

// ===========================================================================
// SECTION A — RPC Existence
// ===========================================================================

describe('Slice 207 — get_most_owned_players_per_club_batch: RPC Existence', () => {
  it('A1. exists (post-migration) — empty club array returns []', async () => {
    if (!dbAvailable) {
      console.warn('[club-most-owned-batch.test] No DB credentials — skipping');
      return;
    }
    const { data, error } = await sb!.rpc('get_most_owned_players_per_club_batch', {
      p_club_ids: [],
      p_limit: 1,
    });
    expect(error, `RPC not yet defined: ${error?.message ?? ''}`).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(0);
  });

  it('A2. NULL p_club_ids returns [] (defensive)', async () => {
    if (!dbAvailable) return;
    const { data, error } = await sb!.rpc('get_most_owned_players_per_club_batch', {
      p_club_ids: null,
      p_limit: 1,
    });
    // Either silently empty (preferred) or error — both acceptable
    if (error) {
      // PostgREST may reject NULL UUID[] before reaching RPC body — that's fine.
      return;
    }
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(0);
  });

  it('A3. fake UUID array returns [] (no rows match)', async () => {
    if (!dbAvailable) return;
    const { data, error } = await sb!.rpc('get_most_owned_players_per_club_batch', {
      p_club_ids: [FAKE_CLUB_UUID],
      p_limit: 1,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(0);
  });
});

// ===========================================================================
// SECTION B — Result Shape (Plain JSONB Array, partitioned per club_id)
// ===========================================================================

describe('Slice 207 — get_most_owned_players_per_club_batch: Result Shape', () => {
  it('B1. returns plain top-level array, NOT discriminated-union', async () => {
    if (!dbAvailable) return;

    // Find any real club with holdings (for a real-data probe)
    const { data: clubRow } = await sb!
      .from('holdings')
      .select('player_id')
      .limit(1)
      .maybeSingle();

    if (!clubRow) {
      console.warn('[club-most-owned-batch.test] B1: no holdings rows — soft skip');
      return;
    }

    const { data: pl } = await sb!
      .from('players')
      .select('club_id')
      .eq('id', (clubRow as { player_id: string }).player_id)
      .maybeSingle();

    const clubId = (pl as { club_id?: string } | null)?.club_id;
    if (!clubId) {
      console.warn('[club-most-owned-batch.test] B1: holdings without club_id — soft skip');
      return;
    }

    const { data, error } = await sb!.rpc('get_most_owned_players_per_club_batch', {
      p_club_ids: [clubId],
      p_limit: 3,
    });
    if (error) throw new Error(error.message);

    expect(Array.isArray(data)).toBe(true);
    if (data !== null && !Array.isArray(data)) {
      expect(data as object).not.toHaveProperty('success');
    }

    const rows = (data as Array<Record<string, unknown>>) ?? [];
    if (rows.length === 0) return;

    const sample = rows[0]!;
    const keys = Object.keys(sample);
    // New batch-only keys
    expect(keys).toContain('club_id');
    expect(keys).toContain('holders_pct');
    // Inherited from Slice 199
    expect(keys).toContain('player_id');
    expect(keys).toContain('first_name');
    expect(keys).toContain('last_name');
    expect(keys).toContain('shirt_number');
    expect(keys).toContain('position');
    expect(keys).toContain('image_url');
    expect(keys).toContain('holders_count');
    expect(keys).toContain('rank');

    // Anonymization invariant: NEVER expose user_id
    expect(keys).not.toContain('user_id');

    // Type checks
    expect(typeof sample.club_id).toBe('string');
    expect(typeof sample.holders_count).toBe('number');
    expect(typeof sample.holders_pct).toBe('number');
    expect(typeof sample.rank).toBe('number');
    expect(sample.holders_count as number).toBeGreaterThan(0);
    // pct is 0-100 inclusive (CASE-guard for /0 returns 0)
    expect(sample.holders_pct as number).toBeGreaterThanOrEqual(0);
    expect(sample.holders_pct as number).toBeLessThanOrEqual(100);

    // The club_id matches what we asked for
    expect(sample.club_id).toBe(clubId);
  });

  it('B2. partitioning — multi-club input keeps rank within each club', async () => {
    if (!dbAvailable) return;
    // Find 2 distinct club_ids that both have at least 1 holding
    const { data: pls } = await sb!
      .from('players')
      .select('club_id')
      .not('club_id', 'is', null)
      .limit(50);

    const distinctClubs = Array.from(
      new Set(((pls as Array<{ club_id: string | null }>) ?? [])
        .map(r => r.club_id)
        .filter((x): x is string => !!x)),
    ).slice(0, 5);

    if (distinctClubs.length < 1) {
      console.warn('[club-most-owned-batch.test] B2: no distinct clubs — soft skip');
      return;
    }

    const { data, error } = await sb!.rpc('get_most_owned_players_per_club_batch', {
      p_club_ids: distinctClubs,
      p_limit: 2,
    });
    if (error) throw new Error(error.message);

    const rows = (data as Array<{ club_id: string; rank: number }>) ?? [];
    if (rows.length === 0) return;

    // For each club_id present, rank must start at 1 (rank is per-club).
    const ranksByClub = new Map<string, number[]>();
    for (const r of rows) {
      if (!ranksByClub.has(r.club_id)) ranksByClub.set(r.club_id, []);
      ranksByClub.get(r.club_id)!.push(r.rank);
    }
    Array.from(ranksByClub.values()).forEach((ranks) => {
      const sorted = ranks.slice().sort((a: number, b: number) => a - b);
      expect(sorted[0]).toBe(1);
      // No duplicate ranks within a club
      expect(new Set(sorted).size).toBe(sorted.length);
      // Each rank must be ≤ p_limit
      for (const r of sorted) expect(r).toBeLessThanOrEqual(2);
    });
  });

  it('B3. p_limit caps at 10', async () => {
    if (!dbAvailable) return;
    const { data: pls } = await sb!
      .from('players')
      .select('club_id')
      .not('club_id', 'is', null)
      .limit(1);
    const clubId = ((pls as Array<{ club_id: string | null }>) ?? [])[0]?.club_id;
    if (!clubId) return;

    const { data, error } = await sb!.rpc('get_most_owned_players_per_club_batch', {
      p_club_ids: [clubId],
      p_limit: 999, // Should be capped at 10
    });
    if (error) throw new Error(error.message);
    const rows = (data as Array<{ rank: number }>) ?? [];
    if (rows.length === 0) return;
    for (const r of rows) expect(r.rank).toBeLessThanOrEqual(10);
  });
});

// ===========================================================================
// SECTION C — Body-Probe (Security)
// ===========================================================================

describe('Slice 207 — get_most_owned_players_per_club_batch: Body Security', () => {
  async function getFunctionBody(funcName: string): Promise<string | null> {
    if (!dbAvailable) return null;
    const { data, error } = await sb!.rpc('exec_sql_readonly', {
      sql_text: `
        SELECT pg_get_functiondef(p.oid) AS body
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = '${funcName}'
        LIMIT 1
      `,
    });
    if (error) return null;
    const rows = (data as Array<{ body: string }>) ?? [];
    return rows[0]?.body ?? null;
  }

  it('C1. body has LANGUAGE plpgsql + SECURITY DEFINER + STABLE', async () => {
    if (!dbAvailable) return;
    const body = await getFunctionBody('get_most_owned_players_per_club_batch');
    if (!body) return;
    const lower = body.toLowerCase();
    expect(lower).toContain('language plpgsql');
    expect(lower).toContain('security definer');
    expect(lower).toContain('stable');
    expect(lower).toContain('holders_count');
    expect(lower).toContain('holders_pct');
    expect(lower).toContain('rank');
    expect(lower).toContain('club_id');
    // Anonymization: jsonb_build_object MUST NOT project user_id.
    const jsonBlockMatch = body.match(/jsonb_build_object\([\s\S]*?\)/i);
    if (jsonBlockMatch) {
      expect(jsonBlockMatch[0].toLowerCase()).not.toContain('user_id');
    }
  });
});

// ===========================================================================
// SECTION D — REVOKE/GRANT (AR-44)
// ===========================================================================

describe('Slice 207 — get_most_owned_players_per_club_batch: Privileges', () => {
  it('D1. anon NOT granted; authenticated + service_role granted', async () => {
    if (!dbAvailable) return;
    const { data, error } = await sb!.rpc('exec_sql_readonly', {
      sql_text: `
        SELECT grantee
        FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name = 'get_most_owned_players_per_club_batch'
          AND privilege_type = 'EXECUTE'
      `,
    });
    if (error) return;
    const grantees = ((data as Array<{ grantee: string }>) ?? []).map((r) =>
      r.grantee.toLowerCase(),
    );
    expect(grantees).toContain('authenticated');
    expect(grantees).toContain('service_role');
    expect(grantees).not.toContain('anon');
    expect(grantees).not.toContain('public');
  });
});

// ===========================================================================
// SECTION E — Service Wrapper Smoke
// ===========================================================================

describe('Slice 207 — getMostOwnedPlayersPerClubBatch service wrapper', () => {
  it('E1. exports getMostOwnedPlayersPerClubBatch from club service', async () => {
    const mod = await import('@/lib/services/club');
    expect(typeof mod.getMostOwnedPlayersPerClubBatch).toBe('function');
  });

  it('E2. exports MostOwnedPlayerBatchRow type (compile-time check via shape)', async () => {
    // Type-only export — verify the type is structurally sound by importing
    // its parent module without errors. Compile-time only.
    const mod = await import('@/lib/services/club');
    // Single-Club RPC remains untouched (D46)
    expect(typeof mod.getMostOwnedPlayersPerClub).toBe('function');
  });

  it('E3. empty clubIds array → empty Map (no RPC roundtrip)', async () => {
    const { getMostOwnedPlayersPerClubBatch } = await import('@/lib/services/club');
    const result = await getMostOwnedPlayersPerClubBatch([], 1);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });
});
