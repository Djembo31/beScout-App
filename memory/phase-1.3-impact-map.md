---
name: Phase 1.3 Impact-Map — RPC DPC→SC Sanitize + 2 Function-Renames
description: CEO-Approval-Doku. Impact-Analyse aller Caller und Tests fuer den RPC-Sanitize + Rename. Geld-relevante Migrations → Approval-Trigger #1.
type: project
status: awaiting-ceo-approval
created: 2026-04-14
owner: CTO
---

# Phase 1.3 — RPC DPC→SC Sanitize + 2 Function-Renames

**Status:** 🔴 READY — awaiting CEO approval (Geld-relevante Migrations, Approval-Trigger #1)

**Aufwand-Schaetzung:** ~2h (75 Min Backend + 15 Min Impact + 30 Min Reviewer)

---

## Kategorie A: 14 RPCs — Description-String Sanitize (niedriges Risiko)

**Scope:** DPC→SC in RAISE/description strings innerhalb des Function-Bodies. KEINE Signatur-Aenderung, KEINE Rename, KEINE Caller-Code-Aenderung noetig.

**RPCs:**
1. accept_offer
2. award_mastery_xp
3. buy_from_ipo
4. buy_from_market
5. buy_from_order
6. calculate_fan_rank
7. create_ipo
8. create_offer
9. fn_mastery_on_trade
10. increment_mastery_hold_days
11. liquidate_player
12. place_buy_order
13. place_sell_order
14. refresh_airdrop_score

**Risiko:** Niedrig. Nur Strings in `RAISE EXCEPTION/NOTICE` oder `INSERT INTO transactions (description)`. Frontend hat bereits `cleanDescription()` Fallback (siehe Commit 34e2d5e). Kein Caller muss angepasst werden.

**Ausfuehrung:** 1 Migration pro RPC = 14 Migrations ODER 1 gesammelte Migration. Empfehlung: **1 gesammelte Migration** `20260414_rpc_sanitize_dpc_descriptions.sql` — weniger Registry-Eintraege, gleichzeitig deploybar.

---

## Kategorie B: 2 RPCs — Function-Renames (hoeheres Risiko — Caller in src/)

### B.1 `buy_player_dpc` → `buy_player_sc`

**Production Caller (1 Stueck):**
- `src/lib/services/trading.ts:88` — in `buyFromMarket()`: `supabase.rpc('buy_player_dpc', ...)`
- `src/lib/services/trading.ts:95` — Error-Message: `'buy_player_dpc returned null'`

**Test Caller (9 Stueck):**
- `src/lib/__tests__/boundaries/edge-cases.test.ts:63,64` — EDGE-01 (quantity=0 reject)
- `src/lib/__tests__/boundaries/edge-cases.test.ts:73,74` — EDGE-02 (quantity=301 reject)
- `src/lib/__tests__/boundaries/edge-cases.test.ts:116,117` — EDGE-06 (negative quantity reject)
- `src/lib/__tests__/auth/rls-checks.test.ts:96,97` — AUTH-03 (anon user cannot call)
- `src/lib/services/__tests__/trading.test.ts:190` — insufficient balance mock
- `src/lib/services/__tests__/trading.test.ts:198,200` — returns null handling
- `src/lib/services/__tests__/trading.test.ts:207,219` — successful trade mock

**Mock File (1 Stueck):**
- `src/test/mocks/supabase.ts:14` — Docstring example (Kommentar)

**Historische Migrations (NICHT aendern, nur Referenz):**
- `20260314120000_trading_missions_order_expiry.sql` (CREATE)
- `20260319_patch_rpcs_recalc_floor.sql` (Patch)
- `20260331_pbt_rpc_consistency.sql` (Patch)

**Impact-Summary:** 1 Production-Call, 9 Test-Calls, 1 Mock-Kommentar.

---

### B.2 `calculate_dpc_of_week` → `calculate_sc_of_week`

**Production Caller (1 Stueck — KRITISCH):**
- `src/app/api/cron/gameweek-sync/route.ts:1091` — `supabaseAdmin.rpc('calculate_dpc_of_week', ...)` — **CRON-ENDPOINT**

**Test Caller:** KEINE direkten Tests.

**Historische Migrations:**
- `20260314200000_fix_cron_auth_guards.sql`

**Impact-Summary:** 1 Cron-Endpoint Call. Kritisch weil Gameweek-Scoring-Pipeline davon abhaengt.

---

## Migration-Strategie (Empfehlung)

### Option A: Hard Rename (CREATE neu + DROP alt in einer Migration)
- Risiko: Zwischen Migration-Apply und Code-Deploy: Caller ruft geloeschte Function auf → Crash
- Nur OK wenn atomic Deploy garantiert

### Option B: Alias-Pattern (EMPFOHLEN)
- **Phase 1:** CREATE neue Function mit neuem Namen (gleicher Body). Alte Function bleibt als dunner Alias-Wrapper der zum neuen ruft.
- **Phase 2:** Code-Deploy — Caller migrieren auf neuen Namen
- **Phase 3:** Nach Verify: Alter Function DROP in separater Migration
- Vorteil: Reversibel, safer Cron-Pipeline

**Empfehlung fuer Production:** Option B fuer `calculate_dpc_of_week` (Cron-kritisch). Option A fuer `buy_player_dpc` ist akzeptabel wenn Migration + Code-Deploy in derselben PR/Commit laufen.

---

## Schritt-fuer-Schritt-Plan (nach Approval)

### Schritt 1: Kategorie A — Description-Sanitize (1 Migration, autonom)
1. `pg_get_functiondef()` fuer alle 14 RPCs lesen
2. Body-Strings extrahieren, DPC→SC in description text only replacen
3. 1 gesammelte Migration `20260414_rpc_sanitize_dpc_descriptions.sql`
4. Apply via `mcp__supabase__apply_migration`
5. Verify: `SELECT prosrc FROM pg_proc WHERE proname IN (...) AND prosrc LIKE '%DPC%'` → 0 rows

### Schritt 2: Kategorie B.1 — `buy_player_dpc` Rename
1. CREATE neue Function `buy_player_sc` mit identischem Body (aber DPC→SC in strings)
2. Alte Function `buy_player_dpc` → Alias-Wrapper: `CREATE OR REPLACE FUNCTION buy_player_dpc(...) AS $$ SELECT buy_player_sc(...); $$`
3. Service + Tests updaten: alle `'buy_player_dpc'` Strings → `'buy_player_sc'`
4. tsc + vitest auf trading.test.ts + edge-cases.test.ts + rls-checks.test.ts
5. Reviewer Agent (Opus) prueft Geld-Invarianten
6. Deploy
7. Nach 1-2 Sessions Verify: alte Function DROP (separate Migration)

### Schritt 3: Kategorie B.2 — `calculate_dpc_of_week` Rename
1. CREATE neue Function `calculate_sc_of_week` (Alias-Pattern wie B.1)
2. Cron-Endpoint updaten: `route.ts:1091`
3. tsc clean
4. Reviewer Agent prueft Cron-Pipeline
5. Deploy
6. Nach Verify (1 Gameweek-Durchlauf): alte Function DROP

---

## Test-Strategie

- **Vor jeder Migration:** `supply-invariant.test.ts` muss gruen sein
- **Nach jeder Migration:** `npx vitest run src/lib/services/__tests__/trading.test.ts` 
- **Nach B.1:** Edge-Cases + RLS-Checks aus `__tests__/boundaries/` + `__tests__/auth/`
- **Nach B.2:** Manuelle Verifikation Cron-Endpoint via `mcp__supabase__execute_sql` (Dry-Run der RPC mit test-season-params)
- **Reviewer Agent Gate:** Geld-Invarianten pruefen, Rename-Vollstaendigkeit pruefen

---

## Approval-Request

**CEO-Entscheidung noetig:**
- [ ] Kategorie A (14 RPCs Sanitize) freigegeben? — niedriges Risiko, 1 Migration
- [ ] Kategorie B.1 (buy_player_dpc Rename) freigegeben? — Alias-Pattern, 10 Caller
- [ ] Kategorie B.2 (calculate_dpc_of_week Rename) freigegeben? — Alias-Pattern, 1 Cron-Caller

Nach Approval: autonome Execution in 1 Session (~2h).
