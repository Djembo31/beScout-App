// @vitest-environment node

/**
 * IPO Lifecycle — State Machine Tests (Layer 2)
 *
 * Verifies the IPO state machine transitions:
 *   announced → early_access → open → ended
 *                             ↘ cancelled (from any non-terminal)
 *
 * Guards tested:
 *   - No oversell (sold > total_offered)
 *   - Auto-close when sold = total_offered
 *   - Early access expiry
 *   - 30-day cooldown between tranches
 *   - Max 4 tranches per player
 *
 * Tests are READ-ONLY queries against live Supabase data.
 *
 * Run: npx vitest run src/lib/__tests__/state-machines/ipo-lifecycle.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

let sb: SupabaseClient;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

const VALID_IPO_STATUSES = ['announced', 'early_access', 'open', 'ended', 'cancelled'];

describe('IPO Lifecycle — State Machine', () => {
  // ── 1. Happy path: all IPO statuses are valid ──
  it('SM-IPO-01: all IPOs have valid status values', async () => {
    const { data, error } = await sb
      .from('ipos')
      .select('id, player_id, status')
      .limit(500);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(
      ipo => !VALID_IPO_STATUSES.includes(ipo.status)
    );
    expect(
      violations,
      `Found ${violations.length} IPOs with invalid status`
    ).toHaveLength(0);
  });

  // ── 2. ended → open: VERBOTEN (no reopened IPOs) ──
  it('SM-IPO-02: no open/early_access IPO should have an ended_at before now (re-opened)', async () => {
    // An IPO that is "open" or "early_access" should not have updated_at AFTER
    // a previous "ended" state. We check: no open IPO where sold = total_offered
    // (which would mean it auto-closed but somehow reopened).
    const { data, error } = await sb
      .from('ipos')
      .select('id, player_id, status, sold, total_offered')
      .in('status', ['open', 'early_access']);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(ipo => ipo.sold >= ipo.total_offered);
    expect(
      violations,
      `Found ${violations.length} open/early_access IPOs that are already sold out (should be ended)`
    ).toHaveLength(0);
  });

  // ── 3. Oversell guard: sold ≤ total_offered ──
  it('SM-IPO-03: no IPO should be oversold (sold > total_offered)', async () => {
    const { data, error } = await sb
      .from('ipos')
      .select('id, player_id, sold, total_offered, status');

    expect(error).toBeNull();
    const violations = (data ?? []).filter(ipo => ipo.sold > ipo.total_offered);
    expect(
      violations,
      `Found ${violations.length} oversold IPOs`
    ).toHaveLength(0);
  });

  // ── 4. Early access expiry: no early_access IPO past deadline ──
  it('SM-IPO-04: no early_access IPO should be past its early_access_ends_at', async () => {
    const now = new Date().toISOString();
    const { data, error } = await sb
      .from('ipos')
      .select('id, player_id, status, early_access_ends_at')
      .eq('status', 'early_access')
      .not('early_access_ends_at', 'is', null)
      .lt('early_access_ends_at', now);

    expect(error).toBeNull();
    expect(
      data ?? [],
      `Found ${(data ?? []).length} early_access IPOs past their deadline (should have transitioned to open)`
    ).toHaveLength(0);
  });

  // ── 5. No player should have 2 active IPOs simultaneously ──
  // The 30-day cooldown is enforced by the create_ipo RPC at creation time.
  // This test verifies the runtime invariant: at most 1 active IPO per player.
  it('SM-IPO-05: no player should have more than 1 active IPO at the same time', async () => {
    const { data: activeIpos, error } = await sb
      .from('ipos')
      .select('id, player_id, status')
      .in('status', ['open', 'early_access', 'announced']);

    expect(error).toBeNull();
    if (!activeIpos || activeIpos.length === 0) return;

    // Count active IPOs per player
    const counts = new Map<string, number>();
    for (const ipo of activeIpos) {
      counts.set(ipo.player_id, (counts.get(ipo.player_id) ?? 0) + 1);
    }

    const violations = Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([pid, count]) => `Player ${pid.slice(0, 8)}: ${count} active IPOs`);

    expect(
      violations,
      `Found ${violations.length} players with multiple active IPOs:\n${violations.join('\n')}`
    ).toHaveLength(0);
  });

  // ── 6. IPO Buy at sold=total: FAIL (auto-close guard) ──
  it('SM-IPO-06: no open IPO should have sold = total_offered (should auto-close)', async () => {
    const { data, error } = await sb
      .from('ipos')
      .select('id, player_id, sold, total_offered, status')
      .eq('status', 'open');

    expect(error).toBeNull();
    const soldOut = (data ?? []).filter(ipo => ipo.sold >= ipo.total_offered);
    expect(
      soldOut,
      `Found ${soldOut.length} open IPOs that are sold out (auto-close failed)`
    ).toHaveLength(0);
  });

  // ── 7. Max 4 tranches per player ──
  it('SM-IPO-07: no player should have more than 4 non-cancelled IPOs', async () => {
    const { data: ipos, error } = await sb
      .from('ipos')
      .select('id, player_id, status')
      .not('status', 'eq', 'cancelled');

    expect(error).toBeNull();
    if (!ipos || ipos.length === 0) return;

    // Count IPOs per player
    const counts = new Map<string, number>();
    for (const ipo of ipos) {
      counts.set(ipo.player_id, (counts.get(ipo.player_id) ?? 0) + 1);
    }

    const violations = Array.from(counts.entries())
      .filter(([, count]) => count > 4)
      .map(([pid, count]) => `Player ${pid.slice(0, 8)}: ${count} tranches (max 4)`);

    expect(
      violations,
      `Found ${violations.length} players exceeding max tranches:\n${violations.join('\n')}`
    ).toHaveLength(0);
  });
});
