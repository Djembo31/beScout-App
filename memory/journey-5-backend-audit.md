---
name: Journey 5 — Backend Audit (Mystery Box)
description: Backend-Audit fuer Mystery Box — RPC `open_mystery_box_v2`, Daily-Cap-Logic, Reward-Distribution, Supply-Invariant, RLS, Migration-Drift, Column-Contract-Drift.
type: project
status: ready-for-aggregate
created: 2026-04-14
---

# Journey #5 — Backend Audit (Mystery Box)

**Scope:** `open_mystery_box_v2` RPC (SECURITY DEFINER), Daily-Cap-Logic, Reward-Distribution (tickets/equipment/bcredits/cosmetic), Supply-Invariant (credits-minting), RLS `mystery_box_results` + `user_equipment`, Migration-Drift-Scan, Column-Contract-Drift, `open_mystery_box` (v1) Legacy.

**Total: 13 Findings — 3 CRITICAL + 5 HIGH + 3 MEDIUM + 2 LOW**

**Live-DB Facts (2026-04-14):**
- 25 total Mystery Box opens (7 free, 18 paid — letztere Legacy v1)
- 7 distinct users
- 0 bcredits minted (trotz legendary/mythic Drops mit bcredits-reward-type)
- 1255 tickets minted via ticket_transactions (`source='mystery_box'`, 37 rows, total_amount 987 — positive minus mystery_box costs)
- Equipment-Drops source=mystery_box: letzte 2026-04-08 (VOR Fix-Migration) — NULL seit 2026-04-11 Fix

---

## CRITICAL

### J5B-01 CRITICAL — Equipment-INSERT nutzt nicht-existente Spalte `equipment_rank` (LIVE BROKEN)

**Live-RPC-Body (pg_get_functiondef):**
```sql
INSERT INTO public.user_equipment (user_id, equipment_key, equipment_rank, source)
VALUES (v_uid, v_eq_key, v_eq_rank, 'mystery_box');
```

**Live-Tabelle:**
```sql
Column: rank (NOT equipment_rank)
```

**Beweis:**
```sql
SELECT COUNT(*) FILTER (WHERE prosrc ILIKE '%user_equipment (user_id, equipment_key, equipment_rank%') AS uses_equipment_rank,
       COUNT(*) FILTER (WHERE prosrc ILIKE '%user_equipment (user_id, equipment_key, rank%') AS uses_rank
FROM pg_proc WHERE proname = 'open_mystery_box_v2';
→ uses_equipment_rank: 1, uses_rank: 0
```

**Impact:** JEDER Equipment-Drop seit Fix-Migration `20260411114600_mystery_box_equipment_branch_fix.sql` crasht mit PG-Error `column "equipment_rank" of relation "user_equipment" does not exist`. User sehen Modal-Result mit Equipment-Namen (aus der Zufallsauswahl aus `equipment_definitions`), aber DB-Row in `user_equipment` fehlt.

**ZWEITE Impact-Dimension:** Das `mystery_box_results`-INSERT kommt VOR dem CASE-statement, NEIN — Moment, Re-Lesen: es kommt NACH dem CASE. Also: PG-Error im CASE-Branch `'equipment'` → gesamter RPC-Call wirft Exception → `mystery_box_results` wird NICHT persistiert → Daily-Cap oeffnet nicht → User kann MEHRMALS versuchen → bei zufaelliger anderer Rarity klappt es, bei Equipment-Rarity jede Mal Fehler.

**Praxis:** Wenn User pech hat und mehrmals hintereinander Equipment-Rarity zieht, kommt er endlos an den Fehler. Live-Data zeigt 3 Equipment-Drops VOR 2026-04-08, dann 0 — bestaetigt das Pattern.

**Fix:** RPC-Body fix → INSERT-Spalte auf `rank` aendern. Migration needed. → **AR-43 Geld-Relevant (Equipment ist Reward)**.

### J5B-02 CRITICAL — Mystery Box-Daily-Cap Race-Condition (no row lock on check)

**Live-RPC-Body:**
```sql
IF p_free THEN
  SELECT COUNT(*) INTO v_free_today
  FROM public.mystery_box_results
  WHERE user_id = v_uid AND ticket_cost = 0 AND opened_at >= ...;
  IF v_free_today >= 1 THEN RETURN error; END IF;
END IF;
-- Kein FOR UPDATE, kein lock auf user_tickets fuer p_free=true
...
-- INSERT into mystery_box_results at end
```

