# Economy Admin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move all hardcoded economy values to DB tables with strict typing, make them editable via bescout-admin "Economy" tab.

**Architecture:** 5 new DB tables seeded with current values. New service + query hooks read from DB. 8 DB triggers + 3 RPCs rewritten to read from config tables. New admin tab with 6 sections for inline editing. Frontend constants replaced with DB-driven hooks.

**Tech Stack:** PostgreSQL (tables + triggers + RPCs), TypeScript service layer, React Query hooks, Next.js admin UI components.

**Design Doc:** `docs/plans/2026-03-30-economy-admin-design.md`

---

## Phase 1: DB Tables + Seed Data

### Task 1: Create 5 economy config tables with initial values

**Files:**
- Create: `supabase/migrations/20260330_economy_config_tables.sql`

**Step 1: Write migration SQL**

Creates 5 tables with CHECK constraints, UNIQUE constraints, RLS policies, and INSERT seeds:

1. `elo_config` — 17 rows (trader/manager/analyst deltas)
2. `rang_thresholds` — 12 rows (Bronze I through Legendaer)
3. `score_road_config` — 11 rows (milestones with rewards)
4. `manager_points_config` — 15 rows (8 normal + 7 small event)
5. `streak_config` — 7 rows (streak benefit tiers)

RLS: SELECT for `authenticated`, UPDATE for platform_admins only (checked via `EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())`).

**Step 2: Apply migration via Supabase MCP**

Run the SQL via `mcp__supabase__execute_sql`.

**Step 3: Verify tables exist with correct row counts**

```sql
SELECT 'elo_config' as t, COUNT(*) FROM elo_config
UNION ALL SELECT 'rang_thresholds', COUNT(*) FROM rang_thresholds
UNION ALL SELECT 'score_road_config', COUNT(*) FROM score_road_config
UNION ALL SELECT 'manager_points_config', COUNT(*) FROM manager_points_config
UNION ALL SELECT 'streak_config', COUNT(*) FROM streak_config;
```

Expected: 17, 12, 11, 15, 7

---

## Phase 2: Types + Service + Query Hooks

### Task 2: Add TypeScript types for all 5 config tables

**Files:**
- Modify: `src/types/index.ts`

Add types: `DbEloConfig`, `DbRangThreshold`, `DbScoreRoadConfig`, `DbManagerPointsConfig`, `DbStreakConfig`.

### Task 3: Create economyConfig service (CRUD)

**Files:**
- Create: `src/lib/services/economyConfig.ts`

Functions:
- `getEloConfig()` → `DbEloConfig[]`
- `getRangThresholds()` → `DbRangThreshold[]`
- `getScoreRoadConfig()` → `DbScoreRoadConfig[]`
- `getManagerPointsConfig()` → `DbManagerPointsConfig[]`
- `getStreakConfig()` → `DbStreakConfig[]`
- `updateEloConfig(adminId, id, fields)` → `{ok: boolean}`
- `updateRangThreshold(adminId, id, fields)` → `{ok: boolean}`
- `updateScoreRoadConfig(adminId, id, fields)` → `{ok: boolean}`
- `updateManagerPointsConfig(adminId, id, fields)` → `{ok: boolean}`
- `updateStreakConfig(adminId, id, fields)` → `{ok: boolean}`

Pattern: Follow `platformAdmin.ts` for admin service structure.

### Task 4: Add query key factory entries

**Files:**
- Modify: `src/lib/queries/keys.ts`

Add `qk.economy.elo`, `qk.economy.rang`, `qk.economy.scoreRoad`, `qk.economy.managerPoints`, `qk.economy.streak`.

### Task 5: Create React Query hooks

**Files:**
- Create: `src/lib/queries/economyConfig.ts`

Hooks: `useEloConfig()`, `useRangThresholds()`, `useScoreRoadConfig()`, `useManagerPointsConfig()`, `useStreakConfig()`. All with `staleTime: 5 * 60 * 1000`.

### Task 6: Commit Phase 2

```
feat: economy config types, service, and query hooks
```

---

## Phase 3: DB Helper Functions + Trigger Rewrites

### Task 7: Create DB helper functions that read from config tables

**Files:**
- Create: `supabase/migrations/20260330_economy_helper_functions.sql`

5 helper functions:

