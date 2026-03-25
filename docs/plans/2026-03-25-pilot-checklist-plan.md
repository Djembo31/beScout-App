# Pilot Checklist — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify all 4 layers (Infra, Data, Flows, Edge Cases) are pilot-ready for 50 Sakaryaspor beta testers.

**Architecture:** Sequential 4-layer audit. Each layer has concrete checks (SQL queries, CLI commands, Playwright tests). Findings are fixed inline as Tier 1-2 hotfixes before moving to the next layer. No new features — only verification and repair.

**Tech Stack:** Supabase SQL (via MCP), tsc, vitest, Playwright MCP, Vercel CLI

---

## Task 1: Schicht 1 — Build & TypeScript

**Files:**
- Check: `next.config.mjs`, `tsconfig.json`

**Step 1: Run tsc**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors. If errors exist → fix before continuing.

**Step 2: Run next build**

```bash
npx next build 2>&1 | tail -30
```

Expected: Build succeeds. Note any warnings (especially "NEXT_PUBLIC_" missing).

**Step 3: Run vitest**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -20
```

Expected: All tests pass. If failures → fix (Tier 1) before continuing.

**Step 4: Commit if fixes were needed**

```bash
git add -A && git commit -m "fix: pilot checklist — build/test fixes"
```

---

## Task 2: Schicht 1 — Vercel Env Vars & Cron

**Step 1: Check env var usage in code**

Grep all `NEXT_PUBLIC_` references and verify each has a value in `.env.local`:

```bash
grep -r "NEXT_PUBLIC_" src/ --include="*.ts" --include="*.tsx" -oh | sort -u
```

Cross-reference with `.env.local.example` — any missing?

**Step 2: Check cron config**

```
Read: vercel.json (crons section)
Read: src/app/api/cron/gameweek-sync/route.ts (first 30 lines — auth check)
```

Verify: schedule is `0 6 * * *` (Hobby Plan limit), CRON_SECRET is set.

**Step 3: Document findings**

Note any missing env vars or cron issues. Fix inline.

---

## Task 3: Schicht 1 — Sentry & PostHog Verification

**Step 1: Verify Sentry config**

```
Read: sentry.client.config.ts
```

Check: DSN present, `enabled: process.env.NODE_ENV === 'production'`, tracesSampleRate > 0.

**Step 2: Verify PostHog config**

```
Read: src/lib/posthog.ts
```

Check: Key present, host points to EU (`eu.i.posthog.com`), dev opt-out active.

**Step 3: Verify global-error.tsx captures to Sentry**

```
Read: src/app/global-error.tsx
```

Check: `Sentry.captureException(error)` is called.

**Step 4: Document status**

Both services configured correctly → proceed. If issues → fix inline.

---

## Task 4: Schicht 1 — PWA & Domain

**Step 1: Validate manifest**

```
Read: public/manifest.webmanifest
```

Check: `name`, `short_name`, `display: standalone`, `theme_color: #0a0a0a`, icons 192+512.

**Step 2: Validate service worker**

```
Read: public/sw.js (first 50 lines)
```

Check: Cache strategy exists, offline fallback registered.

**Step 3: Validate offline page**

```
Read: public/offline.html
```

Check: Page exists, shows friendly message.

**Step 4: Check CSP / security headers**

```
Read: next.config.mjs (headers section)
```

Note: If no CSP headers → document as post-pilot improvement (not a blocker).

---

## Task 5: Schicht 2 — Sakaryaspor Kader-Audit

**Step 1: Query player completeness**

```sql
-- Sakaryaspor players: completeness check
SELECT
  p.id, p.first_name, p.last_name, p.position,
  p.shirt_number, p.nationality, p.image_url,
  CASE WHEN p.image_url IS NULL OR p.image_url = '' THEN 'MISSING_IMAGE' ELSE 'ok' END AS img_status,
  CASE WHEN p.position IS NULL THEN 'MISSING_POS' ELSE 'ok' END AS pos_status
FROM players p
JOIN clubs c ON p.club_id = c.id
WHERE c.slug = 'sakaryaspor'
ORDER BY p.position, p.last_name;
```

Expected: All players have image_url, position, first_name, last_name. Flag any gaps.

**Step 2: Query stats completeness**

```sql
-- Players with missing L5/L15 scores
SELECT p.first_name, p.last_name, p.position,
  pgs.l5_avg, pgs.l15_avg
FROM players p
JOIN clubs c ON p.club_id = c.id
LEFT JOIN player_gameweek_scores pgs ON pgs.player_id = p.id
WHERE c.slug = 'sakaryaspor'
  AND (pgs.l5_avg IS NULL OR pgs.l5_avg = 0)
GROUP BY p.id, p.first_name, p.last_name, p.position, pgs.l5_avg, pgs.l15_avg
LIMIT 20;
```

