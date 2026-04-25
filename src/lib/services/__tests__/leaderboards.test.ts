// @vitest-environment node

/**
 * Slice 199 — get_top_predictors_leaderboard Tests
 *
 * Spec: worklog/specs/199-backend-aggregate-rpcs.md
 * Pattern adopted from Slice 195e (differentials.test.ts).
 *
 * Mixed test-suite (real-DB schema/RPC-shape verification + body-probe for
 * structure correctness). Tests TDD-fail until migration applied.
 *
 * Run: npx vitest run src/lib/services/__tests__/leaderboards.test.ts
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
    // Worktree without .env.local (legitimate) — skip DB-bound tests.
    // CI / main-repo runs WILL have these and run the full suite.
    dbAvailable = false;
    return;
  }
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  dbAvailable = true;
});

// ===========================================================================
// SECTION A — RPC Existence (TDD-FAIL until migration applied)
// ===========================================================================

describe('Slice 199 — get_top_predictors_leaderboard: RPC Existence', () => {
  it('A1. get_top_predictors_leaderboard exists (post-migration)', async () => {
    if (!dbAvailable) {
      console.warn('[leaderboards.test] No DB credentials — skipping');
      return;
    }
    const { data, error } = await sb!.rpc('get_top_predictors_leaderboard', {
      p_limit: 1,
    });
    expect(error, `RPC not yet defined: ${error?.message ?? ''}`).toBeNull();
    expect(data).toBeDefined();
  });
});

// ===========================================================================
// SECTION B — Result Shape (Plain JSONB Array, no Discriminated Union)
// ===========================================================================

describe('Slice 199 — get_top_predictors_leaderboard: Result Shape', () => {
  it('B1. returns top-level array (plain JSONB), NOT {success, data}', async () => {
    if (!dbAvailable) return;
    const { data, error } = await sb!.rpc('get_top_predictors_leaderboard', {
      p_limit: 10,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      expect(msg).not.toContain('does not exist');
      expect(msg).not.toContain('no function matches');
      throw new Error(`Unexpected error: ${error.message}`);
    }
    expect(Array.isArray(data)).toBe(true);
    if (data !== null && !Array.isArray(data)) {
      expect(data as object).not.toHaveProperty('success');
    }
  });

  it('B2. each row contains required fields (when result non-empty)', async () => {
    if (!dbAvailable) return;
    const { data, error } = await sb!.rpc('get_top_predictors_leaderboard', {
      p_limit: 10,
    });
    if (error) throw new Error(error.message);

    const rows = (data as Array<Record<string, unknown>>) ?? [];
    if (rows.length === 0) {
      console.warn(
        '[leaderboards.test] B2: 0 users with ≥5 resolved predictions in DB — soft skip',
      );
      return;
    }

    const sample = rows[0]!;
    const keys = Object.keys(sample);
    expect(keys).toContain('user_id');
    expect(keys).toContain('handle');
    expect(keys).toContain('display_name');
    expect(keys).toContain('tier');
    expect(keys).toContain('predictions_total');
    expect(keys).toContain('predictions_correct');
    expect(keys).toContain('hit_rate_pct');
    expect(keys).toContain('rank');

    // Type checks on first row.
    expect(typeof sample.predictions_total).toBe('number');
    expect(typeof sample.predictions_correct).toBe('number');
    expect(typeof sample.hit_rate_pct).toBe('number');
    expect(typeof sample.rank).toBe('number');
    expect(['fan', 'scout', 'pro', 'founder']).toContain(sample.tier);

    // Invariants per spec:
    expect(sample.predictions_total as number).toBeGreaterThanOrEqual(5);
    expect(sample.predictions_correct as number).toBeLessThanOrEqual(
      sample.predictions_total as number,
    );
    expect(sample.hit_rate_pct as number).toBeGreaterThanOrEqual(0);
    expect(sample.hit_rate_pct as number).toBeLessThanOrEqual(100);
    expect(sample.rank as number).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// SECTION C — Limit-Sanitization
// ===========================================================================

describe('Slice 199 — get_top_predictors_leaderboard: Limit-Sanitization', () => {
  it('C1. p_limit = 0 → coerced to ≥1 row (or empty array if no qualifying users)', async () => {
    if (!dbAvailable) return;
    const { data, error } = await sb!.rpc('get_top_predictors_leaderboard', {
      p_limit: 0,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    // Cap is 1, so result has at most 1 row OR 0 (no qualifying users).
    expect((data as unknown[]).length).toBeLessThanOrEqual(1);
  });

  it('C2. p_limit > 100 → capped at 100', async () => {
    if (!dbAvailable) return;
    const { data, error } = await sb!.rpc('get_top_predictors_leaderboard', {
      p_limit: 9999,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBeLessThanOrEqual(100);
  });
});

// ===========================================================================
// SECTION D — Body-Probe (LANGUAGE plpgsql + SECURITY DEFINER)
// ===========================================================================

describe('Slice 199 — get_top_predictors_leaderboard: Body Anonymization & Security', () => {
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

  it('D1. body has LANGUAGE plpgsql + SECURITY DEFINER + STABLE', async () => {
    if (!dbAvailable) return;
    const body = await getFunctionBody('get_top_predictors_leaderboard');
    if (!body) {
      console.warn('[leaderboards.test] D1: no probe path — soft skip');
      return;
    }
    const lower = body.toLowerCase();
    expect(lower).toContain('language plpgsql');
    expect(lower).toContain('security definer');
    expect(lower).toContain('stable');
    // Spec required output projection
    expect(lower).toContain('hit_rate_pct');
    expect(lower).toContain('predictions_total');
    expect(lower).toContain('rank');
  });
});

// ===========================================================================
// SECTION E — REVOKE/GRANT (AR-44)
// ===========================================================================

describe('Slice 199 — get_top_predictors_leaderboard: Privileges (AR-44)', () => {
  it('E1. anon NOT granted; authenticated + service_role granted', async () => {
    if (!dbAvailable) return;
    const { data, error } = await sb!.rpc('exec_sql_readonly', {
      sql_text: `
        SELECT grantee
        FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name = 'get_top_predictors_leaderboard'
          AND privilege_type = 'EXECUTE'
      `,
    });
    if (error) {
      console.warn('[leaderboards.test] E1: no probe path — soft skip');
      return;
    }
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
// SECTION F — Service Wrapper Smoke (no DB needed)
// ===========================================================================

describe('Slice 199 — getTopPredictorsLeaderboard service wrapper', () => {
  it('F1. exports getTopPredictorsLeaderboard from leaderboards service', async () => {
    const mod = await import('@/lib/services/leaderboards');
    expect(typeof mod.getTopPredictorsLeaderboard).toBe('function');
  });
});
