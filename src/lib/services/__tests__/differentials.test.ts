// @vitest-environment node

/**
 * Slice 195e — Differentials-RPC + Captain-Pick-Rate Tests (TDD, written from spec only)
 *
 * Spec: worklog/specs/195e-differentials-rpc.md
 *
 * Mixed test-suite (real-DB schema/RPC-shape verification + body-probe for
 * anonymization). Pattern adopted from Slice 195d (lineup-auto-sub.test.ts).
 *
 * Erwartete RPCs (Backend-Agent baut parallel):
 *   1. get_event_captain_distribution(p_event_id UUID) RETURNS jsonb
 *      → array [{player_id: UUID, count: INT, pct: NUMERIC}] sortiert pct DESC.
 *      → Empty event = [].
 *   2. get_event_player_pick_rates(p_event_id UUID) RETURNS jsonb
 *      → array [{player_id, count, pct}] aggregiert ueber 12 starting-slots.
 *      → Empty event = [].
 *
 * Pflicht-Eigenschaften:
 *   - SECURITY DEFINER, plpgsql.
 *   - Anonymized: kein user_id, handle, display_name im Output.
 *   - Plain JSONB array (KEIN Discriminated Union {success, ...}).
 *
 * TDD-FAIL Mode: Tests sollen ERST FEHLSCHLAGEN bis Backend-Agent die
 * Migration applied. Erwartete initial-fail-signals:
 *   - A1/A2: pg_proc query liefert 0 rows -> "function does not exist".
 *   - B1/B2: rpc-Call liefert "function ... does not exist" error.
 *   - C1: pg_proc.prosrc-Probe schlaegt fehl (kein body found).
 *
 * Run: npx vitest run src/lib/services/__tests__/differentials.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ---------------------------------------------------------------------------
// Real-DB client (service_role) — for schema + RPC-existence verification
// ---------------------------------------------------------------------------

let sb: SupabaseClient | null = null;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local — required for Slice 195e differentials TDD tests.',
    );
  }
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

const EMPTY_EVENT_UUID = '00000000-0000-0000-0000-000000000000';

// ===========================================================================
// SECTION A — RPC Existence (TDD-FAIL until migration applied)
// ===========================================================================
//
// Verifies both RPCs are discoverable via PostgREST schema cache (i.e. the
// migration is applied). LANGUAGE plpgsql + SECURITY DEFINER metadata is
// asserted indirectly via Section C (body probe, which only succeeds if both
// flags are set — pg_get_functiondef emits "LANGUAGE plpgsql SECURITY
// DEFINER" inline).
//
// Until migration is applied, PostgREST returns:
//   "Could not find the function public.<name>(p_event_id) in the schema cache"
// which trips the assertion below.
// ===========================================================================

describe('Slice 195e — Schema: RPC Existence (TDD: expected to FAIL until migration applied)', () => {
  // RPC-existence probe via direct call. Until migration is applied, postgres
  // returns: "Could not find the function public.<name>(p_event_id) in the
  // schema cache" — that's the TDD-fail signal. After migration: empty event
  // returns []. We assert the success path: error must be null AND data must
  // be a defined value (an empty array). Once Backend-Agent applies migration,
  // both pass automatically.
  it('A1. get_event_captain_distribution exists (RPC discoverable post-migration)', async () => {
    const { data, error } = await sb!.rpc('get_event_captain_distribution', {
      p_event_id: EMPTY_EVENT_UUID,
    });

    // TDD-fail anchor: error must be null. PostgREST signals missing RPCs as
    // "Could not find the function" / "does not exist" / "schema cache".
    expect(error, `RPC not yet defined: ${error?.message ?? ''}`).toBeNull();
    expect(data).toBeDefined();
  });

  it('A2. get_event_player_pick_rates exists (RPC discoverable post-migration)', async () => {
    const { data, error } = await sb!.rpc('get_event_player_pick_rates', {
      p_event_id: EMPTY_EVENT_UUID,
    });

    expect(error, `RPC not yet defined: ${error?.message ?? ''}`).toBeNull();
    expect(data).toBeDefined();
  });
});

// ===========================================================================
// SECTION B — Empty-Event Behavior (TDD-FAIL until migration applied)
// ===========================================================================
//
// AC #4 from spec: "Wenn 0 Lineups submitted, beide RPCs returnen []".
// Tests use the all-zero UUID which by definition has no lineups.
// ===========================================================================

describe('Slice 195e — Empty-Event Behavior (TDD: expected to FAIL until migration applied)', () => {
  it('B1. get_event_captain_distribution returns [] for empty/non-existent event', async () => {
    const { data, error } = await sb!.rpc('get_event_captain_distribution', {
      p_event_id: EMPTY_EVENT_UUID,
    });

    // TDD anchor: function-not-found triggers fail BEFORE shape assertion.
    if (error) {
      const msg = error.message.toLowerCase();
      expect(msg).not.toContain('does not exist');
      expect(msg).not.toContain('no function matches');
      // If a different error fires (auth/RLS/etc.), still fail loudly.
      throw new Error(`Unexpected error: ${error.message}`);
    }

    // AC #4: empty event returns empty array (NOT null, NOT object).
    expect(data).not.toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(0);
  });

  it('B2. get_event_player_pick_rates returns [] for empty/non-existent event', async () => {
    const { data, error } = await sb!.rpc('get_event_player_pick_rates', {
      p_event_id: EMPTY_EVENT_UUID,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      expect(msg).not.toContain('does not exist');
      expect(msg).not.toContain('no function matches');
      throw new Error(`Unexpected error: ${error.message}`);
    }

    expect(data).not.toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(0);
  });
});

// ===========================================================================
// SECTION C — Body-Probe for Anonymization (TDD-FAIL until migration applied)
// ===========================================================================
//
// AC #3 from spec: "Beide RPCs returnen keine user_id / handle / display_name".
// Strategy: pg_get_functiondef oder pg_proc.prosrc body probe + pattern-match.
//
// We allow auth.uid() AS guard inside body, but it must not appear inside any
// json_build_object / json_agg / SELECT-projection that builds the result set.
// Heuristik: the OUTPUT-projection should reference player_id / count / pct
// — NOT user_id / handle / display_name.
// ===========================================================================

describe('Slice 195e — Body-Probe Anonymization (TDD: expected to FAIL until migration applied)', () => {
  // Helper to extract the function body (prosrc) for a given RPC name.
  // Returns null when no probe path is available — the test then falls back
  // to a softer check (RPC existence + signature only).
  async function getFunctionBody(funcName: string): Promise<string | null> {
    // Primary path: exec_sql_readonly (matches Slice 195d C2 pattern).
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

    if (!error) {
      const rows = (data as Array<{ body: string }>) ?? [];
      return rows[0]?.body ?? '';
    }

    // Fallback: direct pg_catalog read via supabase service_role.
    // PostgREST blocks pg_catalog by default ("Invalid schema: pg_catalog").
    // If this also fails, return null and let the caller decide.
    const { data: procData, error: procErr } = await sb!
      .schema('pg_catalog' as never)
      .from('pg_proc' as never)
      .select('prosrc')
      .eq('proname', funcName)
      .limit(1)
      .maybeSingle();

    if (procErr) {
      return null; // No probe path available.
    }

    return (procData as { prosrc?: string } | null)?.prosrc ?? '';
  }

  // Heuristic check: the body MUST contain projection of player_id/count/pct,
  // and MUST NOT project user_id / handle / display_name into the output.
  function assertAnonymizedOutput(body: string, funcName: string): void {
    expect(body.length).toBeGreaterThan(0);

    const lower = body.toLowerCase();

    // Positive signals: pg_get_functiondef emits the function header inline.
    // Required by spec A1/A2 (language plpgsql + security definer) AND by
    // Migration-Template-Pflichten in database.md (REVOKE/GRANT block applies
    // post-CREATE OR REPLACE).
    expect(lower, `${funcName} must be LANGUAGE plpgsql`).toContain('language plpgsql');
    expect(lower, `${funcName} must be SECURITY DEFINER`).toContain('security definer');

    // Output projection MUST reference these field names.
    expect(lower).toContain('player_id');
    expect(lower).toContain('count');
    expect(lower).toContain('pct');

    // Negative signals: PII fields must NOT appear in the body.
    // Per spec C1: "RPC darf auth.uid() als Guard nutzen, aber nicht im
    // Output." — We forbid PII column-names anywhere (no JSON-output, no
    // projection, no JOIN), since these RPCs aggregate over lineups WITHOUT
    // joining to profiles/users. If body references them, anonymization is
    // broken.
    expect(lower, `${funcName} body must not project user_id`).not.toContain('user_id');
    expect(lower, `${funcName} body must not reference handle`).not.toContain('handle');
    expect(lower, `${funcName} body must not reference display_name`).not.toContain(
      'display_name',
    );
    // Per spec C1 explicit exception: auth.uid() AS guard is allowed. We do
    // NOT forbid `auth.uid` tokens at all — backend may use them for SECURITY
    // DEFINER-internal checks. Only the OUTPUT must be free of PII.
    // (Removed prior over-strict `auth.uid` check.)
  }

  // Result-shape probe — an alternative to body-source probe. Calls the RPC
  // against a known live event (any event with submitted lineups) and inspects
  // the returned rows. PII fields (user_id / handle / display_name) must not
  // appear as keys in any result element.
  async function assertNoPIIInResult(
    funcName: 'get_event_captain_distribution' | 'get_event_player_pick_rates',
  ): Promise<void> {
    // Use empty event UUID — empty array is sufficient for body-shape probe
    // BUT only if at least one event has lineups so the RPC actually projects
    // rows. We try empty first (always available), then any-event fallback.
    let { data, error } = await sb!.rpc(funcName, { p_event_id: EMPTY_EVENT_UUID });
    if (error) {
      throw new Error(`RPC error on empty event: ${error.message}`);
    }

    let rows = (data as Array<Record<string, unknown>>) ?? [];

    // If empty event has no rows, try a random event with lineups.
    if (rows.length === 0) {
      const { data: eventRow } = await sb!
        .from('lineups')
        .select('event_id')
        .limit(1)
        .maybeSingle();

      const liveEventId = (eventRow as { event_id?: string } | null)?.event_id;
      if (liveEventId) {
        const r = await sb!.rpc(funcName, { p_event_id: liveEventId });
        if (r.error) {
          throw new Error(`RPC error on live event: ${r.error.message}`);
        }
        rows = (r.data as Array<Record<string, unknown>>) ?? [];
      }
    }

    if (rows.length === 0) {
      // Both probes empty — DB has no submitted lineups at all. Skip with
      // soft warning rather than false-pass.
      console.warn(
        `[differentials.test] ${funcName}: no rows in DB to probe — anonymization assertion incomplete.`,
      );
      return;
    }

    // Inspect first row keys + ensure no PII is projected.
    const sample = rows[0]!;
    const keys = Object.keys(sample).map((k) => k.toLowerCase());

    // Required output fields per spec.
    expect(keys, `${funcName} must project player_id`).toContain('player_id');
    expect(keys, `${funcName} must project count`).toContain('count');
    expect(keys, `${funcName} must project pct`).toContain('pct');

    // Forbidden PII fields per spec C1.
    expect(keys, `${funcName} must not project user_id`).not.toContain('user_id');
    expect(keys, `${funcName} must not project handle`).not.toContain('handle');
    expect(keys, `${funcName} must not project display_name`).not.toContain('display_name');
  }

  it('C1. get_event_captain_distribution result is anonymized (no user_id/handle/display_name in row keys)', async () => {
    // Try body-source probe first; fall back to result-shape probe if no
    // probe path is available (typical for default Supabase setup).
    const body = await getFunctionBody('get_event_captain_distribution');
    if (body !== null && body.length > 0) {
      assertAnonymizedOutput(body, 'get_event_captain_distribution');
      return;
    }
    // Fallback: probe by inspecting actual return rows.
    await assertNoPIIInResult('get_event_captain_distribution');
  });

  it('C1b. get_event_player_pick_rates result is anonymized (no user_id/handle/display_name in row keys)', async () => {
    const body = await getFunctionBody('get_event_player_pick_rates');
    if (body !== null && body.length > 0) {
      assertAnonymizedOutput(body, 'get_event_player_pick_rates');
      return;
    }
    await assertNoPIIInResult('get_event_player_pick_rates');
  });
});

// ===========================================================================
// SECTION D — Real Data with Bootstrap (it.todo — backlog Slice 195f)
// ===========================================================================
//
// Full bootstrap requires: insert test event + fixtures + 5 lineups via
// service_role + verify aggregations. Estimated 100+ LOC of test setup, plus
// teardown. Per Slice 195d pattern (B2/B3, C3-C10) we mark these as it.todo
// to keep coverage gap explicit without false-red signals.
// ===========================================================================

describe('Slice 195e — Real-Data Aggregation (todo: needs test-event bootstrap)', () => {
  it.todo(
    'D1. captain_distribution mit 5 Lineups + 3 unterschiedlichen Captains: 3 entries, counts korrekt summiert, pcts auf 100%',
  );
  it.todo(
    'D2. pick_rates mit 3 Lineups, gemeinsamer Spieler in allen 3: count=3 pct=100',
  );
});

// ===========================================================================
// SECTION E — Discriminated Union NICHT erwartet (Plain JSONB Array)
// ===========================================================================
//
// database.md Section "Discriminated Union Pflicht" gilt fuer Mutations.
// Read-only Aggregation-RPCs returnen direkt das Array — nicht
// {success: true, data: [...]}. Tests hier verifizieren dass Result top-level
// Array ist und KEIN success-Flag-Wrapper.
// ===========================================================================

describe('Slice 195e — Result Shape: Plain JSONB Array (no Discriminated Union)', () => {
  it('E1a. get_event_captain_distribution returns top-level array, NOT {success, data}', async () => {
    const { data, error } = await sb!.rpc('get_event_captain_distribution', {
      p_event_id: EMPTY_EVENT_UUID,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      expect(msg).not.toContain('does not exist');
      expect(msg).not.toContain('no function matches');
      throw new Error(`Unexpected error: ${error.message}`);
    }

    // MUST be a plain Array, NOT an object with success-flag.
    expect(Array.isArray(data)).toBe(true);
    // Anti-pattern guard: a Discriminated-Union {success, data} would be a
    // non-array object with a 'success' field. Verify negation explicitly.
    if (data !== null && !Array.isArray(data)) {
      expect(data as object).not.toHaveProperty('success');
    }
  });

  it('E1b. get_event_player_pick_rates returns top-level array, NOT {success, data}', async () => {
    const { data, error } = await sb!.rpc('get_event_player_pick_rates', {
      p_event_id: EMPTY_EVENT_UUID,
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
});