**Problem:** User koennte 2x parallel (2 Devices, oder 2 Browser-Tabs) `p_free=true` triggern. Beide sehen COUNT=0, beide kriegen Reward, beide INSERTen. Dann `v_free_today=2` — aber beide schon durch.

**Live-Check:** Aktuell keine Doppel-Opens am gleichen Tag (GROUP BY user_id, day HAVING COUNT>1 = empty). Aber das ist survivorship-bias; die Race kann jederzeit treffen bei schneller Doppel-Click.

**Fix:** Advisory-Lock oder `INSERT ... ON CONFLICT` mit UNIQUE-Index auf `(user_id, DATE(opened_at AT TIME ZONE 'UTC')) WHERE ticket_cost=0` — letzteres ist der sauberste Fix.

### J5B-03 CRITICAL — RPC hat KEIN REVOKE-Block fuer anon (aber Live-Check: anon=false)

**Live-Check:**
```
has_function_privilege('anon', 'open_mystery_box_v2(boolean)', 'EXECUTE') = false
has_function_privilege('authenticated', 'open_mystery_box_v2(boolean)', 'EXECUTE') = true
```

Live ist anon korrekt geblockt. ABER: Migration 20260406180000 (original) hat nur am ENDE `REVOKE ALL ON FUNCTION public.open_mystery_box_v2 FROM PUBLIC, anon;` und dann `GRANT EXECUTE TO authenticated;`. Die Fix-Migrations 20260411114500/114600/114700 haben `CREATE OR REPLACE FUNCTION` ausgefuehrt — das RESETTET Privileges auf Postgres-Default (PUBLIC/authenticated/anon/service_role alle EXECUTE). Warum ist es LIVE korrekt gelocked?

**Hypothese:** Supabase Auto-REVOKE-Hook (analog J4 earn_wildcards-Pattern) — aber NICHT verlaesslich. Bei der naechsten Edit/Redeploy ohne REVOKE-Block ist anon wieder offen. Gleiche Schwachstelle wie J4 AR-27 (earn_wildcards LIVE-EXPLOIT).

**Fix:** REVOKE-Block in jede neue Fix-Migration aufnehmen. **AR-44 Security-Hardening**.

---

## HIGH

### J5B-04 HIGH — Migration-Drift: 6 Mystery Box Migrations in Sequence, 3 sind Minimal-Stubs

**Lokal:**
```
20260406180000_mystery_box_equipment_system.sql (320 Zeilen, vollstaendig)
20260407120000_mystery_box_calibration_v1.sql (33 Zeilen, vollstaendig)
20260410170000_mystery_box_daily_cap_and_price_change_7d.sql (STUB — nur Kommentar "See applied migration")
20260411114500_mystery_box_daily_cap_opened_at_fix.sql (STUB)
20260411114600_mystery_box_equipment_branch_fix.sql (STUB)
20260411114700_mystery_box_ticket_source_fix.sql (STUB)
```

**Remote:** 6 Migrations mit richtigem SQL (Version-Namen mismatched wie J1-J4).

**Impact:** Lokale Entwicklung kann RPC-Body nicht reproduzieren ohne DB. `supabase db reset` wuerde einen kaputten Stand hinterlassen (nur ältere Migrations werden replayed). **Vierte Journey in Folge mit Migration-Drift.** (J1-AR-1, J2B-01, J3B-02, J4B-04, J5B-04).

**Fix:** Vollstaendige SQL in die 4 Stub-Files dumpen. Master-Fix: Full-Sweep-Script + Policy in CLAUDE.md. → Teil von AR-28 (J4) sowieso noetig.

### J5B-05 HIGH — Bcredits-Drops werden NIE minted (0 live trotz legendary/mythic Config)

**Live-Data:**
- Live config hat bcredits-rewards fuer `legendary` (5000-15000 cents) + `mythic` (10000-25000 cents)
- Total bcredits minted live: **0**
- Total `mystery_box_results` mit reward_type='bcredits': **0**
- 1x legendary-Tickets drop (avg 880), 0 legendary-bcredits

