// @vitest-environment node

/**
 * Trading Fees — Money Flow Tests (Layer 3)
 *
 * Verifies fee splits on all trades:
 *   Order (secondary market): 6% total → 3.5% Platform + 1.5% PBT + 1.0% Club
 *   IPO (primary market): 100% split → 10% Platform + 5% PBT + 85% Club
 *
 * All values in BIGINT cents. Rounding tolerance: ±1 cent per component.
 *
 * Run: npx vitest run src/lib/__tests__/money/trading-fees.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

let sb: SupabaseClient;

type Trade = {
  id: string;
  price: number;
  quantity: number;
  platform_fee: number;
  pbt_fee: number;
  club_fee: number;
  ipo_id: string | null;
};

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars in .env.local');
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

describe('Trading Fees — Money Flow', () => {
  // ── 1. Order trades: platform_fee ≈ 3.5% ──
  it('MF-FEE-01: order trades platform_fee = 3.5% of trade value (±1 cent)', async () => {
    const { data, error } = await sb
      .from('trades')
      .select('id, price, quantity, platform_fee, ipo_id')
      .is('ipo_id', null)
      .limit(500);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    const violations: string[] = [];
    for (const t of data) {
      const total = t.price * t.quantity;
      const expected = Math.round(total * 0.035);
      if (Math.abs(t.platform_fee - expected) > 1) {
        violations.push(
          `Trade ${t.id.slice(0, 8)}: platform_fee=${t.platform_fee}, expected=${expected} (3.5% of ${total})`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 2. Order trades: pbt_fee ≈ 1.5% ──
  it('MF-FEE-02: order trades pbt_fee = 1.5% of trade value (±1 cent)', async () => {
    const { data, error } = await sb
      .from('trades')
      .select('id, price, quantity, pbt_fee, ipo_id')
      .is('ipo_id', null)
      .limit(500);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    const violations: string[] = [];
    for (const t of data) {
      const total = t.price * t.quantity;
      const expected = Math.round(total * 0.015);
      if (Math.abs(t.pbt_fee - expected) > 1) {
        violations.push(
          `Trade ${t.id.slice(0, 8)}: pbt_fee=${t.pbt_fee}, expected=${expected} (1.5% of ${total})`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 3. Order trades: club_fee ≈ 1.0% ──
  it('MF-FEE-03: order trades club_fee = 1.0% of trade value (±1 cent)', async () => {
    const { data, error } = await sb
      .from('trades')
      .select('id, price, quantity, club_fee, ipo_id')
      .is('ipo_id', null)
      .limit(500);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    const violations: string[] = [];
    for (const t of data) {
      const total = t.price * t.quantity;
      const expected = Math.round(total * 0.01);
      if (Math.abs(t.club_fee - expected) > 1) {
        violations.push(
          `Trade ${t.id.slice(0, 8)}: club_fee=${t.club_fee}, expected=${expected} (1.0% of ${total})`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 4. IPO trades: platform_fee = 10% ──
  it('MF-FEE-04: IPO trades platform_fee = 10% of trade value (±1 cent)', async () => {
    const { data, error } = await sb
      .from('trades')
      .select('id, price, quantity, platform_fee, ipo_id')
      .not('ipo_id', 'is', null)
      .limit(500);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    const violations: string[] = [];
    for (const t of data) {
      const total = t.price * t.quantity;
      const expected = Math.round(total * 0.10);
      if (Math.abs(t.platform_fee - expected) > 1) {
        violations.push(
          `Trade ${t.id.slice(0, 8)}: platform_fee=${t.platform_fee}, expected=${expected} (10% of ${total})`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 5. IPO trades: pbt_fee ≈ 5% ──
  // Note: RPC uses integer math with different rounding strategy. ±2 cent tolerance.
  it('MF-FEE-05: IPO trades pbt_fee = 5% of trade value (±2 cents)', async () => {
    const { data, error } = await sb
      .from('trades')
      .select('id, price, quantity, pbt_fee, ipo_id')
      .not('ipo_id', 'is', null)
      .limit(500);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    const violations: string[] = [];
    for (const t of data) {
      const total = t.price * t.quantity;
      const expected = Math.round(total * 0.05);
      if (Math.abs(t.pbt_fee - expected) > 2) {
        violations.push(
          `Trade ${t.id.slice(0, 8)}: pbt_fee=${t.pbt_fee}, expected=${expected} (5% of ${total})`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 6. IPO trades: club_fee = 85% ──
  it('MF-FEE-06: IPO trades club_fee = 85% of trade value (±1 cent)', async () => {
    const { data, error } = await sb
      .from('trades')
      .select('id, price, quantity, club_fee, ipo_id')
      .not('ipo_id', 'is', null)
      .limit(500);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    const violations: string[] = [];
    for (const t of data) {
      const total = t.price * t.quantity;
      const expected = Math.round(total * 0.85);
      if (Math.abs(t.club_fee - expected) > 1) {
        violations.push(
          `Trade ${t.id.slice(0, 8)}: club_fee=${t.club_fee}, expected=${expected} (85% of ${total})`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 7. All trades: fees don't exceed trade value ──
  it('MF-FEE-07: total fees must not exceed trade value', async () => {
    const { data, error } = await sb
      .from('trades')
      .select('id, price, quantity, platform_fee, pbt_fee, club_fee')
      .limit(1000);

    expect(error).toBeNull();
    const violations: string[] = [];
    for (const t of data ?? []) {
      const tradeValue = t.price * t.quantity;
      const totalFees = t.platform_fee + t.pbt_fee + t.club_fee;
      if (totalFees > tradeValue) {
        violations.push(
          `Trade ${t.id.slice(0, 8)}: fees ${totalFees} > value ${tradeValue}`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 8. Rounding: no missing cents in fee split ──
  it('MF-FEE-08: order fee components must sum to exactly 6% total (±1 cent)', async () => {
    const { data, error } = await sb
      .from('trades')
      .select('id, price, quantity, platform_fee, pbt_fee, club_fee, ipo_id')
      .is('ipo_id', null)
      .limit(500);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    const violations: string[] = [];
    for (const t of data) {
      const total = t.price * t.quantity;
      const actualSum = t.platform_fee + t.pbt_fee + t.club_fee;
      const expectedSum = Math.round(total * 0.06);
      if (Math.abs(actualSum - expectedSum) > 1) {
        violations.push(
          `Trade ${t.id.slice(0, 8)}: fee sum ${actualSum} vs expected ${expectedSum} (6% of ${total})`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });
});