```sql
fn_get_elo_delta(p_dimension TEXT, p_event_type TEXT) → INT
-- Reads from elo_config WHERE dimension = p_dimension AND event_type = p_event_type AND active

fn_get_elo_delta_conditional(p_dimension TEXT, p_event_type TEXT, p_value NUMERIC) → INT
-- For graduated deltas (profit ranges). Reads from elo_config with condition matching.

fn_get_rang_id_dynamic(p_score INT) → INT
-- Reads from rang_thresholds WHERE p_score BETWEEN min_score AND COALESCE(max_score, 999999)

fn_get_rang_name_dynamic(p_score INT) → TEXT
-- Same as above, returns rang_name

fn_get_manager_points_dynamic(p_rank INT, p_total INT) → INT
-- If p_total < 20: reads small_event rows from manager_points_config
-- Else: reads normal rows, calculates percentile
```

### Task 8: Rewrite all 8 trigger functions to use config tables

**Files:**
- Create: `supabase/migrations/20260330_economy_triggers_rewrite.sql`

Rewrite each trigger function:

1. `fn_trader_score_on_trade()` — Replace hardcoded 5/30/50/30/10/-10/-30/-20 with `fn_get_elo_delta()` and `fn_get_elo_delta_conditional()` calls
2. `fn_analyst_score_on_post()` — Replace hardcoded 3 with `fn_get_elo_delta('analyst','post_create')`
3. `fn_analyst_score_on_research()` — Replace 3/5 with config reads
4. `trg_fn_research_unlock_gamification()` — Replace 5 with config read
5. `trg_fn_post_vote_gamification()` — Replace 1/-2 with config reads
6. `trg_fn_follow_gamification()` — Replace 2 with config read
7. `trg_fn_event_scored_manager()` — Replace CASE statements with `fn_get_manager_points_dynamic()`
8. `award_dimension_score()` — Replace `get_rang_id()` / `get_rang_name()` with dynamic versions

### Task 9: Rewrite score_event RPC to read streak config from DB

**Files:**
- Create: `supabase/migrations/20260330_economy_score_event_rewrite.sql`

In `score_event()` RPC:
- Replace hardcoded streak thresholds (7/60 days → 5%/15%) with:
  ```sql
  SELECT fantasy_bonus_pct FROM streak_config
  WHERE min_days <= v_user_streak ORDER BY min_days DESC LIMIT 1
  ```
- Replace hardcoded tier bonuses threshold if needed

In `calculate_fan_rank()` RPC:
- Replace hardcoded elo_boost_pct thresholds with `streak_config` read

In `claim_score_road()` RPC:
- Replace hardcoded milestone check with `score_road_config` table read

### Task 10: Apply all migrations + verify triggers work

Run all SQL via Supabase MCP. Test:
1. `SELECT fn_get_elo_delta('trader','trade_buy')` → should return 5
2. `SELECT fn_get_rang_id_dynamic(1500)` → should return 5 (Silber II)
3. `SELECT fn_get_manager_points_dynamic(1, 30)` → should return 50

### Task 11: Commit Phase 3

```
feat: economy config DB helpers + trigger rewrites
```

---

## Phase 4: Frontend Umstellung

### Task 12: Replace SCORE_ROAD constant with DB-driven data

**Files:**
- Modify: `src/lib/gamification.ts` — Keep `SCORE_ROAD` as FALLBACK, add `getScoreRoadFromDb()` async function
- Modify: `src/components/gamification/ScoreRoadCard.tsx` — Use `useScoreRoadConfig()` with SCORE_ROAD fallback
- Modify: `src/components/gamification/ScoreRoadStrip.tsx` — Same pattern

Pattern:
```typescript
const { data: dbScoreRoad } = useScoreRoadConfig();
const scoreRoad = dbScoreRoad?.map(r => ({
  score: r.score_threshold, rangName: r.rang_name, rangI18nKey: r.rang_i18n_key,
  rewardBsd: r.reward_cents, rewardLabel: r.reward_label, rewardType: r.reward_type,
})) ?? SCORE_ROAD; // Fallback to hardcoded
```

### Task 13: Replace getRang() to support DB-driven thresholds

**Files:**
- Modify: `src/lib/gamification.ts`

Keep existing `getRang()` as sync fallback. Add `getRangFromThresholds(score, thresholds)` that takes DB data. Components that have access to the hook data pass it in; pure functions fall back to hardcoded.

The VISUAL properties (colors, gradients) stay in RANG_DEFS — they're CSS, not economy tuning. Only `minScore`/`maxScore` come from DB.

### Task 14: Replace streakBenefits to support DB-driven config

**Files:**
- Modify: `src/lib/streakBenefits.ts`

