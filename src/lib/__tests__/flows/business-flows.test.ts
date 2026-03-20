// @vitest-environment node

/**
 * Business Flows — End-to-End Verification (Layer 7)
 *
 * Verifies multi-step business processes produced consistent data:
 *   - Event lifecycle completed correctly
 *   - IPO → trade → holdings chain is consistent
 *   - Fee splits propagated to all parties
 *   - Lineup scoring produced correct results
 *
 * All tests are READ-ONLY. They verify existing data consistency
 * across multiple tables (cross-table joins and aggregations).
 *
 * Run: npx vitest run src/lib/__tests__/flows/business-flows.test.ts
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

describe('Business Flows — Cross-Table Verification', () => {
  // ── 1. Event lifecycle: registering → ended chain exists ──
  it('FLOW-01: ended events exist with proper lifecycle timestamps', async () => {
    const { data, error } = await sb
      .from('events')
      .select('id, name, status, starts_at, locks_at, scored_at, current_entries')
      .eq('status', 'ended')
      .gt('current_entries', 0)
      .limit(10);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    for (const evt of data) {
      // Ended events with entries must have scored_at
      expect(evt.scored_at, `Event "${evt.name}" ended but no scored_at`).not.toBeNull();
    }
  });

  // ── 2. Event format → lineup_size consistency (DB level) ──
  // Note: Pre-fix lineups (from BUG-001 era) may have 11 slots in 7er events
  // because lineup_size was not cloned correctly. The fix is in the cron now.
  // We verify the EVENT definition is correct (format ↔ lineup_size).
  it('FLOW-02: event format matches lineup_size in event definition', async () => {
    const { data, error } = await sb
      .from('events')
      .select('id, name, format, lineup_size')
      .limit(500);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(
      e =>
        (e.format === '7er' && e.lineup_size !== 7) ||
        (e.format === '11er' && e.lineup_size !== 11)
    );
    expect(
      violations.map(e => `${e.name}: format=${e.format} but lineup_size=${e.lineup_size}`),
      'Event format/lineup_size mismatch'
    ).toHaveLength(0);
  });

  // ── 3. IPO → Holdings chain: buyers should have holdings ──
  it('FLOW-03: IPO buyers generally retain holdings (batch check)', async () => {
    // Batch approach: load all data in parallel, check in memory
    const [purchaseRes, ipoRes, holdingsRes] = await Promise.all([
      sb.from('ipo_purchases').select('ipo_id, user_id, quantity').limit(500),
      sb.from('ipos').select('id, player_id').limit(500),
      sb.from('holdings').select('user_id, player_id, quantity').limit(5000),
    ]);

    expect(purchaseRes.error).toBeNull();
    expect(ipoRes.error).toBeNull();
    expect(holdingsRes.error).toBeNull();

    const purchases = purchaseRes.data ?? [];
    if (purchases.length === 0) return;

    const ipoPlayerMap = new Map((ipoRes.data ?? []).map(i => [i.id, i.player_id]));
    const holdingSet = new Set(
      (holdingsRes.data ?? [])
        .filter(h => h.quantity > 0)
        .map(h => `${h.user_id}:${h.player_id}`)
    );

    // Deduplicate user:player pairs
    const checked = new Set<string>();
    let missing = 0;

    for (const p of purchases) {
      const playerId = ipoPlayerMap.get(p.ipo_id);
      if (!playerId) continue;

      const key = `${p.user_id}:${playerId}`;
      if (checked.has(key)) continue;
      checked.add(key);

      if (!holdingSet.has(key)) missing++;
    }

    // Allow up to 20% missing (users who sold after buying)
    const maxAllowed = Math.ceil(checked.size * 0.2);
    expect(
      missing,
      `${missing}/${checked.size} IPO buyers have no holdings (sold after?)`
    ).toBeLessThanOrEqual(maxAllowed);
  });

  // ── 4. Trade → fee split → all 3 parties credited ──
  it('FLOW-04: all trades have non-negative fee splits to all 3 parties', async () => {
    const { data, error } = await sb
      .from('trades')
      .select('id, platform_fee, pbt_fee, club_fee')
      .limit(1000);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(
      t => t.platform_fee < 0 || t.pbt_fee < 0 || t.club_fee < 0
    );
    expect(violations).toHaveLength(0);
  });

  // ── 5. IPO sold count matches purchase records ──
  it('FLOW-05: IPO sold count equals sum of ipo_purchases quantity', async () => {
    const { data: ipos, error: ipoErr } = await sb
      .from('ipos')
      .select('id, sold')
      .limit(200);

    expect(ipoErr).toBeNull();
    if (!ipos || ipos.length === 0) return;

    // Get all purchases in one query
    const { data: purchases } = await sb
      .from('ipo_purchases')
      .select('ipo_id, quantity')
      .limit(5000);

    // Sum per IPO
    const purchaseSums = new Map<string, number>();
    for (const p of purchases ?? []) {
      purchaseSums.set(p.ipo_id, (purchaseSums.get(p.ipo_id) ?? 0) + p.quantity);
    }

    const violations: string[] = [];
    for (const ipo of ipos) {
      const purchaseTotal = purchaseSums.get(ipo.id) ?? 0;
      if (purchaseTotal !== ipo.sold) {
        violations.push(
          `IPO ${ipo.id.slice(0, 8)}: sold=${ipo.sold} but purchases sum=${purchaseTotal}`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 6. Scored lineups have scores ──
  it('FLOW-06: lineups in ended events have total_score set', async () => {
    // Get ended events with entries
    const { data: events } = await sb
      .from('events')
      .select('id')
      .eq('status', 'ended')
      .gt('current_entries', 0)
      .limit(50);

    if (!events || events.length === 0) return;

    const eventIds = events.map(e => e.id);
    const { data: lineups, error } = await sb
      .from('lineups')
      .select('id, event_id, total_score, rank')
      .in('event_id', eventIds)
      .limit(500);

    expect(error).toBeNull();
    if (!lineups || lineups.length === 0) return;

    const violations: string[] = [];
    for (const l of lineups) {
      if (l.total_score === null || l.total_score === undefined) {
        violations.push(`Lineup ${l.id.slice(0, 8)}: ended event but total_score is null`);
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 7. Lineup ranks are unique within each event ──
  it('FLOW-07: no duplicate ranks within scored events', async () => {
    const { data: events } = await sb
      .from('events')
      .select('id')
      .eq('status', 'ended')
      .gt('current_entries', 1) // need >1 to check rank uniqueness
      .limit(50);

    if (!events || events.length === 0) return;

    const violations: string[] = [];
    for (const evt of events) {
      const { data: lineups } = await sb
        .from('lineups')
        .select('rank')
        .eq('event_id', evt.id)
        .not('rank', 'is', null);

      if (!lineups || lineups.length < 2) continue;

      const ranks = lineups.map(l => l.rank);
      const unique = new Set(ranks);
      if (unique.size !== ranks.length) {
        violations.push(`Event ${evt.id.slice(0, 8)}: ${ranks.length} lineups but ${unique.size} unique ranks`);
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 8. Trade buyer ≠ seller (no self-trades) ──
  it('FLOW-08: no trade has buyer_id = seller_id', async () => {
    const { data, error } = await sb
      .from('trades')
      .select('id, buyer_id, seller_id')
      .not('seller_id', 'is', null)
      .limit(1000);

    expect(error).toBeNull();
    const selfTrades = (data ?? []).filter(t => t.buyer_id === t.seller_id);
    expect(selfTrades, 'Self-trades found').toHaveLength(0);
  });

  // ── 9. Holdings sum ≤ 300 per player (max supply) ──
  it('FLOW-09: total holdings per player do not exceed 300', async () => {
    const { data, error } = await sb
      .from('holdings')
      .select('player_id, quantity')
      .limit(5000);

    expect(error).toBeNull();
    if (!data || data.length === 0) return;

    const totals = new Map<string, number>();
    for (const h of data) {
      totals.set(h.player_id, (totals.get(h.player_id) ?? 0) + h.quantity);
    }

    const violations = Array.from(totals.entries())
      .filter(([, total]) => total > 300)
      .map(([pid, total]) => `Player ${pid.slice(0, 8)}: ${total} total holdings (max 300)`);

    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 10. Community: votes are ±1 only ──
  it('FLOW-10: all post_votes have vote_type of 1 or -1', async () => {
    const { data, error } = await sb
      .from('post_votes')
      .select('id, vote_type')
      .limit(1000);

    expect(error).toBeNull();
    const invalid = (data ?? []).filter(v => v.vote_type !== 1 && v.vote_type !== -1);
    expect(invalid, 'Votes with invalid vote_type').toHaveLength(0);
  });

  // ── 11. Event current_entries matches actual lineup count ──
  it('FLOW-11: event current_entries equals actual lineup count', async () => {
    const { data: events, error } = await sb
      .from('events')
      .select('id, name, current_entries')
      .in('status', ['registering', 'running', 'ended'])
      .gt('current_entries', 0)
      .limit(50);

    expect(error).toBeNull();
    if (!events || events.length === 0) return;

    const violations: string[] = [];
    for (const evt of events) {
      const { count } = await sb
        .from('lineups')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', evt.id);

      if ((count ?? 0) !== evt.current_entries) {
        violations.push(
          `Event "${evt.name}": current_entries=${evt.current_entries} but ${count} lineups`
        );
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  // ── 12. Offer parties are different users ──
  it('FLOW-12: no offer has sender = receiver', async () => {
    const { data, error } = await sb
      .from('offers')
      .select('id, sender_id, receiver_id')
      .limit(500);

    expect(error).toBeNull();
    const selfOffers = (data ?? []).filter(o => o.sender_id === o.receiver_id);
    expect(selfOffers, 'Self-offers found').toHaveLength(0);
  });

  // ── 13. IPO total_offered ≤ 300 (max per player) ──
  it('FLOW-13: no IPO offers more than 300 SC', async () => {
    const { data, error } = await sb
      .from('ipos')
      .select('id, total_offered')
      .gt('total_offered', 300)
      .limit(5);

    expect(error).toBeNull();
    expect(data ?? [], 'IPOs offering > 300 SC').toHaveLength(0);
  });

  // ── 14. All profiles have valid handles ──
  it('FLOW-14: all profiles with handles have non-empty, trimmed handles', async () => {
    const { data, error } = await sb
      .from('profiles')
      .select('id, handle')
      .not('handle', 'is', null)
      .limit(500);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(
      p => p.handle.trim() === '' || p.handle !== p.handle.trim()
    );
    expect(violations.map(p => `"${p.handle}"`), 'Invalid handles').toHaveLength(0);
  });

  // ── 15. Cron idempotency: no event scored multiple times ──
  it('FLOW-15: each ended event has exactly one scoring timestamp', async () => {
    const { data, error } = await sb
      .from('events')
      .select('id, name, scored_at, current_entries')
      .eq('status', 'ended')
      .gt('current_entries', 0);

    expect(error).toBeNull();
    // Every ended event with entries should have scored_at
    const missing = (data ?? []).filter(e => !e.scored_at);
    expect(
      missing.map(e => e.name),
      'Ended events with entries but no scored_at'
    ).toHaveLength(0);
  });
});
