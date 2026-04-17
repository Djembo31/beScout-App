// @vitest-environment node

/**
 * Wallet Guards — Money Flow Tests (Layer 3)
 *
 * Verifies wallet financial invariants:
 *   - No negative balances
 *   - Locked balance accounting
 *   - Balance consistency
 *
 * Tests are READ-ONLY queries against live Supabase data.
 *
 * Run: npx vitest run src/lib/__tests__/money/wallet-guards.test.ts
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

describe('Wallet Guards — Money Flow', () => {
  // ── 1. No negative balance ──
  it('MF-WAL-01: no wallet should have negative balance', async () => {
    const { data, error } = await sb
      .from('wallets')
      .select('user_id, balance')
      .lt('balance', 0)
      .limit(10);

    expect(error).toBeNull();
    expect(
      data ?? [],
      `Found ${(data ?? []).length} wallets with negative balance`
    ).toHaveLength(0);
  });

  // ── 2. No negative locked_balance ──
  it('MF-WAL-02: no wallet should have negative locked_balance', async () => {
    const { data, error } = await sb
      .from('wallets')
      .select('user_id, locked_balance')
      .lt('locked_balance', 0)
      .limit(10);

    expect(error).toBeNull();
    expect(
      data ?? [],
      `Found ${(data ?? []).length} wallets with negative locked_balance`
    ).toHaveLength(0);
  });

  // ── 3. locked_balance ≤ balance ──
  it('MF-WAL-03: locked_balance must never exceed balance', async () => {
    const { data, error } = await sb
      .from('wallets')
      .select('user_id, balance, locked_balance')
      .gt('locked_balance', 0)
      .limit(500);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(w => w.locked_balance > w.balance);
    expect(
      violations.map(w => `User ${w.user_id.slice(0, 8)}: locked=${w.locked_balance} > balance=${w.balance}`),
      `Found ${violations.length} wallets where locked > balance`
    ).toHaveLength(0);
  });

  // ── 4. Every locked balance has corresponding open orders or pending offers ──
  it('MF-WAL-04: non-zero locked_balance must have open orders or pending offers', { timeout: 30_000 }, async () => {
    const { data: lockedWallets, error } = await sb
      .from('wallets')
      .select('user_id, locked_balance')
      .gt('locked_balance', 0)
      .limit(200);

    expect(error).toBeNull();
    if (!lockedWallets || lockedWallets.length === 0) return;

    const violations: string[] = [];

    for (const w of lockedWallets) {
      // Check for open/partial buy orders (lock balance)
      const { count: buyOrderCount } = await sb
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', w.user_id)
        .eq('side', 'buy')
        .in('status', ['open', 'partial']);

      // Check for open/partial sell orders (lock SC, but some RPCs also lock balance)
      const { count: sellOrderCount } = await sb
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', w.user_id)
        .eq('side', 'sell')
        .in('status', ['open', 'partial']);

      // Check for pending offers
      const { count: offerCount } = await sb
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', w.user_id)
        .eq('status', 'pending');

      // Slice 011: user-bounties also lock balance via `create_user_bounty`
      // (is_user_bounty=true Escrow pattern — bounties.ts:246).
      const { count: bountyCount } = await sb
        .from('bounties')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', w.user_id)
        .eq('is_user_bounty', true)
        .eq('status', 'open');

      const totalActive = (buyOrderCount ?? 0) + (sellOrderCount ?? 0) + (offerCount ?? 0) + (bountyCount ?? 0);
      if (totalActive === 0) {
        violations.push(
          `User ${w.user_id.slice(0, 8)}: locked_balance=${w.locked_balance} but 0 active orders/offers/bounties`
        );
      }
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  });
});
