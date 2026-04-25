---
description: DB-Fehler — Supabase/Postgres, RPCs, Auth/Security, Cache-Sync
---

# Errors: Database & RPCs

Stand: 2026-04-24 · Split aus `common-errors.md` (Slice 186). Siehe auch `database.md` (Columns, CHECK), `trading.md` (Money-Regeln).

## Supabase / Postgres

### CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT (Slice 156 FAIL)
- Beim Body-Rewrite einer SECURITY DEFINER RPC: ALLE Vorgaenger-Migrations greppen, neuester Body = current DB-State. **Nicht vom ersten Create ableiten.**
- Audit: `grep -rn "CREATE OR REPLACE FUNCTION public\\.<name>" supabase/migrations/` + zeitlich sortieren → letzter File ist Baseline. **Oder besser**: `pg_get_functiondef('public.<name>(args)'::regprocedure)` als live-truth.
- Gefahr: Silent-Revert aller Patches zwischen Original-Create und aktuellem Stand (Slice 156 v1: auth.uid()-Guard, min_tier-Gate, fee_config-Lookup alle weggeschrieben).
- Migration-Header: `-- Source-of-truth: <last-CREATE>.sql` + explizite `Applied patches`-Liste.
- Post-Apply: `pg_get_functiondef() ILIKE '%<expected-guard>%'` pro preserved Feature.

### Trigger+GUC-Invariant-Enforcement — generalisiert (D39, 2026-04-24)

Standard-Pattern fuer alle DB-Level Data-Integrity-Invariants, wo mehrere Code-Pfade die Invariant verletzen koennten (Scripts, Crons, RPCs, MCP-SQL). Code-Guards sind fragil, CHECK kann keine cross-row-Bedingungen, RLS ist wrong-layer.

**Template:**
```sql
CREATE OR REPLACE FUNCTION public.prevent_<X>() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- 1. Escape-Hatch
  IF current_setting('bescout.allow_<feature>', true) = 'true' THEN RETURN NEW; END IF;
  -- 2. NULL-Guards
  IF NEW.critical_field IS NULL THEN RETURN NEW; END IF;
  -- 3. Invariant-Check
  IF <violation> THEN RAISE EXCEPTION '<key>: <msg>' USING ERRCODE = 'unique_violation'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER <name> BEFORE <OP> ON public.<table>
  FOR EACH ROW EXECUTE FUNCTION public.prevent_<X>();

COMMENT ON FUNCTION public.prevent_<X>() IS
  'Slice <N>: <purpose>. Bypass: SET LOCAL bescout.allow_<feature> = true.';
```

**Bulk-Bypass:** `BEGIN; SET LOCAL bescout.allow_<feature> = 'true'; ...; COMMIT;`

**Applied:**
- Slice 179: `transactions` append-only (BEFORE UPDATE/DELETE). GUC `bescout.allow_transactions_mutation`.
- Slice 189: `players` ghost-prevention INV-39/40 (BEFORE INSERT). GUC `bescout.allow_player_ghost_insert`.

**Kandidaten:** `trades` (append-only), `activity_log`, `holdings_history`, `audit_log`.

**Vollstaendige Diskussion + Alternativen:** `memory/decisions.md` D39. Pattern-Template: `memory/patterns.md` #29.

### Transactions Append-Only — enforced (Slice 179, Tier A2)
- `transactions` ist append-only. 2-Layer:
  1. `REVOKE UPDATE, DELETE FROM anon, authenticated` — Client-Rollen blockiert.
  2. BEFORE UPDATE/DELETE Trigger `transactions_append_only_guard` raises — blockt auch SECURITY DEFINER.
- Opt-In Bypass (siehe generalisiertes Pattern oben): `SET LOCAL bescout.allow_transactions_mutation = 'true'`.

### PostgREST nested-select Auth-Race (Slice 192/193)

PostgREST `parent.column, child:other_table(...)` gibt **silent NULL** für nested rows zurueck wenn JWT nicht final hydrated ist (Cookie-Resume-in-Progress). Service akzeptiert data-array, downstream Mapper appliziert Defaults — User sieht "Geister-Rows".

**Symptom-Decoder-Tabelle (Slice 192 — Manager Aufstellen-Tab):**

