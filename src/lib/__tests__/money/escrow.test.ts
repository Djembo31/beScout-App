// @vitest-environment node

/**
 * Escrow — Money Flow Tests (Layer 3)
 *
 * Verifies the offer escrow system:
 *   - Pending buy offers lock buyer's balance
 *   - Accepted offers result in trades
 *   - Rejected/expired/cancelled offers release escrow
 *
 * Tests are READ-ONLY queries against live Supabase data.
 *
 * Run: npx vitest run src/lib/__tests__/money/escrow.test.ts
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

const VALID_OFFER_STATUSES = ['pending', 'accepted', 'rejected', 'expired', 'cancelled', 'countered'];

describe('Escrow — Money Flow', () => {
  // ── 1. All offer statuses are valid ──
  it('MF-ESC-01: all offers have valid status values', async () => {
    const { data, error } = await sb
      .from('offers')
      .select('id, status')
      .limit(500);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(
      o => !VALID_OFFER_STATUSES.includes(o.status)
    );
    expect(
      violations,
      `Found ${violations.length} offers with invalid status`
    ).toHaveLength(0);
  });

  // ── 2. Pending buy offers: sender should have locked balance ──
  it('MF-ESC-02: users with pending buy offers should have locked_balance > 0', async () => {
    const { data: pendingOffers, error } = await sb
      .from('offers')
      .select('id, sender_id, side, price, quantity')
      .eq('status', 'pending')
      .eq('side', 'buy');

    expect(error).toBeNull();
    if (!pendingOffers || pendingOffers.length === 0) return;

    const senderIds = Array.from(new Set(pendingOffers.map(o => o.sender_id)));
    const { data: wallets } = await sb
      .from('wallets')
      .select('user_id, locked_balance')
      .in('user_id', senderIds);

    const walletMap = new Map((wallets ?? []).map(w => [w.user_id, w.locked_balance]));

    const violations: string[] = [];
    for (const senderId of senderIds) {
      const locked = walletMap.get(senderId) ?? 0;
      if (locked <= 0) {
        violations.push(
          `User ${senderId.slice(0, 8)} has pending buy offer but locked_balance=${locked}`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 3. Accepted offers should have corresponding trade ──
  it('MF-ESC-03: accepted offers should result in trades for the same player', async () => {
    const { data: accepted, error } = await sb
      .from('offers')
      .select('id, sender_id, receiver_id, player_id, price, quantity, updated_at')
      .eq('status', 'accepted');

    expect(error).toBeNull();
    if (!accepted || accepted.length === 0) return;

    const violations: string[] = [];
    for (const offer of accepted) {
      // Look for any trade involving the same player and either party
      const { data: trades } = await sb
        .from('trades')
        .select('id, buyer_id, seller_id')
        .eq('player_id', offer.player_id)
        .limit(50);

      // Check if any trade involves at least one of the offer parties
      const hasMatchingTrade = (trades ?? []).some(
        t =>
          t.buyer_id === offer.sender_id ||
          t.buyer_id === offer.receiver_id ||
          t.seller_id === offer.sender_id ||
          t.seller_id === offer.receiver_id
      );

      if (!hasMatchingTrade) {
        violations.push(
          `Offer ${offer.id.slice(0, 8)} accepted but no trade found involving parties for player ${offer.player_id.slice(0, 8)}`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 4. Expired offers: no orphan locked balance ──
  it('MF-ESC-04: expired/rejected offers should not leave orphan locked balance', async () => {
    // Users who ONLY have expired/rejected/cancelled offers (no pending/accepted)
    // should not have locked_balance from those offers
    const { data: closedOffers, error } = await sb
      .from('offers')
      .select('sender_id, status, side')
      .in('status', ['expired', 'rejected', 'cancelled'])
      .eq('side', 'buy');

    expect(error).toBeNull();
    if (!closedOffers || closedOffers.length === 0) return;

    const closedSenders = Array.from(new Set(closedOffers.map(o => o.sender_id)));

    // Filter: only check users who have NO pending offers
    const { data: pendingOffers } = await sb
      .from('offers')
      .select('sender_id')
      .eq('status', 'pending')
      .in('sender_id', closedSenders);

    const hasPending = new Set((pendingOffers ?? []).map(o => o.sender_id));
    const onlyClosed = closedSenders.filter(id => !hasPending.has(id));

    if (onlyClosed.length === 0) return;

    // Also check if they have open orders (which also lock balance)
    const { data: openOrders } = await sb
      .from('orders')
      .select('user_id')
      .in('status', ['open', 'partial'])
      .eq('side', 'buy')
      .in('user_id', onlyClosed);

    const hasOpenOrders = new Set((openOrders ?? []).map(o => o.user_id));

    // Slice 011: user-bounties also lock balance via `create_user_bounty`
    // Escrow pattern — bounties.ts:246 (is_user_bounty=true branch).
    const { data: openBounties } = await sb
      .from('bounties')
      .select('created_by')
      .eq('is_user_bounty', true)
      .eq('status', 'open')
      .in('created_by', onlyClosed);

    const hasOpenBounties = new Set((openBounties ?? []).map(b => b.created_by));
    const noActiveLocks = onlyClosed.filter(
      (id) => !hasOpenOrders.has(id) && !hasOpenBounties.has(id)
    );

    if (noActiveLocks.length === 0) return;

    // These users should have locked_balance = 0
    const { data: wallets } = await sb
      .from('wallets')
      .select('user_id, locked_balance')
      .in('user_id', noActiveLocks)
      .gt('locked_balance', 0);

    expect(
      wallets ?? [],
      `Found ${(wallets ?? []).length} users with locked_balance after all offers closed and no open orders/bounties`
    ).toHaveLength(0);
  });
});
