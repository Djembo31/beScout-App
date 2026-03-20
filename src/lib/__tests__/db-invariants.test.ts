// @vitest-environment node

/**
 * DB Invariant Tests — Layer 1
 *
 * These tests run READ-ONLY queries against the live Supabase database
 * to verify data consistency invariants. They never insert, update, or delete.
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

describe('DB Invariants', () => {
  // ─────────────────────────────────────────────────────
  // INV-01: format/lineup_size consistency
  // ─────────────────────────────────────────────────────
  it('INV-01: format=7er events must have lineup_size=7, format=11er must have lineup_size=11', async () => {
    const { data: sevenErViolations, error: err7 } = await sb
      .from('events')
      .select('id, name, format, lineup_size')
      .eq('format', '7er')
      .neq('lineup_size', 7);

    expect(err7).toBeNull();

    const { data: elevenErViolations, error: err11 } = await sb
      .from('events')
      .select('id, name, format, lineup_size')
      .eq('format', '11er')
      .neq('lineup_size', 11);

    expect(err11).toBeNull();

    const violations = [...(sevenErViolations ?? []), ...(elevenErViolations ?? [])];
    expect(violations).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-02: event starts_at within 1h of earliest fixture kickoff
  // ─────────────────────────────────────────────────────
  it('INV-02: event starts_at should be within 1 hour of earliest fixture kickoff for its gameweek', async () => {
    const { data: events, error: evtErr } = await sb
      .from('events')
      .select('id, name, gameweek, starts_at')
      .in('status', ['registering', 'running'])
      .not('gameweek', 'is', null);

    expect(evtErr).toBeNull();
    if (!events || events.length === 0) return;

    const violations: string[] = [];

    for (const evt of events) {
      const { data: fixtures, error: fixErr } = await sb
        .from('fixtures')
        .select('played_at')
        .eq('gameweek', evt.gameweek)
        .not('played_at', 'is', null)
        .order('played_at', { ascending: true })
        .limit(1);

      expect(fixErr).toBeNull();
      if (!fixtures || fixtures.length === 0) continue;

      const earliestKickoff = new Date(fixtures[0].played_at).getTime();
      const startsAt = new Date(evt.starts_at).getTime();
      const diffMs = Math.abs(startsAt - earliestKickoff);
      const oneHourMs = 60 * 60 * 1000;

      if (diffMs > oneHourMs) {
        violations.push(
          `Event "${evt.name}" (id=${evt.id}): starts_at differs from earliest fixture by ${Math.round(diffMs / 60000)}min`
        );
      }
    }

    expect(violations).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-03: event locks_at <= earliest fixture kickoff
  // ─────────────────────────────────────────────────────
  it('INV-03: event locks_at should be <= earliest fixture kickoff', async () => {
    const { data: events, error: evtErr } = await sb
      .from('events')
      .select('id, name, gameweek, locks_at')
      .in('status', ['registering', 'running'])
      .not('gameweek', 'is', null);

    expect(evtErr).toBeNull();
    if (!events || events.length === 0) return;

    const violations: string[] = [];

    for (const evt of events) {
      const { data: fixtures, error: fixErr } = await sb
        .from('fixtures')
        .select('played_at')
        .eq('gameweek', evt.gameweek)
        .not('played_at', 'is', null)
        .order('played_at', { ascending: true })
        .limit(1);

      expect(fixErr).toBeNull();
      if (!fixtures || fixtures.length === 0) continue;

      const earliestKickoff = new Date(fixtures[0].played_at).getTime();
      const locksAt = new Date(evt.locks_at).getTime();

      if (locksAt > earliestKickoff) {
        violations.push(
          `Event "${evt.name}" (id=${evt.id}): locks_at is ${Math.round((locksAt - earliestKickoff) / 60000)}min AFTER earliest fixture`
        );
      }
    }

    expect(violations).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-04: running events should not have locks_at in the future
  // ─────────────────────────────────────────────────────
  it('INV-04: no event with status=running should have locks_at in the future', async () => {
    const now = new Date().toISOString();

    const { data: violations, error } = await sb
      .from('events')
      .select('id, name, locks_at')
      .eq('status', 'running')
      .gt('locks_at', now);

    expect(error).toBeNull();
    expect(violations ?? []).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-05: no wallet balance < 0
  // ─────────────────────────────────────────────────────
  it('INV-05: no wallet balance < 0', async () => {
    const { data: violations, error } = await sb
      .from('wallets')
      .select('user_id, balance')
      .lt('balance', 0);

    expect(error).toBeNull();
    expect(violations ?? []).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-06: locked_balance <= balance for all wallets
  // ─────────────────────────────────────────────────────
  it('INV-06: locked_balance <= balance for all wallets', async () => {
    // Supabase JS doesn't support column-to-column comparison in filters,
    // so we fetch all wallets and check client-side
    const { data: wallets, error } = await sb
      .from('wallets')
      .select('user_id, balance, locked_balance')
      .gt('locked_balance', 0);

    expect(error).toBeNull();
    if (!wallets || wallets.length === 0) return;

    const violations = wallets.filter(
      (w) => BigInt(w.locked_balance) > BigInt(w.balance)
    );

    expect(violations).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-07: locked_balance > 0 implies open order or pending offer
  // ─────────────────────────────────────────────────────
  it('INV-07: every wallet with locked_balance > 0 should have at least 1 open order or pending offer', async () => {
    const { data: lockedWallets, error: wErr } = await sb
      .from('wallets')
      .select('user_id, locked_balance')
      .gt('locked_balance', 0);

    expect(wErr).toBeNull();
    if (!lockedWallets || lockedWallets.length === 0) return;

    const violations: string[] = [];

    for (const wallet of lockedWallets) {
      const { data: openOrders, error: oErr } = await sb
        .from('orders')
        .select('id')
        .eq('user_id', wallet.user_id)
        .in('status', ['open', 'partial'])
        .limit(1);

      expect(oErr).toBeNull();

      if (openOrders && openOrders.length > 0) continue;

      const { data: pendingOffers, error: ofErr } = await sb
        .from('offers')
        .select('id')
        .eq('buyer_id', wallet.user_id)
        .eq('status', 'pending')
        .limit(1);

      expect(ofErr).toBeNull();

      if (!pendingOffers || pendingOffers.length === 0) {
        violations.push(
          `Wallet user_id=${wallet.user_id} has locked_balance=${wallet.locked_balance} but no open orders or pending offers`
        );
      }
    }

    expect(violations).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-08: no holding with quantity <= 0
  // ─────────────────────────────────────────────────────
  it('INV-08: no holding with quantity <= 0', async () => {
    const { data: violations, error } = await sb
      .from('holdings')
      .select('user_id, player_id, quantity')
      .lte('quantity', 0);

    expect(error).toBeNull();
    expect(violations ?? []).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-09: IPO sold <= total_offered
  // ─────────────────────────────────────────────────────
  it('INV-09: IPO sold <= total_offered', async () => {
    const { data: ipos, error } = await sb
      .from('ipos')
      .select('id, player_id, sold, total_offered');

    expect(error).toBeNull();
    if (!ipos || ipos.length === 0) return;

    const violations = ipos.filter((ipo) => ipo.sold > ipo.total_offered);

    expect(violations).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-10: floor_price <= 3x ipo_price
  // ─────────────────────────────────────────────────────
  it('INV-10: floor_price <= 3x ipo_price for all players with ipo_price > 0', async () => {
    const { data: players, error } = await sb
      .from('players')
      .select('id, first_name, last_name, floor_price, ipo_price')
      .gt('ipo_price', 0)
      .not('floor_price', 'is', null);

    expect(error).toBeNull();
    if (!players || players.length === 0) return;

    const violations = players.filter(
      (p) => (p.floor_price ?? 0) > 3 * p.ipo_price
    );

    expect(violations).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-11: no open/partial orders for liquidated players
  // ─────────────────────────────────────────────────────
  it('INV-11: no open/partial orders for liquidated players', async () => {
    const { data: liquidatedPlayers, error: pErr } = await sb
      .from('players')
      .select('id')
      .eq('is_liquidated', true);

    expect(pErr).toBeNull();
    if (!liquidatedPlayers || liquidatedPlayers.length === 0) return;

    const liquidatedIds = liquidatedPlayers.map((p) => p.id);

    const { data: violations, error: oErr } = await sb
      .from('orders')
      .select('id, player_id, user_id, side, status')
      .in('player_id', liquidatedIds)
      .in('status', ['open', 'partial']);

    expect(oErr).toBeNull();
    expect(violations ?? []).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-12: no duplicate player in same lineup slots
  // ─────────────────────────────────────────────────────
  it('INV-12: no duplicate player in same lineup slots', async () => {
    const slotColumns = [
      'slot_gk',
      'slot_def1', 'slot_def2', 'slot_def3', 'slot_def4',
      'slot_mid1', 'slot_mid2', 'slot_mid3', 'slot_mid4',
      'slot_att', 'slot_att2', 'slot_att3',
    ] as const;

    const { data: lineups, error } = await sb
      .from('lineups')
      .select('id, event_id, user_id, slot_gk, slot_def1, slot_def2, slot_def3, slot_def4, slot_mid1, slot_mid2, slot_mid3, slot_mid4, slot_att, slot_att2, slot_att3');

    expect(error).toBeNull();
    if (!lineups || lineups.length === 0) return;

    const violations: string[] = [];

    for (const lineup of lineups) {
      const rec = lineup as unknown as Record<string, unknown>;
      const playerIds: string[] = [];
      for (const col of slotColumns) {
        const val = rec[col];
        if (val && typeof val === 'string') {
          playerIds.push(val);
        }
      }

      const uniqueIds = new Set(playerIds);
      if (uniqueIds.size !== playerIds.length) {
        const duplicates = playerIds.filter(
          (id, idx) => playerIds.indexOf(id) !== idx
        );
        violations.push(
          `Lineup id=${rec['id']} (event=${rec['event_id']}, user=${rec['user_id']}) has duplicate player(s): ${Array.from(new Set(duplicates)).join(', ')}`
        );
      }
    }

    expect(violations).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-13: trade fee splits sum to ~6% of trade value (1 cent tolerance)
  // ─────────────────────────────────────────────────────
  it('INV-13: trade fee splits sum to ~6% of trade value (1 cent tolerance)', async () => {
    const { data: trades, error } = await sb
      .from('trades')
      .select('id, price, quantity, fee_platform, fee_pbt, fee_club');

    expect(error).toBeNull();
    if (!trades || trades.length === 0) return;

    const violations: string[] = [];

    for (const trade of trades) {
      const tradeValue = trade.price * trade.quantity;
      const expectedFee = Math.round(tradeValue * 0.06);
      const actualFee = (trade.fee_platform ?? 0) + (trade.fee_pbt ?? 0) + (trade.fee_club ?? 0);
      const diff = Math.abs(actualFee - expectedFee);

      if (diff > 1) {
        violations.push(
          `Trade id=${trade.id}: value=${tradeValue}, expected ~6% fee=${expectedFee}, actual fee=${actualFee} (diff=${diff})`
        );
      }
    }

    expect(violations).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-14: all active IPOs have price > 0
  // ─────────────────────────────────────────────────────
  it('INV-14: all active IPOs (open/early_access/announced) have price > 0', async () => {
    const { data: violations, error } = await sb
      .from('ipos')
      .select('id, player_id, status, price')
      .in('status', ['open', 'early_access', 'announced'])
      .lte('price', 0);

    expect(error).toBeNull();
    expect(violations ?? []).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────
  // INV-15: no negative locked_balance
  // ─────────────────────────────────────────────────────
  it('INV-15: no negative locked_balance', async () => {
    const { data: violations, error } = await sb
      .from('wallets')
      .select('user_id, locked_balance')
      .lt('locked_balance', 0);

    expect(error).toBeNull();
    expect(violations ?? []).toHaveLength(0);
  });
});