| Sichtbar im UI | Mapper-Default wenn `h.player == null` |
|----------------|-------------------------------------------|
| `#0` (Trikot) | `ticket: h.player?.shirt_number ?? 0` |
| `MID` (Position) | `pos: h.player?.position ?? 'MID'` |
| (leerer Name) | `first/last: h.player?.first_name ?? ''` |
| (leerer Kreis) | `imageUrl: h.player?.image_url ?? null` |
| `0 CR` (Floor) | `floorPrice: h.player?.floor_price ?? 0` |
| `0S 0T 0A` (Stats) | `matches/goals/assists: ?? 0` |

→ 7 Felder gleichzeitig auf Default-Wert = **eindeutige Signatur** fuer NULL-nested-Player. Symptom-zu-Code-Backtrack ohne Repro moeglich.

**Detection:**
```sql
-- Verify DB hat volle Daten (RLS deckt das ab)
SELECT COUNT(*) FILTER (WHERE p.first_name IS NULL OR p.image_url IS NULL)
FROM holdings h JOIN players p ON p.id = h.player_id WHERE h.user_id = '<uid>';
-- Wenn 0: Bug ist Frontend Auth-Race, nicht DB.
```

**Mitigation (Slice 192/193 Defense-in-Depth):**
1. **Type-Truth:** RPC-Return-Shape vs TS-Cast verifizieren (`pg_get_functiondef`). `MarketUserDashboard.holdings: DbHolding[]` (kein nested player, RPC liefert keine).
2. **Service-Filter:** `getHoldings` filtert `player == null` rows + `logSilentCatch` + all-ghost throw.
3. **Mapper-Throw:** `dbHoldingToUserDpcHolding` wirft `ghost_holding_row` i18n-key bei null-player.
4. **Auth-Gate:** `useHoldings` `enabled: !!userId && !profileLoading` (gates query auf vollstaendige Profile-Hydration).

**Live-Verify:** Chrome-DevTools-MCP `get_network_request` → `x-envoy-upstream-service-time` Header zeigt RPC-Server-Time. Wenn Server-Time <500ms aber Browser-Side Timeout: Race, nicht Slow-RPC.

**Referenz:** Slice 192 Proof `worklog/proofs/192-holdings-null-player-guard.md`, Slice 193 Proof `worklog/proofs/193-auth-state-perf.md`. Decision: `memory/decisions.md` D40-D43.

### Ghost-Prevention Player-Insert-Trigger (Slice 189)
- `players` BEFORE INSERT-Trigger `prevent_player_ghost_insert` erzwingt INV-39 (Cross-Club-Contamination: same first+last+contract_end mit anderem club_id) + INV-40 (Same-Club-Duplicates: exakter Name+Club-Match).
- Faengt ALLE Insert-Pfade: Scripts, Crons, manuelle SQL via MCP.
- GUC-Bypass fuer legitime Bulk-Imports: `SET LOCAL bescout.allow_player_ghost_insert = 'true'`.
- Referenz-Migration: `supabase/migrations/20260424200000_slice_189_ghost_prevention_trigger.sql`. Test: `src/lib/__tests__/db-invariants.test.ts` INV-39/40.

### Money-RPC Idempotency-Blueprint (Slice 178a-f — codifiziert 2026-04-24)
Generic `request_dedup_keys` Foundation (Slice 178) + Integration in 7 Money-RPCs (178a/c/e-a..e).

**Signatur-Erweiterung:** +`p_idempotency_key TEXT DEFAULT NULL` (backward-compat).

**Body-Integration (5 Bloecke):**
```sql
-- 1. DECLARE
v_result JSONB;  -- oder JSON, je RPC-Return
v_dedup_new BOOLEAN;
v_dedup_cached JSONB;

-- 2. NACH auth-guard + cheap validation, VOR DB-writes:
IF p_idempotency_key IS NOT NULL THEN
  SELECT is_new, existing_response INTO v_dedup_new, v_dedup_cached
  FROM public.check_or_reserve_dedup_key(p_user_id, p_idempotency_key, 300);
  IF NOT v_dedup_new THEN
    IF v_dedup_cached IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'idempotency_pending', 'idempotent_replay', true);
    END IF;
    RETURN v_dedup_cached;  -- Replay
  END IF;
END IF;

-- 3. ... normaler Body ...

-- 4. Vor RETURN: v_result assemblen statt inline-build
v_result := jsonb_build_object('success', true, ...);

-- 5. Completion-UPDATE
IF p_idempotency_key IS NOT NULL THEN
  UPDATE public.request_dedup_keys
  SET response = v_result, status = 'completed'
  WHERE user_id = p_user_id AND dedup_key = p_idempotency_key;
END IF;

RETURN v_result;
```

