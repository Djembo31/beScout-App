// @vitest-environment node

/**
 * Liquidation Payout — Money Flow Tests (Layer 3)
 *
 * Verifies liquidation payout accounting:
 *   - Distributed amount = sum of individual payouts
 *   - Holder count matches payout count
 *   - PBT + Success Fee = total payout per holder
 *   - No negative payout amounts
 *
 * Note: If no liquidations have occurred yet, tests pass with early return.
 * These become active regression guards once liquidations start.
 *
 * Run: npx vitest run src/lib/__tests__/money/liquidation-payout.test.ts
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

describe('Liquidation Payout — Money Flow', () => {
  // ── 1. Distributed amount = sum of payouts ──
  it('MF-LIQ-01: each liquidation distributed_cents must equal sum of payout_cents', async () => {
    const { data: events, error: evtErr } = await sb
      .from('liquidation_events')
      .select('id, player_id, distributed_cents, holder_count')
      .limit(100);

    expect(evtErr).toBeNull();
    if (!events || events.length === 0) return; // no liquidations yet

    for (const evt of events) {
      const { data: payouts, error } = await sb
        .from('liquidation_payouts')
        .select('payout_cents')
        .eq('liquidation_id', evt.id);

      expect(error).toBeNull();
      const sum = (payouts ?? []).reduce((acc, p) => acc + p.payout_cents, 0);
      expect(
        sum,
        `Liquidation ${evt.id.slice(0, 8)}: sum(payouts)=${sum} vs distributed=${evt.distributed_cents}`
      ).toBe(evt.distributed_cents);
    }
  });

  // ── 2. Holder count = payout count ──
  it('MF-LIQ-02: each liquidation holder_count must match number of payouts', async () => {
    const { data: events, error: evtErr } = await sb
      .from('liquidation_events')
      .select('id, holder_count')
      .limit(100);

    expect(evtErr).toBeNull();
    if (!events || events.length === 0) return;

    for (const evt of events) {
      const { count, error } = await sb
        .from('liquidation_payouts')
        .select('id', { count: 'exact', head: true })
        .eq('liquidation_id', evt.id);

      expect(error).toBeNull();
      expect(
        count ?? 0,
        `Liquidation ${evt.id.slice(0, 8)}: ${count} payouts vs holder_count=${evt.holder_count}`
      ).toBe(evt.holder_count);
    }
  });

  // ── 3. PBT + Success Fee = total payout per holder ──
  it('MF-LIQ-03: each payout pbt_payout + success_fee_payout must equal payout_cents', async () => {
    const { data: payouts, error } = await sb
      .from('liquidation_payouts')
      .select('id, liquidation_id, payout_cents, pbt_payout_cents, success_fee_payout_cents')
      .limit(500);

    expect(error).toBeNull();
    if (!payouts || payouts.length === 0) return;

    const violations: string[] = [];
    for (const p of payouts) {
      const sum = (p.pbt_payout_cents ?? 0) + (p.success_fee_payout_cents ?? 0);
      if (sum !== p.payout_cents) {
        violations.push(
          `Payout ${p.id.slice(0, 8)}: pbt(${p.pbt_payout_cents}) + sf(${p.success_fee_payout_cents}) = ${sum} ≠ total(${p.payout_cents})`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 4. No negative payout amounts ──
  it('MF-LIQ-04: no payout should have negative amounts', async () => {
    const { data: payouts, error } = await sb
      .from('liquidation_payouts')
      .select('id, payout_cents, pbt_payout_cents, success_fee_payout_cents')
      .limit(500);

    expect(error).toBeNull();
    if (!payouts || payouts.length === 0) return;

    const violations: string[] = [];
    for (const p of payouts) {
      if (p.payout_cents < 0) violations.push(`Payout ${p.id.slice(0, 8)}: payout_cents=${p.payout_cents}`);
      if ((p.pbt_payout_cents ?? 0) < 0) violations.push(`Payout ${p.id.slice(0, 8)}: pbt_payout_cents=${p.pbt_payout_cents}`);
      if ((p.success_fee_payout_cents ?? 0) < 0) violations.push(`Payout ${p.id.slice(0, 8)}: success_fee_payout_cents=${p.success_fee_payout_cents}`);
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });
});
