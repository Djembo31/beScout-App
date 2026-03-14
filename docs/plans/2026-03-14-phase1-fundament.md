# Phase 1: Fundament — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Alles was existiert bulletproof machen — kein User darf je einen Fehler sehen.

**Architecture:** 7 unabhaengige Tasks (3 von 10 bereits erledigt). Jeder Task standalone,
parallel ausfuehrbar. Gate am Ende: Build clean, Tests gruen, Lighthouse >80, Console 0 Errors.

**Tech Stack:** Next.js 14 / TypeScript strict / Supabase / Vitest / Playwright

**Already Verified (kein Handlungsbedarf):**
- Item 1.2 Hydration: CLEAN (0 unsafe useState patterns, grep verified)
- Item 1.8 Error Boundaries: COMPLETE (15 route-level error.tsx files)
- Item 1.9 SW Cache Purge: WORKING (aggressive purge on activate, self.clients.claim)

---

### Task 1: CSP Headers + Security Hardening (Item 1.1)

**Files:**
- Modify: `vercel.json` (lines 12-21, headers array)
- Modify: `next.config.mjs` (if nonce needed)

**Step 1: Inventory external origins**

Grep all external URLs in the codebase:
```bash
grep -roh "https://[a-zA-Z0-9._-]*" src/ public/ --include="*.ts" --include="*.tsx" --include="*.js" | sort -u
```

Expected origins:
- `*.supabase.co` (API + Auth + Storage)
- `eu.posthog.com` (Analytics)
- `v3.football.api-sports.io` (API-Football)
- `upload.wikimedia.org` (Player photos fallback)
- `media-*.api-sports.io` (Player/team photos)

**Step 2: Add CSP header to vercel.json**

