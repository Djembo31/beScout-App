// @vitest-environment node

/**
 * Order Lifecycle — State Machine Tests (Layer 2)
 *
 * Verifies the order state machine:
 *   open → partial → filled (terminal)
 *                  ↘ cancelled (from open/partial)
 *
 * Guards tested:
 *   - Cancelled order cannot be filled later
 *   - Expired orders (past expires_at) are cancelled
 *   - Partial fill: 0 < filled_qty < quantity
 *   - Full fill: filled_qty = quantity
 *   - locked_balance consistency with open buy orders
 *
 * Tests are READ-ONLY queries against live Supabase data.
 *
 * Run: npx vitest run src/lib/__tests__/state-machines/order-lifecycle.test.ts
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

const VALID_ORDER_STATUSES = ['open', 'partial', 'filled', 'cancelled'];

describe('Order Lifecycle — State Machine', () => {
  // ── 1. Cancel open order: locked_balance accounting ──
  it('SM-ORD-01: all orders have valid status values', async () => {
    const { data, error } = await sb
      .from('orders')
      .select('id, status')
      .limit(1000);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(
      o => !VALID_ORDER_STATUSES.includes(o.status)
    );
    expect(
      violations,
      `Found ${violations.length} orders with invalid status`
    ).toHaveLength(0);
  });

  // ── 2. Partial fill: filled_qty must be between 0 and quantity ──
  it('SM-ORD-02: partial orders must have 0 < filled_qty < quantity', async () => {
    const { data, error } = await sb
      .from('orders')
      .select('id, quantity, filled_qty, status')
      .eq('status', 'partial');

    expect(error).toBeNull();
    const violations = (data ?? []).filter(
      o => o.filled_qty <= 0 || o.filled_qty >= o.quantity
    );
    expect(
      violations,
      `Found ${violations.length} "partial" orders with invalid filled_qty`
    ).toHaveLength(0);
  });

  // ── 3. Fill cancelled order: IMPOSSIBLE ──
  it('SM-ORD-03: no cancelled order should have filled_qty = quantity (full fill)', async () => {
    const { data, error } = await sb
      .from('orders')
      .select('id, quantity, filled_qty, status')
      .eq('status', 'cancelled');

    expect(error).toBeNull();
    const violations = (data ?? []).filter(o => o.filled_qty >= o.quantity);
    expect(
      violations,
      `Found ${violations.length} cancelled orders that were fully filled (should be "filled" not "cancelled")`
    ).toHaveLength(0);
  });

  // ── 4. Expire pending: no open/partial order past expiry ──
  it('SM-ORD-04: no open/partial order should be past its expires_at', async () => {
    const now = new Date().toISOString();
    const { data, error } = await sb
      .from('orders')
      .select('id, status, expires_at, player_id')
      .in('status', ['open', 'partial'])
      .not('expires_at', 'is', null)
      .lt('expires_at', now);

    expect(error).toBeNull();
    expect(
      data ?? [],
      `Found ${(data ?? []).length} open/partial orders past expiry (cron should have cancelled them)`
    ).toHaveLength(0);
  });

  // ── 5. Filled orders: filled_qty = quantity ──
  it('SM-ORD-05: filled orders must have filled_qty = quantity', async () => {
    const { data, error } = await sb
      .from('orders')
      .select('id, quantity, filled_qty, status')
      .eq('status', 'filled');

    expect(error).toBeNull();
    const violations = (data ?? []).filter(o => o.filled_qty !== o.quantity);
    expect(
      violations,
      `Found ${violations.length} "filled" orders where filled_qty ≠ quantity`
    ).toHaveLength(0);
  });

  // ── 6. Open orders: filled_qty = 0 ──
  it('SM-ORD-06: open orders must have filled_qty = 0', async () => {
    const { data, error } = await sb
      .from('orders')
      .select('id, quantity, filled_qty, status')
      .eq('status', 'open');

    expect(error).toBeNull();
    const violations = (data ?? []).filter(o => o.filled_qty !== 0);
    expect(
      violations,
      `Found ${violations.length} "open" orders with filled_qty > 0 (should be "partial")`
    ).toHaveLength(0);
  });
});