**REVOKE/GRANT renew (AR-44):** CREATE OR REPLACE resettet Privilegien — explicit REVOKE FROM PUBLIC + FROM anon + GRANT TO authenticated am Migration-Ende.

**DROP alte Signatur:** `DROP FUNCTION IF EXISTS public.<name>(<old-args>);` um pg_proc-Ambiguity zu vermeiden.

**Client-Side (178d+f):** `useSafeIdempotentMutation` mit `idempotencyNamespace: 'scope.action'` + `mutationFn: (vars, key) => service(..., key)`. Oder plain-async: `newIdempotencyKey('scope.action')` inline.

**Integrated RPCs:** buy_player_sc · buy_from_order · place_sell_order · place_buy_order · subscribe_to_club · liquidate_player · open_mystery_box_v2.

### ON CONFLICT validiert CHECK gegen INSERT-Defaults (Slice 075c)
- `INSERT ... ON CONFLICT DO UPDATE` validiert CHECK gegen Tuple-Defaults **bevor** UPDATE-Pfad. `.upsert()` erbt.
- Symptom: existierende Rows errorn wenn Defaults Constraint verletzen.
- Fix: echter `.update().eq('id', ...)` statt `.upsert()`.

### PL/pgSQL NULL-in-Scalar-Subquery — MONEY (2026-04-11)
- `IF (SELECT COALESCE(x, 0) FROM t WHERE ...) < y` ist FALSCH wenn keine Row. Scalar-Subquery auf leeres Set = NULL, `NULL < y` = NULL = falsy → Guard skipped.
- Richtig: `SELECT x INTO v_x; IF COALESCE(v_x, 0) < y THEN ...` ODER `IF NOT FOUND`.
- Audit: `grep 'SELECT COALESCE.*FROM.*WHERE' supabase/migrations/`

### PL/pgSQL Loop-Variable Shadowing in Nested Loops (Slice 195d, 2026-04-25)
- Nested `FOR v_i IN ... LOOP` mit gleichem Counter-Var-Namen ueberschreibt outer-Loop-Iter — bricht outer Iteration silent.
- PL/pgSQL hat KEIN block-scoped Counter wie JS `let i`. `FOR var IN range`-Variante deklariert `var` implicit als INTEGER im current Block-Scope.
- Fix: separate Variable per nested Loop. NIEMALS dieselbe FOR-counter-var in nested loops nutzen.
- Beispiel `score_event` Slice 195d: outer `FOR v_i IN 1..12 LOOP` (slot-loop) + inner `FOR v_bench_loop IN 1..3 LOOP` (bench-order-loop). Inner muss eigenen Counter haben.
- Audit: `grep -nE "FOR (v_i|i|j) IN.*LOOP" supabase/migrations/*.sql | sort -t: -k2 -n | uniq -f1 -c` — Migrations mit mehreren `FOR v_i IN`-Vorkommnissen sind Kandidaten.

### PL/pgSQL Loop-Variable Stale State (Slice 195d, 2026-04-25)
- DECLARE-Variablen sind **persistent** ueber Loop-Iterationen. Wenn Iter N einen Wert setzt und Iter N+1 die Setting-Branch nicht trifft (`IF v_player_id IS NOT NULL THEN ...`), traegt die Variable den Wert von Iter N rueber → STILLE False-Positive bei conditional Reads.
- Fix-Pattern: Am LOOP-Top alle iter-spezifischen Variablen explicit zuruecksetzen:
  ```sql
  FOR v_i IN 1..N LOOP
    v_did_sub := FALSE;
    v_starter_minutes := 0;
    v_sub_player_id := NULL;
    -- ... iter-Logic
  END LOOP;
  ```
- Regel: Alle Variablen, die innerhalb eines Loop-Bodys conditionally gesetzt werden, MUESSEN am Top jedes iteration-Cycles explizit resettet werden — nicht nur einmal vor dem Loop.
- Audit: Bei Migration-Reviews mit nested IF-Branches in Loops: pruefen welche Variablen conditionally geschrieben werden, dann checken ob am Loop-Top reset passiert.

