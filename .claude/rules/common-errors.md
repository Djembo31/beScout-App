---
description: Haeufigste Fehler die bei JEDER Arbeit relevant sind
---

# Common Errors

Stand: 2026-04-24 · Konsolidiert aus Slices 001-180.
Querverweise: `database.md` (Columns, CHECK) · `business.md` (Compliance) · `performance.md` (Query-Limits) · `memory/patterns.md` (#28 Ferrari-Blueprint).

## Inhalt (schnell-navigation)

1. **Silent Fails** (die stillsten Bugs) — L12
2. **Supabase / Postgres** (RLS, Triggers, Migrations, Transactions Append-Only) — L125
3. **RPC Design** (Anti-Patterns, Return-Shape, Formula-Drift) — L203
4. **Auth / Security** (RLS-Policies, SECURITY DEFINER Guards, Public-Wrapper) — L246
5. **Frontend** (React, TypeScript, CSS, Modal-Pattern) — L292
6. **i18n / Locale** (Error-Keys, setState-Race, useCountUp, Singleton-Migration) — L346
7. **Build / Deploy** (Next.js Route-Handler, ESLint, Vercel-Env, tsconfig) — L436
8. **Cross-Cutting / Operational** (Grep-Scope-Gap, Data-Contract-Changes, Shell-Hooks) — L463
9. **Scraper-Parser** (externe HTML, nested-tr, DE-EN-Drift, null-Policy) — L575
10. **React Query + Supabase Cache** (setQueryData vs invalidateQueries) — L620
11. **Beta-Launch-Ops** (CSP, Sensitive-Flag-Bug, Playwright, Two-Lockfile-Drift) — L638

> **Size-Note (2026-04-24):** Diese Datei ist bei ~700 Zeilen / 55 KB. Geplanter Follow-up-Slice: Split in `errors-db.md` / `errors-frontend.md` / `errors-infra.md` / `errors-scraper.md`. Bis dahin bleibt diese Konsolidierung gueltig — alle Patterns one-file-searchable.

---

## 1. Silent Fails (die stillsten Bugs)

### Tool: `/silent-fail-audit`
- `npm run audit:silent-fail` → Report in `worklog/audits/silent-fail-YYYY-MM-DD.md`
- `npm run audit:silent-fail:check` → CI-Gate gegen `.audit-baseline.json` (HIGH-Increase = exit 1, MEDIUM-Increase = warn)
- 8 Pattern: `.in()` unchecked · `.select()` unranged · silent catch · error-swallow · data-destructure ohne error · hart-coded script state-checks · `Promise.allSettled` ohne `logSilentRejects` · `.catch(() => fallback)` ohne `logSilentCatch`
- Baseline Slice 092: 193 findings / 98 HIGH / 95 MEDIUM / HIGH-FP-Rate 0%. CI-Gate via GitHub Actions lint-job.
- Post-Fix: `.audit-baseline.json` mit neuen Zahlen committen.

### Silent-Catch ohne Observability (Slice 092)
- `.catch(() => null)` / `.catch(() => [])` → rejected Promise silent auf Fallback gemappt. Kein Log, kein Sentry.
- Fix: `.catch((err) => { logSilentCatch('module.fn', err); return null; })` aus `@/lib/observability/silentRejects`.
- Skip: `req.json().catch(() => ({}))` body-parse-Fallbacks sind legitim.
- Audit: `grep -rn '\.catch(() =>' src/ | grep -v __tests__ | grep -v logSilentCatch | grep -v 'json().catch'`

### Silent-Cast ohne Discriminator-Check (Slice 165, aus 160 Finding #2)
- `return data as { upvotes: number; ... }` direkt nach `supabase.rpc()` ohne Prüfung ob RPC-Body Error-Shape hat.
- **Symptom:** RPC returnt `{success: false, error: '...'}` (PostgREST-Level kein Error, nur HTTP 200 mit Error-JSON). TypeScript-Cast lügt: Felder (`upvotes`, `downvotes`) sind `undefined`. UI setzt `setReplies(...upvotes: undefined)` → NaN-Rendering, kein Error-Toast.
- **Kritischste Variante:** RPC mit inkonsistenter Return-Shape — Success-Path `{upvotes, downvotes}` (kein `success: true` flag), Error-Path `{success: false, error}`. Discriminator ist effektiv das Vorhandensein von Success-Fields.
- **Fix-Pattern:**
  ```ts
  const result = data as { upvotes?: number; downvotes?: number; success?: boolean; error?: string };
  if (result.success === false || typeof result.upvotes !== 'number') {
    throw new Error(result.error ?? 'rpc_failed');
  }
  return { upvotes: result.upvotes, downvotes: result.downvotes ?? 0 };
  ```
- **Audit 2026-04-23:** 8 Services mit `return data as {...}` Cast. 7 haben `success: boolean` im Cast-Type (Caller-Pflicht zu prüfen — OK-Grey-Zone). 1 ohne Discriminator: **`votePost`** (gefixt Slice 165). `referral.getInviter` ist explicit-null-path, kein Silent-Fall.
- **Regel:** RPC-Services mit discriminated Union-Return MÜSSEN Pre-Cast-Guard haben. Audit-Command:
  ```bash
  grep -B2 "return data as" src/lib/services/**/*.ts | grep -v "if.*success\|if.*!data\|if.*error\b"
  ```
- **Schlimmster Fall:** Client-Caller `const result = await votePost(...); setState(result.upvotes)` mit undefined-set → UI rendert NaN oder leer. Kein React Query Retry weil kein thrown Error. User clickt retry → Symptom persistent.

### `.in()` Chunking + Upstream-Query auch prüfen (Slice 082 + 086)
- `.in('col', ids)` mit >100 UUIDs liefert `data=undefined` + `error=undefined` (URL-Limit ~14KB). MUSS in 100er-Chunks split + explicit error-check.
- Bei Chunk-Fix **Loader-Query** prüfen: ist die id-Liste aus `.select().in()` mit >1000 rows? → Loader hat 1000-Cap, gleicher Silent-Fail.
- Summierung über Chunks: nur valide wenn Batches disjunkt sind (z.B. unique player_ids). Bei überlappenden Conditions nicht summierbar.
- Pattern:
  ```ts
  const CHUNK = 100;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await supabase.from('t').select().in('k', ids.slice(i, i+CHUNK));
    if (error) throw new Error(error.message);
  }
  ```

### PostgREST 1000-row cap — MONEY-CRITICAL (Slice 078 + 079b + 133 + 134 + 135)
- `.select()` ohne `.range()` auf Tabelle >1000 rows liefert still max 1000. Kein Error.
- **`.limit(N)` ist KEIN Override-Path**: auch `.limit(10000)` cappt PostgREST bei ~1000. Nur `.range(offset, offset+999)` im Loop ist zuverlässig.
- Beispiele: `/api/players` 1000/4556 alpha-sortiert (079b) · `getClubsWithStats` zeigte ~23% wahrer player-counts je Club (133) · system-weit 6+ Stellen gefixt für `player_external_ids`/`players` (134+135).
- Fix: while-loop `.range(offset, offset+999)` bis `data.length < PAGE`.
- Audit: `grep -rn "\.from.*\.select" src/app/api/ src/lib/ | grep -v "\.range\|\.limit\|\.eq\|\.single\|\.maybeSingle"`
- Verdächtiges vierstelliges Limit: `grep -rn "\.limit([0-9]\{4,\})" src/lib/`
- Referenz-Tables >800 rows (paginate from day-one): `player_external_ids` (>5k), `players` (>4k), `fixtures` (wachsend), `club_followers` (wachsend).

### `.single()` vs `.maybeSingle()`
- `.single()` wirft HTTP 406 bei 0 Rows. Nur wenn Row garantiert existiert.
- Sonst `.maybeSingle()`.

### Service Error-Swallowing (2026-04-13 Hardening · 117 Fixes in 61 Services)
- `if (error) { console.error(); return null; }` → React Query cached null als SUCCESS, kein Retry, UI stuck auf Skeleton/Empty.
- Kritischste Variante: `const { data } = await supabase...` **ohne** error-Destructuring. Komplett unsichtbar.
- Fix: `throw new Error(error.message)`. React Query retried automatisch.
- Audit: `grep -rn 'const { data } = await supabase' src/lib/services/`

### Scraper Default-Poisoning (Slice 081, TM)
- Parser-Fallback-Werte (z.B. MV=500K/8M + contract=2025-07-01) erscheinen auf vielen Spielern identisch — sehen aus wie echte Daten. Wird nie überschrieben weil MV≠0.
- Detect: `GROUP BY market_value_eur, contract_end HAVING COUNT(*) >= 4`.
- Mitigation: `players.mv_source` (`unknown|transfermarkt_verified|transfermarkt_stale|manual_csv|api_football`). Cluster auf `_stale` setzen, **nicht** MV überschreiben (Trigger-Safety).
- Guard: INV-36/37/38. Re-Scraper: `scripts/tm-rescrape-stale.ts`.

### External-Site Scraper-Regex Drift (Slice 078, TM)
- Fremde Site ändert Markup → Regex matcht nicht → parser `null` → Daten-Lücke wächst silent.
- Beispiel: TM 2026-04 MV-Container umbenannt, 433 Stammspieler mit MV=0 trotz echtem Wert.
- Regel: Externe HTML-Parser brauchen Regression-Tests mit echten Fixtures. Template: `src/lib/scrapers/transfermarkt-profile.test.ts`.
- Entity-Drift: `€` / `&#8364;` / `&euro;` — nie auf trailing `€` matchen.

### Cloudflare-Block für Vercel-IPs (Slice 075, TM)
- TM Cloudflare blockiert Vercel-Datacenter-IPs → HTTP 200 mit leerem Challenge-HTML (keine Player-Links). Lokaler curl liefert volles HTML.
- Debug-Mode `?debug=true`: `debug_trace[].parsed=0` = Block bestätigt.
- Workaround: CSV-Import-UI (aktuell), Residential-Proxy, TM Partner-API.

### Script mit hart-coded state-check (Phase B Hot-Fix)
- Script akzeptiert Flag `--mv-source=unknown` aber intern `if (fresh.mv_source !== 'transfermarkt_stale') skip` hart-codiert → silent skip.
- Fix: Flag-Wert in Variable, ALLE Hart-Code-Referenzen ersetzen.

### Cron-Guard API-Response-Count vs DB-Count (Slice 140)
- Externe API liefert weniger Rows als DB hat, Cron verwendet API-Count als Completion-Guard → bricht zu früh ab → DB-Rows unerreichbar.
- Slice 140: `gameweek-sync` hatte `allDone = (API.total === API.finished)`. API-Football dropped 4/9 Süper-Lig-Fixtures für GW 30 → Phase B advanced, 4 Fixtures blieben scheduled 30-60h in Vergangenheit.
- Detect-Query: `SELECT COUNT(*) FROM <table> WHERE status='<expected>' AND <timestamp> < NOW() - INTERVAL '24 hours'`.
- Fix-Pattern:
  ```ts
  const dbTruthAllDone = totalDbRows > 0 && (alreadyDone.size + newlyDone.length) >= totalDbRows;
  allDone = apiAllDone && dbTruthAllDone;  // beide müssen true sein
  ```
  Plus `logStep 'phase_X_blocked_db_mismatch'` für Monitoring.
- Regel: API-Response-Count IST KEIN Proxy für DB-Completion. Gilt für alle "alle X fertig"-Guards mit externer Quelle.

### Promise.allSettled ohne Observability (Slice 088)
- `Promise.allSettled` + `r.status === 'fulfilled' ? r.value.data : []` ist graceful-degrade, aber rejected results sind unsichtbar → Data-Liar im UI.
- Zwei Fix-Patterns:
  - **Alles-oder-nichts**: `Promise.all` + explicit `.error`-Checks → Fehler propagieren natural.
  - **Graceful degrade gewollt**: `Promise.allSettled` + `logSilentRejects(label, results)` aus `@/lib/observability/silentRejects`.
- Pattern:
  ```ts
  const results = await Promise.allSettled([q1, q2, q3]);
  logSilentRejects('myModule.myFunction', results);
  ```
- Audit: `grep -rn 'Promise.allSettled' src/ | grep -v __tests__ | grep -v logSilentRejects`

---

## 2. Supabase / Postgres

### CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT vor Body-Rewrite (Slice 156 FAIL-Review)
- Beim Body-Rewrite einer SECURITY DEFINER RPC: erst ALLE Vorgaenger-Migrations greppen, neuester Body = current DB-State. **Nicht vom ersten Create ableiten.**
- Audit: `grep -rn "CREATE OR REPLACE FUNCTION public\\.<name>" supabase/migrations/` + zeitlich sortieren → letzter File ist Baseline.
- Gefahr: Silent-Revert aller Patches zwischen Original-Create und aktuellem Stand. Slice 156 v1 hatte in einem `CREATE OR REPLACE` die folgenden dazwischen-Patches ueberschrieben:
  - auth.uid()-Guard (Slice 005 J4-Live-Exploit-Fix)
  - `min_subscription_tier`-Gate (20260325_event_fee_from_config)
  - `min_tier`-Gamification-Gate (20260417000000)
  - `event_fee_config`-Lookup + fee_split Shape `{platform, beneficiary, prize_pool}`
  - `holding_locks`-Cleanup im unlock (20260325_sc_blocking_rpcs)
- Bei SECURITY DEFINER RPCs ist Scope oft defense-in-depth — Guards in einer Schicht weg wird nur in Prod sichtbar.
- Migration-Header-Template:
  ```
  -- Source-of-truth: <last-CREATE-OR-REPLACE-of-this-fn>.sql
  -- Applied patches ueber dem Baseline:
  --   - <file1> — <change-summary>
  --   - <file2> — <change-summary>
  -- This migration: nur diff-related Aenderungen. Alles andere ist 1:1-Kopie.
  ```
- Post-Apply-Audit: `pg_get_functiondef('public.<name>(args)'::regprocedure) ILIKE '%<expected-guard>%'` fuer jedes preserved Feature.

### Transactions Append-Only — hart enforced (Slice 179, Tier A2)

- `transactions` ist DB-invariant append-only. UPDATE + DELETE geblockt auf 2 Ebenen:
  1. `REVOKE UPDATE, DELETE FROM anon, authenticated` — Client-Rollen haben kein DML-Privileg.
  2. BEFORE UPDATE OR DELETE Trigger `transactions_append_only_guard` raises exception — blockt auch SECURITY DEFINER RPCs.
- **Opt-In Bypass fuer legitimierte Bulk-Migrations:**
  ```sql
  BEGIN;
  SET LOCAL bescout.allow_transactions_mutation = 'true';
  UPDATE public.transactions SET type = 'new_type' WHERE type = 'old_type';
  COMMIT;
  ```
  Der Trigger checkt `current_setting('bescout.allow_transactions_mutation', true)` vor dem RAISE EXCEPTION. SET LOCAL gilt nur fuer die Transaction.
- **Bei Admin-Refund-Flow (nicht in V1, aber zukuenftig):** RPC setzt GUC vor UPDATE + audit-entry.
- **Pattern uebertragbar:** Gleicher Trigger+Opt-in-GUC-Pattern fuer andere immutable-log-tables (`trades`, `activity_log`, `audit_log`).

### ON CONFLICT validiert CHECK gegen INSERT-Tuple-Defaults (Slice 075c)
- `INSERT ... ON CONFLICT DO UPDATE` validiert CHECK gegen die INSERT-Tuple-Defaults **bevor** es den UPDATE-Pfad nimmt. `.upsert()` erbt das.
- Symptom: existierende Rows schlagen fehl wenn Tuple-Defaults den Constraint verletzen (Slice 075: 4074/5019 Payloads errored mit `dpc_total=10000` default vs `max_supply=300` CHECK).
- Fix: echter `.update().eq('id', ...)` statt `.upsert()`. Pattern: pre-query `api_id → id` map + `Promise.all(batch.map(t => ...update(payload).eq('id', t.id)))` in Chunks 20-50.

### PL/pgSQL NULL-in-Scalar-Subquery — MONEY (2026-04-11)
- `IF (SELECT COALESCE(x, 0) FROM t WHERE ...) < y` ist FALSCH wenn keine Row existiert. Scalar-Subquery auf leeres Set = NULL. `NULL < y` = NULL = falsy → Guard übersprungen.
- Richtig: `SELECT x INTO v_x; IF COALESCE(v_x, 0) < y THEN ...` ODER `IF NOT FOUND`.
- Audit: `grep 'SELECT COALESCE.*FROM.*WHERE' supabase/migrations/`

### Trigger-Guard BEFORE UPDATE (Slice 081)
- BEFORE UPDATE Trigger auf money-Spalten kaskadiert auch wenn nur flag-Spalten geändert werden → Trading-Block-Risiko bei MV=0-Fallback.
- Jeder Trigger-Body braucht `IF NEW.<col> IS DISTINCT FROM OLD.<col> THEN ...` Guard.
- Check: `sum_mv + sum_ref` byte-identisch vor/nach Migration messen.

### Holdings Zombie-Row (Slice 025)
- `UPDATE holdings SET quantity = quantity - X` → Row mit `quantity=0` bleibt als Zombie. CHECK `>= 0` erlaubt. SUM/COUNT DISTINCT zählen leer-Holdings mit.
- Fix: `AFTER UPDATE OF quantity WHEN (NEW.quantity = 0)` Trigger → `DELETE FROM holdings WHERE id = OLD.id`. Atomisch in Transaction.

### auth.users DELETE NO-ACTION-FK (Slice 028)
- `DELETE FROM auth.users` scheitert an NO-ACTION-FK-Constraints (Postgres 23503). 23 known Tables — siehe `database.md`.
- Pre-Audit via `pg_constraint` (NICHT `information_schema` — cross-schema FKs ausgelassen).
- Row-Counts pro NO-ACTION-Table → pre-clean → `DELETE FROM auth.users`.

### Vercel Hobby Cron-Limit + Function Timeouts (Slice 071 + 075)
- Hobby: max 2 Cron-Jobs, 1×/Tag. Pro: 40 Jobs, 300s HTTP-timeout (NICHT 900s).
- `maxDuration = 300` ist Hard-Limit für HTTP-Trigger. Cron-Schedule darf länger (bis 900s Pro).
- Sync-Routes mit per-Row-DB-Ops timeouten bei 1000+ rows. Batch-Pattern: 1× pre-query `.in(all_ids)` + chunked `Promise.all` (20-50 parallel). Messung: sync-injuries 60s→28s, sync-players-daily 300s→17s.

### pgBouncer Read-After-Write Transient (Slice 139)
- Direkter `.select()` nach `.upsert()` / `.insert()` liefert den neuen Row **manchmal nicht** zurück. Supabase pgBouncer-Pooling → verschiedene Queries landen auf verschiedenen Connections, Read kann vor dem Commit-Visible-Window sein.
- Symptom (Slice 138): Follow → Optimistic+upsert OK → direkter `getUserFollowedClubs` findet Row nicht → reconcile überschreibt Optimistic → UI reverted sichtbar.
- Fix-Strategien:
  - **Skip reconcile-on-success** wenn Optimistic deterministisch ist (Follow-Path skipt, Unfollow-Path behält wg. Primary-Promotion).
  - **Reconcile-Delay 100-300ms** wenn Server-State wirklich gebraucht.
  - **Merge statt Replace** — Optimistic als Ground-Truth, Server als Patch drüber.
- Regel: Nach `setX(optimistic)` + DB-Write NICHT blind `setX(server-read)`.

---

## 3. RPC Design

### RPC INSERT Column-Mismatch (J5 AR-42 + AR-42b)
- `CREATE OR REPLACE FUNCTION` parst Body aber validiert keine Column-Existenz. Fehler erst beim Call (PG 42703) → silent fail, Transaction rollback, Ticket-Kosten revertiert aber Reward weg.
- Beispiele: `open_mystery_box_v2` → `user_equipment(equipment_rank)` (heisst `rank`) · same RPC → `transactions(amount_cents)` (sind `amount`+`balance_after` NOT NULL).
- Regel: Nach JEDER RPC-Migration die INSERT/UPDATE macht: `SELECT column_name FROM information_schema.columns` gegen Body matchen.
- Audit cross-RPC: `SELECT proname FROM pg_proc WHERE pg_get_functiondef(oid) ILIKE '%suspected_column%'`.

### RPC Response camelCase/snake_case (Mystery Box)
- RPC `jsonb_build_object('rewardType', ...)` → camelCase. Service castet `as { reward_type }` → ALLE Felder undefined. TS fängt das nicht (`as` = unchecked assertion).
- Check: `pg_get_functiondef()` → Return-Shape → Service-Cast vergleichen.

### Server-Validation Pflicht für Money/Fantasy RPCs (Slice 023 B4)
- Client-only Validation ist via direkten RPC-Call umgehbar. RPC muss einzige Wahrheit sein.
- Konkret: `rpc_save_lineup` akzeptierte `p_formation='xxx'` ungeprüft → Scoring broken.
- Pattern: Billige Early-Exits (Allowlist, GK-Required, Slot-Counts, Captain-Empty) VOR teuren DB-Joins.

### pg_cron Fail-Isolation (Slice 024 B5)
- RAISE EXCEPTION auf Item #2 blockt ganzen Batch → nachfolgende Items unverarbeitet.
- Fix: `BEGIN ... EXCEPTION WHEN OTHERS THEN ... END` pro Item im FOR-Loop. Safety-Bound: `LIMIT 50`.
- Return `{success, scored, skipped, errored, errors, ran_at}` für Monitoring via `cron.job_run_details`.

### Transaction-Type activityHelpers Sync (Slice 027)
- RPC schreibt neuen `transactions.type` → `src/lib/activityHelpers.ts` mappt type→i18n-Key. Ohne Mapping: User sieht snake_case raw-string.
- Regel: Jeder neue transactions-type-Writer triggert 3-File-Change: activityHelpers.ts + de.json + tr.json.
- Audit: `SELECT DISTINCT type FROM transactions` vs grep activityHelpers.ts.

### RPC Anti-Patterns Top 5
- `::TEXT` auf UUID beim INSERT
- Record nicht initialisiert vor Zugriff in falscher Branch
- FK-Reihenfolge falsch (Child INSERT vor Parent)
- NOT NULL Spalte fehlt im INSERT
- Guards fehlen (Liquidation-Check in Trading-RPCs)

### Money-RPC Pricing-Formel Drift (Slice 108)
- RPC-Body in DB = einzige Wahrheit. Frontend-Tier-Konstanten driften wenn Spec nachträglich geklärt wird.
- Konkret: `liquidate_player` nutzte 10-Tier-Table obwohl CEO-Regel `fee = MV_EUR / 10` linear ist — Drift ~1,5× systematisch höher.
- Prevention: Test-Invariant `SUCCESS_FEE_TIERS[i].fee === calcSuccessFee(SUCCESS_FEE_TIERS[i].minValue)` erzwingt Zero-Drift.
- Regel: Money-RPC mit `COMMENT ON FUNCTION` inkl. Formel-Version (`formula_version: 'linear_v2_2026_04_20'` in Return-JSON).
- Referenz: `memory/decision_pricing_asset_model.md` + `.claude/rules/trading.md`.

---

## 4. Auth / Security

### RLS qual=true auf sensiblen Tabellen (Slice 014 + 019-021)
- `USING (true)` auf `authenticated` = keine Zugriffskontrolle. Bei holdings/transactions/activity_log/user_stats/orders = systemweiter Portfolio/Stat/Trading-Leak.
- Fix: `USING (auth.uid() = user_id OR <admin-check>)`.
- Cross-User-Aggregate (Orderbook, holder-count): SECURITY DEFINER RPC mit projiziertem Output (handle+is_own statt user_id).
- Rollout ohne Markt-Störung: (1) Projection-RPC deploy → (2) Service-Layer migriert → (3) Deploy verify → (4) RLS tighten.
- Guard: INV-26 in `db-invariants.test.ts`.

### SECURITY DEFINER + auth.uid()-Guard (Slice 005 + J4 Live-Exploit)
- J4-Live-Exploit: `earn_wildcards` mintete 99.999 Wildcards als anon (reverted).
- Zwei Exploit-Klassen: **anon** (keine Grant-Beschränkung) + **authenticated-to-other-user** (`p_user_id` ohne auth.uid()-Check).
- Fix-Pattern:
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
- RPC mit `p_user_id` + auth-context: 2 Funktionen statt 1.
  - **Public Wrapper** `rpc_name(args_ohne_uid)`: GRANT authenticated, PERFORM internal(auth.uid()).
  - **Internal** `_rpc_internal(args, p_user_id)`: REVOKE authenticated, GRANT service_role only.
- Zweck 1: auth-context-injection für Client-Calls (kein Exploit ohne auth_uid_mismatch-guard).
- Zweck 2: Trigger ruft Internal direkt (umgeht Guard bei `NEW.seller_id ≠ auth.uid()`). Slice 035: `trg_fn_trade_refresh` ruft `refresh_airdrop_score(NEW.seller_id)`.
- Doku: `COMMENT ON FUNCTION` für beide pflicht.

### RLS Policy Trap — neue Tabelle
- Neue Tabelle mit RLS braucht Policies für ALLE Client-Ops (SELECT + INSERT + UPDATE + DELETE). SELECT-only = silent write failure.
- Nach Migration: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`.
- NIEMALS `console.error` ohne `throw` bei kritischen DB-Writes.

### SECURITY DEFINER Guard: Admin-only vs Public-safe (Slice 095)
- Beim Design: NICHT nur "wer darf diese Tabelle SELECT", sondern **"wo wird der RPC aufgerufen?"**.
- Wenn Return-Shape KEINE user_ids/PII enthält UND die UI-page public ist: **kein Guard nötig** — der RPC ist selbst die Security-Boundary via Projection.
- Wenn Return-Shape user_ids/PII enthält: **admin-Guard pflicht**.
- Slice 095: `rpc_get_club_recent_trades` (public-safe) hatte fälschlich club-admin-guard → blockte `/club/<slug>` für alle non-admin. Fix: Guard entfernen.
- Regel: Vor Deploy `grep -rn "rpc_name" src/components/ src/app/` — wenn eine public-page es nutzt, MUSS RPC public-callable sein.

---

## 5. Frontend (React / TS / CSS)

### React / TypeScript Checklist
- Hooks VOR early returns.
- `Array.from(new Set())` / `Array.from(map.keys())` statt Spread (strict TS).
- Modal: IMMER `open={true/false}` prop.
- PlayerPhoto: `first` / `last` / `pos` (nicht firstName/lastName).
- Barrel-Exports bereinigen wenn Files gelöscht werden.
- NIEMALS `.catch(() => {})` — mindestens `console.error`.
- Cancellation Token in useEffect: `let cancelled = false; return () => { cancelled = true; }`.
- Null-Guards: `floor_price ?? 0`, `entry.rank ?? 999`.

### Modal preventClose Pattern (J2 + J3)
- Jeder Modal mit `useMutation.isPending` → `preventClose={isPending}` pflicht. Sonst ESC/Backdrop-Click mitten in DB-Transaction verliert State.
- Heuristik: `Modal` + (`isPending|cancelling|selling|buying|submitting`) im gleichen File → nachrüsten.
- Audit: `grep -rn '<Modal' src/components/ | grep -v preventClose`

### CSS / Tailwind Gotchas
- `::after` / `::before` mit `position: absolute` → Eltern MUSS `relative`. `overflow: hidden` reicht NICHT als Containing Block.
- `flex-1` auf Tabs → iPhone overflow → `flex-shrink-0`.
- Dynamic Tailwind NIEMALS: `border-[${var}]/40` → JIT scannt nur statische Strings. Nutze `style={{ borderColor: hex }}` + statische Class.

### Multi-League Props-Propagation (J3 + J4)
- Neues optional Field auf Type (z.B. `leagueShort?`) → nur 2/8 Render-Call-Sites bedient. TSC/Tests merken nichts (optional = kein Error).
- Visual-QA im Pilot (1 Liga) übersieht's, Fehler erst im Multi-League-Betrieb.
- Beispiele: TradingCardFrame + PlayerHero + TransferListSection hatten 0 Liga-Logos trotz vollständigem Type. FantasyEvent + UserDpcHolding hatten `club*` aber kein `league*`.
- Regel: Jedes Type mit `club*` Field MUSS spiegelbildlich `league*` Fields haben. ALLE Render-Call-Sites manuell greppen.

### Data-Format vs Component-Expectation Drift (Slice 102)
- Scraper speichert Full-Name ("Nigeria"), Component erwartet ISO-Code ("NG"). `hasFlag("NIGERIA")` = false → unsichtbarer text-badge-Fallback.
- Bonus-Bug: Pilot-Default `?? 'TR'` auf service-layer setzt NULL-Spieler auf türkisches Flag — bei Multi-Liga-Expansion wird Pilot-Default zum Gift.
- Regel: Component-API-Contract muss im Service-Layer-Mapper erzwungen werden, nicht als DB-Schema-Annahme. Leer/unbekannt → `""` / `undefined`, **nie** raten. Truthy-Check im Component: `{code && <Flag ...>}`.
- Library-Quirk: `country-flag-icons` — `hasFlag("GB-ENG")` true, aber React-Export heisst `GB_ENG` (Underscore). Mismatch im Component transformen.
- Audit: `SELECT DISTINCT <field>, COUNT(*) FROM <table> GROUP BY <field>` → jede Zeile gegen Component-Contract validieren.

### ConfirmDialog statt native alert/confirm (J4)
- Live: `src/components/ui/ConfirmDialog.tsx` — built-in preventClose + loading/disabled + `confirmVariant: 'gold' | 'danger'`.
- Native alert/confirm sind unstyled, blockieren Main-Thread, nicht i18n-ready, ignorieren preventClose.
- Audit: `grep -rn 'window.alert\|window.confirm' src/`

### UX Konsistenz
- Spieler-Anzeigen → Link zu `/player/[id]` (Ausnahme: Picker-UIs).
- `<button>` NICHT in `<Link>` wrappen (invalid HTML) → `href` Prop oder Wrapper-Komponente.

### Vote-Toggle Client-Intent vs RPC-Constraint (Slice 159 Finding → Slice 160 FIXED)
- Client sendet `voteType=0` fuer Toggle-Off (z.B. `handleVote(replyId, myVote === 1 ? 0 : 1)`), aber `vote_post` RPC (Migration `20260404192000`) hat Guard `p_vote_type NOT IN (1,-1) → json_build_object('success', false, 'error', ...)`. Kein HTTP-Error, kein throw — Service castet `data as { upvotes: number }` silent auf `undefined` → UI-State-Breakage (keine Error-Toast, Vote haengt, Refresh zeigt Vote wieder da).
- **RPC-seitiger Toggle-Pfad:** `vote_post` hat internal DELETE-Branch wenn `p_vote_type = v_existing.vote_type` (same vote → remove). Client muss **same vote_type** senden, nicht 0.
- **Fix-Pattern (Slice 160, angewendet auf 4 Files):** UI sendet immer `1` oder `-1`. Handler liest lokalen State `prevVote = myVotes.get(postId)`, ermittelt `isToggleOff = prevVote === voteType`, updated State entsprechend (`isToggleOff ? myVotes.delete : myVotes.set`).
- **Fixed Files (2026-04-23):** `PostReplies.tsx` · `PostCard.tsx` · `CommunityFeedTab.tsx` (Prop-Type) · `useCommunityActions.ts` · `CommunityTab.tsx` (player detail) · `usePlayerCommunity.ts` · `EventCommunityTab.tsx`. Handler-Signaturen alle auf `voteType: 1 | -1`.
- **Silent-Type-Cast-Risiko:** Service `votePost` castet `data as { upvotes: number; downvotes: number }` ohne Shape-Check — bei RPC-Error-Response (`{success:false, error:"..."}`) returnt das undefined-Felder. Separater Silent-Fail-Audit-Kandidat: Error-JSON in Service erkennen und throwen.
- **Audit:** `grep -rnE "voteType === (0|1|-1) \? 0" src/` → Regression-Guard fuer 0-Send-Pattern (post-160 sollte 0 Treffer zurueckgeben).

---

## 6. i18n / Locale

### i18n-Key-Leak via Service-Errors (J1 + J3)
- `throw new Error('handleReserved')` → `err.message === 'handleReserved'` (raw key). Caller mit `setError(err.message)` zeigt literal unübersetzt.
- Fix: Caller resolved via `mapErrorToKey(normalizeError(err)) → te(key)`.
- Konvention: Service wirft I18N-KEYS, Consumer resolved via `t()`. In Service-JSDoc dokumentieren.
- Nach JEDEM swallow→throw-Refactor ALLE gleichartigen Consumer-Pfade greppen (J3: useTradeActions hatte 4 Methoden, nur 1 war gefixt).
- Audit: `grep -n 'throw new Error' src/lib/services/` → Keys sammeln → gegen `setError(err.message)` prüfen.

### Error-Messages nie dynamische Werte (J3 Triple-Red-Flag)
- `throw new Error(\`Price exceeds maximum (${X} $SCOUT)\`)` hat 3 Probleme: DE/EN-Mix + $SCOUT-Ticker user-facing + dynamischer Wert.
- Dynamic gehört in Pre-Submit-Hints, nicht Post-Error.

### Turkish Unicode
- `I`.toLowerCase() = `i̇` (NICHT `i`) → NFD + strip diacritics + `ı→i`.
- SQL: `translate(lower(name), 'şçğıöüİŞÇĞÖÜ', 'scgiouISCGOU')`.

### React setState Race in Mutation-Handler (Slice 149 / 150 / 151 — D18)
- `async handleX() { if (loading) return; setLoading(true); try { await fn(); } finally { setLoading(false); } }` ist race-prone. React setState ist async — zwischen `if`-Check und setState koennen 2 Clicks in derselben Render-Frame beide passieren → 2 parallele DB-Writes.
- **Symptom:** Follow-Button zeigt kurz +2 Delta; Wallet wird doppelt abgebucht bei Network-Retry; UI-Wackeln nach optimistic-update.
- Slice 150 Audit zaehlte 63 Files mit dem Pattern; nur 4 nutzen `useMutation` (race-safe).
- **Fix:** `useSafeMutation` aus `src/lib/hooks/useSafeMutation.ts`. `safeTrigger(variables)` hat synchronen `isPending`-Guard via React Query v5 MutationObserver. Auto-Toast bei Error (`errorToast`) + Sentry-Breadcrumb (`errorTag`).
- **Migration-Plan:** `worklog/proofs/150-mutation-audit.md` — 5 Phasen, Money-Path zuerst (Tier-1, CEO-Scope), dann Data-Integrity (Tier-2), dann Auth (Tier-3).
- **Piloten:** useClubActions (151b), MembershipSection (151c).
- **Stand 2026-04-23:** Tier-1 Money-Path 7/9 done — trading.ts (153a), usePlayerTrading (153b), useEventActions (156), useOffersState (157), KaderSellModal (158). Tier-2 Data-Integrity 4/8 done — ReportModal/PostReplies/FanWishModal (159). Offen: AdminWithdrawalTab + AdminFoundingPassesTab, plus LeaguesSection + AirdropScoreCard + MissionBanner.
- **Blueprint-Referenz:** `memory/patterns.md` #28 (Ferrari-Blueprint) — vollstaendige Struktur incl. onMutate/Rollback/onSettled.
- **Audit-Command:** `npm run audit:mutation-race` (scripts/audit-mutation-race.sh) — CI-Gate kandidat.

### Money-RPC Idempotency-Window (Slice 151c.2 — D18 Subsection)
- Money-RPCs die Wallet-Deduct + Domain-INSERT kombinieren: Pre-Check fuer existing-state mit kurzem Window (60s) VOR Wallet-Deduction.
- Client-Guard (useSafeMutation safeTrigger) ist Defense-in-Depth — **NICHT authoritative**. Server-side network-retry (Mobile-Switch, 3G-Timeout) umgeht den Client-Guard.
- **Symptom (Slice 151c.2):** subscribe_to_club deductete Wallet UNCONDITIONAL vor `ON CONFLICT`-Check. Call #1: 1M → 950K. Call #2 (network-retry): 950K → 900K. Subscription-Row via ON CONFLICT OK, aber 2x Wallet-Deduct.
- **Fix-Pattern:**
  ```sql
  IF FOUND THEN
    IF v_existing.tier = p_tier AND v_existing.started_at > NOW() - INTERVAL '60 seconds' THEN
      RETURN jsonb_build_object('success', true, 'idempotent_retry', true, ...);
    END IF;
    -- tier-change / older: cancel + new (Upgrade/Downgrade-Flow)
  END IF;
  -- Wallet-Deduction nur nach Idempotency-Check
  ```
- **Audit-Query vor Money-RPC-Migration:** `SELECT pg_get_functiondef('rpc_name'::regproc);` → Body auf Pre-Check + Early-Return pruefen.
- **Anwendbar auf:** subscribe_to_club (DONE 151c.2), renew_club_subscription, buy_player_dpc, openMysteryBox, liquidate_player. Slice 152+ jede einzelne pruefen.

### useCountUp auf volatile Server-Daten (Slice 151b-RESET — D20 Klasse D)
- `useCountUp(serverData, durationMs)` animiert jedes Re-Render mit neuer Zahl. Auf React-Query-Daten die zwischen Optimistic-Update + Stale-Refetch + Real-Refetch hopsen entstehen 2-3 sichtbare Animations-Zyklen.
- **Symptom:** Anil-Report Club-Follow "zeigt mal 0, mal 4 Scouts, blinzelt". Hero und StatsBar animierten parallel mit unterschiedlichen Start-Punkten → Desync zwischen 2 Anzeigen desselben Werts auf demselben Screen.
- **Fix:** `useDeferredValue` davorschalten — React throttlet Zwischenwerte und commit-en nur den letzten stable Wert.
  ```ts
  // Schlecht — animiert jeden Optimistic-Stale-Real-Wechsel:
  const count = useCountUp(followerCount, 600);

  // Gut — React deferred-rendert, nur 1 Animation:
  const stable = useDeferredValue(followerCount);
  const count = useCountUp(stable, 600);
  ```
- **Anwendbar auf:** alle `useCountUp`-Call-Sites mit Query-Cache-gespeisten Inputs. Heute angewendet in `ClubHero.tsx` (Slice 151b-RESET) + `ClubStatsBar.tsx`. Audit-Command: `grep -rn 'useCountUp(' src/ | grep -v useDeferredValue`.
- **Alternative bei reinen UI-Updates:** `useCountUp` ganz weglassen (Animation ist Dekoration, Data-Correctness ist Pflicht).

### Component-Prop Silent-Fallback (Slice 149b — D17)
- Components mit `prop?: T | null` + Fallback-Branch der schlechte-UX liefert: Caller-Sites koennen prop weglassen **ohne TSC-Error**, User sieht silent-degraded UI.
- Beispiel: `PlayerPhoto(imageUrl?)` rendert Photo wenn imageUrl, sonst Initialen-Circle. 7 Call-Sites korrekt, 3 vergessen → 30% silent-fail auf Club-Page-Sections (IPO, Trending, Rankings).
- Symptom: User-Screenshot zeigt Initialen, aber DB hat Photos + Primary-Claude-Playwright-Proof auf anderer Section zeigt Photos korrekt → Inkonsistenz verdeckt durch Sub-Section-Unterschiede.
- Detect-Audit: `grep '<ComponentName' src/` → Zeile-fuer-Zeile prop-Coverage checken. Falls >3 Call-Sites: separate Coverage-Test-Fixture oder required-prop-Variant erstellen.
- Prevention-Pattern: Wenn Fallback-Branch schlecht genug UX hat um User-Reports auszuloesen, mach prop **required** und erfordere Caller-Seite `imageUrl={x ?? null}` explicit — TSC-Check erzwingt bewusste Entscheidung.

### Singleton→useQueryClient() Migration — exhaustive-deps-Trap (Slice 170 → codifiziert Slice 171)
- Vor Migration: `import { queryClient } from '@/lib/queryClient'` ist ein **Module-Import** — exhaustive-deps Rule exempt, weil Module-Level-Bindings nie in deps-arrays gehoeren.
- Nach Migration: `const queryClient = useQueryClient()` ist ein **Hook-lokales Binding** — MUSS in allen `useCallback`/`useMemo`/`useEffect` deps-arrays die `queryClient.*` im Body lesen.
- **Runtime-Impact meist Null:** `useQueryClient()` returnt die gleiche stable Instance solange der `QueryClientProvider` sich nicht aendert (React Query v5 Garantie). ABER Konvention-Drift zum etablierten Pattern + ESLint-warn bei strict.
- **Symptom wenn vergessen:** `eslint-plugin-react-hooks` warnt `React Hook useCallback has a missing dependency: 'queryClient'`. CI bricht nicht (Rule ist warn, nicht error bei `next/core-web-vitals`), aber Konvention-Konsistenz zum Sister-Hook `usePlayerCommunity.ts` (etablierte Referenz) fehlt.
- **Slice 170 Evidence:** 9 useCallbacks in `useCommunityActions.ts` (Z.116, 133, 155, 178, 243, 297, 313, 325, 361) brauchten `queryClient` in deps nach Hook-Migration. Sister-Hook `usePlayerCommunity.ts` (Z.58, 98, 110, 122) hat das Pattern bereits richtig.
- **Audit-Command (post-Migration):**
  ```bash
  grep -n "queryClient\." <file> | while read L; do
    line=$(echo "$L" | cut -d: -f1)
    # Finde enclosing useCallback und pruefe deps-array
    awk -v ln=$line 'NR<=ln && /useCallback/{start=NR} END{print start}' <file>
  done
  ```
- **Audit-Pattern vor Slice-170b (weitere Singleton-Kandidaten):** Bei jeder Singleton→Hook-Migration:
  1. Imports: `useQueryClient` ergaenzen, Singleton-Import entfernen.
  2. Hook-Call `const queryClient = useQueryClient();` in Component-/Hook-Body vor erstem Use.
  3. **MANDATORY:** jede `useCallback`/`useMemo`/`useEffect` die `queryClient.*` im Body liest um `queryClient` in deps erweitern.
  4. Test-File: `vi.hoisted(mockQc)` + partial `@tanstack/react-query` Mock (siehe testing.md §5).
- **Cross-Ref:** `memory/patterns.md` #28 Konvention "useQueryClient() Hook > Singleton queryClient" + `.claude/rules/testing.md` "useSafeMutation Test-Patterns" Pattern 5.

---

## 7. Build / Deploy

### tsconfig excludes scripts (Slice 079)
- `"include": ["**/*.ts"]` + `"exclude": [..., "e2e"]` → includet `scripts/`. Scripts importieren deps wie `playwright` die nicht in `package.json` sind.
- `tsc --noEmit` cleant lokal (`skipLibCheck: true`), **Vercel `next build` schlägt fehl**: `Cannot find module 'playwright'`. Symptom: Commits über Tage auf Vercel "Error", Production zeigt alten Deploy.
- Fix: `"exclude": [..., "scripts", "tmp"]`. Dev-scripts laufen via `npx tsx` weiter.
- Prevention: Nach neuen `scripts/*.ts` immer `npx next build` lokal (nicht nur tsc).
- Debug: `npx vercel inspect <deploy-url> --logs`.

### Next.js Route-Handler Named-Exports (Slice 069)
- `export function helper()` in `src/app/api/**/route.ts` ist verboten. Nur HTTP-Methods (GET/POST/...) + `runtime|dynamic|revalidate|fetchCache|maxDuration|generateStaticParams|config`.
- Jeder andere Export → `next build` Type-Error `'OmitWithTag<...>' does not satisfy the constraint`.
- `tsc --noEmit` fängt das NICHT — Type entsteht aus generated `.next/types/app/.../route.ts` nur beim `next build`.
- Kostete 11 gefailte Deploys / 2 Tage / 4 Slices.
- Fix: Helpers nach `src/lib/scrapers/` extrahieren. Regel: Nach JEDEM route.ts-Edit → `npx next build` lokal.

### ESLint disable-comment mit undefined rule (Slice 069)
- `// eslint-disable-next-line @typescript-eslint/no-explicit-any` failt wenn Plugin nicht in eslintrc (extends nur `next/core-web-vitals`).
- Fix: typgerechter Cast (`as unknown as (k: string) => string`) oder `unknown` + enger Cast — kein disable-comment.

### Vercel Env + Module-Level + CSP
- `NEXT_PUBLIC_*` NIEMALS als "Sensitive" markieren → werden beim Build nicht injected.
- KEIN `createClient()` auf Module-Level → Lazy-Init via Proxy/Getter, sonst crasht Vercel Build.
- CSP `img-src`: Domains aus DB ableiten (`SELECT DISTINCT substring(image_url FROM '^https?://[^/]+')`), nicht raten. Spielerbilder sind `img.a.transfermarkt.technology`.

---

## 8. Cross-Cutting / Operational

### Grep-Audit-Scope-Gap bei Sub-Component-Scan (Slice 166)
- Top-Level-Grep (`grep "<Modal" src/components/`) findet nur direkt in Top-Level-Component-Files — verpasst **embedded Modals in Sub-Components** (Cards, Tabs, Dialog-Containers).
- **Slice 166 Evidence:** Primary Scope-Audit fand 7 Modal-Targets. Reviewer-Scope-Gap-Audit fand **zusätzliche 6 embedded Modals** (46% der Fixes):
  - `OfferModal.tsx` (HIGH-Prio Money-Pfad, P2P)
  - `BountyCard.SubmitModal` (embedded in Card)
  - `CommunityTab.CreatePost` + `CommunityTab.CreateRumor` (embedded in Tab)
  - `ReportModal` + `FanWishModal` (Top-Level aber Slice-159-Blueprint-Gap)
- **Fix-Pattern (besserer Audit):**
  ```bash
  # Step 1: ALLE Modal-Usages (egal wie tief verschachtelt)
  grep -rn "<Modal" src/ | grep -v "preventClose\|__tests__" | awk -F: '{print $1}' | sort -u
  # Step 2: Cross-Ref mit mutation-state-Pattern
  grep -rn "isPending\|loading:\|saving\|submitting\|posting" <found-files>
  ```
- **Regel:** Wenn Scope-Basis-Pattern ist "alle X mit Y-Attribut finden", dann:
  - Full-recursive-Grep, nicht top-level-only.
  - Cross-Ref mit Zweit-Pattern (Mutation-State, Loading-Prop, State-Variable) um echte Targets von Noise zu trennen.
  - Reviewer-Agent als Scope-Gap-Catcher einsetzen — Spec-behauptete "Audit komplett"-Claims sind Audit-blind-spot-Kandidaten.
- **Relevant für:** Modal-preventClose Sweep, Dead-Code-Entfernung, API-Consumer-Updates, Pattern-Migration-Scans (z.B. "alle useState-Loading auf useSafeMutation migrieren").
- **Cross-Ref:** `memory/patterns.md` #28 Konvention "Modal-gescopte Mutation → preventClose Pflicht" — wurde in Slice 166 systematisch angewendet nach Reviewer-Gap-Catch.

### dynamic() rettet nur wenn KEIN anderer Pfad eager lädt (Slice 121)
- Symptom: `const { fn } = await import('module')` in queryFn eingebaut, Modul bleibt trotzdem im Initial-Bundle.
- Root cause: Webpack erstellt Lazy-Chunk, aber wenn **irgendein anderer Codepfad** denselben Modul eager importiert, bleibt Modul-Code in beiden Chunks.
- Slice 121 Evidenz: BuyConfirmModal lazy-importierte research.ts (Lazy-Chunk 11.8 kB entstand), aber Modul blieb in /market-only chunk weil TradingTab es eager lädt. Market-only total 70→73 kB (keine Reduktion).
- Regel: Vor "Seite X FLJS sinkt"-Versprechen: `grep -rn "from.*'@/lib/services/<modul>'" src/` → ALLE Call-Sites prüfen.
- Messen: `ANALYZE=true next build` + app-build-manifest.json — prüfen ob Lazy-Chunk NICHT in Ziel-Route's `pages[].chunks[]` erscheint.

### Namespace-Import blockiert Tree-Shaking (Slice 120)
- Symptom: `optimizePackageImports` tree-shaked nicht, obwohl Library drin ist. Bundle enthält alle Exports.
- Root cause: `import * as X from 'lib' + X[dynamic]` = namespace-import mit dynamic lookup. Webpack bundled alles.
- Slice 120 Evidenz: `country-flag-icons/react/3x2` namespace = 235 kB parsed / 53 kB gzipped. 265 Flag-Komponenten, ~10 pro Session gebraucht.
- Lösung je nach Library:
  - **Static assets (SVG/PNG) verfügbar**: nach `public/` kopieren + `<img src>` — zero JS bundle. Empfehlung für Flags, Icons.
  - **React-only**: Named imports statt Namespace. `import { X, Y, Z }` tree-shakable mit `optimizePackageImports`.
  - **Dynamic lookup zwingend**: Factory-Map mit `React.lazy` / `dynamic()` pro Export.
- Audit: Bundle-Analyzer Client-HTML nach chunks >200 kB suchen → wenn einzelnes Module dominiert = Namespace-Import-Suspect.
- Regel: Vor `import * as X` aus schwerem Package: prüfen ob static-asset-Alternative oder Named-Imports reichen.

### Query-Konsolidierung ≠ LCP-Win wenn Queries schon parallel (Slice 109)
- Symptom: N Einzel-Hooks in 1 SECURITY DEFINER RPC konsolidiert. Network-Log zeigt eliminierte Calls. Aber LCP-Delta nur -1-5%, innerhalb Rauschen.
- Root cause: React Query feuert Einzel-Hooks **parallel** beim Mount. Die 4 Roundtrips liefen schon gleichzeitig — Einsparung ist `max(1 RPC) - max(4 parallel)`, meist <50ms.
- Latenz-Gewinn nur bei: (a) wirklich sequentielle Queries (waterfall), (b) LCP-blocking, (c) HTTP/1-Limits.
- Structural Wins die trotzdem echt sind: -N Roundtrips, Konsistenz, Priming-Pattern für andere Pages, DB-billiger als 4× PostgREST-parse.
- Regel: Vor Konsolidierung prüfen ob sequentiell oder parallel. Parallel → kein LCP-Win versprechen, nur Connection-Count + Konsistenz.
- Evidenz: /home LCP 3792→3740ms (-1.3%). Structural: 3 Calls → 1 RPC. Net -2 roundtrips.

### Data Contract Changes (NICHT als UI-Change behandeln)
- required → optional (Field, Prop, DB Column) = Contract Change → alle Consumer greppen.
- optional → required = Breaking → Migration + Backfill nötig.
- Form-Validation ändern (disabled, required weg) → downstream prüfen bei null/leer.
- Service swallow→throw = Breaking für Caller. ALLE Caller greppen + try/catch auditen. Für "best-effort" Side-Effects (club-follow, referral, avatar): separates try/catch + `console.error` + continue.
- Slice J1: `applyClubReferral.throw` ohne Consumer-Fix → onboarding trapped User.
- Regel: Jede Änderung die beeinflusst WELCHE Werte in DB geschrieben werden → `/impact` oder manueller Grep VOR Code.

### Cross-Club-Contamination via API-Football (Slice 081d)
- Club hat 62 Spieler (realistisch ~30). Duplikate haben 0 Appearances + Name+Contract-Match zu echten Spielern anderer Clubs (verschiedene `api_football_id`).
- Beispiel: Aston Villa hatte 11 Duplikate von Werder/Real-Madrid-Spielern.
- Detect: SELF-JOIN auf `(first_name, last_name, contract_end)` + `club_id <> club_id` + target `last_appearance_gw = 0`.
- Fix: `club_id = NULL` (nicht DELETE — reversibel, kein FK-Cascade). Guard: INV-39.

### TM Player-Matching Trikot-Check (Phase B)
- Name-based TM-Search liefert false-positives bei identischen Namen (z.B. "Bara Ndiaye").
- Fix: Nach name+club scoring (≥30), scrape TM-Profile + compare `shirt_number`. Mismatch bei beiden NOT NULL → SKIP. Match oder one-sided NULL → accept.
- Impact: Threshold 50→30 (Recall↑), 0 shirt-mismatches in ~1000 Runs.
- Parser: `parseShirtNumber` in `src/lib/scrapers/transfermarkt-profile.ts`.

### Unknown-with-existing-Mapping Trap (Phase B)
- Players mit `mv_source='unknown'` aber EXISTING `player_external_ids` (source='transfermarkt') sind scrape-ready, nie verifiziert.
- Detect:
  ```sql
  SELECT COUNT(*) FROM players p
  JOIN player_external_ids pe ON pe.player_id=p.id AND pe.source='transfermarkt'
  WHERE p.mv_source='unknown' AND (p.matches>0 OR p.last_appearance_gw>0);
  ```
- Workflow: `npx tsx scripts/tm-rescrape-stale.ts --mv-source=unknown --league="<name>"`.

### API-Football Quirks
- Substitution: `time.elapsed` (NICHT `time.minute`!), `player`=OUT, `assist`=IN.
- Null guards: `evt.player?.id` und `evt.assist?.id` können null sein.
- `grid_position` kann kaputt sein: fehlende GK-Row, Duplikate, >11 Starters.
- KEINE Market Values → nur Transfermarkt.

### Shell / Hooks (Windows Git Bash)
- `grep -oP` mit `\K` scheitert silent (Locale: "supports only unibyte and UTF-8"). Fix: `sed -n 's/.*"key"\s*:\s*"\([^"]*\)".*/\1/p'`.
- Worktree-Agents haben KEINEN Zugriff auf `.claude/skills/` → Fallback Main-Repo-Path oder Task gut verpacken.

### Shell case-statement wildcard promiskuös (Slice 145 + 146)
- `case "$COMMAND" in *"merge"*) exit 0 ;; esac` matched **jede** Commit-Message mit "merge" drin und skipped den Hook. Same-Klasse: `*"--amend"*`, `*"git commit"*` (letzteres false-triggert bash test-scripts die Fixture-Strings wie `git commit -m "fix(x)"` enthalten).
- Regel: Shell-case-patterns auf COMMAND-Strings MÜSSEN command-token-anchorn, nicht substring-matchen:
  - Start-of-command: `"git merge"|"git merge "*)` (nicht `*"git merge "*`)
  - Flag in unquoted command: erst `UNQUOTED=$(echo "$CMD" | sed 's/"[^"]*"//g; s/'\''[^'\'']*'\''//g')`, dann `case "$UNQUOTED" in *"--amend"*)` — strippt quoted message-Inhalte raus, damit `git commit -m "docs: add --amend help"` nicht false-exempt.
- Fix in Slice 146: Alle 3 Stellen (merge-anchor + --amend-quoted-strip + git-commit-outer-anchor) in `ship-proof-gate.sh` + `ship-cto-review-gate.sh`. 21-Case Test-Suite als Regression-Guard (`worklog/proofs/146-hook-test.txt`).
- Audit: `grep -rn 'case.*in.*\*"' .claude/hooks/` — jede Zeile gegen "könnte COMMAND-Message selbst den Token enthalten?" pruefen.

### Heredoc-Backdoor in Commit-Gates (Slice 145 + 146)
- `ship-proof-gate.sh` hatte: `case "$COMMAND" in *"<<"*) exit 0 ;; esac` — "user knows what they do". In Praxis umgeht jeder heredoc-Commit (95%-Variante bei multi-line messages) den Gate komplett.
- Anti-Pattern: "Hook exempt bei komplex aussehendem input" — das ist die Commit-Variante die am meisten Review braucht.
- Fix in beiden Gates: Heredoc-Exempt entfernt. MSG-Extraktion via `grep -oE "(feat|fix|refactor)[(:]..."` auf dem ganzen COMMAND-String fängt heredoc-Messages auch (Claude's JSON-stdin hat den feat/fix/refactor-Token im heredoc-Body erreichbar).

### grep `\b` Word-Boundary broken bei JSON-escaped Heredoc (Slice 146)
- PreToolUse-Hooks kriegen JSON wie `{"command":"git commit -m \"$(cat <<EOF\nfeat(x): msg\nEOF\n)\""}`. Die `\n` bleiben in bash als Literal `\` + `n` (2 chars), nicht als echte newlines.
- Heredoc-Body zeigt dann als `...\nfeat(x)...` — der Char vor `feat` ist das Literal `n` = word-char → `\b` matched NICHT.
- Folge Slice 145: `grep -oE "\b(feat|fix|refactor)[(:]"` in review-gate fand NIE die heredoc-Messages → Hook exit 0 silent → effektiver Bypass für ALLE heredoc-Commits.
- Fix (Slice 146): `\b` entfernen, `[(:]`-Suffix reicht als Word-Boundary-Ersatz (prevents `feature`/`fixation` Matches). Alternative bei PCRE: `[^a-zA-Z_]`-Lookbehind.
- Audit: `grep -rn '\\b(feat\|fix\|refactor)' .claude/hooks/` — jede Stelle auf JSON-Context pruefen.
- Regel: Bei Shell-Hooks die JSON-Stdin parsen: `\b` ist unreliable weil escaped `\n` word-char-Kontext erzeugt. Suffix-Anker oder explizite Char-Class statt `\b`.

---

## 9. Scraper-Parser (extern HTML)

### Nested-tr + non-greedy regex → mid-row cutoff (Slice 144)
- TM Squad-Page rendert pro Zeile nested `<table class="inline-table">` mit eigenen `<tr>`s.
- Regex `/<tr class="(?:odd|even)">([\s\S]*?)<\/tr>/g` stoppt am ERSTEN inneren `</tr>`, nicht am äußeren squad-row-`</tr>`. Shirt+Name+Position matched (früh), MV+Nationality verloren (nach inline-table-close).
- Fix: tr-depth-counter state machine:
  ```ts
  const step = /<tr[\s>]|<\/tr>/g;
  step.lastIndex = start;
  let depth = 1;
  while ((m = step.exec(html)) !== null) {
    if (m[0] === '</tr>') { depth--; if (depth === 0) { cursor = m.index; break; } }
    else depth++;
  }
  ```
- Regel: Bei nested-Element-Parsing (HTML-Rows, JSON-Objects, XML-Nodes) IMMER depth-counter statt non-greedy regex.

### HTML-Attribut-Order-Sensitivity (Slice 144)
- TM rendert `<img ... title="Türkei" alt="Türkei" class="flaggenrahmen" />` — title VOR class.
- Regex `/class="flaggenrahmen[^"]*"[^>]*title="([^"]+)"/` matched nur wenn class vor title → 0% coverage.
- Fix: 2-step extraction. Match ganzes Tag via class-anchor, dann extrahiere title innerhalb.
- Regel: HTML-Attribute-Matching NIEMALS auf Reihenfolge verlassen. Lookaround (PCRE) oder 2-step-Extract.

### DE-EN Name-Drift in Fuzzy-Match (Slice 141b)
- TM zeigt deutsche Club-Namen: "AC Mailand" statt AC Milan, "SSC Neapel" statt Napoli, "Amed SK" statt Amedspor.
- Fuzzy-Match via Token-Overlap scheitert bei fremdsprachigen Umbenennungen ohne Token-Gemeinsamkeit.
- Fix-Patterns: (1) Manuell-Fill für bekannte Drift-Cases. (2) Multi-Language-Dictionary als 3rd Fuzzy-Fallback. (3) TM-Slug als sekundäre Signal-Quelle.
- Regel: Scraper auf lokalisierten Websites brauchen Locale-Drift-Handling. TM-DE ≠ TM-EN in Club-Namen für ~30% der non-DE-Clubs.

### URL-based Canonical-ID statt Fuzzy-Match (Slice 141b)
- Wenn externe Quelle stabile URL-Pfad-ID hat (z.B. `/startseite/verein/<id>`), nutze die ID als Primary-Key statt Club-Name-Fuzzy-Match.
- Slug kann driften (Rebrand), ID bleibt stabil über Jahre.
- Pattern: `/href="\/([a-z0-9-]+)\/startseite\/verein\/(\d+)"/` liefert slug + ID; Slug ist decorative, ID ist canonical.

### Scraper null-Policy: always write null statt old-value keep (Slice 144g — D16)
- Parser returnt `null` wenn Source-Feld fehlt. Policy MUSS sein: write `null` to DB, nicht alten Wert belassen.
- Anti-Pattern: `if (contract !== null) updates.contract_end = contract` — bei null keep-old = data-liar. UI zeigt alte 2022-Werte trotz `mv_source=verified`.
- Fix-Pattern: `updates.contract_end = contract` — always write, `null` = honest "source has no current value".
- Evidenz Slice 144g: 3 WER-Players (Lynen/Pieper/Stark) hatten 0 "Vertrag bis" in TM-Profil → parser null korrekt → old-keep-policy liess 2022-07-01 in DB. Fix setzt NULL, UI (`calcContractMonths → 0`, `PerformanceTab > 0` gated) behandelt null transparent.
- INV-38 heilt automatisch (filters IS NULL out).
- Regel: Für ALLE scraper-consumers die DB-Write machen: null-return from parser = null-Write to DB, nicht keep-old. Opt-out via explicit flag dokumentieren wenn conservative-mode irgendwo gewollt.
- Audit: `grep -rn "if.*!==.*null.*updates\." scripts/` — jede Zeile als Data-Liar-Suspect prüfen.

---

## 10. React Query + Supabase Cache

### setQueryData statt invalidateQueries bei deterministic optimistic (Slice 143)
- Nach `toggleFollow` war nur `qk.social.followerCount(userId)` invalidated. `qk.clubs.followers(clubId)` und `qk.clubs.isFollowing(uid, cid)` drifted bis 2min stale-cycle oder Page-Refresh.
- Fix: `queryClient.setQueryData(key, (prev) => prev ± 1)` — deterministic, kein Refetch-Roundtrip.
- Regel: Bei deterministischer Mutation (follow/unfollow, ±1) → `setQueryData`. Bei indeterministic (server uuid, complex state) → `invalidateQueries`.
- Warum: `setQueryData` schafft instant-Propagation an ALLE Consumer. `invalidateQueries` ist async + Netzwerk-Roundtrip.
- Pattern:
  ```ts
  const delta = wasFollowing ? -1 : 1;
  queryClient.setQueryData<number>(qk.clubs.followers(clubId), (prev) =>
    prev === undefined ? prev : Math.max(0, prev + delta),
  );
  queryClient.setQueryData<boolean>(qk.clubs.isFollowing(uid, clubId), !wasFollowing);
  ```

---

## 11. Beta-Launch-Ops (BETA-PREP 2026-04-21)

### CSP blocks Sentry EU ingest (silent error-tracking failure)
- Sentry EU endpoint = `https://<org>.ingest.de.sentry.io/` (aus org-token `region_url` lesbar).
- Vercel CSP `connect-src` muss **explizit** Sentry enthalten, sonst werden JS-Events silent gedroppt (86 CSP-Violations per Synthetic-Run beobachtet).
- Fix in `vercel.json`: `connect-src ... https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io`.
- Detect: `grep "Refused to connect" qa-screenshots/synthetic/*/report.md` — wenn Sentry-URL → CSP broken.

### Vercel "Sensitive" Flag auf NEXT_PUBLIC_* = Build-Injection-Bug
- `NEXT_PUBLIC_*` Vars dürfen NIEMALS "Sensitive" sein. "Sensitive" = Build-Zeit-nicht-inject → `process.env.NEXT_PUBLIC_X = undefined` im Browser.
- Symptom: Sentry/PostHog lazy-init OK, aber `dsn === undefined` → silent "init without DSN".
- Fix-Workflow: In Vercel Env-UI MUSS Delete + Create New passieren (nicht Edit!). Edit-Dialog zeigt bei Sensitive-Vars `YOUR_SECRET_VALUE_GOES_HERE` als Placeholder statt echtem Wert — Save darauf ZERSTÖRT die Var.
- Historisch betroffen: `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN`.

### Supabase Legacy JWT vs New API Keys (Migration 2024+)
- Legacy (`anon` + `service_role` JWT): shared-Secret-signed. "Reset JWT Secret" invalidiert **alle** JWTs inkl. user sessions — Platform-Logout = NIE MACHEN im Live-Betrieb.
- New (`sb_publishable_...` + `sb_secret_...`): asymmetrisch signed. Rotation invalidiert KEINE user sessions.
- Beide parallel aktiv in Migration-Phase (Legacy-Retirement Ende 2026).
- Check: `mcp__supabase__get_publishable_keys(project_id)` — wenn `sb_publishable_...` returned, Projekt dual-mode.
- Zero-Downtime-Rotation: (1) Supabase Dashboard "New secret key" (parallel) → (2) Update 4 Stellen: Vercel Prod + GH Secret + `.env.local` + `.env.vercel-prod` → (3) Redeploy → (4) Post-Deploy-Smoke grün → alten Key revoken.

### Playwright Cookie Subdomain-Mismatch
- `context.addCookies({ domain: 'bescout.net' })` → nicht gesendet an `www.bescout.net` (explicit domain = exact match).
- Fix: Leading dot — `domain: '.bescout.net'` = valid für hostname + alle subdomains.
- Plus Cookie-Timing: wenn i18n-Cookie VOR Login gesetzt wird, rendert Login-Page im Target-Locale → lokalisierte Button-Namen. Fix: Login in Default-Locale, DANN Cookie für Post-Login.

### Vercel `deployment_status.target_url` in GHA = Preview-URL mit Auth-Wall
- `deployment_status`-Event liefert `target_url = <unique-deploy>.vercel.app`, nicht Custom-Domain. Unique-Preview hat Vercel Deployment Protection (Auth-Wall).
- Playwright läuft in Auth-Wall → Timeout.
- Fix: In GHA hardcode Custom-Domain: `env: PLAYWRIGHT_BASE_URL: https://bescout.net`. Custom-Domain switched atomic auf neuen Prod-Deploy.

### GitHub Actions: Default `GITHUB_TOKEN` hat KEINE `issues: write`
- `actions/github-script@v7` mit `github.rest.issues.create({...})` failed: `"Resource not accessible by integration"`.
- Fix: `permissions:` Block am Workflow-Top:
  ```yaml
  permissions:
    contents: read
    issues: write
    actions: read
  ```
- Null-safe payload für `workflow_dispatch`: `context.payload.deployment?.sha?.substring(0, 7) ?? context.sha.substring(0, 7)`.

### Playwright Test-Timeout-Akkumulation gegen Prod
- `test.setTimeout(180_000)` (3 min) reicht NICHT für 10-step Suites gegen Prod. Jeder step mit `waitForApp()` akkumuliert bis zu 60s Default-Timeouts — bei Cold-Start 10× 15-30s = 150-300s.
- Fix: Lightweight-helper ohne full React-Hydration-Wait:
  ```ts
  async function smokeNavigate(page, url, label) {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('main, [role="main"]')).toBeVisible({ timeout: 15_000 });
  }
  ```
- Global `test.setTimeout(300_000)` für Prod-Suites. Runtime-Ziel: 10-Step-Smoke <15s warm, <30s cold.

### Route existence vs. name assumption (Smoke-Test-Gotcha)
- "Mein Kader" ist ein Tab auf `/market`, NICHT eine eigene URL `/kader`. GET `/kader` → 404.
- "Spieltag" in Sidebar = Link `/fantasy`, NICHT `/fantasy/spieltag` (existiert nicht).
- Audit vor Test-Writing: `ls src/app/(app) && grep -rn "href=\"/" src/components/navigation/ src/components/layout/`.

### Two-lockfile drift (pnpm + npm parallel)
- `pnpm-lock.yaml` UND `package-lock.json` parallel → 1-2 Tage bis Problem sichtbar:
  - Lokal: `pnpm install` updated nur pnpm-lock.yaml
  - CI mit `npm ci`: bleibt auf altem package-lock.json → falsche Versionen → Build kaputt
  - Vercel (auto-detect): nimmt pnpm-lock.yaml → deployed funktioniert → aber CI failed
  - Historisch: 22 konsekutive CI-Fails (Slice 118-123 nicht live für 8 Tage).
- Fix: `rm package-lock.json`, `packageManager: "pnpm@X.Y.Z"` in package.json, CI auf `pnpm/action-setup@v4` + `pnpm install --frozen-lockfile`.
- Prevention: Branch-Protection mit `required_status_checks: [lint, build, test]`.