**Hypothese:** Config-Drop-Rate-Bug. Live-Body iteriert:
```sql
FOR v_reward_rec IN SELECT ... FROM mystery_box_config WHERE rarity = v_rarity AND active ORDER BY reward_weight DESC
```
Bei `legendary`: `tickets (30) DESC, equipment (50) DESC, bcredits (20) DESC` → Reihenfolge `equipment(50), tickets(30), bcredits(20)`. Loop break wenn `v_reward_roll < v_reward_acc` — mit `total_w=100`, roll 0-99. Equipment-Bucket 0-49, tickets 50-79, bcredits 80-99.

Das ist statistisch OK. Aber wenn `total_w = 100` und `random() < 0.2` = 20% landet in bcredits-Bucket. Bei 25 opens, legendary 1 = expected 0.2 bcredits-drops — consistent mit 0. **Kein Bug, nur low-n.** Live-Data also OK.

**Aber:** `transactions.type='mystery_box_reward'` constraint check:
```
Constraint query returned empty (no explicit constraint on transactions.type).
```
Bedeutet: Wenn bcredits-Drop stattfindet, gibts keinen Check-Constraint-Violation-Risk mehr. Frueher (siehe Fix-Migration 20260411114700) hat `ticket_transactions.source='mystery_box_reward'` gegen CHECK-Constraint verloren — wurde gefixt zu `'mystery_box'`. Aber `transactions.type='mystery_box_reward'` steht noch im RPC-Body (siehe Zeile `INSERT INTO public.transactions (...) VALUES (v_uid, 'mystery_box_reward', v_bcredits, ...)`).

**Frage:** Hat `public.transactions` eine CHECK constraint auf `type`? Live-Check zeigt leer. Aber wenn zukuenftig constraint-check addiert wird, bricht bcredits-Drop-Path. **Implicit Contract-Drift-Risk.**

**Fix:** Entweder CHECK-Constraint auf `transactions.type` explizit dokumentieren, ODER `mystery_box_reward` auf `'mystery_box'` standardisieren.

### J5B-06 HIGH — `open_mystery_box` (v1) Legacy-Function noch live

**Live-Grants:**
```
open_mystery_box (p_free boolean) → DEFINER, granted to authenticated+postgres+service_role
```

V1 ist noch GRANTed auf authenticated. Service-Code nutzt nur `openMysteryBoxV2` (siehe src/lib/services/mysteryBox.ts:24 `supabase.rpc('open_mystery_box_v2')`). V1 ist unreferenced Legacy. Aber wenn irgendjemand (z.B. API-Integration, Admin-Tool) es noch callt, kriegt er old Behavior (kein Daily-Cap? — v1 hat vermutlich keinen Cap-Check).

**Fix:** `DROP FUNCTION open_mystery_box(boolean)` Migration. Sauber-machen. → AR-45 Legacy-Cleanup.

### J5B-07 HIGH — Supply-Invariant: 37 ticket_transactions aber nur 25 mystery_box_results

**Live-Data:**
```
ticket_transactions source='mystery_box': 37 rows
mystery_box_results: 25 rows
```

**Diff: 12 rows.** Erklaerung: Jeder PAID Open schreibt 2 `ticket_transactions`: (a) -effective_cost (debit fuer Box-Kauf), (b) +tickets_amount (credit wenn reward=tickets). Bei 18 paid_opens und wenn alle tickets-rewards sind, waeren das 36 rows. Aber nur 13 von 25 sind tickets-reward → andere reward_types (equipment, cosmetic, bcredits) schreiben KEINEN +credit ticket_transaction.

Modell: 
- 18 paid × 1 debit = 18 
- 13 tickets-rewards × 1 credit = 13
- total expected: 31. Live: 37 → 6 extra.

**Hypothese:** Fallback-Paths in RPC (Zeile "Mystery Box reward (fallback)") schreiben extra Credits. Plus: v1 Legacy noch aufgerufen? 25 results + ??? weitere.

**Fix:** Invariant-Test schreiben: `ticket_transactions.source='mystery_box' count MUST = (paid_opens + tickets-rewards + fallback-paths)`. Currently not covered. **Supply-Invariant-Gap**. → CI Test noetig.

### J5B-08 HIGH — mystery_box_results.rarity CHECK constraint hat 'uncommon' (war frueher genutzt)

**Live-Data:**
```
SELECT rarity, COUNT(*) FROM mystery_box_results GROUP BY rarity:
 - common: 13
 - epic: 4
 - legendary: 1
 - rare: 4
 - uncommon: 3 ← LEGACY Rarity
```