Expected: Most active players have L5 > 0. GK/bench players may be 0 — acceptable.

**Step 3: Fix any data gaps**

If images missing → check Transfermarkt mapping. If stats missing → verify cron ran.

---

## Task 6: Schicht 2 — IPOs, Events & Preise

**Step 1: Query active IPOs**

```sql
-- Active IPOs for Sakaryaspor
SELECT i.id, p.first_name, p.last_name, i.status, i.price_cents,
  i.total_supply, i.sold_count, i.tranche_number
FROM ipos i
JOIN players p ON i.player_id = p.id
JOIN clubs c ON p.club_id = c.id
WHERE c.slug = 'sakaryaspor'
  AND i.status IN ('open', 'early_access', 'announced')
ORDER BY i.status, p.last_name;
```

Expected: 10-15 players with open/early_access IPOs. Prices between 500-5000 cents (5-50 $SCOUT).

**Step 2: Query active Fantasy events**

```sql
-- Active events
SELECT e.id, e.title, e.type, e.status, e.start_date, e.end_date,
  e.currency, e.entry_cost_cents
FROM events e
WHERE e.status IN ('open', 'upcoming', 'live')
ORDER BY e.start_date;
```

Expected: At least 1 open event. Free entry preferred for pilot.

**Step 3: Query welcome bonus config**

```sql
-- Check platform_settings for welcome bonus
SELECT key, value FROM platform_settings
WHERE key LIKE '%welcome%' OR key LIKE '%bonus%';
```

Verify: Amount is enough for 1-2 Scout Card purchases.

**Step 4: Sanity-check prices**

```sql
-- Price sanity: any 0 or extreme values?
SELECT p.first_name, p.last_name, p.market_price_cents, p.floor_price_cents
FROM players p
JOIN clubs c ON p.club_id = c.id
WHERE c.slug = 'sakaryaspor'
  AND (p.market_price_cents = 0 OR p.market_price_cents > 10000000
       OR p.floor_price_cents = 0)
LIMIT 10;
```

Expected: No rows (all prices reasonable). If found → investigate.

---

## Task 7: Schicht 2 — Club Page & Fixtures

**Step 1: Query Sakaryaspor club data**

```sql
SELECT id, name, slug, short_name, logo_url, primary_color, secondary_color,
  league_id, country
FROM clubs
WHERE slug = 'sakaryaspor';
```

Expected: All fields populated, logo_url valid.

**Step 2: Query upcoming fixtures**

```sql
-- Next 5 Sakaryaspor fixtures
SELECT f.id, f.gameweek, f.kickoff,
  h.name AS home, a.name AS away,
  f.home_formation, f.away_formation
FROM fixtures f
JOIN clubs h ON f.home_club_id = h.id
JOIN clubs a ON f.away_club_id = a.id
WHERE (f.home_club_id = (SELECT id FROM clubs WHERE slug = 'sakaryaspor')
    OR f.away_club_id = (SELECT id FROM clubs WHERE slug = 'sakaryaspor'))
  AND f.kickoff > NOW()
ORDER BY f.kickoff
LIMIT 5;
```

Expected: Upcoming fixtures exist with correct opponents and kickoff times.

**Step 3: Document findings**

All Sakaryaspor data complete → Gate 2 passed. Fix gaps inline.

---

## Task 8: Schicht 3 — Signup & Onboarding Flow

**Prerequisite:** Vercel preview deployment URL available.

**Step 1: Navigate to login page**

Playwright: Navigate to `{VERCEL_URL}/login`, viewport 360x800.
Screenshot: Login page renders correctly, no overflow.

**Step 2: Test signup form**

Fill email + password, submit. Verify: form validates, no console errors.
(Note: actual email confirmation may need to be tested manually or via Supabase dashboard)

**Step 3: Test onboarding steps (if test account available)**

Navigate through all 6 onboarding steps. Screenshot each.
Verify: No step is broken, back/forward navigation works, Sakaryaspor pre-selected.

**Step 4: Verify Home Dashboard**

After onboarding → Home page loads. Screenshot.
Verify: Portfolio section, events section, no "undefined", no empty sections without CTAs.

---

## Task 9: Schicht 3 — Market & Trading Flow

**Step 1: Navigate to Market**

Playwright: `/market`, viewport 360x800. Screenshot.
Verify: "Kaufen" tab shows players, "Mein Kader" tab shows holdings (or empty state with CTA).

**Step 2: Test player search**

Search for a Sakaryaspor player. Verify: results appear, no encoding issues.

