# Test Architecture v2 — Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement DB Invariants (15 tests) + Bug Regression (4 red tests) as the first layer of the 7-layer test architecture.

**Architecture:** Vitest tests connecting directly to Supabase (not mocked). Uses `// @vitest-environment node` pragma since default config is jsdom. Reuses the existing `e2e/bots/ai/supabase.ts` pattern for client creation.

**Tech Stack:** Vitest, Supabase JS Client, dotenv, TypeScript

---

### Task 1: Create Test Helper — Supabase Client for Integration Tests

**Files:**
- Create: `src/lib/__tests__/helpers/supabase-test-client.ts`

**Step 1: Create the helper file**

```typescript
// src/lib/__tests__/helpers/supabase-test-client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local for Supabase credentials
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');

/**
 * Admin client with service_role — bypasses RLS.
 * Use for DB invariant checks (read-only queries against live data).
 */
export function getTestAdminClient(): SupabaseClient {
  return createClient(url!, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Helper to run raw SQL via supabase-js rpc.
 * Uses the admin client (service_role) to run arbitrary SQL.
 */
export async function sql<T = Record<string, unknown>>(
  query: string,
  client?: SupabaseClient,
): Promise<T[]> {
  const sb = client ?? getTestAdminClient();
  const { data, error } = await sb.rpc('exec_sql', { query });
  if (error) {
    // Fallback: try direct table queries if rpc not available
    throw new Error(`SQL query failed: ${error.message}\nQuery: ${query}`);
  }
  return (data ?? []) as T[];
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/__tests__/helpers/supabase-test-client.ts
git commit -m "test: add Supabase test client helper for integration tests"
```

---

### Task 2: Create DB Invariants Test File (15 Tests)

**Files:**
- Create: `src/lib/__tests__/db-invariants.test.ts`

**Step 1: Write the test file**

All 15 invariants as individual test cases. Each test runs a SQL query against live DB and asserts 0 violations.