### Trigger-Guard BEFORE UPDATE (Slice 081)
- BEFORE UPDATE auf money-Spalten kaskadiert auch bei flag-Spalten-Change → Trading-Block bei MV=0.
- Jeder Trigger-Body braucht `IF NEW.<col> IS DISTINCT FROM OLD.<col> THEN ...`.

### Holdings Zombie-Row (Slice 025)
- `UPDATE holdings SET quantity = quantity - X` → Row mit `quantity=0` bleibt. SUM/COUNT DISTINCT zaehlen mit.
- Fix: `AFTER UPDATE OF quantity WHEN (NEW.quantity = 0)` Trigger → `DELETE`.

### auth.users DELETE NO-ACTION-FK (Slice 028)
- 23 Tables mit NO-ACTION-FK verhindern `DELETE FROM auth.users` (Postgres 23503).
- Pre-Audit via `pg_constraint` (NICHT `information_schema` — cross-schema FKs ausgelassen).

### Vercel Cron-Limits + Function Timeouts (Slice 071 + 075)
- Hobby: max 2 Crons, 1×/Tag. Pro: 40 Jobs, **300s HTTP-timeout** (NICHT 900s).
- `maxDuration = 300` ist Hard-Limit. Sync-Routes >1000 rows timeouten — Batch-Pattern pflicht: `.in(all_ids)` + `Promise.all(20-50 parallel)`.

### pgBouncer Read-After-Write Transient (Slice 139)
- Direkter `.select()` nach `.upsert()`/`.insert()` findet Row **manchmal nicht**. pgBouncer-Pooling → verschiedene Connections, Read vor Commit-Visible.
- Fix: Optimistic deterministisch, NICHT blind `setX(server-read)` nach Write. Alternativ Reconcile-Delay 100-300ms.

## RPC Design

### RPC INSERT Column-Mismatch (J5 AR-42)
- CREATE OR REPLACE parst Body aber validiert keine Column-Existenz. Fehler erst beim Call.
- Beispiele: `open_mystery_box_v2` INSERT `equipment_rank` (heisst `rank`), `transactions(amount_cents)` statt `amount`+`balance_after`.
- Regel: Nach JEDER RPC-Migration: `information_schema.columns` gegen Body matchen.

### RPC Response camelCase/snake_case Cast-Mismatch
- RPC `jsonb_build_object('rewardType', ...)` → camelCase. Service `as { reward_type }` → ALLE Felder undefined.
- Check: `pg_get_functiondef()` → Return-Shape → Service-Cast vergleichen.

### Server-Validation Pflicht fuer Money/Fantasy RPCs (Slice 023 B4)
- Client-only Validation via direktem RPC-Call umgehbar. RPC ist einzige Wahrheit.
- Pattern: Billige Early-Exits (Allowlist, GK-Required, Slot-Counts, Captain-Empty) VOR teuren DB-Joins.

### pg_cron Fail-Isolation (Slice 024 B5)
- RAISE EXCEPTION auf Item #2 blockt Batch. Fix: `BEGIN ... EXCEPTION WHEN OTHERS THEN ... END` pro Item. Safety `LIMIT 50`.
- Return `{success, scored, skipped, errored, errors, ran_at}` fuer `cron.job_run_details`.

### Transaction-Type activityHelpers Sync (Slice 027)
- Neuer `transactions.type` braucht 3-File-Change: `activityHelpers.ts` + `de.json` + `tr.json`. Ohne Mapping: User sieht snake_case.

### RPC Anti-Patterns Top 5
- `::TEXT` auf UUID beim INSERT
- Record nicht initialisiert vor Zugriff in falscher Branch
- FK-Reihenfolge falsch (Child INSERT vor Parent)
- NOT NULL Spalte fehlt im INSERT
- Guards fehlen (Liquidation-Check in Trading-RPCs)

### Money-RPC Pricing-Formel Drift (Slice 108)
- RPC-Body = einzige Wahrheit. Frontend-Tier-Konstanten driften.
- Konkret: `liquidate_player` nutzte 10-Tier-Table obwohl CEO-Regel `fee = MV_EUR / 10` linear — 1,5× Drift.
- Prevention: Test-Invariant `SUCCESS_FEE_TIERS[i].fee === calcSuccessFee(...)` erzwingt Zero-Drift.
- Regel: Money-RPC mit `COMMENT ON FUNCTION` + `formula_version` in Return-JSON.