Keep `STREAK_TIERS` as fallback. Add `getStreakBenefitsFromConfig(streakDays, config)` that takes DB data:
```typescript
export function getStreakBenefitsFromConfig(streakDays: number, config: DbStreakConfig[]): StreakBenefits {
  const sorted = [...config].sort((a, b) => b.min_days - a.min_days);
  const tier = sorted.find(t => streakDays >= t.min_days) ?? sorted[sorted.length - 1];
  return { dailyTickets: tier.daily_tickets, ... };
}
```

Update consumers:
- `src/app/(app)/hooks/useHomeData.ts` — use `useStreakConfig()` if available
- Any component calling `getStreakBenefits()` or `getStreakBenefitLabels()`

### Task 15: Commit Phase 4

```
feat: frontend economy constants → DB-driven with fallbacks
```

---

## Phase 5: Admin UI

### Task 16: Create AdminEconomyTab component

**Files:**
- Create: `src/app/(app)/bescout-admin/AdminEconomyTab.tsx`

6 collapsible sections:

1. **Elo-Punkte** — Table grouped by dimension (Trader/Manager/Analyst), columns: event_type, delta, description, active. Inline edit on delta + active toggle.
2. **Raenge** — Table: rang_name, tier_number, min_score, max_score. Inline edit on scores.
3. **Score Road** — Table: score_threshold, rang_name, reward_cents (formatted as $SCOUT), reward_label, reward_type. Inline edit.
4. **Manager Points** — 2 sub-tables: Normal (percentile) + Small Event (rank). Inline edit on points.
5. **Streak Benefits** — Table: min_days, daily_tickets, fantasy_bonus_pct, elo_boost_pct, free_boxes, box_discount. Inline edit.
6. **Missions** — Full CRUD. Table: key, type, title, target_value, reward_cents, active. Create new + edit + deactivate toggle.

Each section:
- Header with count badge
- Save button per row (like AdminFeesTab pattern)
- `updated_by` display (profile handle)
- Toast on success/error
- Only editable for admin/superadmin role

Props: `{ adminId: string; role: PlatformAdminRole }`

### Task 17: Register Economy tab in BescoutAdminContent

**Files:**
- Modify: `src/app/(app)/bescout-admin/BescoutAdminContent.tsx`

1. Add `'economy'` to `AdminTab` type
2. Add `economy: Coins` to `TAB_ICONS` (import `Coins` from lucide-react)
3. Add `'economy'` to `TAB_ORDER` (after 'fees')
4. Add lazy import: `const AdminEconomyTab = dynamic(() => import('./AdminEconomyTab').then(m => ({ default: m.AdminEconomyTab })))`
5. Add case in tab renderer

### Task 18: Add i18n keys for Economy tab

**Files:**
- Modify: `messages/de.json` — Add `bescoutAdmin.economy*` keys
- Modify: `messages/tr.json` — Same keys in Turkish

Keys needed: `tabEconomy`, `eloConfig`, `rangThresholds`, `scoreRoad`, `managerPoints`, `streakBenefits`, `missions`, `dimension`, `eventType`, `delta`, `active`, `minScore`, `maxScore`, section headers, save/edit labels.

### Task 19: Commit Phase 5

```
feat: Admin Economy tab with 6 editable sections
```

---

## Phase 6: Verification

### Task 20: tsc + vitest

Run `tsc --noEmit` and `vitest run` for affected test files.

### Task 21: DB Smoke Test

1. Change a value in Admin UI (e.g. `elo_config` trader/trade_buy delta from 5 to 6)
2. Verify the trigger reads the new value: execute a test trade, check `score_history` for delta=6
3. Revert the value back to 5

### Task 22: Holistic Review

Read ALL changed files. Verify:
- No hardcoded values remain that should be in DB
- All fallbacks work (DB read failure → hardcoded defaults)
- RLS policies correct (authenticated=SELECT, admin=UPDATE)
- No circular dependencies
- All `updated_by` fields populated on saves

### Task 23: Final Commit + Push

```
feat: Economy Admin — complete implementation
```

---

## Summary

| Phase | Tasks | Estimated |
|-------|-------|-----------|
| 1: DB Tables | 1 | 30 min |
| 2: Types + Service + Hooks | 2-6 | 45 min |
| 3: DB Helpers + Triggers | 7-11 | 1.5h |
| 4: Frontend Umstellung | 12-15 | 1h |
| 5: Admin UI | 16-19 | 1.5h |
| 6: Verification | 20-23 | 30 min |
| **Total** | **23 Tasks** | **~5.5h** |

**Critical Path:** Phase 1 → Phase 3 (DB must exist before triggers can read from it). Phase 2 and Phase 3 can partially overlap. Phase 4+5 depend on Phase 2.