```typescript
// @vitest-environment node
/**
 * DB Invariants — Schicht 1
 *
 * SQL assertions against LIVE Supabase data.
 * Each test queries for violations of a business rule.
 * A passing test means 0 violations found.
 *
 * Run: npx vitest run src/lib/__tests__/db-invariants.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let sb: SupabaseClient;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

describe('DB Invariants', () => {
  // ── 1. format ↔ lineup_size Konsistenz ──
  it('INV-01: format and lineup_size must be consistent', async () => {
    const { data, error } = await sb.from('events')
      .select('id, name, format, lineup_size, gameweek')
      .or('and(format.eq.7er,lineup_size.neq.7),and(format.eq.11er,lineup_size.neq.11)');

    expect(error).toBeNull();
    const violations = (data ?? []).filter(e =>
      (e.format === '7er' && e.lineup_size !== 7) ||
      (e.format === '11er' && e.lineup_size !== 11)
    );
    expect(violations).toHaveLength(0);
  });

  // ── 2. Event starts_at matches earliest fixture kickoff ──
  it('INV-02: event starts_at should match earliest fixture kickoff of its gameweek', async () => {
    // Get running/registering events with their gameweek
    const { data: events } = await sb.from('events')
      .select('id, name, gameweek, starts_at, status')
      .in('status', ['registering', 'running', 'late-reg']);

    if (!events || events.length === 0) return; // skip if no active events

    // For each gameweek, get earliest fixture
    const gameweeks = Array.from(new Set(events.map(e => e.gameweek)));
    for (const gw of gameweeks) {
      const { data: fixtures } = await sb.from('fixtures')
        .select('played_at')
        .eq('gameweek', gw)
        .not('played_at', 'is', null)
        .order('played_at', { ascending: true })
        .limit(1);

      if (!fixtures || fixtures.length === 0) continue; // no fixture times yet

      const earliestKickoff = new Date(fixtures[0].played_at);
      const gwEvents = events.filter(e => e.gameweek === gw);
      for (const evt of gwEvents) {
        const evtStart = new Date(evt.starts_at);
        // starts_at should be within 1 hour of earliest kickoff
        const diffMs = Math.abs(evtStart.getTime() - earliestKickoff.getTime());
        expect(diffMs, `Event "${evt.name}" (GW${gw}): starts_at ${evt.starts_at} vs kickoff ${fixtures[0].played_at}`).toBeLessThan(3600_000);
      }
    }
  });

  // ── 3. Event locks_at should be ≤ earliest fixture kickoff ──
  it('INV-03: event locks_at should be at or before earliest fixture kickoff', async () => {
    const { data: events } = await sb.from('events')
      .select('id, name, gameweek, locks_at, status')
      .in('status', ['registering', 'running', 'late-reg']);

    if (!events || events.length === 0) return;

    const gameweeks = Array.from(new Set(events.map(e => e.gameweek)));
    for (const gw of gameweeks) {
      const { data: fixtures } = await sb.from('fixtures')
        .select('played_at')
        .eq('gameweek', gw)
        .not('played_at', 'is', null)
        .order('played_at', { ascending: true })
        .limit(1);

      if (!fixtures || fixtures.length === 0) continue;

      const earliestKickoff = new Date(fixtures[0].played_at);
      const gwEvents = events.filter(e => e.gameweek === gw);
      for (const evt of gwEvents) {
        const locksAt = new Date(evt.locks_at);
        expect(locksAt.getTime(), `Event "${evt.name}": locks_at ${evt.locks_at} should be before kickoff ${fixtures[0].played_at}`).toBeLessThanOrEqual(earliestKickoff.getTime());
      }
    }
  });

  // ── 4. No "running" event before locks_at ──
  it('INV-04: no event should be "running" while locks_at is still in the future', async () => {
    const now = new Date().toISOString();
    const { data, error } = await sb.from('events')
      .select('id, name, status, locks_at')
      .eq('status', 'running')
      .gt('locks_at', now);

    expect(error).toBeNull();
    expect(data ?? [], 'Events that are "running" but locks_at has not passed yet').toHaveLength(0);
  });

  // ── 5. No negative wallet balances ──
  it('INV-05: no wallet should have negative balance', async () => {
    const { data, error } = await sb.from('wallets')
      .select('user_id, balance')
      .lt('balance', 0)
      .limit(5);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  // ── 6. locked_balance ≤ balance ──
  it('INV-06: locked_balance should never exceed balance', async () => {
    const { data, error } = await sb.from('wallets')
      .select('user_id, balance, locked_balance')
      .not('locked_balance', 'is', null)
      .limit(500);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(w => w.locked_balance > w.balance);
    expect(violations, 'Wallets where locked_balance > balance').toHaveLength(0);
  });

  // ── 7. Wallet reconciliation: no orphan locked balances ──
  it('INV-07: every non-zero locked_balance should have corresponding open orders/offers', async () => {
    const { data: lockedWallets, error } = await sb.from('wallets')
      .select('user_id, locked_balance')
      .gt('locked_balance', 0)
      .limit(100);

    expect(error).toBeNull();
    if (!lockedWallets || lockedWallets.length === 0) return;

    for (const w of lockedWallets) {
      // Check for open orders (sell orders lock SC, buy orders lock balance)
      const { count: orderCount } = await sb.from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', w.user_id)
        .in('status', ['open', 'partial']);

      // Check for pending offers
      const { count: offerCount } = await sb.from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', w.user_id)
        .eq('status', 'pending');

      const totalOpen = (orderCount ?? 0) + (offerCount ?? 0);
      expect(totalOpen, `User ${w.user_id.slice(0, 8)} has locked_balance=${w.locked_balance} but 0 open orders/offers`).toBeGreaterThan(0);
    }
  });

  // ── 8. Holdings quantity > 0 ──
  it('INV-08: no holding should have quantity ≤ 0', async () => {
    const { data, error } = await sb.from('holdings')
      .select('user_id, player_id, quantity')
      .lte('quantity', 0)
      .limit(5);

    expect(error).toBeNull();
    expect(data ?? [], 'Holdings with quantity ≤ 0').toHaveLength(0);
  });

  // ── 9. IPO sold ≤ total_offered ──
  it('INV-09: IPO sold count should never exceed total_offered', async () => {
    const { data, error } = await sb.from('ipos')
      .select('id, player_id, sold, total_offered, status');

    expect(error).toBeNull();
    const violations = (data ?? []).filter(i => i.sold > i.total_offered);
    expect(violations, 'IPOs where sold > total_offered').toHaveLength(0);
  });

  // ── 10. Floor price ≤ 3x IPO price ──
  it('INV-10: floor_price should not exceed 3x ipo_price', async () => {
    const { data, error } = await sb.from('players')
      .select('id, first_name, last_name, floor_price, ipo_price')
      .gt('ipo_price', 0)
      .not('floor_price', 'is', null);

    expect(error).toBeNull();
    const violations = (data ?? []).filter(p => p.floor_price > p.ipo_price * 3);
    expect(violations.length, `${violations.length} players with floor > 3x IPO`).toBe(0);
  });

  // ── 11. No open orders for liquidated players ──
  it('INV-11: no open orders should exist for liquidated players', async () => {
    const { data: liquidated } = await sb.from('players')
      .select('id')
      .eq('is_liquidated', true);

    if (!liquidated || liquidated.length === 0) return;

    const liquidatedIds = liquidated.map(p => p.id);
    const { data: orphanOrders, error } = await sb.from('orders')
      .select('id, player_id, status')
      .in('player_id', liquidatedIds)
      .in('status', ['open', 'partial']);

    expect(error).toBeNull();
    expect(orphanOrders ?? [], 'Open orders for liquidated players').toHaveLength(0);
  });

  // ── 12. No duplicate player in same event lineup ──
  it('INV-12: no player should appear in multiple slots of the same lineup', async () => {
    const { data: lineups, error } = await sb.from('lineups')
      .select('id, event_id, user_id, slot_gk, slot_def1, slot_def2, slot_def3, slot_def4, slot_mid1, slot_mid2, slot_mid3, slot_mid4, slot_att, slot_att2, slot_att3')
      .limit(200);

    expect(error).toBeNull();
    const violations: string[] = [];
    for (const l of lineups ?? []) {
      const slots = [l.slot_gk, l.slot_def1, l.slot_def2, l.slot_def3, l.slot_def4,
        l.slot_mid1, l.slot_mid2, l.slot_mid3, l.slot_mid4,
        l.slot_att, l.slot_att2, l.slot_att3].filter(Boolean);
      const unique = new Set(slots);
      if (unique.size !== slots.length) {
        violations.push(`Lineup ${l.id}: ${slots.length} slots but only ${unique.size} unique players`);
      }
    }
    expect(violations).toHaveLength(0);
  });

  // ── 13. Fee splits sum correctly ──
  it('INV-13: trade fee splits should sum to total fee (6%)', async () => {
    const { data: trades, error } = await sb.from('trades')
      .select('id, price, quantity, fee_platform, fee_pbt, fee_club')
      .not('fee_platform', 'is', null)
      .limit(100);

    expect(error).toBeNull();
    for (const t of trades ?? []) {
      const totalFee = (t.fee_platform ?? 0) + (t.fee_pbt ?? 0) + (t.fee_club ?? 0);
      const expectedFee = Math.round(t.price * t.quantity * 0.06);
      // Allow 1 cent rounding tolerance
      expect(Math.abs(totalFee - expectedFee), `Trade ${t.id}: fee sum ${totalFee} vs expected ${expectedFee}`).toBeLessThanOrEqual(1);
    }
  });

  // ── 14. All active IPO prices > 0 ──
  it('INV-14: all active IPO prices must be greater than 0', async () => {
    const { data, error } = await sb.from('ipos')
      .select('id, player_id, price, status')
      .in('status', ['open', 'early_access', 'announced'])
      .lte('price', 0);

    expect(error).toBeNull();
    expect(data ?? [], 'Active IPOs with price ≤ 0').toHaveLength(0);
  });

  // ── 15. No negative locked_balance ──
  it('INV-15: no wallet should have negative locked_balance', async () => {
    const { data, error } = await sb.from('wallets')
      .select('user_id, locked_balance')
      .lt('locked_balance', 0)
      .limit(5);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/lib/__tests__/db-invariants.test.ts`