**Problem:** Original Migration 20260406180000 hat `CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'))`. Types (`MysteryBoxRarity`) nur `'common' | 'rare' | 'epic' | 'legendary' | 'mythic'`. Live sind 3 Rows mit `'uncommon'` — Type-Gap. Service `getMysteryBoxHistory` castet als `MysteryBoxResult[]` blind → RARITY_CONFIG['uncommon'] → undefined → React-Crash in `MysteryBoxHistorySection:93`:

```tsx
const rarityCfg = RARITY_CONFIG[entry.rarity];   // undefined für 'uncommon'
const RewardIcon = REWARD_ICONS[entry.reward_type] ?? Gift;
...
<div className={cn('size-10 rounded-lg flex items-center justify-center flex-shrink-0',
  rarityCfg.bgClass, ...)  // TypeError: cannot read 'bgClass' of undefined
```

**LIVE-CRASH PROB:** User mit 'uncommon'-Legacy-Row sieht Inventar → MysteryBoxHistorySection crasht Tab.

**Fix:** Zwei Optionen:
- (a) Entweder RARITY_CONFIG um 'uncommon' erweitern + Type-Union
- (b) Migration: UPDATE mystery_box_results SET rarity='rare' WHERE rarity='uncommon'; + DROP/RECREATE Constraint ohne 'uncommon'.
→ **AR-46 Money-Adjacent (Legacy-Rows in Geld-Tabelle)**.

---

## MEDIUM

### J5B-09 MEDIUM — RLS auf mystery_box_results nur SELECT, keine INSERT/UPDATE/DELETE-Policies

**Live:**
```
tablename: mystery_box_results, cmd: SELECT (own)
```

RPC ist SECURITY DEFINER, umgeht RLS beim INSERT. Das ist Design. ABER: falls jemand per service-role oder direct-DB eine Row manipuliert, gibt es keine Whitelist-Policy. Session 255 Pattern — neue Tabelle MUSS alle Ops haben.

**Fix:** Explizit INSERT/UPDATE/DELETE-Policies mit `false` (nur RPC darf schreiben). Dokumentations-Klarheit. → Nicht akut, aber common-errors.md Pattern.

### J5B-10 MEDIUM — mystery_box_config public SELECT — Drop-Rates sichtbar fuer User

**Live:**
```
tablename: mystery_box_config, policy: public SELECT (qual=true)
```

Jeder authenticated (auch anon? — `roles={public}`) kann Drop-Weights + min/max abfragen. Reveals Game-Economy zu User. Nicht Security, aber Competitive-Info-Leak. Speedrunners koennen optimal-roll-Path berechnen.

**Fix:** Restrict to service_role ODER Admin-only. Client braucht nur Reward-Preview (schon in Code hardcoded). → Post-Beta akzeptabel, aber dokumentieren.

### J5B-11 MEDIUM — RPC Return-JSON uses camelCase AND snake_case mixed (ticket_cost vs ticketCost)

**Live-RPC-Return:**
```sql
RETURN jsonb_build_object(
  'ok', true,
  'id', v_result_id,
  'rarity', v_rarity,
  'rewardType', v_reward_type,          -- camel
  'ticketsAmount', v_tickets_amount,    -- camel
  'bcreditsAmount', v_bcredits,         -- camel
  'cosmeticKey', COALESCE(v_cosmetic_key, ''),
  'equipmentType', COALESCE(v_eq_key, ''),
  'equipmentRank', COALESCE(v_eq_rank, 0),
  'equipmentNameDe', COALESCE(v_eq_name_de, ''),
  'equipmentNameTr', COALESCE(v_eq_name_tr, ''),
  'equipmentPosition', COALESCE(v_eq_position, ''),
  'ticketCost', v_effective_cost        -- camel
);
```

Service casts mit camelCase (src/lib/services/mysteryBox.ts:37-51) — korrekt. KEINE Drift aktuell. ABER: das ist gegen J1-AR Migration-Naming-Convention + anderen RPCs die `snake_case` nutzen (trade_ipo, buy_from_market etc). Inkonsistenz im Codebase.

**Fix:** Dokumentieren in common-errors.md: "RPC returns camelCase → Service MUST match exactly (TypeScript casts unchecked)". Oder beim Full-Sweep standardisieren auf snake_case. Nur Rule, keine Migration.

