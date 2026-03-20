// @vitest-environment node

/**
 * Player Lifecycle — State Machine Tests (Layer 2)
 *
 * Verifies the player lifecycle around liquidation:
 *   active → liquidated (terminal, irreversible)
 *
 * When a player is liquidated:
 *   - All open orders must be cancelled
 *   - No new trades can happen
 *   - No new sell orders can be placed
 *   - Holders receive payouts
 *
 * Tests are READ-ONLY queries against live Supabase data.
 *
 * Run: npx vitest run src/lib/__tests__/state-machines/player-lifecycle.test.ts
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

describe('Player Lifecycle — State Machine', () => {
  // ── 1. Liquidation: all open orders must be cancelled ──
  it('SM-PLR-01: no open/partial orders should exist for liquidated players', async () => {
    const { data: liquidated } = await sb
      .from('players')
      .select('id')
      .eq('is_liquidated', true);

    if (!liquidated || liquidated.length === 0) return; // no liquidated players

    const liquidatedIds = liquidated.map(p => p.id);

    const { data: orphanOrders, error } = await sb
      .from('orders')
      .select('id, player_id, status, side')
      .in('player_id', liquidatedIds)
      .in('status', ['open', 'partial']);

    expect(error).toBeNull();
    expect(
      orphanOrders ?? [],
      `Found ${(orphanOrders ?? []).length} open/partial orders for liquidated players (auto-cancel failed)`
    ).toHaveLength(0);
  });

  // ── 2. Liquidated players: no active IPOs ──
  it('SM-PLR-02: no active IPO should exist for liquidated players', async () => {
    const { data: liquidated } = await sb
      .from('players')
      .select('id')
      .eq('is_liquidated', true);

    if (!liquidated || liquidated.length === 0) return;

    const liquidatedIds = liquidated.map(p => p.id);

    const { data: activeIpos, error } = await sb
      .from('ipos')
      .select('id, player_id, status')
      .in('player_id', liquidatedIds)
      .in('status', ['announced', 'early_access', 'open']);

    expect(error).toBeNull();
    expect(
      activeIpos ?? [],
      `Found ${(activeIpos ?? []).length} active IPOs for liquidated players`
    ).toHaveLength(0);
  });

  // ── 3. Liquidation payouts: every liquidation event has payouts ──
  it('SM-PLR-03: every liquidation_event should have corresponding payouts', async () => {
    const { data: events, error: evtErr } = await sb
      .from('liquidation_events')
      .select('id, player_id, holder_count')
      .limit(100);

    expect(evtErr).toBeNull();
    if (!events || events.length === 0) return; // no liquidations happened

    for (const evt of events) {
      const { count, error } = await sb
        .from('liquidation_payouts')
        .select('id', { count: 'exact', head: true })
        .eq('liquidation_id', evt.id);

      expect(error).toBeNull();
      expect(
        count ?? 0,
        `Liquidation ${evt.id.slice(0, 8)} (player ${evt.player_id.slice(0, 8)}): expected ${evt.holder_count} payouts, got ${count}`
      ).toBeGreaterThan(0);
    }
  });

  // ── 4. No trades after liquidation ──
  it('SM-PLR-04: no trades should exist after player liquidation timestamp', async () => {
    // Get liquidation events with timestamps
    const { data: liquidations, error: liqErr } = await sb
      .from('liquidation_events')
      .select('id, player_id, created_at')
      .limit(100);

    expect(liqErr).toBeNull();
    if (!liquidations || liquidations.length === 0) return;

    const violations: string[] = [];

    for (const liq of liquidations) {
      // Check for trades AFTER the liquidation timestamp
      const { data: postTrades, error } = await sb
        .from('trades')
        .select('id, executed_at')
        .eq('player_id', liq.player_id)
        .gt('executed_at', liq.created_at)
        .limit(5);

      expect(error).toBeNull();
      if (postTrades && postTrades.length > 0) {
        violations.push(
          `Player ${liq.player_id.slice(0, 8)}: ${postTrades.length} trades after liquidation at ${liq.created_at}`
        );
      }
    }

    expect(
      violations,
      `Found trades after liquidation:\n${violations.join('\n')}`
    ).toHaveLength(0);
  });
});
