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
      .select('id, name, gameweek, starts_at, club_id, clubs!inner(league_id)')
      .in('status', ['registering', 'running'])
      .not('gameweek', 'is', null);

    expect(evtErr).toBeNull();
    if (!events || events.length === 0) return;

    const { data: allClubs } = await sb.from('clubs').select('id, league_id');
    const clubsByLeague = new Map<string, string[]>();
    (allClubs ?? []).forEach((c) => {
      if (!c.league_id) return;
      const arr = clubsByLeague.get(c.league_id) ?? [];
      arr.push(c.id);
      clubsByLeague.set(c.league_id, arr);
    });

    const kickoffCache = new Map<string, number>();
    const violations: string[] = [];
    const oneHourMs = 60 * 60 * 1000;

    for (const evt of events) {
      const leagueId = (evt as unknown as { clubs: { league_id: string } }).clubs?.league_id;
      if (!leagueId) continue;
      const clubIds = clubsByLeague.get(leagueId);
      if (!clubIds || clubIds.length === 0) continue;

      const cacheKey = `${leagueId}::${evt.gameweek}`;
      let earliestKickoff = kickoffCache.get(cacheKey);
      if (earliestKickoff === undefined) {
        const { data: fixtures } = await sb
          .from('fixtures')
          .select('played_at')
          .eq('gameweek', evt.gameweek)
          .in('home_club_id', clubIds)
          .not('played_at', 'is', null)
          .order('played_at', { ascending: true })
          .limit(1);
        if (!fixtures || fixtures.length === 0) {
          kickoffCache.set(cacheKey, -1);
          continue;
        }
        earliestKickoff = new Date(fixtures[0].played_at).getTime();
        kickoffCache.set(cacheKey, earliestKickoff);
      }
      if (earliestKickoff < 0) continue;

      const diffMs = Math.abs(new Date(evt.starts_at).getTime() - earliestKickoff);
      if (diffMs > oneHourMs) {
        violations.push(
          `Event "${evt.name}" (id=${evt.id}, gw=${evt.gameweek}, league=${leagueId.slice(0, 8)}): starts_at differs by ${Math.round(diffMs / 60000)}min`
        );
      }
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-03: event locks_at <= earliest fixture kickoff
  // ─────────────────────────────────────────────────────
  it('INV-03: event locks_at should be <= earliest fixture kickoff', async () => {
    const { data: events, error: evtErr } = await sb
      .from('events')
      .select('id, name, gameweek, locks_at, club_id, clubs!inner(league_id)')
      .in('status', ['registering', 'running'])
      .not('gameweek', 'is', null);

    expect(evtErr).toBeNull();
    if (!events || events.length === 0) return;

    const { data: allClubs } = await sb.from('clubs').select('id, league_id');
    const clubsByLeague = new Map<string, string[]>();
    (allClubs ?? []).forEach((c) => {
      if (!c.league_id) return;
      const arr = clubsByLeague.get(c.league_id) ?? [];
      arr.push(c.id);
      clubsByLeague.set(c.league_id, arr);
    });

    const kickoffCache = new Map<string, number>();
    const violations: string[] = [];

    for (const evt of events) {
      const leagueId = (evt as unknown as { clubs: { league_id: string } }).clubs?.league_id;
      if (!leagueId) continue;
      const clubIds = clubsByLeague.get(leagueId);
      if (!clubIds || clubIds.length === 0) continue;

      const cacheKey = `${leagueId}::${evt.gameweek}`;
      let earliestKickoff = kickoffCache.get(cacheKey);
      if (earliestKickoff === undefined) {
        const { data: fixtures } = await sb
          .from('fixtures')
          .select('played_at')
          .eq('gameweek', evt.gameweek)
          .in('home_club_id', clubIds)
          .not('played_at', 'is', null)
          .order('played_at', { ascending: true })
          .limit(1);
        if (!fixtures || fixtures.length === 0) {
          kickoffCache.set(cacheKey, -1);
          continue;
        }
        earliestKickoff = new Date(fixtures[0].played_at).getTime();
        kickoffCache.set(cacheKey, earliestKickoff);
      }
      if (earliestKickoff < 0) continue;

      const locksAt = new Date(evt.locks_at).getTime();
      if (locksAt > earliestKickoff) {
        violations.push(
          `Event "${evt.name}" (id=${evt.id}, gw=${evt.gameweek}, league=${leagueId.slice(0, 8)}): locks_at is ${Math.round((locksAt - earliestKickoff) / 60000)}min AFTER league-scoped earliest fixture`
        );
      }
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  }, 30_000);

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
        .eq('sender_id', wallet.user_id)
        .eq('status', 'pending')
        .limit(1);

      expect(ofErr).toBeNull();

      if (pendingOffers && pendingOffers.length > 0) continue;

      // Slice 011: user-bounties also lock balance via `create_user_bounty`
      // (is_user_bounty=true branch — see bounties.ts:246). Without this
      // check, a user with a legitimate open user-bounty and no orders/offers
      // would be falsely flagged as having orphan locked_balance.
      const { data: openBounties, error: bErr } = await sb
        .from('bounties')
        .select('id')
        .eq('created_by', wallet.user_id)
        .eq('is_user_bounty', true)
        .eq('status', 'open')
        .limit(1);

      expect(bErr).toBeNull();

      if (!openBounties || openBounties.length === 0) {
        violations.push(
          `Wallet user_id=${wallet.user_id} has locked_balance=${wallet.locked_balance} but no open orders, pending offers, or user-bounties`
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
  it('INV-13: trade fee splits must be internally consistent (platform + pbt + club > 0)', async () => {
    // Market trades: 6% fee (Platform 3.5% + PBT 1.5% + Club 1%)
    // IPO trades: Different split (Club 85%, Platform 10%, PBT 5%) — NOT 6% total
    // This test checks: fee components are non-negative and sum to a positive total
    const { data: trades, error } = await sb
      .from('trades')
      .select('id, price, quantity, platform_fee, pbt_fee, club_fee, ipo_id')
      .limit(500);

    expect(error).toBeNull();
    if (!trades || trades.length === 0) return;

    const violations: string[] = [];

    for (const trade of trades) {
      const pf = trade.platform_fee ?? 0;
      const pb = trade.pbt_fee ?? 0;
      const cf = trade.club_fee ?? 0;

      // Each fee component must be non-negative
      if (pf < 0 || pb < 0 || cf < 0) {
        violations.push(`Trade ${trade.id}: negative fee component (pf=${pf}, pb=${pb}, cf=${cf})`);
        continue;
      }

      // For market trades (no ipo_id): total fee should be ~6%
      if (!trade.ipo_id) {
        const tradeValue = trade.price * trade.quantity;
        const totalFee = pf + pb + cf;
        const expectedFee = Math.round(tradeValue * 0.06);
        if (Math.abs(totalFee - expectedFee) > 1) {
          violations.push(`Market trade ${trade.id}: fee=${totalFee} vs expected ~6%=${expectedFee}`);
        }
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

  // ─────────────────────────────────────────────────────
  // INV-16: wallets.balance matches latest transactions.balance_after per user
  // ─────────────────────────────────────────────────────
  // Ledger-Drift-Check (Blocker A-04): Jede transactions-Row schreibt
  // balance_after als Snapshot der wallets.balance NACH der Mutation.
  // Die juengste Transaction eines Users MUSS daher mit wallets.balance
  // uebereinstimmen. Drift = RPC-Bug (Balance-Update ohne Transaction-Insert
  // oder vice versa) oder silent Error-Swallowing in Service-Layer.
  it('INV-16: wallets.balance matches latest transactions.balance_after per user', async () => {
    // 5s Toleranz-Fenster: Mutations die JUST passieren koennten Wallet oder
    // Transaction bereits geschrieben haben aber die andere Seite noch nicht.
    const raceCutoff = new Date(Date.now() - 5000).toISOString();

    const { data: wallets, error: wErr } = await sb
      .from('wallets')
      .select('user_id, balance');

    expect(wErr).toBeNull();
    if (!wallets || wallets.length === 0) return;

    // Fetch transactions paginiert (max 1000 per Supabase-Query) und dedup
    // client-seitig: erster Eintrag pro user_id = juengster (ORDER BY user_id ASC,
    // created_at DESC, id DESC).
    const latestByUser = new Map<string, { balanceAfter: number; txId: string; createdAt: string }>();
    const pageSize = 1000;
    let offset = 0;

    while (true) {
      const { data: rows, error: tErr } = await sb
        .from('transactions')
        .select('id, user_id, balance_after, created_at')
        .lt('created_at', raceCutoff)
        .order('user_id', { ascending: true })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize - 1);

      expect(tErr).toBeNull();
      if (!rows || rows.length === 0) break;

      for (const row of rows) {
        if (!latestByUser.has(row.user_id)) {
          latestByUser.set(row.user_id, {
            balanceAfter: row.balance_after,
            txId: row.id,
            createdAt: row.created_at,
          });
        }
      }

      if (rows.length < pageSize) break;
      offset += pageSize;
    }

    const violations: string[] = [];
    let skippedNoTx = 0;

    for (const wallet of wallets) {
      const latest = latestByUser.get(wallet.user_id);
      if (!latest) {
        skippedNoTx += 1;
        continue;
      }
      if (BigInt(wallet.balance) !== BigInt(latest.balanceAfter)) {
        const diff = BigInt(wallet.balance) - BigInt(latest.balanceAfter);
        violations.push(
          `User ${wallet.user_id.slice(0, 8)}: wallet.balance=${wallet.balance} vs latest tx.balance_after=${latest.balanceAfter} (diff=${diff}, tx=${latest.txId.slice(0, 8)}, at=${latest.createdAt})`
        );
      }
    }

    // Info-Log fuer Kontext (sichtbar wenn Test gruen)
    if (violations.length === 0) {
      console.log(
        `[INV-16] checked ${wallets.length} wallets, ${latestByUser.size} with transactions, ${skippedNoTx} without (skipped), 0 violations`
      );
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  }, 60_000);

  // ─────────────────────────────────────────────────────
  // INV-17: every wallets.user_id must reference an existing profile
  // ─────────────────────────────────────────────────────
  // Orphan-Wallet-Guard (Slice 002): FK wallets_user_id_profiles_fkey wurde
  // 2026-04-16 hinzugefuegt mit ON DELETE CASCADE. Dieser Test verifiziert
  // dass keine Orphans existieren. Vor Slice 002 gab es 2 Orphans aus
  // Pre-J1-03-Zeit (ein abandoned signup geloescht, ein Test-Account via
  // Profile-Backfill erhalten). FK blockiert ab jetzt jeden neuen Orphan
  // auf DB-Ebene, INV-17 ist Regression-Guard falls FK versehentlich
  // entfernt wird oder schema-Drift eintritt.
  it('INV-17: every wallets.user_id must reference an existing profile', async () => {
    const { data: wallets, error: wErr } = await sb
      .from('wallets')
      .select('user_id, balance');

    expect(wErr).toBeNull();
    if (!wallets || wallets.length === 0) return;

    const userIds = wallets.map((w) => w.user_id);
    const profileIdSet = new Set<string>();
    const chunkSize = 500;

    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize);
      const { data: profiles, error: pErr } = await sb
        .from('profiles')
        .select('id')
        .in('id', chunk);
      expect(pErr).toBeNull();
      (profiles ?? []).forEach((p) => profileIdSet.add(p.id));
    }

    const orphans = wallets.filter((w) => !profileIdSet.has(w.user_id));
    const violations = orphans.map(
      (w) => `Orphan wallet: user_id=${w.user_id.slice(0, 8)} balance=${w.balance}`
    );

    if (violations.length === 0) {
      console.log(
        `[INV-17] checked ${wallets.length} wallets, all have matching profile, 0 orphans`
      );
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-18: CHECK constraint values match hardcoded expected sets
  // ─────────────────────────────────────────────────────
  // Freezes current DB enum-CHECK state for critical money/identity columns.
  // A migration that adds/removes a value here will fail this test →
  // reminder to sync TS unions, UI labels, common-errors.md before merging.
  //
  // Nutzt `public.get_check_enum_values(p_constraint_name)` RPC aus
  // `20260416240000_audit_helper_check_enum_values.sql`.
  it('INV-18: CHECK constraint values match expected snapshot', async () => {
    const cases: Array<{
      table: string;
      column: string;
      constraint: string;
      expected: readonly string[];
    }> = [
      {
        table: 'transactions',
        column: 'type',
        constraint: 'transactions_type_check',
        expected: [
          'deposit', 'welcome_bonus', 'admin_adjustment', 'tier_bonus',
          'trade_buy', 'trade_sell', 'ipo_buy', 'order_cancel',
          'offer_lock', 'offer_unlock', 'offer_execute', 'offer_sell',
          'mission_reward', 'streak_reward', 'liga_reward',
          'mystery_box_reward', 'tip_send', 'tip_receive',
          'subscription', 'founding_pass', 'bounty_cost', 'bounty_reward',
          'research_unlock', 'research_earn', 'referral_reward',
          'poll_vote_cost', 'poll_earn', 'withdrawal',
        ],
      },
      {
        table: 'orders',
        column: 'status',
        constraint: 'orders_status_check',
        expected: ['open', 'partial', 'filled', 'cancelled'],
      },
      {
        table: 'orders',
        column: 'side',
        constraint: 'orders_side_check',
        expected: ['buy', 'sell'],
      },
      {
        table: 'offers',
        column: 'status',
        constraint: 'offers_status_check',
        expected: ['pending', 'accepted', 'rejected', 'countered', 'expired', 'cancelled'],
      },
      {
        table: 'offers',
        column: 'side',
        constraint: 'offers_side_check',
        expected: ['buy', 'sell'],
      },
      {
        table: 'events',
        column: 'status',
        constraint: 'events_status_check',
        expected: ['upcoming', 'registering', 'late-reg', 'running', 'scoring', 'ended'],
      },
      {
        table: 'events',
        column: 'type',
        constraint: 'events_type_check',
        expected: ['bescout', 'club', 'sponsor', 'special'],
      },
      {
        table: 'players',
        column: 'position',
        constraint: 'players_position_check',
        expected: ['GK', 'DEF', 'MID', 'ATT'],
      },
      {
        table: 'user_stats',
        column: 'tier',
        constraint: 'user_stats_tier_check',
        expected: ['Rookie', 'Amateur', 'Profi', 'Elite', 'Legende', 'Ikone'],
      },
      {
        table: 'research_posts',
        column: 'call',
        constraint: 'research_posts_call_check',
        expected: ['Bullish', 'Bearish', 'Neutral'],
      },
      {
        table: 'research_posts',
        column: 'category',
        constraint: 'research_posts_category_check',
        expected: ['Spieler-Analyse', 'Transfer-Empfehlung', 'Taktik', 'Saisonvorschau', 'Scouting-Report'],
      },
      {
        table: 'lineups',
        column: 'captain_slot',
        constraint: 'lineups_captain_slot_check',
        expected: [
          'gk', 'def1', 'def2', 'def3', 'def4',
          'mid1', 'mid2', 'mid3', 'mid4',
          'att', 'att2', 'att3',
        ],
      },
      {
        table: 'club_subscriptions',
        column: 'tier',
        constraint: 'club_subscriptions_tier_check',
        expected: ['bronze', 'silber', 'gold'],
      },
      {
        table: 'user_founding_passes',
        column: 'tier',
        constraint: 'user_founding_passes_tier_check',
        expected: ['fan', 'scout', 'pro', 'founder'],
      },
    ];

    const drifts: string[] = [];

    for (const c of cases) {
      const { data, error } = await sb.rpc('get_check_enum_values', {
        p_constraint_name: c.constraint,
      });

      expect(error, `RPC failed for ${c.constraint}: ${error?.message}`).toBeNull();
      expect(data, `Constraint ${c.constraint} not found`).not.toBeNull();

      const dbSet = new Set<string>((data as string[]) ?? []);
      const expectedSet = new Set<string>(c.expected);

      const onlyInDb = Array.from(dbSet).filter((v) => !expectedSet.has(v)).sort();
      const onlyInExpected = Array.from(expectedSet).filter((v) => !dbSet.has(v)).sort();

      if (onlyInDb.length > 0 || onlyInExpected.length > 0) {
        drifts.push(
          `${c.table}.${c.column}: ` +
            (onlyInDb.length > 0 ? `DB-only=[${onlyInDb.join(', ')}] ` : '') +
            (onlyInExpected.length > 0 ? `expected-only=[${onlyInExpected.join(', ')}]` : '')
        );
      }
    }

    if (drifts.length === 0) {
      console.log(
        `[INV-18] checked ${cases.length} CHECK constraints, 0 drifts`
      );
    }

    expect(drifts, drifts.join('\n')).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-19: every RLS-enabled table has ≥1 policy (except whitelist)
  // ─────────────────────────────────────────────────────
  // Schuetzt vor dem Silent-Fail aus `.claude/rules/common-errors.md` (Session 255,
  // holding_locks): RLS=true + 0 policies → Client kann weder lesen noch schreiben,
  // kein Error-Log, unsichtbar kaputt. Whitelist = Tabellen die nur via service_role
  // oder SECURITY DEFINER RPCs angesprochen werden (Client-Access gewollt blockiert).
  it('INV-19: every RLS-enabled table has at least one policy (except whitelist)', async () => {
    // Whitelist: Tabellen ohne Client-Access (server-role/RPC only)
    const ZERO_POLICY_WHITELIST = new Set<string>([
      '_rpc_body_snapshots',     // interne Debug-Tabelle
      'club_external_ids',       // API-Football-Sync, server-role only
      'player_external_ids',     // API-Football-Sync, server-role only
      'mystery_box_config',      // server-only, Client ruft RPC
    ]);

    const { data, error } = await sb.rpc('get_rls_policy_coverage');
    expect(error, `RPC failed: ${error?.message}`).toBeNull();

    const rows = (data ?? []) as Array<{ table_name: string; cmds: string; policy_count: number }>;
    const violations = rows
      .filter((r) => r.policy_count === 0 && !ZERO_POLICY_WHITELIST.has(r.table_name))
      .map((r) => `RLS enabled on "${r.table_name}" but 0 policies (silent-fail risk)`);

    if (violations.length === 0) {
      const zeroPolicyCount = rows.filter((r) => r.policy_count === 0).length;
      console.log(
        `[INV-19] checked ${rows.length} RLS-tables, ${zeroPolicyCount} zero-policy (all whitelisted), 0 violations`
      );
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-20: critical money/trading tables have expected CRUD coverage
  // ─────────────────────────────────────────────────────
  // Freezes current policy-coverage for money/trading-critical tables. Accidental
  // drift (z.B. wallets verliert SELECT-Policy) triggered sofort.
  it('INV-20: critical money/trading tables have expected policy coverage', async () => {
    // Expected coverage: exakter Match (nicht Superset).
    // Werte sortiert alphabetisch, wie von get_rls_policy_coverage() string_agg zurueck gegeben.
    const EXPECTED: Record<string, string> = {
      wallets: 'INSERT,SELECT',
      transactions: 'SELECT',
      orders: 'SELECT',
      trades: 'SELECT',
      holdings: 'SELECT',
      offers: 'INSERT,SELECT,UPDATE',
      ipos: 'SELECT',
      pbt_transactions: 'SELECT',
      pbt_treasury: 'SELECT',
      ipo_purchases: 'SELECT',
      liquidation_payouts: 'SELECT',
      liquidation_events: 'SELECT',
      welcome_bonus_claims: 'SELECT',
      ticket_transactions: 'SELECT',
    };

    const { data, error } = await sb.rpc('get_rls_policy_coverage');
    expect(error, `RPC failed: ${error?.message}`).toBeNull();

    const rows = (data ?? []) as Array<{ table_name: string; cmds: string; policy_count: number }>;
    const byName = new Map(rows.map((r) => [r.table_name, r.cmds]));

    const drifts: string[] = [];
    for (const [table, expectedCmds] of Object.entries(EXPECTED)) {
      const actual = byName.get(table);
      if (actual === undefined) {
        drifts.push(`${table}: RLS not enabled or table missing (expected cmds=${expectedCmds})`);
        continue;
      }
      if (actual !== expectedCmds) {
        drifts.push(`${table}: cmds=[${actual}] expected=[${expectedCmds}]`);
      }
    }

    if (drifts.length === 0) {
      console.log(
        `[INV-20] checked ${Object.keys(EXPECTED).length} critical tables, 0 drifts`
      );
    }

    expect(drifts, drifts.join('\n')).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-21: no SECURITY DEFINER RPC with p_user_id + authenticated-grant lacks auth.uid()
  // ─────────────────────────────────────────────────────
  // Blocker A-02 Exploit-Klasse: SECURITY DEFINER + authenticated-grant + p_user_id
  // uuid parameter OHNE auth.uid()-check im body = authenticated user kann fremde
  // User-IDs uebergeben. Slice 005 hat 4 solche RPCs gehaertet. INV-21 ist der
  // Regression-Guard gegen future-drift.
  //
  // Whitelist: RPCs die explicit ohne auth.uid() auskommen duerfen (z.B. read-only
  // reading fremder Profiles mit optional p_user_id).
  it('INV-21: no SECURITY DEFINER with p_user_id+authenticated-grant lacks auth.uid()', async () => {
    // Whitelist: RPCs die keinen auth.uid()-Guard brauchen (z.B. optional p_user_id fuer public lookups)
    const WHITELIST = new Set<string>([
      'get_club_by_slug',   // p_user_id DEFAULT NULL, public club lookup
      'is_club_admin',      // read-only permission check, p_user_id kann any
    ]);

    const { data, error } = await sb.rpc('get_auth_guard_audit');
    expect(error, `RPC failed: ${error?.message}`).toBeNull();

    const rows = (data ?? []) as Array<{
      proname: string;
      has_authenticated_grant: boolean;
      has_auth_uid_in_body: boolean;
      has_p_user_id_param: boolean;
    }>;

    const violations = rows
      .filter(
        (r) =>
          r.has_p_user_id_param &&
          r.has_authenticated_grant &&
          !r.has_auth_uid_in_body &&
          !WHITELIST.has(r.proname)
      )
      .map(
        (r) =>
          `RPC "${r.proname}" has p_user_id+authenticated-grant but no auth.uid() check (A-02 exploit class)`
      );

    if (violations.length === 0) {
      const totalDef = rows.length;
      const atRisk = rows.filter(
        (r) => r.has_p_user_id_param && r.has_authenticated_grant
      ).length;
      console.log(
        `[INV-21] checked ${totalDef} SECURITY DEFINER RPCs, ${atRisk} with p_user_id+auth-grant (all guarded or whitelisted), 0 violations`
      );
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-22: ALL_CREDIT_TX_TYPES (TS) ⊇ DB transactions.type CHECK values
  // ─────────────────────────────────────────────────────
  // Garantiert dass jede transactions.type DB-Wert in TS `ALL_CREDIT_TX_TYPES`
  // Union ist, sonst weiss TS/UI nix vom Typ (raw-string-fallback).
  // Slice 006 (2026-04-17) hat TS nachgezogen. Drift = Test-Fail → Reminder.
  it('INV-22: ALL_CREDIT_TX_TYPES contains every DB transactions.type CHECK value', async () => {
    const { data: dbValues, error } = await sb.rpc('get_check_enum_values', {
      p_constraint_name: 'transactions_type_check',
    });
    expect(error, `RPC failed: ${error?.message}`).toBeNull();
    expect(dbValues).not.toBeNull();

    const { ALL_CREDIT_TX_TYPES } = await import('@/lib/transactionTypes');
    const tsSet = new Set<string>(ALL_CREDIT_TX_TYPES);

    const missing = ((dbValues as string[]) ?? []).filter((v) => !tsSet.has(v)).sort();
    const violations = missing.map(
      (v) => `DB transactions.type has "${v}" but ALL_CREDIT_TX_TYPES doesn't — UI/services may show raw string`
    );

    if (violations.length === 0) {
      console.log(
        `[INV-22] DB has ${(dbValues as string[]).length} transaction types, all present in TS ALL_CREDIT_TX_TYPES`
      );
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-23: Service-Cast keys ⊆ RPC top-level jsonb_build_object keys
  // ─────────────────────────────────────────────────────
  // Blocker A-07 drift class: `jsonb_build_object('rewardType', …)` (camelCase
  // in RPC) vs `data as { reward_type: … }` (snake_case in Service) → every
  // field silently `undefined`. TypeScript-Cast (`as`) is unchecked, so compile
  // passes. Audited in Slice 007 (2026-04-17).
  //
  // Per-RPC whitelist = the exact key set the Service reads from the RPC
  // response. Each entry asserts `expected ⊆ extracted_keys`, which catches
  // camelCase/snake_case renames, typos, and removed keys without failing on
  // additional keys the RPC may emit (harmless supersets).
  //
  // Wrappers (lock_event_entry → rpc_lock_event_entry, save_lineup →
  // rpc_save_lineup, cancel_event_entries → rpc_cancel_event_entries,
  // unlock_event_entry → rpc_unlock_event_entry): whitelisted against the
  // INNER RPC because that is where the Service-consumed keys are actually
  // emitted (the wrapper body just forwards the inner result).
  //
  // Exclusions: RPCs that only return string-literal-cast JSON
  // (e.g. `'{"success":true}'::JSONB`) like `admin_delete_post` and
  // `update_community_guidelines` cannot be audited by this parser because
  // their keys never appear in a `jsonb_build_object(...)` call. Documented
  // in RPC_SHAPE_EXCLUDED below.
  it('INV-23: Service-consumed RPCs emit the keys their TS casts expect', async () => {
    // Key set per RPC that the Service layer casts to and reads from.
    // If you change a Service-Cast shape, update this map. If you change the
    // RPC return shape, this test will catch the drift.
    const RPC_SHAPE_WHITELIST: Record<string, string[]> = {
      // Trading (money)
      buy_player_sc: ['success', 'error', 'trade_id', 'total_cost', 'new_balance', 'quantity', 'price_per_dpc', 'order_id', 'seller_id', 'source'],
      place_sell_order: ['success', 'error', 'order_id', 'quantity', 'price'],
      buy_from_order: ['success', 'error', 'trade_id', 'total_cost', 'quantity', 'price', 'buyer_new_balance', 'seller_new_balance'],
      cancel_order: ['success', 'error', 'order_id'],
      place_buy_order: ['success', 'error', 'order_id', 'total_locked', 'new_available'],
      cancel_buy_order: ['success', 'error', 'unlocked'],

      // IPO (money)
      buy_from_ipo: ['success', 'error', 'trade_id', 'total_cost', 'new_balance', 'quantity', 'price_per_dpc', 'source', 'user_total_purchased', 'ipo_remaining'],
      create_ipo: ['success', 'error', 'ipo_id', 'status', 'starts_at', 'ends_at'],
      update_ipo_status: ['success', 'error', 'ipo_id', 'new_status'],

      // Offers (money)
      create_offer: ['success', 'error', 'offer_id'],
      accept_offer: ['success', 'error', 'trade_price'],
      reject_offer: ['success', 'error'],
      counter_offer: ['success', 'error', 'offer_id'],
      cancel_offer_rpc: ['success', 'error'],

      // Liquidation (money)
      liquidate_player: ['success', 'holder_count', 'distributed_cents', 'pbt_distributed_cents', 'success_fee_cents', 'fee_per_dpc_cents', 'transfer_value_eur', 'liquidation_id'],
      set_success_fee_cap: ['success', 'error'],

      // Mystery Box (tickets/credits)
      open_mystery_box_v2: ['ok', 'error', 'rarity', 'rewardType', 'ticketsAmount', 'equipmentType', 'equipmentRank', 'equipmentNameDe', 'equipmentNameTr', 'equipmentPosition', 'bcreditsAmount', 'cosmeticKey'],
      get_mystery_box_drop_rates: ['rates', 'total_weight', 'rarity', 'drop_weight', 'drop_percent'],

      // Wallet/Credits
      claim_welcome_bonus: ['ok', 'already_claimed', 'amount_cents', 'new_balance'],
      get_user_tickets: ['balance', 'earned_total', 'spent_total', 'updated_at', 'created_at'],
      credit_tickets: ['ok', 'new_balance'],
      spend_tickets: ['ok', 'new_balance', 'error'],
      send_tip: ['success', 'error', 'tip_id', 'amount_cents', 'platform_fee', 'receiver_earned'],
      grant_founding_pass: ['ok', 'error', 'pass_id', 'bcredits_granted', 'new_balance'],

      // Social
      get_auth_state: ['profile', 'platformRole', 'clubAdmin'],
      refresh_my_stats: ['ok', 'error'],
      refresh_my_airdrop_score: ['ok', 'error'],

      // Mission/Gamification
      claim_mission_reward: ['success', 'error', 'reward_cents', 'new_balance'],
      track_my_mission_progress: ['ok', 'error'],
      record_login_streak: ['ok', 'already_today', 'streak'],
      claim_score_road: ['ok', 'error', 'reward_bsd', 'milestone'],
      submit_daily_challenge: ['ok', 'error', 'is_correct', 'tickets_awarded'],
      // calculate_fan_rank has no error branch — always returns ok=true with components
      calculate_fan_rank: ['ok', 'rank_tier', 'csf_multiplier', 'total_score', 'components'],
      batch_recalculate_fan_ranks: ['ok', 'recalculated', 'errors'],
      get_todays_challenge: ['ok', 'error', 'already_answered', 'challenge'],

      // Events/Fantasy (via wrappers — whitelisted against inner RPC where keys live)
      rpc_lock_event_entry: ['ok', 'error', 'currency', 'balance_after', 'already_entered', 'have', 'need'],
      rpc_unlock_event_entry: ['ok', 'error', 'currency', 'balance_after'],
      rpc_cancel_event_entries: ['ok', 'error', 'refunded_count'],
      rpc_save_lineup: ['ok', 'error', 'lineup_id'],
      score_event: ['success', 'error'],
      reset_event: ['success', 'error', 'message'],
      simulate_gameweek: ['success', 'error', 'fixtures_simulated', 'gameweek', 'player_stats_created'],
      create_prediction: ['ok', 'error', 'id', 'gameweek', 'difficulty'],
      resolve_gameweek_predictions: ['ok', 'error', 'resolved'],
      close_monthly_liga: ['ok', 'error', 'month', 'winners_inserted', 'payouts_credited', 'total_paid_cents'],
      soft_reset_season: ['ok', 'new_season_id', 'users_reset'],

      // Leagues
      create_league: ['success', 'error', 'league_id'],
      join_league: ['success', 'error', 'league_id', 'league_name'],
      leave_league: ['success', 'error'],

      // Research
      unlock_research: ['success', 'error', 'amount_paid', 'author_earned', 'platform_fee'],
      rate_research: ['success', 'error', 'avg_rating', 'ratings_count', 'user_rating'],

      // Valuations/Voting
      submit_player_valuation: ['success', 'error', 'median_cents', 'vote_count'],
      cast_vote: ['success', 'cost', 'total_votes'],
      cast_community_poll_vote: ['success', 'error', 'cost', 'total_votes', 'creator_share'],

      // Posts
      vote_post: ['upvotes', 'downvotes'],
      admin_toggle_pin: ['success', 'is_pinned'],

      // Bounties
      create_user_bounty: ['success', 'error', 'bounty_id'],
      cancel_user_bounty: ['success', 'error'],
      submit_bounty_response: ['success', 'error', 'submission_id'],
      approve_bounty_submission: ['success', 'error', 'reward'],
      reject_bounty_submission: ['success', 'error'],

      // Platform Admin
      adjust_user_wallet: ['success', 'error', 'new_balance'],
      update_fee_config_rpc: ['success', 'error'],
      create_club_by_platform_admin: ['success', 'error', 'club_id', 'slug'],
      get_treasury_stats: ['total_circulating_cents', 'total_locked_cents', 'wallets_with_balance', 'total_platform_fees', 'total_pbt_fees', 'total_club_fees', 'pbt_total_balance', 'pbt_trading_inflow', 'total_pass_bcredits', 'total_passes_sold', 'welcome_bonuses_claimed', 'total_tickets_circulating', 'total_tickets_earned', 'total_tickets_spent', 'total_trades'],

      // Club
      get_club_by_slug: ['id', 'slug', 'name', 'short', 'logo_url', 'league', 'country', 'city', 'stadium', 'plan', 'is_verified', 'admin_role', 'is_admin', 'community_guidelines', 'primary_color', 'secondary_color', 'created_at'],
      add_club_admin: ['success', 'error'],
      remove_club_admin: ['success', 'error'],
      request_club_withdrawal: ['success', 'error'],

      // Scout missions
      submit_scout_mission: ['success', 'error', 'reward_cents'],
      claim_scout_mission_reward: ['success', 'error', 'reward_cents', 'new_balance'],

      // Equipment/Cosmetics
      equip_to_slot: ['ok', 'error'],
      unequip_from_slot: ['ok', 'error', 'slot_key'],
      equip_cosmetic: ['ok', 'error'],

      // Content/Community
      report_content: ['success', 'error'],
      submit_fan_wish: ['success', 'error'],
      update_fan_wish_status: ['success', 'error'],

      // Ad Revenue / Creator
      calculate_ad_revenue_share: ['success', 'error', 'total_revenue_cents', 'pool_cents', 'paid_count', 'total_paid_cents'],
      calculate_creator_fund_payout: ['success', 'error', 'total_impressions', 'pool_cents', 'paid_count', 'rolled_count', 'total_paid_cents'],

      // Subscription
      subscribe_to_club: ['success', 'error', 'subscription_id', 'tier', 'price_cents', 'expires_at', 'new_balance'],

      // Referral
      reward_referral: ['success', 'reason', 'referrer_id', 'referee_reward'],

      // Football Data (admin)
      admin_map_clubs: ['success', 'error', 'updated_count'],
      admin_map_players: ['success', 'error', 'updated_count'],
      admin_map_fixtures: ['success', 'error', 'updated_count'],
      admin_import_gameweek_stats: ['success', 'error', 'fixtures_imported', 'stats_imported', 'scores_synced'],

      // Research auto-resolve
      resolve_expired_research: ['resolved'],

      // Fixtures sync
      sync_fixture_scores: ['success', 'synced_count'],
    };

    // RPCs that return string-literal JSON (e.g. '{"success":true}'::JSONB)
    // rather than jsonb_build_object — cannot be parsed by get_rpc_jsonb_keys
    // but still conform to their Service-Cast shape. Documented for future
    // audit-helper improvements (Slice 007+).
    const RPC_SHAPE_EXCLUDED = new Set<string>([
      'admin_delete_post',           // string-literal returns only
      'update_community_guidelines', // string-literal returns only
    ]);

    const names = Object.keys(RPC_SHAPE_WHITELIST);
    const violations: string[] = [];
    let checked = 0;

    for (const rpcName of names) {
      const { data, error } = await sb.rpc('get_rpc_jsonb_keys', {
        p_rpc_name: rpcName,
      });
      if (error) {
        violations.push(`${rpcName}: audit-helper RPC failed: ${error.message}`);
        continue;
      }

      const rows = (data ?? []) as Array<{
        rpc_name: string;
        uses_jsonb_build: boolean;
        uses_json_build: boolean;
        top_level_keys: string[] | null;
      }>;
      const row = rows[0];
      if (!row) {
        violations.push(`${rpcName}: RPC not found in public schema (was it renamed or deleted?)`);
        continue;
      }

      checked++;
      const extracted = new Set(row.top_level_keys ?? []);
      const expected = RPC_SHAPE_WHITELIST[rpcName]!;
      const missing = expected.filter((k) => !extracted.has(k));
      if (missing.length > 0) {
        violations.push(
          `${rpcName}: Service cast expects [${missing.join(', ')}] but RPC body emits [${Array.from(extracted).sort().join(', ')}]`
        );
      }
    }

    if (violations.length === 0) {
      console.log(
        `[INV-23] ${checked} RPCs checked, 0 shape drifts — all Service-Cast keys present in RPC bodies (${RPC_SHAPE_EXCLUDED.size} RPCs excluded: string-literal returns only)`
      );
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  }, 60_000);

  // ─────────────────────────────────────────────────────
  // INV-26: sensitive tables do not have unexpected qual='true' policies
  // ─────────────────────────────────────────────────────
  // AUTH-08-class regression-guard (Slice 014): qual='true' on a SELECT policy
  // = permissive-for-all-authenticated = portfolio/financial/stat leak.
  // Whitelist documents the *intentionally* public policies — anything else
  // with qual='true' or qual=NULL on SENSITIVE_TABLES fails this test.
  it('INV-26: sensitive tables have no unexpected qual=true policies (AUTH-08 class)', async () => {
    const SENSITIVE_TABLES = [
      'holdings',             // portfolio-privacy (Slice 014 fixed)
      'transactions',         // financial-history-privacy
      'ticket_transactions',  // ticket-history-privacy
      'activity_log',         // social-graph-privacy
      'user_stats',           // performance-privacy (but leaderboard is public-by-design)
      'wallets',              // balance-privacy
      'orders',               // trading-strategy-privacy (orderbook intent TBD CEO)
      'offers',               // trading-strategy-privacy
    ];

    // Policies intentionally with qual='true' or qual=NULL (permissive-by-design).
    // Format: `${table_name}.${policy_name}` with brief justification.
    const EXPECTED_PERMISSIVE: Record<string, string> = {
      'user_stats.Anyone can read stats': 'Leaderboard: all authenticated users need to read stats across the platform.',
      // orders.orders_select was tightened in Slice 021 (2026-04-17) to
      // `auth.uid() = user_id OR admin-check`. Cross-user orderbook reads
      // go via get_public_orderbook RPC (handle+is_own, no user_id).
    };

    const { data, error } = await sb.rpc('get_rls_policy_quals', { p_tables: SENSITIVE_TABLES });
    expect(error, `RPC failed: ${error?.message}`).toBeNull();

    const rows = (data ?? []) as Array<{ table_name: string; policy_name: string; cmd: string; qual: string | null }>;

    const violations: string[] = [];
    for (const r of rows) {
      // NULL qual == no USING clause == permissive for all rows (same-class as qual='true').
      const isPermissive = r.qual === 'true' || r.qual === null;
      if (!isPermissive) continue;

      // INSERT-only policies with NULL qual are fine — INSERT USING applies to
      // row-being-inserted, and WITH CHECK normally restricts the payload.
      // Flag SELECT/UPDATE/DELETE/ALL only.
      if (r.cmd === 'INSERT') continue;

      const key = `${r.table_name}.${r.policy_name}`;
      if (EXPECTED_PERMISSIVE[key]) continue;

      violations.push(
        `${r.table_name}.${r.policy_name} (${r.cmd}) has permissive qual=${r.qual === null ? 'NULL' : "'true'"} — AUTH-08 class risk`
      );
    }

    if (violations.length === 0) {
      const flaggedCount = rows.filter((r) => (r.qual === 'true' || r.qual === null) && r.cmd !== 'INSERT').length;
      console.log(
        `[INV-26] checked ${SENSITIVE_TABLES.length} sensitive tables, ${rows.length} policies, ${flaggedCount} permissive (all whitelisted), 0 unexpected violations`
      );
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-27: rpc_save_lineup enforces formation validation
  // ─────────────────────────────────────────────────────
  // Slice 023 (B4): Client-Formation-Check ist umgehbar via direkten RPC-Call.
  // Nach Slice 023 ist der RPC die einzige Wahrheit. Verifiziert dass Body
  // die B4-Checks enthaelt (scan via get_rpc_source helper — service_role only).
  it('INV-27: rpc_save_lineup enforces formation validation (B4 Slice 023)', async () => {
    const { data, error } = await sb.rpc('get_rpc_source', { p_rpc_name: 'rpc_save_lineup' });
    expect(error, `RPC failed: ${error?.message}`).toBeNull();
    expect(data, 'rpc_save_lineup not found').toBeTruthy();

    const body = String(data);

    // B4 new error-keys
    const requiredKeys = [
      'invalid_formation',
      'gk_required',
      'invalid_slot_count_def',
      'invalid_slot_count_mid',
      'invalid_slot_count_att',
      'extra_slot_for_formation',
      'captain_slot_empty',
      'wildcard_slot_invalid',
      'wildcard_slot_empty',
    ];
    const missingKeys = requiredKeys.filter((k) => !body.includes(`'${k}'`));
    expect(
      missingKeys,
      `Missing B4 error-keys in rpc_save_lineup: ${missingKeys.join(', ')}`,
    ).toHaveLength(0);

    // Formation allowlist — at least 1 representative of each format
    expect(body, "11er formation '1-4-4-2' not in allowlist").toContain("'1-4-4-2'");
    expect(body, "7er formation '1-2-2-2' not in allowlist").toContain("'1-2-2-2'");

    // Pre-existing safety checks preserved
    expect(body, 'existing duplicate_player check removed').toContain("'duplicate_player'");
    expect(body, 'existing insufficient_sc check removed').toContain("'insufficient_sc'");
    expect(body, 'existing event_not_found check removed').toContain("'event_not_found'");
  }, 30_000);
});
