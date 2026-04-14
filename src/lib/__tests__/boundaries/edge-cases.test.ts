// @vitest-environment node

/**
 * Boundary / Edge Cases — Layer 6
 *
 * Verifies system behavior at boundaries:
 *   - Quantity limits (0, 1, max)
 *   - Price limits (0, negative, cap)
 *   - Format consistency (7er/11er slots)
 *   - Turkish unicode handling
 *   - Duplicate player prevention
 *
 * RPC calls with invalid params are safe — they return {success:false}
 * without modifying data. Read-only DB checks verify current data consistency.
 *
 * Run: npx vitest run src/lib/__tests__/boundaries/edge-cases.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let admin: SupabaseClient;
let botClient: SupabaseClient;
let botId: string;
let testPlayerId: string;

beforeAll(async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) throw new Error('Missing Supabase env vars');

  admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  botClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: auth, error } = await botClient.auth.signInWithPassword({
    email: 'bot-001@bescout.app',
    password: 'BeScout2026!',
  });
  if (error || !auth.user) throw new Error(`Bot login failed: ${error?.message}`);
  botId = auth.user.id;

  // Find a non-liquidated player for RPC tests
  const { data: player } = await admin
    .from('players')
    .select('id')
    .eq('is_liquidated', false)
    .limit(1);
  if (!player?.[0]) throw new Error('No active player found');
  testPlayerId = player[0].id;
});

describe('Boundary / Edge Cases', () => {
  // ── 1. Buy 0 SC → FAIL ──
  it('EDGE-01: buy_player_sc rejects quantity=0', async () => {
    const { data } = await botClient.rpc('buy_player_sc', {
      p_user_id: botId,
      p_player_id: testPlayerId,
      p_quantity: 0,
    });
    expect(data?.success).toBe(false);
  });

  // ── 2. Buy 301 SC (>300 max) → FAIL ──
  it('EDGE-02: buy_player_sc rejects quantity=301', async () => {
    const { data } = await botClient.rpc('buy_player_sc', {
      p_user_id: botId,
      p_player_id: testPlayerId,
      p_quantity: 301,
    });
    expect(data?.success).toBe(false);
  });

  // ── 3. Sell price = 0 → FAIL ──
  it('EDGE-03: place_sell_order rejects price=0', async () => {
    const { data } = await botClient.rpc('place_sell_order', {
      p_user_id: botId,
      p_player_id: testPlayerId,
      p_quantity: 1,
      p_price: 0,
    });
    expect(data?.success).toBe(false);
  });

  // ── 4. Sell quantity = 0 → FAIL ──
  it('EDGE-04: place_sell_order rejects quantity=0', async () => {
    const { data } = await botClient.rpc('place_sell_order', {
      p_user_id: botId,
      p_player_id: testPlayerId,
      p_quantity: 0,
      p_price: 50000,
    });
    expect(data?.success).toBe(false);
  });

  // ── 5. Buy order price = 0 → FAIL ──
  it('EDGE-05: place_buy_order rejects price=0', async () => {
    const { data } = await botClient.rpc('place_buy_order', {
      p_user_id: botId,
      p_player_id: testPlayerId,
      p_quantity: 1,
      p_max_price: 0,
    });
    expect(data?.success).toBe(false);
  });

  // ── 6. Buy negative quantity → FAIL ──
  it('EDGE-06: buy_player_sc rejects negative quantity', async () => {
    const { data } = await botClient.rpc('buy_player_sc', {
      p_user_id: botId,
      p_player_id: testPlayerId,
      p_quantity: -1,
    });
    expect(data?.success).toBe(false);
  });

  // ── 7. Sell negative price → FAIL ──
  it('EDGE-07: place_sell_order rejects negative price', async () => {
    const { data } = await botClient.rpc('place_sell_order', {
      p_user_id: botId,
      p_player_id: testPlayerId,
      p_quantity: 1,
      p_price: -100,
    });
    expect(data?.success).toBe(false);
  });

  // ── 8. No duplicate player in same lineup (DB check) ──
  it('EDGE-08: no player appears in multiple slots of the same lineup', async () => {
    const { data: lineups, error } = await admin
      .from('lineups')
      .select('id, slot_gk, slot_def1, slot_def2, slot_def3, slot_def4, slot_mid1, slot_mid2, slot_mid3, slot_mid4, slot_att, slot_att2, slot_att3')
      .limit(500);

    expect(error).toBeNull();
    const violations: string[] = [];
    for (const l of lineups ?? []) {
      const slots = [
        l.slot_gk, l.slot_def1, l.slot_def2, l.slot_def3, l.slot_def4,
        l.slot_mid1, l.slot_mid2, l.slot_mid3, l.slot_mid4,
        l.slot_att, l.slot_att2, l.slot_att3,
      ].filter(Boolean);
      const unique = new Set(slots);
      if (unique.size !== slots.length) {
        violations.push(`Lineup ${l.id.slice(0, 8)}: ${slots.length} slots but ${unique.size} unique`);
      }
    }
    expect(violations).toHaveLength(0);
  });

  // ── 9. Turkish Unicode İ/ı normalization ──
  it('EDGE-09: Turkish İ characters exist in player names and are searchable', async () => {
    // Verify players with Turkish İ/ı are in the DB and queryable
    const { data, error } = await admin
      .from('players')
      .select('first_name, last_name')
      .or('last_name.ilike.%İ%,last_name.ilike.%ı%,first_name.ilike.%İ%,first_name.ilike.%ı%')
      .limit(10);

    expect(error).toBeNull();
    // Turkish league should have players with İ/ı
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  // ── 10. Event format ↔ lineup_size consistency ──
  it('EDGE-10: 7er events have exactly 7 lineup slots, 11er have 11', async () => {
    const { data, error } = await admin
      .from('events')
      .select('id, name, format, lineup_size')
      .limit(500);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(
      e =>
        (e.format === '7er' && e.lineup_size !== 7) ||
        (e.format === '11er' && e.lineup_size !== 11)
    );
    expect(violations).toHaveLength(0);
  });

  // ── 11. No order quantity exceeds holdings ──
  it('EDGE-11: no open sell order quantity exceeds user holdings', async () => {
    const { data: orders, error } = await admin
      .from('orders')
      .select('id, user_id, player_id, quantity, filled_qty, status, side')
      .in('status', ['open', 'partial'])
      .eq('side', 'sell')
      .limit(200);

    expect(error).toBeNull();
    if (!orders || orders.length === 0) return;

    // Batch: load all relevant holdings in one query
    const keys = orders.map(o => ({ uid: o.user_id, pid: o.player_id }));
    const userIds = Array.from(new Set(keys.map(k => k.uid)));
    const playerIds = Array.from(new Set(keys.map(k => k.pid)));

    const { data: holdings } = await admin
      .from('holdings')
      .select('user_id, player_id, quantity')
      .in('user_id', userIds)
      .in('player_id', playerIds);

    const holdingMap = new Map(
      (holdings ?? []).map(h => [`${h.user_id}:${h.player_id}`, h.quantity])
    );

    const violations: string[] = [];
    for (const o of orders) {
      const remainingOrder = o.quantity - o.filled_qty;
      const holdingQty = holdingMap.get(`${o.user_id}:${o.player_id}`) ?? 0;
      if (remainingOrder > holdingQty) {
        violations.push(
          `Order ${o.id.slice(0, 8)}: selling ${remainingOrder} but holds ${holdingQty}`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 12. No negative IPO sold count ──
  it('EDGE-12: no IPO has negative sold count', async () => {
    const { data, error } = await admin
      .from('ipos')
      .select('id, sold')
      .lt('sold', 0)
      .limit(5);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  // ── 13. All orders have positive price ──
  it('EDGE-13: no order has zero or negative price', async () => {
    const { data, error } = await admin
      .from('orders')
      .select('id, price')
      .lte('price', 0)
      .limit(5);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  // ── 14. All orders have positive quantity ──
  it('EDGE-14: no order has zero or negative quantity', async () => {
    const { data, error } = await admin
      .from('orders')
      .select('id, quantity')
      .lte('quantity', 0)
      .limit(5);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  // ── 15. No filled_qty exceeds quantity on any order ──
  it('EDGE-15: no order has filled_qty > quantity', async () => {
    const { data, error } = await admin
      .from('orders')
      .select('id, quantity, filled_qty')
      .limit(1000);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(o => o.filled_qty > o.quantity);
    expect(violations).toHaveLength(0);
  });

  // ── 16. All trade prices are positive ──
  it('EDGE-16: no trade has zero or negative price', async () => {
    const { data, error } = await admin
      .from('trades')
      .select('id, price')
      .lte('price', 0)
      .limit(5);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  // ── 17. All holdings have positive quantity ──
  it('EDGE-17: no holding has zero or negative quantity', async () => {
    const { data, error } = await admin
      .from('holdings')
      .select('user_id, player_id, quantity')
      .lte('quantity', 0)
      .limit(5);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  // ── 18. All IPO prices are positive ──
  it('EDGE-18: no IPO has zero or negative price', async () => {
    const { data, error } = await admin
      .from('ipos')
      .select('id, price')
      .lte('price', 0)
      .limit(5);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  // ── 19. Event entries don't exceed max_entries (ended events only) ──
  // Note: Active events may temporarily exceed max_entries due to concurrent joins.
  // The guard is in the RPC, but race conditions during heavy load are possible.
  // We check only ended events where the final count should be correct.
  it('EDGE-19: no ended event has current_entries > max_entries', async () => {
    const { data, error } = await admin
      .from('events')
      .select('id, name, current_entries, max_entries')
      .not('max_entries', 'is', null)
      .eq('status', 'ended')
      .limit(500);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(
      e => e.max_entries !== null && e.current_entries > e.max_entries
    );
    expect(violations.map(e => `${e.name}: ${e.current_entries}/${e.max_entries}`)).toHaveLength(0);
  });

  // ── 20. Handles contain no HTML/script injection ──
  it('EDGE-20: no profile handle contains HTML or script tags', async () => {
    const { data, error } = await admin
      .from('profiles')
      .select('id, handle')
      .or('handle.ilike.%<script%,handle.ilike.%<img%,handle.ilike.%javascript:%,handle.ilike.%onerror%')
      .limit(5);

    expect(error).toBeNull();
    expect(data ?? [], 'Found handles with potential XSS').toHaveLength(0);
  });
});