Add to the `headers` array in `vercel.json`:
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://eu.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://upload.wikimedia.org https://media-*.api-sports.io https://media.api-sports.io; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://eu.posthog.com https://v3.football.api-sports.io; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
}
```

Also add:
```json
{ "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
{ "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
```

**Step 3: Deploy preview + verify**

```bash
npx next build
```
Verify: No CSP violations in browser console on any route.

**Step 4: Commit**

```bash
git add vercel.json
git commit -m "security: add CSP + Permissions-Policy + HSTS headers"
```

---

### Task 2: Fantasy API & Cron Stabilisierung (Item 1.3)

**Files:**
- Audit: `src/app/api/cron/gameweek-sync/route.ts` (1252 lines)
- Create: `memory/features/fantasy-api-cron.md` (feature spec)

**Step 1: Read the cron route fully and document**

Read `src/app/api/cron/gameweek-sync/route.ts` — the 1252-line cron job that:
1. Imports fixtures from API-Football
2. Matches players by name + shirt number
3. Calculates fantasy points
4. Creates/closes gameweek events
5. Scores lineups
6. Expires pending orders/offers

**Step 2: Identify edge cases and failure modes**

Check for:
- What happens when API-Football is down? (timeout, retry?)
- What happens when a fixture is postponed/cancelled?
- What happens when player matching fails? (unmatched players)
- What happens when the cron runs twice? (idempotency)
- Are there any hardcoded season/league IDs that need updating?

**Step 3: Write feature spec documenting findings**

Create `memory/features/fantasy-api-cron.md` with:
- Current behavior (what the cron does step by step)
- Known issues/gaps
- Recovery procedures
- Performance baseline (how long does a run take?)

**Step 4: Fix any critical issues found**

If the audit reveals bugs: fix, test, commit individually.

**Step 5: Run cron manually to verify**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/gameweek-sync
```

**Step 6: Commit documentation**

```bash
git add memory/features/fantasy-api-cron.md
git commit -m "docs: document Fantasy API & Cron system behavior and edge cases"
```

---

### Task 3: Admin Event Management (Item 1.4)

**Files:**
- Audit: `src/components/admin/AdminEventsTab.tsx` (606 lines)
- Audit: `src/components/admin/RewardStructureEditor.tsx` (189 lines)
- Test: `e2e/admin.spec.ts`

**Step 1: Manual QA of AdminEventsTab**

Navigate to `/club/sakaryaspor/admin` (requires login as club admin).
Test every action:
- [ ] Create new event (all fields)
- [ ] Set reward structure (6 tiers)
- [ ] Transition event: upcoming → registering → running → scoring → ended
- [ ] Cancel event
- [ ] Edit event details while in different states
- [ ] Check mobile layout (360px)

**Step 2: Document findings**

For each broken/incomplete flow, document:
- What fails
- Where (component:line)
- Fix needed

**Step 3: Fix issues found**

For each issue: fix → build → test → commit.

**Step 4: Verify E2E covers admin event flow**

Read `e2e/admin.spec.ts` — does it test event creation/lifecycle?
If not: add critical path E2E test.

**Step 5: Commit all fixes**

```bash
git commit -m "fix(admin): complete event management lifecycle"
```

---

### Task 4: E2E Test Completeness (Item 1.5)

**Files:**
- Modify: `e2e/player-detail.spec.ts` (6 skipped tests)
- Create: `e2e/fixtures/seed-data.ts` (test data seeding)

**Step 1: Understand why tests skip**

The 6 tests in `player-detail.spec.ts` skip when:
- No players exist in the market
- No prices visible
- No buy button available

This is a DATA problem, not a code problem.

**Step 2: Create E2E seed data helper**

Create `e2e/fixtures/seed-data.ts` that:
- Creates a test player with known data
- Places a sell order (so market has listings)
- Creates an IPO (so club sale exists)

Use Supabase admin client (service role key) for seeding.

**Step 3: Wire seed into player-detail tests**

```typescript
test.beforeAll(async () => {
  await seedTestPlayer();
});
test.afterAll(async () => {
  await cleanupTestPlayer();
});
```

**Step 4: Remove conditional skips**

Replace `if (!ok) { test.skip(); return; }` with assertions that expect data.

**Step 5: Run full E2E suite**

```bash
npx playwright test --reporter=html
```

Verify: 0 skipped, 68+ passed.

**Step 6: Commit**

```bash
git add e2e/
git commit -m "test(e2e): add seed data, fix 6 skipped player-detail tests"
```

---

### Task 5: Vitest Config Fix (Item 1.6)

**Files:**
- Modify: `vitest.config.ts` (line 11, exclude array)

**Step 1: Add worktree exclusion**

```typescript
exclude: ['backup/**', 'node_modules/**', '.next/**', 'e2e/**', '.claude/**'],
```

**Step 2: Verify**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -5
```

Expected: `Test Files  30 passed (30)` — no more stale worktree failures.

**Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "fix(test): exclude .claude worktrees from vitest"
```

---

### Task 6: Data Integrity Audit (Item 1.7)

**Files:**
- Audit: `src/lib/services/trading.ts` (all 4 buy functions)
- Audit: `src/lib/services/ipo.ts` (buyFromIpo)
- Audit: `src/lib/services/offers.ts` (acceptOffer)
- Test: `src/__tests__/trading*.test.ts`

**Step 1: Parity matrix verification**

For each of the 4 buy paths, verify:
```
| Check                    | buyFromMarket | buyFromOrder | buyFromIpo | acceptOffer |
|--------------------------|---------------|--------------|------------|-------------|
| Balance check            | ?             | ?            | ?          | ?           |
| Advisory lock            | ?             | ?            | ?          | ?           |
| Fee calculation          | ?             | ?            | ?          | ?           |
| PBT credit               | ?             | ?            | ?          | ?           |
| Club treasury credit     | ?             | ?            | ?          | ?           |
| Holdings update          | ?             | ?            | ?          | ?           |
| Trade record             | ?             | ?            | ?          | ?           |
| Transaction records      | ?             | ?            | ?          | ?           |
| Mission tracking         | ?             | ?            | ?          | ?           |
| Achievement check        | ?             | ?            | ?          | ?           |
| Seller notification      | ?             | ?            | ?          | N/A         |
| Activity log             | ?             | ?            | ?          | ?           |
| Cache invalidation       | ?             | ?            | ?          | ?           |
| Circular trade guard     | ?             | ?            | N/A        | N/A         |
| Velocity guard           | ?             | ?            | N/A        | N/A         |
| Liquidation check        | ?             | ?            | ?          | ?           |
| Club admin block         | ?             | ?            | ?          | ?           |
```

Use `/impact` skill to verify each cell.

**Step 2: Fill the matrix by reading RPCs**

For each RPC, grep the latest migration that defines it:
```bash
grep -r "CREATE OR REPLACE FUNCTION buy_player_dpc" supabase/migrations/ -l | tail -1
```

Read the full function body and verify each guard.

**Step 3: Document gaps**

Write findings to `memory/features/data-integrity-audit.md`.

**Step 4: Fix any gaps found**

Each gap: migration → service → test → commit.

**Step 5: Commit audit results**

```bash
git commit -m "audit: verify data integrity across all 4 trade paths"
```

---

### Task 7: Dependency + Env Cleanup (Item 1.10)

**Files:**
- Modify: `package.json`
- Modify: `.env.local.example`

**Step 1: Move devtools to devDependencies**

```bash
npm install --save-dev @tanstack/react-query-devtools
```

This moves it from `dependencies` to `devDependencies` in package.json.

**Step 2: Move sharp to dependencies**

```bash
npm install sharp
```

**Step 3: Update .env.local.example**

Add missing env vars:
```
# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Feature Flags
NEXT_PUBLIC_GEOFENCING_ENABLED=true
```

**Step 4: Verify build**

```bash
npx next build
```

**Step 5: Commit**

```bash
git add package.json package-lock.json .env.local.example
git commit -m "chore: fix dependency placement + document all env vars"
```

---

## Execution Order (empfohlen)

Parallel-faehig (keine Abhaengigkeiten untereinander):

```
Wave 1 (parallel, 30 min):
  - Task 5: Vitest Config Fix (5 min)
  - Task 7: Dependency Cleanup (10 min)
  - Task 1: CSP Headers (20 min)

Wave 2 (parallel, 2-3h):
  - Task 6: Data Integrity Audit (2h)
  - Task 4: E2E Test Seeding (1.5h)
  - Task 2: Fantasy Cron Audit (2h)

Wave 3 (sequential, needs login):
  - Task 3: Admin Event QA (1-2h, needs browser login)

Final Gate:
  - npx next build → clean
  - npx vitest run → 530/530 pass (30/30 files)
  - npx playwright test → 68/68 pass (0 skipped)
  - Lighthouse Performance → >80
  - Browser Console → 0 errors
```

---

## Phase 1 Gate Checklist

- [ ] `npx next build` → 0 errors
- [ ] `npx vitest run` → 30/30 test files, 530/530 tests pass
- [ ] `npx playwright test` → 68+ tests, 0 skipped, 0 failed
- [ ] Browser Console (Prod) → 0 errors, 0 warnings (excl. 3rd party)
- [ ] Lighthouse Performance → >80 (mobile)
- [ ] Lighthouse Best Practices → >90
- [ ] CSP Header active in response headers
- [ ] HSTS + Permissions-Policy headers active
- [ ] All 4 trade paths verified (parity matrix complete)
- [ ] .env.local.example documents all 14 env vars
- [ ] Fantasy cron documented with edge cases
- [ ] Admin event lifecycle works end-to-end