**Step 3: Test buy flow**

Tap player → detail opens → buy button visible → tap buy → confirmation modal → confirm.
Verify: Wallet balance decreases, holding appears in "Mein Kader".

**Step 4: Test sell flow**

Navigate to "Mein Kader" → select holding → create sell order → verify in orderbook.
Cancel the sell order → verify it disappears.

---

## Task 10: Schicht 3 — Fantasy Flow

**Step 1: Navigate to Fantasy**

Playwright: `/fantasy`, viewport 360x800. Screenshot.
Verify: Events tab shows active event(s), tabs don't overflow.

**Step 2: Open event and build lineup**

Tap active event → lineup builder opens.
Select players for each position (GK, DEF, MID, ATT).
Select captain.

**Step 3: Submit lineup**

Tap submit → verify confirmation → lineup saved.
Navigate to "Meine Lineups" → verify lineup appears.

**Step 4: Screenshot results**

Screenshot the full lineup view. Verify: all players shown with photos, names, positions.

---

## Task 11: Schicht 3 — Community, Player Detail, Profile, Club, Notifications, i18n

**Step 1: Community flow**

Navigate to `/community`. Verify: feed loads, filter tabs work, can create a post (or see CTA).

**Step 2: Player Detail**

Tap any Sakaryaspor player → `/player/[id]`. Screenshot.
Verify: Stats, score, chart visible. Back button works.

**Step 3: Profile**

Navigate to `/profile`. Verify: Holdings, stats, achievements tabs work.
Navigate to another user's profile → public view loads.

**Step 4: Club page**

Navigate to `/club/sakaryaspor`. Verify: logo, kader, info. Abo flow if available.

**Step 5: Notifications**

Check notification bell → badge count, list renders, mark as read works.

**Step 6: Language switch**

Switch to TR → navigate 3-4 pages → all text Turkish, no fallback keys.
Switch back to DE → verify restored.

---

## Task 12: Schicht 4 — Edge Cases (Automated)

**Step 1: Empty wallet guard**

Set up test scenario where wallet = 0. Attempt buy. Verify: friendly error message, no crash.

**Step 2: Double-click protection**

Playwright: rapid-click buy button twice. Verify: only 1 trade executes (check DB or wallet).

**Step 3: Mobile overflow audit**

Playwright: viewport 360x800, navigate to all 10 routes:
`/`, `/market`, `/fantasy`, `/community`, `/profile`, `/club/sakaryaspor`,
`/player/[any-id]`, `/clubs`, `/compare`, `/missions`

For each: `document.documentElement.scrollWidth > document.documentElement.clientWidth` → must be false.

**Step 4: i18n audit**

Playwright: set locale to TR, navigate all routes.
Search visible text for patterns: `\.` (dot-separated keys like `market.buy`).
Any untranslated key = finding.

**Step 5: Empty state audit (fresh user)**

Create fresh test account (no holdings, no activity).
Navigate all routes. Screenshot each.
Verify: helpful empty states with CTAs, no "undefined", no blank pages.

---

## Task 13: Schicht 4 — Edge Cases (Manual / DB)

**Step 1: Turkish character search**

Search for players with Turkish chars: "Şahin", "Güçlü", etc.
Verify: results found, no encoding issues in display.

**Step 2: Concurrent trade safety**

```sql
-- Verify trading RPCs have proper locking
-- Check buy_player_dpc has SELECT ... FOR UPDATE or advisory lock
```

Review RPC source for concurrency guards. Document finding.

**Step 3: Session expiry behavior**

Manually expire auth token (clear cookies). Navigate to protected route.
Verify: redirect to /login, no spinner, no white screen.

**Step 4: Back button on all flows**

Navigate: Home → Market → Player → Back → Back.
Verify: each back step returns to expected page, no loop.

---

## Task 14: Final Report & Handoff

**Step 1: Compile findings**

Create `docs/plans/2026-03-25-pilot-checklist-results.md`:

```markdown
# Pilot Checklist — Results

## Date: 2026-03-25

## Schicht 1: Infra
| Check | Status | Notes |
|-------|--------|-------|
| ... | PASS/FAIL/FIXED | ... |

## Schicht 2: Daten
...

## Schicht 3: Flows
...

## Schicht 4: Edge Cases
...

## Summary
- Total checks: X
- Passed: X
- Fixed inline: X
- Open issues: X (with severity)

## Pilot Readiness: GO / NO-GO
```

**Step 2: Update session-handoff.md**

**Step 3: Commit results**

```bash
git add docs/plans/2026-03-25-pilot-checklist-results.md
git commit -m "docs: pilot checklist results — [GO/NO-GO]"
```