---

## LOW

### J5B-12 LOW — cosmetic_name fehlt im RPC-Return (verglichen mit equipment_name_de/tr)

**Live-Return** (Zeile aus pg_get_functiondef):
```sql
'cosmeticKey', COALESCE(v_cosmetic_key, ''),
```

Equipment hat Name (DE+TR) + Position im Return. Cosmetic hat nur `cosmeticKey` (der enum-key). Frontend muss extra `cosmetic_definitions` abfragen um Name zu zeigen. Schlimmer: im Modal gibts KEIN zweites Fetch → Cosmetic-Display ist nur generisch "Neues Cosmetic freigeschaltet!" (siehe J5F-06).

**Fix:** RPC soll `cosmetic_name` + optional `cosmetic_image_url` mit-returnen. Simple Schema-Erweiterung.

### J5B-13 LOW — Daily-Cap 'daily_free_limit_reached' i18n-Leak in Service

**Datei:** `src/lib/services/mysteryBox.ts:28-30`

```ts
if (error) {
  console.error('[MysteryBox] openMysteryBox error:', error);
  return { ok: false, error: error.message };
}
```

Bei Daily-Cap-Reject gibt RPC `'daily_free_limit_reached'` als raw String zurueck. Modal (MysteryBoxModal.tsx:155) macht `setError(msg ?? t('openBoxError'))` → User sieht `daily_free_limit_reached` unuebersetzt.

**Fix:** J1/J2/J3/J4 Pattern — `mapErrorToKey` + `te()` im Caller. → Geringe Prio weil Daily-Cap UI (hasFreeBox=false) kommt VOR dem RPC-Call (JAvaScript-Guard), aber bei Race oder schnellem Re-Click kann der Error trotzdem durchkommen.

---

## VERIFIED OK

| Check | Beweis |
|-------|--------|
| RPC uid-Guard | `v_uid IS NULL → RETURN error` |
| Row-Lock auf user_tickets (paid) | `FOR UPDATE` Zeile |
| Rarity CHECK OK | 5 valid + 1 legacy (uncommon) |
| Equipment-INSERT source CHECK | Allowed list enthaelt 'mystery_box' |
| ticket_transactions source CHECK fixed | Migration 20260411114700 |
| Fallback-Paths bei NULL Cosmetic/Equipment | CASE ELSE → fallback tickets |
| Realtime replica_ident=d (default) | OK, nicht broadcast-Pflicht |
| Multi-League | NICHT relevant |

---

## LEARNINGS (Drafts)

1. **Fix-Migrations muessen REVOKE-Block erneuern** (J5B-03) — `CREATE OR REPLACE FUNCTION` reset Privileges. Jede Fix-Migration MUSS REVOKE/GRANT-Block enthalten. Audit-Pattern: nach jeder fix-migration `has_function_privilege('anon', fn, 'EXECUTE')` checken.
2. **Contract-Drift RPC-Body vs Table-Schema ist fatal** (J5B-01) — fix-migration hat Spalte falsch benannt (`equipment_rank` vs `rank`). 6 Monate broken Equipment-Path. **Common-errors.md Rule:** nach jeder RPC-Fix-Migration `\d+ target_table` reviewen und Body-Insert-Columns matchen.
3. **Stub-Migration-Files sind Migration-Drift-4. Journey** — J1+J2+J3+J4+J5. Full-Sweep ueber alle Migrations-Files nicht optional. Stub-Policy: nur bei Admin-Only-Code OR nach schriftlicher Genehmigung.
4. **Race-Condition bei Daily-Cap** (J5B-02) — `COUNT` + `INSERT` ohne Lock. Pattern fuer alle Cap-Limited-RPCs (nicht nur Mystery-Box): UNIQUE partial index erzwingt Idempotency.
5. **Legacy Enum-Values in Tabellen** (J5B-08) — 'uncommon' war valid, ist nicht mehr Type. UI crasht bei Legacy-Row-Render. **Pattern:** alle Type-Enum-Aenderungen brauchen Backfill ODER erweitere Type-Union.
6. **Legacy RPC weiter GRANTed** (J5B-06) — `open_mystery_box` v1 nicht gedroppt. Pattern: RPC-Rename oder -Replace → `DROP FUNCTION old_name(...)` Migration direkt danach.

