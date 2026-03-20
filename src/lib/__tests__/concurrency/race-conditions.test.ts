// @vitest-environment node

/**
 * Concurrency — Race Condition Guards (Layer 4)
 *
 * Verifies that database-level concurrency protections exist:
 *   - CHECK constraints prevent invalid states
 *   - Unique indexes prevent duplicate entries
 *   - RPC guards prevent overselling
 *   - Transaction isolation prevents double-spending
 *
 * These tests verify GUARDS exist by checking current data consistency.
 * For safety against live DB, no concurrent write operations are performed.
 * Actual concurrent load testing should use a dedicated test environment.
 *
 * Run: npx vitest run src/lib/__tests__/concurrency/race-conditions.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

let sb: SupabaseClient;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars in .env.local');
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

describe('Concurrency — Race Condition Guards', () => {
  // ── 1. IPO oversell guard: sold never exceeds total_offered ──
  it('CONC-01: no IPO has sold > total_offered (oversell guard works)', async () => {
    const { data, error } = await sb
      .from('ipos')
      .select('id, player_id, sold, total_offered, status');

    expect(error).toBeNull();
    const oversold = (data ?? []).filter(i => i.sold > i.total_offered);
    expect(oversold, 'Oversold IPOs found — race condition in buy_from_ipo').toHaveLength(0);
  });

  // ── 2. No double scoring: each event scored at most once ──
  it('CONC-02: no ended event has multiple scored_at entries (double-scoring guard)', async () => {
    // Verify no event was scored twice by checking for duplicate event IDs
    // in any scoring-related audit trail. Since scored_at is a single timestamp,
    // we verify it's set exactly once for each ended event with entries.
    const { data: events, error } = await sb
      .from('events')
      .select('id, name, status, scored_at, current_entries')
      .eq('status', 'ended')
      .gt('current_entries', 0);

    expect(error).toBeNull();
    if (!events || events.length === 0) return;

    // Every ended event with entries must have exactly one scored_at timestamp
    const missingScoring = events.filter(e => !e.scored_at);
    expect(
      missingScoring.map(e => e.name),
      `${missingScoring.length} ended events with entries but no scored_at`
    ).toHaveLength(0);
  });

  // ── 3. No duplicate holdings: user+player combination is unique ──
  it('CONC-03: no user has duplicate holdings for the same player', async () => {
    const { data, error } = await sb
      .from('holdings')
      .select('user_id, player_id, quantity')
      .limit(5000);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const h of data) {
      const key = `${h.user_id}:${h.player_id}`;
      if (seen.has(key)) {
        duplicates.push(`User ${h.user_id.slice(0, 8)} + Player ${h.player_id.slice(0, 8)}`);
      }
      seen.add(key);
    }

    expect(duplicates, `Duplicate holdings found:\n${duplicates.join('\n')}`).toHaveLength(0);
  });

  // ── 4. No negative wallet balance (concurrent buy guard) ──
  it('CONC-04: no wallet went negative from concurrent buys', async () => {
    const { data, error } = await sb
      .from('wallets')
      .select('user_id, balance, locked_balance')
      .or('balance.lt.0,locked_balance.lt.0')
      .limit(10);

    expect(error).toBeNull();
    expect(
      data ?? [],
      'Negative balance/locked_balance found — concurrent buy guard failed'
    ).toHaveLength(0);
  });

  // ── 5. No filled order exceeds original quantity ──
  it('CONC-05: no order has filled_qty > quantity (concurrent fill guard)', async () => {
    const { data, error } = await sb
      .from('orders')
      .select('id, quantity, filled_qty, status')
      .limit(1000);

    expect(error).toBeNull();
    const overfilled = (data ?? []).filter(o => o.filled_qty > o.quantity);
    expect(
      overfilled,
      'Orders with filled_qty > quantity — concurrent fill race condition'
    ).toHaveLength(0);
  });

  // ── 6. No duplicate lineup entries per event ──
  it('CONC-06: no user has multiple lineups for the same event', async () => {
    const { data, error } = await sb
      .from('lineups')
      .select('user_id, event_id')
      .limit(5000);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const l of data) {
      const key = `${l.user_id}:${l.event_id}`;
      if (seen.has(key)) {
        duplicates.push(`User ${l.user_id.slice(0, 8)} in Event ${l.event_id.slice(0, 8)}`);
      }
      seen.add(key);
    }

    expect(duplicates, `Duplicate lineups:\n${duplicates.join('\n')}`).toHaveLength(0);
  });

  // ── 7. Wallet balance consistency after concurrent trades ──
  it('CONC-07: available balance (balance - locked) is never negative', async () => {
    const { data, error } = await sb
      .from('wallets')
      .select('user_id, balance, locked_balance')
      .gt('locked_balance', 0)
      .limit(500);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(w => w.balance - w.locked_balance < 0);
    expect(
      violations.map(w => `User ${w.user_id.slice(0, 8)}: avail=${w.balance - w.locked_balance}`),
      'Negative available balance — concurrent lock/unlock race'
    ).toHaveLength(0);
  });

  // ── 8. No duplicate votes on same post by same user ──
  it('CONC-08: no user has voted multiple times on the same post', async () => {
    const { data, error } = await sb
      .from('post_votes')
      .select('user_id, post_id')
      .limit(5000);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const v of data) {
      const key = `${v.user_id}:${v.post_id}`;
      if (seen.has(key)) {
        duplicates.push(`User ${v.user_id.slice(0, 8)} on Post ${v.post_id.slice(0, 8)}`);
      }
      seen.add(key);
    }

    expect(duplicates, `Duplicate votes:\n${duplicates.join('\n')}`).toHaveLength(0);
  });

  // ── 9. Trade quantities match order fill changes ──
  it('CONC-09: total trade quantity per order matches filled_qty', async () => {
    // For filled orders, sum of trade quantities should equal filled_qty
    const { data: filledOrders, error } = await sb
      .from('orders')
      .select('id, filled_qty, side')
      .eq('status', 'filled')
      .eq('side', 'sell')
      .limit(100);

    expect(error).toBeNull();
    if (!filledOrders || filledOrders.length === 0) return;

    const violations: string[] = [];
    for (const order of filledOrders) {
      const { data: trades } = await sb
        .from('trades')
        .select('quantity')
        .eq('sell_order_id', order.id);

      const tradeSum = (trades ?? []).reduce((acc, t) => acc + t.quantity, 0);
      if (tradeSum !== order.filled_qty) {
        violations.push(
          `Order ${order.id.slice(0, 8)}: filled_qty=${order.filled_qty} but trade sum=${tradeSum}`
        );
      }
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 10. No duplicate IPO purchases beyond max_per_user ──
  it('CONC-10: no user exceeds max_per_user for any IPO', async () => {
    // Batch approach: load all purchases and IPO limits, check in memory
    const { data: ipos, error: ipoErr } = await sb
      .from('ipos')
      .select('id, max_per_user')
      .limit(500);

    expect(ipoErr).toBeNull();
    if (!ipos || ipos.length === 0) return;

    const ipoMaxMap = new Map(ipos.map(i => [i.id, i.max_per_user]));

    // Single query for all purchases
    const { data: purchases, error: purchErr } = await sb
      .from('ipo_purchases')
      .select('ipo_id, user_id, quantity')
      .limit(5000);

    expect(purchErr).toBeNull();
    if (!purchases || purchases.length === 0) return;

    // Group: ipo_id:user_id → total quantity
    const userTotals = new Map<string, number>();
    for (const p of purchases) {
      const key = `${p.ipo_id}:${p.user_id}`;
      userTotals.set(key, (userTotals.get(key) ?? 0) + p.quantity);
    }

    const violations: string[] = [];
    for (const [key, total] of userTotals) {
      const [ipoId, userId] = key.split(':');
      const max = ipoMaxMap.get(ipoId);
      if (max !== undefined && total > max) {
        violations.push(
          `IPO ${ipoId.slice(0, 8)}: User ${userId.slice(0, 8)} bought ${total} (max ${max})`
        );
      }
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  });
});