Expected: Some tests PASS (data is clean), some FAIL (the known bugs — INV-01, INV-02, INV-03, INV-04 should fail based on the GW32 data)

**Step 3: Commit**

```bash
git add src/lib/__tests__/db-invariants.test.ts
git commit -m "test: add 15 DB invariant checks against live Supabase data

INV-01 through INV-15 verify data consistency.
Known failures: INV-01 (format/lineup_size), INV-02/03/04 (event timing)."
```

---

### Task 3: Create Bug Regression File (4 Red Tests)

**Files:**
- Create: `src/lib/__tests__/bug-regression.test.ts`

**Step 1: Write the 4 bug regression tests**

Each test documents exactly one of the 4 reported bugs. These tests are INTENTIONALLY RED — they prove the bug exists.

```typescript
// @vitest-environment node
/**
 * Bug Regression Tests — Permanent Bug Graveyard
 *
 * Every fixed bug gets a test here that STAYS FOREVER.
 * Currently: 4 tests are RED (bugs not yet fixed).
 * After fixing: all should be GREEN.
 *
 * Run: npx vitest run src/lib/__tests__/bug-regression.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let sb: SupabaseClient;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

describe('Bug Regression — Known Bugs (should turn GREEN after fix)', () => {
  /**
   * BUG-001: 7er Events haben lineup_size=11
   *
   * Reported: 2026-03-20 by Anil
   * Root Cause: Event clone in cron does not copy lineup_size from template.
   *             DB default is 11, so all cloned 7er events get lineup_size=11.
   * Effect: Event card shows "7er" but modal shows 11 slots.
   * File: src/app/api/cron/gameweek-sync/route.ts:1144-1168
   */
  it('BUG-001: 7er events must have lineup_size=7', async () => {
    const { data, error } = await sb.from('events')
      .select('id, name, format, lineup_size')
      .eq('format', '7er')
      .neq('lineup_size', 7)
      .limit(5);

    expect(error).toBeNull();
    expect(
      data ?? [],
      'BUG-001: Found 7er events with lineup_size != 7. Fix: cron must set lineup_size from format.'
    ).toHaveLength(0);
  });

  /**
   * BUG-002: Events starten mit falschen Zeiten
   *
   * Reported: 2026-03-20 by Anil
   * Root Cause: Event clone uses fallback (NOW+7d) when fixtures lack played_at.
   *             Fixtures get played_at set AFTER events are cloned.
   * Effect: starts_at/locks_at don't match actual fixture kickoff times.
   * File: src/app/api/cron/gameweek-sync/route.ts:1121-1142
   */
  it('BUG-002: event locks_at must match first fixture kickoff, not creation time', async () => {
    const { data: events } = await sb.from('events')
      .select('id, name, gameweek, locks_at, starts_at')
      .in('status', ['registering', 'running'])
      .order('gameweek', { ascending: false })
      .limit(13);

    if (!events || events.length === 0) return;

    const latestGw = events[0].gameweek;
    const gwEvents = events.filter(e => e.gameweek === latestGw);

    const { data: fixtures } = await sb.from('fixtures')
      .select('played_at')
      .eq('gameweek', latestGw)
      .not('played_at', 'is', null)
      .order('played_at', { ascending: true })
      .limit(1);

    if (!fixtures || fixtures.length === 0) return;

    const firstKickoff = new Date(fixtures[0].played_at);
    for (const evt of gwEvents) {
      const locksAt = new Date(evt.locks_at);
      const diffHours = Math.abs(locksAt.getTime() - firstKickoff.getTime()) / 3_600_000;
      expect(
        diffHours,
        `BUG-002: Event "${evt.name}" locks_at is ${diffHours.toFixed(1)}h away from first kickoff. Should be <1h.`
      ).toBeLessThan(1);
    }
  });

  /**
   * BUG-003: Events sind "running" obwohl Spiele noch nicht begonnen haben
   *
   * Reported: 2026-03-20 by Anil
   * Root Cause: Cron score_events step transitions registering→running
   *             without checking if locks_at has passed.
   * Effect: Users cannot register for events because status is "running".
   * File: src/app/api/cron/gameweek-sync/route.ts:973-980
   */
  it('BUG-003: no event should be "running" while locks_at is in the future', async () => {
    const now = new Date().toISOString();
    const { data, error } = await sb.from('events')
      .select('id, name, status, locks_at, gameweek')
      .eq('status', 'running')
      .gt('locks_at', now);

    expect(error).toBeNull();
    expect(
      data ?? [],
      `BUG-003: Found ${(data ?? []).length} events that are "running" but locks_at hasn't passed. Users can't register.`
    ).toHaveLength(0);
  });

  /**
   * BUG-004: Cron setzt Events auf "running" ohne locks_at Check
   *
   * Reported: 2026-03-20 by Anil
   * Root Cause: score_events step (line 973-980) transitions ALL registering
   *             events to "running" without checking locks_at timestamp.
   *             Combined with BUG-002 (wrong locks_at), events go live too early.
   * Effect: Registration window closes days before matches.
   * Fix needed: Add `AND locks_at <= NOW()` guard before transition.
   *
   * This test verifies that registering events with future fixtures
   * should NOT have status "running".
   */
  it('BUG-004: events with future fixtures should be registering, not running', async () => {
    const now = new Date().toISOString();

    // Find gameweeks where ALL fixtures are still in the future
    const { data: futureFixtures } = await sb.from('fixtures')
      .select('gameweek')
      .gt('played_at', now)
      .eq('status', 'scheduled');

    if (!futureFixtures || futureFixtures.length === 0) return;

    const futureGws = Array.from(new Set(futureFixtures.map(f => f.gameweek)));

    // Check if any events for these future GWs are already "running"
    const { data: prematureEvents, error } = await sb.from('events')
      .select('id, name, status, gameweek')
      .in('gameweek', futureGws)
      .eq('status', 'running');

    expect(error).toBeNull();
    expect(
      prematureEvents ?? [],
      `BUG-004: Found ${(prematureEvents ?? []).length} events set to "running" for gameweeks where fixtures haven't started yet.`
    ).toHaveLength(0);
  });
});
```

**Step 2: Run tests — expect RED**

Run: `npx vitest run src/lib/__tests__/bug-regression.test.ts`
Expected: All 4 tests FAIL (bugs not yet fixed)

**Step 3: Commit**

```bash
git add src/lib/__tests__/bug-regression.test.ts
git commit -m "test: add 4 bug regression tests (intentionally RED)

