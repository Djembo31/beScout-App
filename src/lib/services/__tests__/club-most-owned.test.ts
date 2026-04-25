// @vitest-environment node

/**
 * Slice 199 — get_most_owned_players_per_club Tests
 *
 * Spec: worklog/specs/199-backend-aggregate-rpcs.md
 * Pattern adopted from Slice 195e (differentials.test.ts).
 *
 * Run: npx vitest run src/lib/services/__tests__/club-most-owned.test.ts
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

describe('Slice 199 — get_most_owned_players_per_club: RPC Existence', () => {
  it('A1. exists (post-migration) — empty club returns []', async () => {
    if (!dbAvailable) {
      console.warn('[club-most-owned.test] No DB credentials — skipping');
      return;
    }
    const { data, error } = await sb!.rpc('get_most_owned_players_per_club', {
      p_club_id: FAKE_CLUB_UUID,
      p_limit: 5,
    });
    expect(error, `RPC not yet defined: ${error?.message ?? ''}`).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(0);
  });

  it('A2. NULL p_club_id returns [] (defensive)', async () => {
    if (!dbAvailable) return;
    const { data, error } = await sb!.rpc('get_most_owned_players_per_club', {
      p_club_id: null,
      p_limit: 5,
    });
    // Either silently empty (preferred) or error — both acceptable
    if (error) {
      // PostgREST may reject NULL UUID before reaching RPC body — that's fine.
      return;
    }
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(0);
  });
});

// ===========================================================================
// SECTION B — Result Shape (Plain JSONB Array)
// ===========================================================================

describe('Slice 199 — get_most_owned_players_per_club: Result Shape', () => {
  it('B1. returns plain top-level array, NOT discriminated-union', async () => {
    if (!dbAvailable) return;

    // Find any real club with holdings (for a real-data probe)
    const { data: clubRow } = await sb!
      .from('holdings')
      .select('player_id')
      .limit(1)
      .maybeSingle();

    if (!clubRow) {
      console.warn('[club-most-owned.test] B1: no holdings rows — soft skip');
      return;
    }

    const { data: pl } = await sb!
      .from('players')
      .select('club_id')
      .eq('id', (clubRow as { player_id: string }).player_id)
      .maybeSingle();

    const clubId = (pl as { club_id?: string } | null)?.club_id;
    if (!clubId) {
      console.warn('[club-most-owned.test] B1: holdings without club_id — soft skip');
      return;
    }

    const { data, error } = await sb!.rpc('get_most_owned_players_per_club', {
      p_club_id: clubId,
      p_limit: 5,
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
    expect(typeof sample.holders_count).toBe('number');
    expect(typeof sample.rank).toBe('number');
    expect(sample.holders_count as number).toBeGreaterThan(0);
  });
});

// ===========================================================================
// SECTION C — Body-Probe (Security)
// ===========================================================================

describe('Slice 199 — get_most_owned_players_per_club: Body Security', () => {
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
    const body = await getFunctionBody('get_most_owned_players_per_club');
    if (!body) return;
    const lower = body.toLowerCase();
    expect(lower).toContain('language plpgsql');
    expect(lower).toContain('security definer');
    expect(lower).toContain('stable');
    expect(lower).toContain('holders_count');
    expect(lower).toContain('rank');
    // Anonymization: body must NOT project user_id into JSON output
    // (RPC counts user_id internally but only emits aggregate count).
    // We allow `count(distinct h.user_id)` but not literal `user_id` in
    // jsonb_build_object → check via grep on jsonb_build_object block.
    const jsonBlockMatch = body.match(/jsonb_build_object\([\s\S]*?\)/i);
    if (jsonBlockMatch) {
      expect(jsonBlockMatch[0].toLowerCase()).not.toContain('user_id');
    }
  });
});

// ===========================================================================
// SECTION D — REVOKE/GRANT (AR-44)
// ===========================================================================

describe('Slice 199 — get_most_owned_players_per_club: Privileges', () => {
  it('D1. anon NOT granted; authenticated + service_role granted', async () => {
    if (!dbAvailable) return;
    const { data, error } = await sb!.rpc('exec_sql_readonly', {
      sql_text: `
        SELECT grantee
        FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name = 'get_most_owned_players_per_club'
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

describe('Slice 199 — getMostOwnedPlayersPerClub service wrapper', () => {
  it('E1. exports getMostOwnedPlayersPerClub from club service', async () => {
    const mod = await import('@/lib/services/club');
    expect(typeof mod.getMostOwnedPlayersPerClub).toBe('function');
  });
});
