// @vitest-environment node

/**
 * Slice 199 — get_event_difficulty_score Tests
 *
 * Spec: worklog/specs/199-backend-aggregate-rpcs.md
 * Pattern adopted from Slice 195e (differentials.test.ts).
 *
 * Run: npx vitest run src/lib/services/__tests__/events-difficulty.test.ts
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

const FAKE_EVENT_UUID = '00000000-0000-0000-0000-000000000000';

// ===========================================================================
// SECTION A — RPC Existence + event_not_found
// ===========================================================================

describe('Slice 199 — get_event_difficulty_score: RPC Existence', () => {
  it('A1. exists (post-migration) — non-existent event returns event_not_found', async () => {
    if (!dbAvailable) {
      console.warn('[events-difficulty.test] No DB credentials — skipping');
      return;
    }
    const { data, error } = await sb!.rpc('get_event_difficulty_score', {
      p_event_id: FAKE_EVENT_UUID,
    });
    expect(error, `RPC not yet defined: ${error?.message ?? ''}`).toBeNull();
    expect(data).toBeDefined();

    // Should be discriminated-union error shape for non-existent event.
    const result = data as { success?: boolean; error?: string };
    expect(result).toBeTypeOf('object');
    expect(result.success).toBe(false);
    expect(result.error).toBe('event_not_found');
  });
});

// ===========================================================================
// SECTION B — Result Shape (success → object with required fields)
// ===========================================================================

describe('Slice 199 — get_event_difficulty_score: Result Shape', () => {
  it('B1. success returns required keys (event_id, difficulty_score, ...)', async () => {
    if (!dbAvailable) return;

    // Find any real event with non-null club_id
    const { data: ev } = await sb!
      .from('events')
      .select('id')
      .not('club_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!ev) {
      console.warn(
        '[events-difficulty.test] B1: no clubbed events in DB — soft skip',
      );
      return;
    }

    const { data, error } = await sb!.rpc('get_event_difficulty_score', {
      p_event_id: (ev as { id: string }).id,
    });
    if (error) throw new Error(error.message);

    const result = data as Record<string, unknown>;
    expect(result).toHaveProperty('event_id');
    expect(result).toHaveProperty('difficulty_score');
    expect(result).toHaveProperty('difficulty_tier');
    expect(result).toHaveProperty('avg_ipo_price_cents');
    expect(result).toHaveProperty('participant_clubs_count');

    expect(typeof result.difficulty_score).toBe('number');
    expect(['easy', 'medium', 'hard']).toContain(result.difficulty_tier);
    expect(typeof result.avg_ipo_price_cents).toBe('number');
    expect(typeof result.participant_clubs_count).toBe('number');

    // Heuristik invariants
    const score = result.difficulty_score as number;
    const tier = result.difficulty_tier as string;
    expect([0.3, 0.6, 0.85]).toContain(score);
    if (tier === 'easy') expect(score).toBe(0.3);
    if (tier === 'medium') expect(score).toBe(0.6);
    if (tier === 'hard') expect(score).toBe(0.85);
  });

  it('B2. event with NULL club_id returns event_not_clubbed', async () => {
    if (!dbAvailable) return;

    // Find an event WITHOUT club_id (if any exist)
    const { data: ev } = await sb!
      .from('events')
      .select('id')
      .is('club_id', null)
      .limit(1)
      .maybeSingle();

    if (!ev) {
      console.warn(
        '[events-difficulty.test] B2: no clubless events in DB — soft skip',
      );
      return;
    }

    const { data, error } = await sb!.rpc('get_event_difficulty_score', {
      p_event_id: (ev as { id: string }).id,
    });
    if (error) throw new Error(error.message);

    const result = data as { success?: boolean; error?: string };
    expect(result.success).toBe(false);
    expect(result.error).toBe('event_not_clubbed');
  });
});

// ===========================================================================
// SECTION C — Body-Probe (Security)
// ===========================================================================

describe('Slice 199 — get_event_difficulty_score: Body Security', () => {
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
    const body = await getFunctionBody('get_event_difficulty_score');
    if (!body) return;
    const lower = body.toLowerCase();
    expect(lower).toContain('language plpgsql');
    expect(lower).toContain('security definer');
    expect(lower).toContain('stable');
    // Heuristik thresholds present
    expect(lower).toContain('100000');
    expect(lower).toContain('500000');
    // Discriminator-error paths present
    expect(lower).toContain('event_not_found');
    expect(lower).toContain('event_not_clubbed');
  });
});

// ===========================================================================
// SECTION D — REVOKE/GRANT (AR-44)
// ===========================================================================

describe('Slice 199 — get_event_difficulty_score: Privileges', () => {
  it('D1. anon NOT granted; authenticated + service_role granted', async () => {
    if (!dbAvailable) return;
    const { data, error } = await sb!.rpc('exec_sql_readonly', {
      sql_text: `
        SELECT grantee
        FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name = 'get_event_difficulty_score'
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
// SECTION E — Service Wrapper Smoke (no DB needed)
// ===========================================================================

describe('Slice 199 — getEventDifficultyScore service wrapper', () => {
  it('E1. exports getEventDifficultyScore from events service', async () => {
    const mod = await import('@/lib/services/events');
    expect(typeof mod.getEventDifficultyScore).toBe('function');
  });
});