### Return-Shape: Discriminated Union (Slice 168, aus 165)
Siehe `database.md` Return-Shape-Regel. Kurz: Success IMMER `{success: true, ...}`, Error IMMER `{success: false, error: '...'}`. Service kann `if (!data.success) throw new Error(data.error)` einheitlich anwenden.

## Auth / Security

### RLS qual=true auf sensiblen Tabellen (Slice 014 + 019-021)
- `USING (true)` auf `authenticated` = keine Zugriffskontrolle. Bei holdings/transactions/activity_log/user_stats/orders = systemweiter Leak.
- Fix: `USING (auth.uid() = user_id OR <admin-check>)`.
- Cross-User-Aggregate (Orderbook, holder-count): SECURITY DEFINER RPC mit projiziertem Output (handle+is_own statt user_id).
- Rollout: (1) Projection-RPC deploy → (2) Service-Layer migriert → (3) Deploy verify → (4) RLS tighten.
- Guard: INV-26.

### SECURITY DEFINER + auth.uid()-Guard (Slice 005 + J4 Live-Exploit)
- J4-Live: `earn_wildcards` mintete 99.999 Wildcards als anon (reverted).
- Exploit-Klassen: **anon** (keine Grant-Beschraenkung) + **authenticated-to-other-user** (`p_user_id` ohne auth.uid()-Check).
- Pattern:
  ```sql
  REVOKE EXECUTE ON FUNCTION X FROM anon, authenticated;
  GRANT EXECUTE ON FUNCTION X TO authenticated;
  -- im Body:
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch';
  END IF;
  ```
  `IS NOT NULL` skippt service_role (Cron). `IS DISTINCT FROM` rejected cross-user.
- Guard: INV-21 + `public.get_auth_guard_audit()` RPC.

### Public-Wrapper + Internal-RPC Pattern (Slice 035 + 041)
- RPC mit `p_user_id` + auth-context: 2 Funktionen.
  - **Public Wrapper** `rpc_name(args_ohne_uid)`: GRANT authenticated, PERFORM internal(auth.uid()).
  - **Internal** `_rpc_internal(args, p_user_id)`: REVOKE authenticated, GRANT service_role only.
- Zweck 1: auth-context-injection fuer Client.
- Zweck 2: Trigger ruft Internal direkt (umgeht Guard bei `NEW.seller_id ≠ auth.uid()`).
- Doku: `COMMENT ON FUNCTION` fuer beide pflicht.

### RLS Policy Trap — neue Tabelle
- Neue Tabelle mit RLS braucht Policies fuer ALLE Client-Ops (SELECT + INSERT + UPDATE + DELETE). SELECT-only = silent write fail.
- Nach Migration: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`.

### SECURITY DEFINER Guard: Admin-only vs Public-safe (Slice 095)
- Beim Design: NICHT nur "wer darf Tabelle SELECT", sondern **"wo wird RPC aufgerufen?"**.
- Return-Shape KEINE user_ids/PII UND UI-page public: **kein Guard**, RPC ist selbst Security-Boundary via Projection.
- Return-Shape user_ids/PII: **admin-Guard pflicht**.
- Slice 095: `rpc_get_club_recent_trades` (public-safe) hatte falsch club-admin-guard → blockte `/club/<slug>` fuer non-admin. Fix: Guard weg.

## React Query + Supabase Cache

### setQueryData statt invalidateQueries bei deterministic optimistic (Slice 143)
- Nach `toggleFollow` war nur `qk.social.followerCount(userId)` invalidated. `qk.clubs.followers(clubId)` + `qk.clubs.isFollowing(uid, cid)` drifted bis 2min stale-cycle.
- Fix: `queryClient.setQueryData(key, (prev) => prev ± 1)` — deterministic, kein Refetch.
- Regel: Bei deterministischer Mutation (follow/unfollow, ±1) → `setQueryData`. Bei indeterministic (server uuid) → `invalidateQueries`.
- Pattern:
  ```ts
  queryClient.setQueryData<number>(qk.clubs.followers(clubId), (prev) =>
    prev === undefined ? prev : Math.max(0, prev + delta),
  );
  queryClient.setQueryData<boolean>(qk.clubs.isFollowing(uid, clubId), !wasFollowing);
  ```
