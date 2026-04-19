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
          // Slice 037 additions (6)
          'vote_fee', 'ad_revenue_payout', 'creator_fund_payout',
          'event_entry_unlock', 'scout_subscription', 'scout_subscription_earning',
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
      get_club_by_slug: ['id', 'slug', 'name', 'short', 'logo_url', 'league', 'country', 'city', 'stadium', 'stadium_image_url', 'plan', 'is_verified', 'admin_role', 'is_admin', 'community_guidelines', 'primary_color', 'secondary_color', 'created_at'],
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

      // Slice 049 — coverage expansion (A-07 audit)
      get_club_balance: ['total_earned', 'trade_fees', 'sub_revenue', 'total_withdrawn', 'available'],
      // Slice 067 — Club-Assets Admin-Override
      update_club_assets: ['success', 'error'],
      rpc_get_player_percentiles: ['floor_price_pct', 'holder_count_pct', 'l15_score_pct', 'l5_score_pct', 'pos_assists_pct', 'pos_clean_sheets_pct', 'pos_goals_pct', 'pos_l5_pct', 'pos_l5_rank', 'pos_l5_total', 'pos_matches_pct', 'pos_minutes_pct', 'pos_saves_pct', 'total_trades_pct'],
    };

    // RPCs that return string-literal JSON (e.g. '{"success":true}'::JSONB)
    // rather than jsonb_build_object — cannot be parsed by get_rpc_jsonb_keys
    // but still conform to their Service-Cast shape. Documented for future
    // audit-helper improvements (Slice 007+).
    const RPC_SHAPE_EXCLUDED = new Set<string>([
      'admin_delete_post',           // string-literal returns only
      'update_community_guidelines', // string-literal returns only
      // Slice 049: uses SELECT ... FROM ... not jsonb_build_object → audit-helper can't parse
      'rpc_get_user_social_stats',   // SELECT ... aggregates, no literal build
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
  // INV-29: holdings auto-delete-zero trigger exists + no zombies
  // ─────────────────────────────────────────────────────
  // Slice 025 (B5-Follow-Up): Zombie-Prevention via AFTER UPDATE OF quantity
  // Trigger. Verifies (1) trigger is registered + function body contains DELETE,
  // (2) no holdings with quantity <= 0 exist live (defense-in-depth for whatever
  // path might bypass the trigger).
  it('INV-29: holdings_auto_delete_zero trigger registered + no zombie rows (B5 Slice 025)', async () => {
    // 1. Trigger-Function body contains DELETE
    const { data: bodyData, error: bodyErr } = await sb.rpc('get_rpc_source', {
      p_rpc_name: 'delete_zero_qty_holding',
    });
    expect(bodyErr, `RPC failed: ${bodyErr?.message}`).toBeNull();
    expect(bodyData, 'delete_zero_qty_holding function missing').toBeTruthy();
    const body = String(bodyData);
    expect(body, 'trigger function missing DELETE FROM holdings').toContain('DELETE FROM public.holdings');

    // 2. Live zombie-check: no holdings with quantity <= 0
    const { count: zeroCount, error: zeroErr } = await sb
      .from('holdings')
      .select('id', { count: 'exact', head: true })
      .lte('quantity', 0);
    expect(zeroErr, `holdings query failed: ${zeroErr?.message}`).toBeNull();
    expect(zeroCount, `found ${zeroCount} zombie holdings (quantity <= 0) — trigger may have failed`).toBe(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-28: cron_score_pending_events scheduled + body sane
  // ─────────────────────────────────────────────────────
  // Slice 024 (B5): Event-Scoring Automation via pg_cron.
  // Verifies (1) wrapper-RPC body contains expected filters + fail-isolation
  //          (2) cron-job "score-pending-events" is scheduled and active.
  it('INV-28: cron_score_pending_events scheduled with correct filters (B5 Slice 024)', async () => {
    // 1. Wrapper-RPC body scan
    const { data: bodyData, error: bodyErr } = await sb.rpc('get_rpc_source', {
      p_rpc_name: 'cron_score_pending_events',
    });
    expect(bodyErr, `RPC failed: ${bodyErr?.message}`).toBeNull();
    expect(bodyData, 'cron_score_pending_events RPC not found').toBeTruthy();

    const body = String(bodyData);

    const requiredFragments = [
      'scored_at IS NULL',         // idempotency filter
      'gameweek IS NOT NULL',      // score_event prerequisite
      'score_event',               // delegates to existing RPC
      'WHEN OTHERS',               // fail-isolation
      'LIMIT 50',                  // safety bound
      "status = 'ended'",          // post-transition scoring
      "status = 'running'",        // race with event-status-sync
      'ends_at',                   // time filter
    ];
    const missing = requiredFragments.filter((f) => !body.includes(f));
    expect(
      missing,
      `Missing expected fragments in cron_score_pending_events: ${missing.join(', ')}`,
    ).toHaveLength(0);

    // 2. Cron-Job exists + schedule
    const { data: jobData, error: jobErr } = await sb.rpc('get_cron_job_schedule', {
      p_jobname: 'score-pending-events',
    });
    expect(jobErr, `get_cron_job_schedule failed: ${jobErr?.message}`).toBeNull();
    expect(jobData, 'cron job score-pending-events not scheduled').toBeTruthy();

    const job = jobData as {
      jobname: string;
      schedule: string;
      command: string;
      active: boolean;
    };
    expect(job.jobname).toBe('score-pending-events');
    expect(job.schedule).toBe('*/5 * * * *');
    expect(job.active).toBe(true);
    expect(job.command).toContain('cron_score_pending_events');
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

  // ─────────────────────────────────────────────────────
  // INV-30: transactions.type drift in RPC bodies vs CHECK constraint
  // ─────────────────────────────────────────────────────
  // Slice 034 entdeckte buy_player_sc schrieb 'buy'/'sell' obwohl CHECK
  // 'trade_buy'/'trade_sell' erwartet → live HTTP 400 Crash, Buy ist tot.
  //
  // Dieser Invariant scannt alle RPC-Bodies via get_rpc_transaction_inserts(),
  // extrahiert die type-Position der VALUES-Tuple aus der Spaltenliste, gleicht
  // gegen den CHECK-Constraint ab und meldet jeden Drift.
  //
  // ALLOWLIST_KNOWN_DRIFTS: dokumentiert Slice-037-Followups, damit der Test
  // jetzt nicht rot ist aber nicht vergisst dass diese RPCs noch fixen muessen.
  // Wenn alle Slice-037-Drifts gefixt sind, ist die Allowlist leer.
  it('INV-30: RPC bodies use only valid transactions.type values (Slice 037: Allowlist EMPTY)', async () => {
    const { data: checkValues, error: checkErr } = await sb.rpc('get_check_enum_values', {
      p_constraint_name: 'transactions_type_check',
    });
    expect(checkErr, `get_check_enum_values failed: ${checkErr?.message}`).toBeNull();
    const validTypes = new Set<string>((checkValues as string[]) ?? []);

    const { data: snippets, error: snipErr } = await sb.rpc('get_rpc_transaction_inserts');
    expect(snipErr, `get_rpc_transaction_inserts failed: ${snipErr?.message}`).toBeNull();
    expect(snippets, 'no snippets returned').toBeTruthy();

    // Slice 037: Allowlist leer — alle 9 known drifts gefixt:
    //   - 2× RPC-Rename (poll_earning→poll_earn, research_earning→research_earn)
    //   - 6× CHECK extended (vote_fee, ad_revenue_payout, creator_fund_payout,
    //     event_entry_unlock, scout_subscription, scout_subscription_earning)
    const ALLOWLIST_KNOWN_DRIFTS = new Set<string>([]);

    type Snip = { rpc_name: string; snippet: string };
    const drifts: string[] = [];

    // Helper: find first ';' OUTSIDE single-quoted strings — stop snippet there
    function trimAtFirstStmtEnd(s: string): string {
      let inStr = false;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === "'" && s[i - 1] !== '\\') inStr = !inStr;
        if (ch === ';' && !inStr) return s.slice(0, i + 1);
      }
      return s;
    }

    for (const rawRow of (snippets as Snip[]) ?? []) {
      const row = { rpc_name: rawRow.rpc_name, snippet: trimAtFirstStmtEnd(rawRow.snippet) };
      // Extract column list to find type-position. Column list looks like:
      //   INSERT INTO transactions (user_id, type, amount, ...)
      const colMatch = row.snippet.match(/transactions\s*\(([^)]+)\)/i);
      if (!colMatch) continue;
      const cols = colMatch[1].split(',').map((c) => c.trim().toLowerCase());
      const typeIdx = cols.indexOf('type');
      if (typeIdx < 0) continue;

      // Extract VALUES tuples — match (...) groups after VALUES.
      // Tuples may contain quoted strings, function calls, expressions.
      // Simple split on top-level commas via tracking parens.
      const valuesPart = row.snippet.slice(row.snippet.toUpperCase().indexOf('VALUES'));
      // Find each top-level (...) block
      const tuples: string[] = [];
      let depth = 0;
      let buf = '';
      let inStr = false;
      for (let i = 0; i < valuesPart.length; i++) {
        const ch = valuesPart[i];
        if (ch === "'" && valuesPart[i - 1] !== '\\') inStr = !inStr;
        if (!inStr) {
          if (ch === '(') {
            if (depth === 0) buf = '';
            depth++;
            continue;
          }
          if (ch === ')') {
            depth--;
            if (depth === 0) tuples.push(buf);
            continue;
          }
        }
        if (depth > 0) buf += ch;
      }

      for (const tuple of tuples) {
        // Split tuple on top-level commas
        const fields: string[] = [];
        let fbuf = '';
        let fdepth = 0;
        let fstr = false;
        for (let i = 0; i < tuple.length; i++) {
          const ch = tuple[i];
          if (ch === "'" && tuple[i - 1] !== '\\') fstr = !fstr;
          if (!fstr) {
            if (ch === '(') fdepth++;
            else if (ch === ')') fdepth--;
            else if (ch === ',' && fdepth === 0) {
              fields.push(fbuf.trim());
              fbuf = '';
              continue;
            }
          }
          fbuf += ch;
        }
        if (fbuf.trim()) fields.push(fbuf.trim());

        if (fields.length <= typeIdx) continue;
        const typeField = fields[typeIdx];
        // Match a single-quoted simple identifier (snake_case)
        const litMatch = typeField.match(/^'([a-z_]+)'$/);
        if (!litMatch) continue; // dynamic param like p_type — caller-validated

        const typeValue = litMatch[1];
        if (!validTypes.has(typeValue)) {
          const key = `${row.rpc_name}:${typeValue}`;
          if (!ALLOWLIST_KNOWN_DRIFTS.has(key)) {
            drifts.push(`${row.rpc_name} writes type='${typeValue}' but CHECK does not allow it`);
          }
        }
      }
    }

    if (drifts.length === 0) {
      console.log(
        `[INV-30] checked ${(snippets as Snip[]).length} INSERT-into-transactions snippets, ` +
          `${ALLOWLIST_KNOWN_DRIFTS.size} known drifts allowlisted (Slice 037 followups), 0 unexpected violations`
      );
    }

    expect(drifts, drifts.join('\n')).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-31: Vollstaendiger auth.uid() Body-Audit (Slice 044)
  // Erweitert INV-21 auf die gesamte Matrix: alle SECURITY DEFINER RPCs mit
  // user-identity-Parametern (p_user_id, p_mentor_id, p_subscriber_id, ...)
  // muessen entweder Guard haben oder in Allowlist mit Reason sein.
  //
  // Audit-RPC klassifiziert pro RPC:
  //   guard_type ∈ {strict_guard, loose_guard, admin_role_guard, club_admin_guard,
  //                 explicit_caller_check, other_auth_use, no_guard}
  //   grant_status ∈ {authenticated, service_role_only, default_public, other}
  //   allowlist_reason: warum no-guard OK ist (null = muss gefixt werden)
  //
  // Test-Regel: needs_fix = (guard_type='no_guard' AND grant_status='authenticated'
  //                          AND allowlist_reason IS NULL) muss 0 sein.
  //
  // Slice 044: 5 RPCs gefixt (accept_mentee, request_mentor, subscribe_to_scout,
  // cancel_scout_subscription, award_dimension_score REVOKE authenticated).
  // ─────────────────────────────────────────────────────
  it('INV-31: vollstaendiger user-identity Body-Audit (alle SECURITY DEFINER RPCs)', async () => {
    const { data, error } = await sb.rpc('get_security_definer_user_param_audit');
    expect(error, `RPC failed: ${error?.message}`).toBeNull();
    expect(data, 'audit returned null').toBeTruthy();

    type AuditRow = {
      proname: string;
      args: string;
      grant_status: 'authenticated' | 'service_role_only' | 'default_public' | 'other';
      guard_type:
        | 'strict_guard'
        | 'loose_guard'
        | 'admin_role_guard'
        | 'club_admin_guard'
        | 'explicit_caller_check'
        | 'other_auth_use'
        | 'no_guard';
      allowlist_reason: string | null;
      needs_fix: boolean;
    };

    const rows = (data ?? []) as AuditRow[];

    const violations = rows
      .filter((r) => r.needs_fix)
      .map(
        (r) =>
          `RPC "${r.proname}(${r.args})" — grant=${r.grant_status}, guard=${r.guard_type}, reason=${r.allowlist_reason} — A-02 exploit class: authenticated user can spoof identity`
      );

    if (violations.length === 0) {
      const byCat = rows.reduce(
        (acc, r) => {
          const key = `${r.grant_status}/${r.guard_type}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      console.log(
        `[INV-31] checked ${rows.length} SECURITY DEFINER RPCs with user-identity params, ` +
          `0 violations. Breakdown: ${Object.entries(byCat)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')}`
      );
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-32: Komplette RLS-Matrix aller public Tabellen (Slice 045)
  // Erweitert INV-26 von 8 sensiblen Tables auf die komplette Matrix.
  // EXPECTED_PUBLIC Allowlist: Tables die legitim qual=true Policies haben (public by design).
  // EXPECTED_SENSITIVE Blocklist: Tables die NIE qual=true haben duerfen (AUTH-08 class).
  // Drift-Detektion: Neue Table mit qual=true ohne Allowlist-Eintrag → Test-Fail.
  // ─────────────────────────────────────────────────────
  it('INV-32: komplette RLS-Matrix aller public Tabellen (AUTH-08 class erweitert)', async () => {
    // Allowlist: Tables die legitim qual=true sind (public by design)
    const EXPECTED_PUBLIC: Record<string, string> = {
      // Reference / Definitions
      achievement_definitions: 'Gamification: alle User brauchen Achievement-Definitions',
      cosmetic_definitions: 'Cosmetic-Items Katalog, public read',
      cosmetic_shop_listings: 'Shop-Listing, public read',
      creator_config: 'Creator-Fee-Config, platform-wide read',
      daily_challenges: 'Daily-Challenge Definitions, public read',
      elo_config: 'ELO-Rating Config, platform-wide read',
      equipment_definitions: 'Equipment-Definitionen, public katalog',
      equipment_ranks: 'Equipment-Ranks, public read',
      event_fee_config: 'Event-Fee-Config, platform-wide read',
      fee_config: 'Fee-Config (Fee-Split), platform-wide read',
      geofencing_config: 'Geofencing-Tiers, platform-wide read (determines feature access)',
      manager_points_config: 'Manager-Points Config, platform-wide read',
      mentorship_milestones: 'Mentorship-Milestones Katalog, public read',
      mission_definitions: 'Mission Katalog, public read',
      platform_settings: 'Platform-Settings, platform-wide read',
      rang_thresholds: 'Rang-Thresholds, platform-wide read',
      score_road_config: 'Score-Road-Config, platform-wide read',
      streak_config: 'Streak-Config, platform-wide read',

      // Content (public by design)
      bounties: 'Bounties Marketplace, public',
      bounty_submissions: 'Bounty-Submissions, public-by-design (Transparenz)',
      club_votes: 'Club-Votes, Community-Transparenz',
      community_polls: 'Community-Polls, public',
      community_poll_votes: 'Poll-Votes, Community-Transparenz (nicht personifiziert)',
      post_votes: 'Post-Votes, public-by-design',
      posts: 'Community-Posts, public',
      research_posts: 'Research-Posts, public (Scout-Content)',
      research_ratings: 'Research-Ratings, public-by-design',
      sponsors: 'Sponsoren-Metadaten, public',
      user_achievements: 'User-Achievements, Leaderboard-by-design',

      // Sport-Daten (public)
      clubs: 'Clubs-Katalog, public read',
      club_admins: 'Club-Admin-Mapping, public (fuer is_admin-checks)',
      club_followers: 'Club-Follower-Mapping, public (Zahlen-Transparenz)',
      dpc_mastery: 'DPC-Mastery-Leaderboard, public',
      dpc_of_the_week: 'DPC-Weekly-Winner, public',
      events: 'Events-Katalog, public',
      founder_clubs: 'Founder-Club-Mapping, public',
      fixtures: 'Fixtures-Daten (API-Football), public',
      fixture_player_stats: 'Player-Stats pro Fixture, public',
      fixture_substitutions: 'Substitutions pro Fixture, public',
      ipos: 'IPOs, public (Marktplatz)',
      leagues: 'Leagues-Katalog, public',
      liga_seasons: 'Liga-Seasons, public',
      players: 'Players-Katalog, public read',
      trades: 'Trades-Historie, public (Orderbook-Transparenz)',

      // Leaderboard / Scores (public by design)
      airdrop_scores: 'Airdrop-Leaderboard, public',
      arena_seasons: 'Arena-Seasons, public',
      bescout_scores: 'BeScout-Score-Leaderboard, public',
      fan_rankings: 'Fan-Rankings pro Club, public',
      monthly_liga_snapshots: 'Monthly-Liga-Snapshots, public history',
      monthly_liga_winners: 'Monthly-Winners, public',
      player_fair_values: 'Player-Fair-Values (algorithmic), public',
      player_gameweek_scores: 'Gameweek-Scores, public leaderboard',
      scout_scores: 'Scout-Score-Leaderboard, public',
      user_stats: 'User-Stats Leaderboard-by-design (auch in INV-26 Allowlist)',
      vote_entries: 'Vote-Entries, Community-Transparenz',

      // Social-Graph (public)
      profiles: 'Public Profile, read-by-anyone (display_name, handle etc)',
      user_follows: 'Follow-Graph, public',

      // Platform Treasury (Transparenz fuer authenticated)
      pbt_transactions: 'PBT-Treasury-Transactions, Transparenz fuer authenticated (Slice 056)',
      pbt_treasury: 'PBT-Treasury-State, Transparenz fuer authenticated (Slice 056)',

      // Internal Operational Logs
      cron_sync_log: 'Cron-Sync-Log, authenticated-read fuer Admin-UI',
    };

    // Blocklist: diese Tables duerfen NIE qual=true SELECT-Policy haben.
    // Ueberlappung mit INV-26 SENSITIVE_TABLES ist bewusst (zwei Layer).
    const EXPECTED_SENSITIVE = new Set<string>([
      'holdings',
      'transactions',
      'ticket_transactions',
      'activity_log',
      'wallets',
      'orders',
      'offers',
      'notifications',
      'notification_preferences',
      'push_subscriptions',
      'lineups',
      'event_entries',
      'user_tickets',
      'user_wildcards',
      'user_equipment',
      'user_cosmetics',
      'user_founding_passes',
      'user_mentorship_progress',
      'user_missions',
      'user_scout_missions',
      'user_streaks',
      'user_daily_challenges',
      'tips',
      'scout_subscriptions',
      'scout_assignments',
      'scout_mission_definitions',
      'mentorships',
      'mystery_box_results',
      'welcome_bonus_claims',
      'wildcard_transactions',
      'watchlist',
      'chip_usages',
      'club_subscriptions',
      'club_withdrawals',
      'content_impressions',
      'content_reports',
      'creator_fund_payouts',
      'fantasy_league_members',
      'fantasy_leagues',
      'fan_wishes',
      'feedback',
      'holding_locks',
      'ipo_purchases',
      'liquidation_events',
      'liquidation_payouts',
      'platform_admins',
      'player_valuations',
      'predictions',
      'research_unlocks',
      'score_events',
      'score_history',
      'score_road_claims',
      'sponsor_impressions',
      'sponsor_stats',
      'streak_milestones_claimed',
      'verified_scouts',
    ]);

    const { data, error } = await sb.rpc('get_rls_policy_matrix');
    expect(error, `RPC failed: ${error?.message}`).toBeNull();
    expect(data, 'matrix returned null').toBeTruthy();

    type MatrixRow = {
      table_name: string;
      has_rls: boolean;
      force_rls: boolean;
      policy_count: number;
      permissive_select_update_delete_count: number;
      qual_true_count: number;
      is_qual_true: boolean;
    };

    const rows = (data ?? []) as MatrixRow[];
    const violations: string[] = [];

    for (const r of rows) {
      // Case A: Table in Blocklist hat qual=true → AUTH-08 violation
      if (EXPECTED_SENSITIVE.has(r.table_name) && r.is_qual_true) {
        violations.push(
          `${r.table_name}: AUTH-08 class — sensitive table has qual=true SELECT policy (MUST be user-scoped)`
        );
        continue;
      }

      // Case B: Table NICHT in Allowlist hat qual=true → unerwartete Permissivitaet
      if (r.is_qual_true && !EXPECTED_PUBLIC[r.table_name]) {
        violations.push(
          `${r.table_name}: qual=true SELECT policy not in EXPECTED_PUBLIC allowlist — add reason or make user-scoped`
        );
        continue;
      }

      // Case C: Table in Allowlist aber KEIN qual=true mehr → Allowlist-Eintrag veraltet
      // Intentionally silent: kein Fail, kein Warn. Dead reference ist harmlos
      // (entweder Table wurde gedropped, oder Policy wurde geaendert aber Allowlist-Eintrag
      // nicht mitgezogen). Scrub via Code-Review, nicht via Test-Fail.

      // Case D: Table hat RLS aus — immer violation (in public Schema)
      if (!r.has_rls) {
        violations.push(
          `${r.table_name}: RLS is DISABLED — all tables in public.* must have RLS enabled`
        );
      }
    }

    if (violations.length === 0) {
      const allowlistedCount = rows.filter(
        (r) => r.is_qual_true && EXPECTED_PUBLIC[r.table_name]
      ).length;
      const sensitiveProtectedCount = rows.filter(
        (r) => EXPECTED_SENSITIVE.has(r.table_name) && !r.is_qual_true
      ).length;
      console.log(
        `[INV-32] checked ${rows.length} public tables, ` +
          `${allowlistedCount} qual=true allowlisted (public-by-design), ` +
          `${sensitiveProtectedCount} sensitive-blocklist tables protected, ` +
          `0 violations`
      );
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-33: SUM(transactions.amount) == wallets.balance pro User (Slice 046)
  // Ergaenzt INV-16 (latest tx.balance_after == wallet.balance).
  // INV-16 faengt: Transaction nach Wallet-Update vergessen.
  // INV-33 faengt: Wallet-Balance-Mutation ohne Transaction-Log (admin adjust,
  //                racy init, legacy setup).
  // Slice 046: 69 Dev-Accounts mit historischer drift reconciled via
  // compensating welcome_bonus tx-rows. Alle 124 wallets jetzt balanced.
  // ─────────────────────────────────────────────────────
  it('INV-33: SUM(transactions.amount) matches wallets.balance for every user (Slice 046)', async () => {
    // Pull wallets + transactions via Supabase-Client (service_role bypasses RLS),
    // aggregiere client-side. Kein execute_sql_readonly RPC benoetigt.
    const { data: wallets, error: wErr } = await sb
      .from('wallets')
      .select('user_id, balance');
    expect(wErr, `wallets fetch failed: ${wErr?.message}`).toBeNull();

    // Paginierung: transactions kann viele Rows haben. Supabase-Client default-limit ist 1000.
    // Wir ziehen alle Seiten ueber range() bis erschoepft.
    const txSumByUser = new Map<string, bigint>();
    const PAGE_SIZE = 1000;
    let offset = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: txPage, error: tErr } = await sb
        .from('transactions')
        .select('user_id, amount')
        .range(offset, offset + PAGE_SIZE - 1);
      expect(tErr, `transactions fetch failed: ${tErr?.message}`).toBeNull();
      if (!txPage || txPage.length === 0) break;

      for (const tx of txPage as Array<{ user_id: string; amount: number | string }>) {
        const amt = BigInt(String(tx.amount));
        txSumByUser.set(tx.user_id, (txSumByUser.get(tx.user_id) ?? BigInt(0)) + amt);
      }

      if (txPage.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const drifts: string[] = [];
    for (const w of (wallets ?? []) as Array<{ user_id: string; balance: number | string }>) {
      const balance = BigInt(String(w.balance));
      const txSum = txSumByUser.get(w.user_id) ?? BigInt(0);
      const drift = balance - txSum;
      if (drift !== BigInt(0)) {
        drifts.push(
          `User ${w.user_id}: wallet=${balance}, tx_sum=${txSum}, drift=${drift}`
        );
      }
    }

    if (drifts.length === 0) {
      console.log(
        `[INV-33] checked ${wallets?.length ?? 0} wallets, ${txSumByUser.size} users with tx history, 0 drift — ledger balanced`
      );
    }

    expect(drifts, drifts.join('\n')).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-34: Player Data-Quality SLA (Slice 059)
  // Stammkader (shirt_number IS NOT NULL) muss minimum SLA erfuellen.
  // Bronze = 95%, Silver = 99%, Gold = 99.9% auf 5 Kritisch-Feldern
  // (nationality, photo, market_value, contract_end, api_mapping).
  // Test: WARN bei <Silver, FAIL bei <Bronze. Gold ist Ziel, aktuell 0/7 Ligen.
  // ─────────────────────────────────────────────────────
  it('INV-34: Player Data-Quality — Bronze-SLA Ratcheting (Slice 059)', async () => {
    const { data, error } = await sb.rpc('get_player_data_completeness');
    expect(error, `RPC failed: ${error?.message}`).toBeNull();
    expect(data, 'no completeness data').toBeTruthy();

    type LeagueStats = {
      league: string;
      league_total: number;
      stammkader: {
        total: number;
        nationality_pct: number;
        photo_pct: number;
        market_value_pct: number;
        contract_pct: number;
        api_mapping_pct: number;
        age_pct: number;
        gold_tier: boolean;
      };
      youth_reserve_total: number;
    };

    const rows = (data ?? []) as LeagueStats[];
    const bronzeMin = 95;
    const violations: string[] = [];

    for (const row of rows) {
      const k = row.stammkader;
      const fields: Array<[string, number]> = [
        ['nationality', k.nationality_pct],
        ['photo', k.photo_pct],
        ['market_value', k.market_value_pct],
        ['contract', k.contract_pct],
        ['api_mapping', k.api_mapping_pct],
      ];
      for (const [name, pct] of fields) {
        if (pct < bronzeMin) {
          violations.push(`${row.league}/${name}`);
        }
      }
    }

    // Baseline-Freeze (Slice 059 initial state): 21 violations dokumentiert.
    // Target: iterativ runter auf 0 via Phase 2 Sync-Pipeline (Slices 063+).
    // Ratcheting: Wert darf nur sinken, nie steigen.
    const BASELINE_MAX_VIOLATIONS = 21;

    const goldCount = rows.filter((r) => r.stammkader.gold_tier).length;
    console.log(
      `[INV-34] ${rows.length} Ligen, ${violations.length}/${BASELINE_MAX_VIOLATIONS} Bronze-Violations, ${goldCount}/${rows.length} Gold-Tier`
    );

    expect(
      violations.length,
      `Bronze-SLA regressed (baseline=${BASELINE_MAX_VIOLATIONS}):\n  ${violations.join('\n  ')}`
    ).toBeLessThanOrEqual(BASELINE_MAX_VIOLATIONS);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-35: Club-Logo Source Single-Domain (Slice 062)
  // Alle Club-Logos muessen aus media.api-sports.io kommen (canonical).
  // Verhindert Re-Drift durch manuelle Wikimedia/andere Imports.
  // ─────────────────────────────────────────────────────
  it('INV-35: Club-Logos sind aus einer Single-Source (api-sports canonical)', async () => {
    const { data, error } = await sb.from('clubs').select('id, name, logo_url');
    expect(error, `clubs fetch failed: ${error?.message}`).toBeNull();

    const violations = ((data ?? []) as Array<{ id: string; name: string; logo_url: string | null }>)
      .filter((c) => {
        if (!c.logo_url) return true; // missing logo = violation
        return !c.logo_url.startsWith('https://media.api-sports.io/');
      })
      .map((c) => `${c.name}: ${c.logo_url ?? 'NULL'}`);

    if (violations.length === 0) {
      console.log(`[INV-35] ${data?.length ?? 0} Club-Logos alle aus api-sports canonical source`);
    }

    expect(
      violations,
      `Non-canonical logo sources found:\n  ${violations.join('\n  ')}`
    ).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-36: Kein Duplicate-Cluster-Poisoning in market_value_eur (Slice 081)
  // Verhindert, dass TM-Scraper-Fallback-Defaults (wie 500K/2025-07-01) als echte
  // Werte durchgehen. Wenn mehr als 3 Spieler identisches (mv, contract_end)-Paar
  // teilen UND nicht als 'transfermarkt_stale' markiert sind → Fail.
  // Bereits markierte stale-Rows sind ausgenommen (warten auf Re-Scraper in A.2).
  // ─────────────────────────────────────────────────────
  it('INV-36: kein ungeflagtes Duplicate-Cluster-Poisoning in market_value_eur', async () => {
    type Row = { market_value_eur: number; contract_end: string; mv_source: string };
    const all: Row[] = [];
    const PAGE = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await sb
        .from('players')
        .select('market_value_eur, contract_end, mv_source')
        .gt('market_value_eur', 0)
        .not('contract_end', 'is', null)
        .neq('mv_source', 'transfermarkt_stale')
        .range(offset, offset + PAGE - 1);
      expect(error, `players fetch failed: ${error?.message}`).toBeNull();
      if (!data || data.length === 0) break;
      all.push(...(data as Row[]));
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    const clusters = new Map<string, number>();
    for (const p of all) {
      const key = `${p.market_value_eur}|${p.contract_end}`;
      clusters.set(key, (clusters.get(key) ?? 0) + 1);
    }
    const violations = Array.from(clusters.entries())
      .filter(([, n]) => n > 3)
      .map(([key, n]) => `${n}× ${key}`);

    if (violations.length === 0) {
      console.log(`[INV-36] ${all.length} unflagged players, 0 duplicate-clusters > 3`);
    }

    expect(
      violations,
      `Duplicate-Cluster-Poisoning detected (>3 Spieler mit identisch mv+contract_end, nicht als stale markiert):\n  ${violations.slice(0, 20).join('\n  ')}`
    ).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-37: Kein Paired-Poisoning (Slice 081b)
  // Erweitert INV-36 auf Cluster 2-3 WENN zusaetzlich last_name identisch ist
  // (TR-normalisiert via Diakritika-Strip). Faengt Arda Yilmaz + Baris Alper-Case:
  // gleicher Nachname, gleicher mv, gleicher contract_end = TM-Scraper-Mismatch.
  // Bereits markierte stale-Rows sind ausgenommen.
  // ─────────────────────────────────────────────────────
  it('INV-37: kein ungeflagtes Paired-Poisoning (Cluster 2-3 mit gleichem last_name)', async () => {
    type Row = {
      market_value_eur: number;
      contract_end: string;
      last_name: string;
      mv_source: string;
    };
    const all: Row[] = [];
    const PAGE = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await sb
        .from('players')
        .select('market_value_eur, contract_end, last_name, mv_source')
        .gt('market_value_eur', 0)
        .not('contract_end', 'is', null)
        .neq('mv_source', 'transfermarkt_stale')
        .range(offset, offset + PAGE - 1);
      expect(error, `players fetch failed: ${error?.message}`).toBeNull();
      if (!data || data.length === 0) break;
      all.push(...(data as Row[]));
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    // TR-normalize: lowercase + strip türkische Diakritika (Pattern aus common-errors.md)
    const normalize = (s: string): string => {
      const map: Record<string, string> = {
        ş: 's', Ş: 's', ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g',
        ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u',
      };
      return s
        .split('')
        .map((ch) => map[ch] ?? ch)
        .join('')
        .toLowerCase();
    };

    const clusters = new Map<string, number>();
    for (const p of all) {
      const key = `${p.market_value_eur}|${p.contract_end}|${normalize(p.last_name)}`;
      clusters.set(key, (clusters.get(key) ?? 0) + 1);
    }
    const violations = Array.from(clusters.entries())
      .filter(([, n]) => n >= 2)
      .map(([key, n]) => `${n}× ${key}`);

    if (violations.length === 0) {
      console.log(`[INV-37] ${all.length} unflagged players, 0 paired-clusters (same last_name + mv + contract_end)`);
    }

    expect(
      violations,
      `Paired-Poisoning detected (>=2 Spieler mit identisch mv+contract_end+normalized last_name, nicht als stale markiert):\n  ${violations.slice(0, 20).join('\n  ')}`
    ).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-38: Keine unflagged Orphan-Stale-Contracts (Slice 081c)
  // Spieler mit contract_end > 12 Monate in der Vergangenheit müssen als
  // transfermarkt_stale markiert sein — TM-Daten sind eindeutig veraltet.
  // ─────────────────────────────────────────────────────
  it('INV-38: kein unflagged Player mit contract_end > 12 Monate in der Vergangenheit', async () => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    const cutoffIso = cutoff.toISOString().slice(0, 10);

    type Row = { id: string; first_name: string; last_name: string; contract_end: string };
    const all: Row[] = [];
    const PAGE = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await sb
        .from('players')
        .select('id, first_name, last_name, contract_end')
        .lt('contract_end', cutoffIso)
        .neq('mv_source', 'transfermarkt_stale')
        .range(offset, offset + PAGE - 1);
      expect(error, `players fetch failed: ${error?.message}`).toBeNull();
      if (!data || data.length === 0) break;
      all.push(...(data as Row[]));
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    if (all.length === 0) {
      console.log(`[INV-38] 0 unflagged players with contract_end < ${cutoffIso}`);
    }

    const violations = all
      .slice(0, 20)
      .map((p) => `${p.first_name} ${p.last_name} (contract_end=${p.contract_end})`);

    expect(
      all,
      `Orphan-Stale-Contracts detected (${all.length} Spieler mit contract_end < ${cutoffIso}, nicht als stale markiert):\n  ${violations.join('\n  ')}`
    ).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-39: Keine Ghost-Rows (Cross-Club-Contamination, Slice 081d)
  // Ein Spieler mit 0 Appearances und identisch Name + Contract + MV wie ein anderer
  // Spieler mit >0 Appearances (anderer Club) ist ein Sync-Ghost. Solche Rows
  // duerfen nicht mit aktivem club_id stehen.
  // ─────────────────────────────────────────────────────
  it('INV-39: keine Cross-Club-Contamination Ghost-Rows', async () => {
    type Row = {
      id: string;
      first_name: string;
      last_name: string;
      contract_end: string | null;
      market_value_eur: number;
      club_id: string | null;
      last_appearance_gw: number;
    };
    const all: Row[] = [];
    const PAGE = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await sb
        .from('players')
        .select('id, first_name, last_name, contract_end, market_value_eur, club_id, last_appearance_gw')
        .range(offset, offset + PAGE - 1);
      expect(error, `players fetch failed: ${error?.message}`).toBeNull();
      if (!data || data.length === 0) break;
      all.push(...(data as Row[]));
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    const byKey = new Map<string, Row[]>();
    for (const p of all) {
      if (!p.contract_end) continue;
      const key = `${p.first_name}|${p.last_name}|${p.contract_end}`;
      const arr = byKey.get(key) ?? [];
      arr.push(p);
      byKey.set(key, arr);
    }

    const ghosts: string[] = [];
    for (const rows of Array.from(byKey.values())) {
      if (rows.length < 2) continue;
      const hasReal = rows.some((r: Row) => r.last_appearance_gw > 0 && r.club_id !== null);
      if (!hasReal) continue;
      for (const r of rows) {
        if (r.last_appearance_gw === 0 && r.club_id !== null) {
          ghosts.push(`${r.first_name} ${r.last_name} (id=${r.id}, club assigned, 0 apps — should be orphan)`);
        }
      }
    }

    if (ghosts.length === 0) {
      console.log('[INV-39] 0 Cross-Club-Contamination ghosts detected');
    }

    expect(
      ghosts,
      `Ghost-Rows detected (Spieler mit 0 apps + club_id + echter Doppelgaenger bei anderem Club):\n  ${ghosts.slice(0, 20).join('\n  ')}`
    ).toHaveLength(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────
  // INV-40: Keine Same-Club Player-Duplicates (Slice 084)
  // Spieler mit identischem first_name + last_name + club_id duerfen nicht
  // mehrfach mit aktivem club_id existieren. Root-Cause: sync-players-daily
  // Cross-Club-Contamination + Apostrophe-Namen (O'Brien/O'Reilly).
  // ─────────────────────────────────────────────────────
  it('INV-40: keine Same-Club Player-Duplicates', async () => {
    type Row = { id: string; first_name: string; last_name: string; club_id: string | null };
    const all: Row[] = [];
    const PAGE = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await sb
        .from('players')
        .select('id, first_name, last_name, club_id')
        .not('club_id', 'is', null)
        .range(offset, offset + PAGE - 1);
      expect(error, `players fetch failed: ${error?.message}`).toBeNull();
      if (!data || data.length === 0) break;
      all.push(...(data as Row[]));
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    const byKey = new Map<string, Row[]>();
    for (const p of all) {
      if (!p.club_id) continue;
      const fn = (p.first_name ?? '').trim().toLowerCase();
      const ln = (p.last_name ?? '').trim().toLowerCase();
      const key = `${fn}|${ln}|${p.club_id}`;
      const arr = byKey.get(key) ?? [];
      arr.push(p);
      byKey.set(key, arr);
    }

    const dupes: string[] = [];
    for (const [key, rows] of Array.from(byKey.entries())) {
      if (rows.length > 1) {
        const [fn, ln] = key.split('|');
        dupes.push(`${fn} ${ln}: ${rows.length} rows (ids=${rows.map(r => r.id).join(', ')})`);
      }
    }

    if (dupes.length === 0) {
      console.log('[INV-40] 0 same-club player duplicates detected');
    }

    expect(
      dupes,
      `Same-Club Player-Duplicates gefunden:\n  ${dupes.slice(0, 20).join('\n  ')}`
    ).toHaveLength(0);
  }, 30_000);
});