BUG-001: 7er events with lineup_size=11
BUG-002: event locks_at doesn't match fixture kickoff
BUG-003: events running before locks_at
BUG-004: events running while fixtures still scheduled"
```

---

### Task 4: Create Test Helper file

**Files:**
- Create: `src/lib/__tests__/helpers/supabase-test-client.ts`

**Step 1: Create directory and file**

```bash
mkdir -p src/lib/__tests__/helpers
```

```typescript
// src/lib/__tests__/helpers/supabase-test-client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) throw new Error('Missing Supabase env vars in .env.local');

/** Service-role client — bypasses RLS. For read-only invariant checks. */
export function getAdminClient(): SupabaseClient {
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Anon client — respects RLS. For auth/permission tests. */
export function getAnonClient(): SupabaseClient {
  return createClient(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Authenticated bot client — for flow tests. */
export async function getBotClient(email: string, password = 'BeScout2026!'): Promise<{
  client: SupabaseClient;
  userId: string;
}> {
  const client = createClient(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Bot login failed for ${email}: ${error?.message}`);
  return { client, userId: data.user.id };
}
```

**Step 2: Commit**

```bash
git add src/lib/__tests__/helpers/supabase-test-client.ts
git commit -m "test: add shared test helpers (admin, anon, bot clients)"
```

---

### Task 5: Run Full Test Suite and Verify

**Step 1: Run all existing tests (should still pass)**

Run: `npx vitest run --exclude 'src/lib/__tests__/db-invariants.test.ts' --exclude 'src/lib/__tests__/bug-regression.test.ts'`
Expected: 267/267 PASS (no regressions)

**Step 2: Run DB invariants**

Run: `npx vitest run src/lib/__tests__/db-invariants.test.ts`
Expected: Mix of PASS and FAIL. Document which ones fail.

**Step 3: Run bug regression**

Run: `npx vitest run src/lib/__tests__/bug-regression.test.ts`
Expected: 4/4 FAIL (bugs confirmed)

**Step 4: Final commit with test results documented**

```bash
git add -A
git commit -m "test: Phase 1 complete — 15 DB invariants + 4 bug regression tests

DB Invariants: X/15 PASS, Y/15 FAIL (known data issues)
Bug Regression: 0/4 PASS (all 4 bugs confirmed, awaiting fix)"
```

---

## Summary

| Task | Files | Tests | Status |
|------|-------|-------|--------|
| 1 | helpers/supabase-test-client.ts | 0 | Helper |
| 2 | db-invariants.test.ts | 15 | Mix PASS/FAIL |
| 3 | bug-regression.test.ts | 4 | All RED |
| 4 | Run & verify | — | Confirmation |

**Total new tests: 19** (15 invariants + 4 bug regression)
**Expected runtime: <15 seconds**
**Expected result: ~11 PASS, ~8 FAIL (known bugs in live data)**
