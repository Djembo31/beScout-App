---
description: Haeufigste Fehler die bei JEDER Arbeit relevant sind
---

# Common Errors

Stand: 2026-04-22 · Konsolidiert aus Slices 001-086.
DB-Columns + CHECK Constraints: siehe `database.md`.

---

## 1. Silent Fails (die stillsten Bugs)

### Tool: `/silent-fail-audit` (Slice 085 + 090 v2)
- `npx tsx scripts/silent-fail-audit.ts` → `worklog/audits/silent-fail-YYYY-MM-DD.md`
- 7 Pattern: `.in()` unchecked · `.select()` unranged · silent catch · error-swallow · data-destructure ohne error · hart-coded script state-checks · `Promise.allSettled` ohne `logSilentRejects`
- Baseline Slice 090 v2: 195 findings / 98 HIGH / HIGH-FP-Rate 0%
- Cadence: wöchentlich + nach jedem `/impact` für Money/Data-Code
- v2 verbesserungen: Pattern 1 `.range()`/`.limit()` multi-line-awareness, Pattern 7 regression-guard für allSettled

### `.in()` Chunking — Upstream-Query auch prüfen (Slice 082 + 086)
- `.in('col', ids)` mit >100 UUIDs liefert `data=undefined` + `error=undefined` (URL-Limit ~14KB). MUSS in 100er-Chunks split + explicit error-check.
- Bei Chunk-Fix **Loader-Query** prüfen: kommt die id-Liste aus `.select().in()` mit >1000 rows? → Loader hat 1000-row-cap, gleicher Silent-Fail.
- Summierung über Chunk-Batches: nur valide wenn Batches **disjunkt** sind (z.B. unique player_ids). Bei `.in('status', [...])` mit überlappenden Conditions nicht summierbar.
- Pattern:
  ```ts
  const CHUNK = 100;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await supabase.from('t').select().in('k', ids.slice(i, i+CHUNK));
    if (error) throw new Error(error.message);
  }
  ```

### PostgREST 1000-row cap — MONEY-CRITICAL (Slice 078 + 079b)
- `.select()` ohne `.range()` auf Tabelle >1000 rows liefert still max 1000. Kein Error.
- Slice 079b-Incident: `/api/players` lud nur 1000/4556 alpha-sortiert → Holdings hinter Alpha-Position 1000 unsichtbar im Marktplatz (test12: 9/16 Holdings weg).
- Fix: while-loop `.range(offset, offset+999)` bis `data.length < PAGE`.
- Audit: `grep -rn "\.from.*\.select" src/app/api/ src/lib/ | grep -v "\.range\|\.limit\|\.eq\|\.single\|\.maybeSingle"`

### `.single()` vs `.maybeSingle()`
- `.single()` wirft HTTP 406 bei 0 Rows. Nur wenn Row garantiert existiert.
- Sonst `.maybeSingle()`.

### Service Error-Swallowing (2026-04-13 Hardening · 117 Fixes in 61 Services)
- `if (error) { console.error(); return null; }` → React Query cached null als SUCCESS, kein Retry, UI stuck auf Skeleton/Empty.
- Kritischste Variante: `const { data } = await supabase...` **OHNE** error-Destructuring. Komplett unsichtbar.
- Fix: `throw new Error(error.message)`. React Query retried automatisch (3x backoff).
- Audit: `grep -rn 'const { data } = await supabase' src/lib/services/`

### Scraper Default-Poisoning (Slice 081, TM)
- Parser-Fallback-Werte (z.B. MV=500K/8M + contract=2025-07-01) erscheinen auf vielen Spielern identisch — sehen aus wie echte Daten. Wird nie überschrieben weil MV≠0.
- Detect: `GROUP BY market_value_eur, contract_end HAVING COUNT(*) >= 4`.
- Mitigation: `players.mv_source` (`unknown|transfermarkt_verified|transfermarkt_stale|manual_csv|api_football`). Cluster auf `_stale` setzen, **nicht** MV überschreiben (Trigger-Safety).
- Guard: INV-36/37/38. Re-Scraper: `scripts/tm-rescrape-stale.ts`.

### External-Site Scraper-Regex Drift (Slice 078, TM)
- Fremde Site ändert Markup → Regex matcht nicht → parser `null` → Daten-Lücke wächst silent bei jedem Rerun.
- Konkret: TM 2026-04 von `data-header__box--marketvalue` auf `data-header__market-value-wrapper`, Zahl/Währung-Reihenfolge gedreht. 433 Stammspieler mit MV=0 trotz echtem TM-Wert.
- Regel: Externe HTML-Parser brauchen Regression-Tests mit echten HTML-Fixtures. Template: `src/lib/scrapers/transfermarkt-profile.test.ts`.
- Entity-Drift: `€` / `&#8364;` / `&euro;` — nie auf trailing `€` matchen.

### Cloudflare-Block für Vercel-IPs (Slice 075, TM)
- `transfermarkt-search-batch` findet 0/20 matches obwohl URL+Regex korrekt. TM Cloudflare blockiert Vercel-Datacenter-IPs → HTTP 200 mit leerem Challenge-HTML (keine `profil/spieler/XXXXX` Links).
- Verifikation: `curl` vom lokalen PC returnt volle HTML mit 10+ Links.
- Workaround: CSV-Import-UI (aktuell), Residential-Proxy, TM Partner-API (Kosten).
- Debug-Mode `?debug=true`: `debug_trace[].parsed=0` = Block bestätigt.

### Script mit hart-coded state-check (Phase B Hot-Fix)
- Script akzeptiert Flag `--mv-source=unknown` aber intern `if (fresh.mv_source !== 'transfermarkt_stale') skip` hart-codiert → silent skip trotz 1240 Kandidaten.
- Fix: Flag-Wert in Variable, ALLE Hart-Code-Referenzen ersetzen (nicht nur die Haupt-Filter-Zeile).

### Promise.allSettled ohne Observability (Slice 088)
- `Promise.allSettled` + `r.status === 'fulfilled' ? r.value.data : []` ist graceful-degrade-by-design, aber rejected results sind komplett unsichtbar → Data-Liar im UI (z.B. "0/0 mapped").
- Zwei Fix-Patterns je nach Absicht:
  - **Alles-oder-nichts** (Slice 087 getMappingStatus): `Promise.all` + explicit `.error`-Checks → Fehler propagieren natural.
  - **Graceful degrade gewollt**: `Promise.allSettled` behalten, aber `logSilentRejects(label, results)` einbauen → console.error (dev) + Sentry.captureException (prod).
- Util: `src/lib/observability/silentRejects.ts`. Pattern:
  ```ts
  const results = await Promise.allSettled([q1, q2, q3]);
  logSilentRejects('myModule.myFunction', results);
  const [r1, r2, r3] = results;
  ```
- Audit: `grep -rn 'Promise.allSettled' src/ | grep -v __tests__ | grep -v logSilentRejects` — Stellen ohne Util instrumentieren.

---

## 2. Supabase / Postgres

### ON CONFLICT validiert CHECK gegen INSERT-Tuple-Defaults (Slice 075c)
- `INSERT ... ON CONFLICT DO UPDATE` validiert CHECK-Constraints gegen die INSERT-Tuple-Defaults **bevor** es den UPDATE-Pfad nimmt.
- `.upsert([...], { onConflict })` erbt das: existierende Rows schlagen fehl wenn Tuple-Defaults den Constraint verletzen.
- Fix: echter `.update().eq('id', ...)` statt `.upsert()`. Pattern: pre-query `api_xyz_id → id` map + `Promise.all(batch.map(t => ...update(payload).eq('id', t.id)))` in Chunks 20-50.
- Evidence Slice 075: sync-players-daily 4074/5019 Payloads errored (`dpc_total=10000` default vs `max_supply=300` CHECK).

### PL/pgSQL NULL-in-Scalar-Subquery (2026-04-11 — MONEY)
- `IF (SELECT COALESCE(x, 0) FROM t WHERE ...) < y` ist FALSCH wenn keine Row existiert. Scalar-Subquery auf leeres Set = NULL. `NULL < y` = NULL = falsy → Guard ÜBERSPRUNGEN.
- Richtig: `SELECT x INTO v_x; IF COALESCE(v_x, 0) < y THEN ...` ODER `IF NOT FOUND`.
- Audit: `grep 'SELECT COALESCE.*FROM.*WHERE' supabase/migrations/`

### Trigger-Guard BEFORE UPDATE (Slice 081)
- BEFORE UPDATE Trigger auf money-Spalten kaskadiert auch wenn nur flag-Spalten geändert werden → Trading-Block-Risiko bei MV=0-Fallback.
- Jeder Trigger-Body braucht `IF NEW.<col> IS DISTINCT FROM OLD.<col> THEN ...` Guard.
- Check: `SELECT pg_get_functiondef('trigger_fn'::regproc)` + `sum_mv + sum_ref` byte-identisch vor/nach Migration messen.

### Holdings Zombie-Row (Slice 025)
- `UPDATE holdings SET quantity = quantity - X` → Row mit `quantity=0` bleibt als Zombie. CHECK `>= 0` erlaubt.
- Symptome: Portfolio zeigt 0-qty Einträge; SUM/COUNT DISTINCT zählen leer-Holdings mit.
- Fix: `AFTER UPDATE OF quantity WHEN (NEW.quantity = 0)` Trigger → `DELETE FROM holdings WHERE id = OLD.id`. Atomisch in Transaction, future-proof statt RPC-Patch.

### auth.users DELETE NO-ACTION-FK (Slice 028)
- `DELETE FROM auth.users` scheitert an NO-ACTION-FK-Constraints (Postgres 23503). 23 known Tables: user_tickets, ticket_transactions, transactions, trades, events.created_by, ipo_purchases, mystery_box_results, welcome_bonus_claims, chip_usages, mentorships, community_poll_votes, verified_scouts, fan_rankings, user_cosmetics, user_daily_challenges, user_founding_passes, user_scout_missions, liquidation_events/_payouts, sponsors.created_by, fee_config.updated_by, club_votes.created_by, bounty_submissions.reviewed_by, player_valuations.
- Pre-Audit via `pg_constraint` (NICHT `information_schema` — cross-schema FKs werden ausgelassen).
- Row-Counts pro NO-ACTION-Table, dann pre-clean, dann `DELETE FROM auth.users`.

### Vercel Hobby Cron-Limit + Function Timeouts (Slice 071 + 075)
- Hobby: max 2 Cron-Jobs, max 1×/Tag. Pro: 40 Jobs, 300s HTTP-timeout (NICHT 900s).
- `maxDuration = 300` ist Hard-Limit für HTTP-Trigger. Cron-Schedule darf länger laufen (bis 900s Pro).
- Implication: Sync-Routes mit per-Row-DB-Ops timeouten bei 1000+ rows. Zwingend Batch-Pattern: 1× pre-query `.in(all_ids)` + chunked `Promise.all` (20-50 parallel).
- Messung Slice 075: sync-injuries 60s→28s, sync-players-daily 300s→17s.

---

## 3. RPC Design

### RPC INSERT Column-Mismatch (J5 AR-42 + AR-42b)
- `CREATE OR REPLACE FUNCTION` parst Body aber validiert keine Column-Existenz. Fehler erst beim Call (PG 42703) → silent fail, Transaction rollback, User sieht "Open Error" Toast, Ticket-Kosten revertiert aber Reward weg.
- AR-42: `open_mystery_box_v2` → `user_equipment(equipment_rank)` (Spalte heißt `rank`) → 6d Equipment-Drops tot.
- AR-42b: Gleicher RPC → `transactions(amount_cents)` (Spalten sind `amount`+`balance_after` NOT NULL) → bCredits-Drops NIE funktioniert.
- Regel: Nach JEDER RPC-Migration die INSERT/UPDATE macht: `SELECT column_name FROM information_schema.columns` gegen Body-Statements matchen.
- Audit cross-RPC: `SELECT proname FROM pg_proc WHERE pg_get_functiondef(oid) ILIKE '%suspected_column%'`.

### RPC Response camelCase/snake_case (Mystery Box)
- RPC `jsonb_build_object('rewardType', ...)` → camelCase. Service castet `as { reward_type }` → ALLE Felder undefined. TS fängt das nicht (as = unchecked assertion).
- Check: `pg_get_functiondef()` → Return-Shape → Service-Cast vergleichen.

### Server-Validation Pflicht für Money/Fantasy RPCs (Slice 023 B4)
- Client-only Validation ist via direkten RPC-Call umgehbar. RPC muss die einzige Wahrheit sein.
- Konkret: `rpc_save_lineup` akzeptierte `p_formation='xxx'` ungeprüft → Scoring-Logik broken.
- Pattern: Billige Early-Exits (Formation-Allowlist, GK-Required, Slot-Counts, Extra-Slots, Captain-Empty) VOR teuren DB-Joins.
- Regel: Jeder Money/Fantasy-RPC mit Client-Inputs validiert **alles selbst**.

### pg_cron Fail-Isolation (Slice 024 B5)
- RAISE EXCEPTION auf Item #2 blockt ganzen Batch → nachfolgende Items unverarbeitet.
- Fix: `BEGIN ... EXCEPTION WHEN OTHERS THEN ... END` pro Item innerhalb FOR-Loop. Safety-Bound: `LIMIT 50`.
- Return `{success, scored, skipped, errored, errors, ran_at}` für Monitoring via `cron.job_run_details`.

### Transaction-Type activityHelpers Sync (Slice 027)
- RPC schreibt neue `transactions.type` → `src/lib/activityHelpers.ts` mappt type→i18n-Key. Ohne Mapping-Eintrag: User sieht snake_case raw-string.
- Audit-Query: `SELECT DISTINCT type FROM transactions` vs. grep activityHelpers.ts.
- Regel: Jeder neue transactions-type-Writer triggert 3-File-Change: activityHelpers.ts + de.json + tr.json.

### RPC Anti-Patterns Top 5
- `::TEXT` auf UUID beim INSERT
- Record nicht initialisiert vor Zugriff in falscher Branch
- FK-Reihenfolge falsch (Child INSERT vor Parent)
- NOT NULL Spalte fehlt im INSERT
- Guards fehlen (Liquidation-Check in Trading-RPCs)

---

## 4. Auth / Security

### RLS qual=true auf sensiblen Tabellen (Slice 014 + 019-021)
- `USING (true)` auf `authenticated` = keine Zugriffskontrolle. Bei holdings/transactions/activity_log/user_stats/orders: systemweiter Portfolio/Stat/Trading-Leak.
- Fix: `USING (auth.uid() = user_id OR <admin-check>)`.
- Cross-User-Aggregate (Orderbook, holder-count): SECURITY DEFINER RPC mit projiziertem Output (handle+is_own statt user_id).
- Rollout ohne Markt-Störung: (1) Projection-RPC deploy → (2) Service-Layer migriert → (3) Deploy verify → (4) RLS tighten (DROP qual=true, CREATE own-or-admin).
- Guard: INV-26 in `db-invariants.test.ts` via `get_rls_policy_quals()`.
- Bekannte Instanzen: holdings (014), orders (020+021) — 8 UI-Consumer-Sites von `order.user_id === uid` auf `order.is_own` migriert.

### SECURITY DEFINER + auth.uid()-Guard (Slice 005 A-02 + J4 Live-Exploit)
- J4-Live-Exploit: `earn_wildcards` mintete 99.999 Wildcards als anon (reverted).
- Zwei Exploit-Klassen:
  - **anon**: keine Grant-Beschränkung → anyone mit service call.
  - **authenticated-to-other-user**: `p_user_id` Parameter + kein `auth.uid()`-Check → User schickt fremde UUID, RPC läuft in deren Namen.
- Fix-Pattern:
  ```sql
  REVOKE EXECUTE ON FUNCTION X FROM anon, authenticated;
  GRANT EXECUTE ON FUNCTION X TO authenticated;
  -- im Body:
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch';
  END IF;
  ```
  `IS NOT NULL` skippt für service_role (Cron). `IS DISTINCT FROM` reject authenticated-to-other-user.
- Guard: INV-21 + `public.get_auth_guard_audit()` RPC.
- Entdeckt in Slice 005: `rpc_lock_event_entry`, `renew_club_subscription`, `check_analyst_decay`, `refresh_airdrop_score`.

### Public-Wrapper + Internal-RPC Pattern (Slice 035 + 041)
- RPC `p_user_id` + auth-context: 2 Funktionen statt 1.
  - **Public Wrapper** `rpc_name(args_ohne_uid)`: GRANT authenticated, PERFORM internal(auth.uid()).
  - **Internal** `_rpc_internal(args, p_user_id)`: REVOKE authenticated, GRANT service_role only.
- Zweck 1 (Slice 041): auth-context-injection für Client-Calls. Kein Exploit möglich ohne explicit auth_uid_mismatch-guard.
- Zweck 2 (Slice 035): Trigger ruft AR-44-hardened RPC mit `NEW.seller_id` ≠ `auth.uid()` → Guard tripped → silent fail. Internal-Helper umgeht Guard, Trigger ruft Internal direkt.
- Slice 035 Fund: `trg_fn_trade_refresh` ruft `refresh_airdrop_score(NEW.seller_id)` — Sellers hatten `airdrop_scores.updated_at = NULL` trotz mehrerer Trades.
- Doku: `COMMENT ON FUNCTION` für beide pflicht.

### RLS Policy Trap — neue Tabelle
- Neue Tabelle mit RLS braucht Policies für ALLE Client-Ops (SELECT + INSERT + UPDATE + DELETE). SELECT-only = silent write failure.
- Nach Migration: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`.
- NIEMALS `console.error` ohne `throw` bei kritischen DB-Writes — silent failure ist der schlimmste Bug.

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
- Jeder Modal mit `useMutation.isPending` → `preventClose={isPending}` pflicht.
- Sonst: ESC/Backdrop-Click mitten in DB-Transaction verliert State (200-500ms 4G-Latenz).
- Heuristik: `Modal` + (`isPending|cancelling|selling|buying|submitting`) im gleichen File → nachrüsten.
- Audit: `grep -rn '<Modal' src/components/ | grep -v preventClose`

### CSS / Tailwind Gotchas
- `::after` / `::before` mit `position: absolute` → Eltern MUSS `relative`. `overflow: hidden` reicht NICHT als Containing Block.
- `flex-1` auf Tabs → iPhone overflow → `flex-shrink-0`.
- Dynamic Tailwind NIEMALS: `border-[${var}]/40` → JIT scannt nur statische Strings. Nutze `style={{ borderColor: hex }}` + statische Class.

### Multi-League Props-Propagation (J3 + J4)
- Neues optional Field auf Type (z.B. `leagueShort?`) → nur 2/8 Render-Call-Sites bedient. TSC/Tests merken nichts (optional = kein Error).
- Visual-QA im Pilot (1 Liga) übersieht's, Fehler erst im Multi-League-Betrieb.
- J3-Fund: TradingCardFrame + PlayerHero + TransferListSection hatten 0 Liga-Logos trotz vollständigem Type seit 2026-04-07.
- J4-Erweiterung: FantasyEvent + UserDpcHolding hatten `club*` aber kein `league*` → client-side Cache-Lookup `getClub() → getLeague()` Zero-RPC-Fix.
- Regel: Jedes Type mit `club*` Field MUSS spiegelbildlich `league*` Fields haben. ALLE Render-Call-Sites manuell greppen.

### ConfirmDialog statt native alert/confirm (J4)
- Live: `src/components/ui/ConfirmDialog.tsx`. Built-in preventClose + loading/disabled + `confirmVariant: 'gold' | 'danger'`.
- Native alert/confirm sind unstyled, blockieren Main-Thread, nicht i18n-ready, ignorieren preventClose.
- Audit: `grep -rn 'window.alert\|window.confirm' src/`

### UX Konsistenz
- Spieler-Anzeigen → Link zu `/player/[id]` (Ausnahme: Picker-UIs).
- `<button>` NICHT in `<Link>` wrappen (invalid HTML) → `href` Prop oder Wrapper-Komponente.

---

## 6. i18n / Locale

### i18n-Key-Leak via Service-Errors (J1 + J3)
- `throw new Error('handleReserved')` → `err.message === 'handleReserved'` (raw key). Caller mit `setError(err.message)` zeigt literal unübersetzt.
- Fix: Caller resolved via `mapErrorToKey(normalizeError(err)) → te(key)`.
- Konvention: Service wirft I18N-KEYS, Consumer resolved via `t()`. In Service-JSDoc dokumentieren.
- Systematisch: Nach JEDEM swallow→throw-Refactor ALLE gleichartigen Consumer-Pfade greppen (J3 Evidence: useTradeActions hatte 4 Methoden, nur 1 war gefixt).
- Audit: `grep -n 'throw new Error' src/lib/services/` → Keys sammeln, gegen Caller-`setError(err.message)` prüfen.

### Error-Messages nie dynamische Werte (J3 Triple-Red-Flag)
- `throw new Error(\`Price exceeds maximum (${X} $SCOUT)\`)` hat 3 Probleme: DE/EN-Mix + $SCOUT-Ticker user-facing + dynamischer Wert.
- Dynamic gehört in Pre-Submit-Hints, nicht Post-Error.

### Turkish Unicode
- `I`.toLowerCase() = `i̇` (NICHT `i`) → NFD + strip diacritics + `ı→i`.
- SQL: `translate(lower(name), 'şçğıöüİŞÇĞÖÜ', 'scgiouISCGOU')`.

---

## 7. Build / Deploy

### tsconfig excludes scripts (Slice 079)
- `"include": ["**/*.ts"]` + `"exclude": ["node_modules", "backup", "e2e"]` → includet `scripts/`. Scripts importieren deps wie `playwright` die nicht in `package.json` sind (lokal via transitive resolution).
- `tsc --noEmit` cleant lokal (`skipLibCheck: true`), **Vercel `next build` schlägt fehl**: `Cannot find module 'playwright'`.
- Symptom: Alle Commits über Tage auf Vercel "Error", Production zeigt alten Deploy. User sieht keine Änderungen.
- Fix: `"exclude": [..., "scripts", "tmp"]`. Dev-scripts laufen via `npx tsx` weiter.
- Prevention: Nach neuen `scripts/*.ts` immer `npx next build` lokal (nicht nur tsc).
- Debug: `npx vercel inspect <deploy-url> --logs`.

### Next.js Route-Handler Named-Exports (Slice 069)
- `export function helper()` in `src/app/api/**/route.ts` ist verboten. Nur HTTP-Methods (GET/POST/...) + `runtime|dynamic|revalidate|fetchCache|maxDuration|generateStaticParams|config`.
- Jeder andere Export → `next build` Type-Error `'OmitWithTag<...>' does not satisfy the constraint`.
- `tsc --noEmit` fängt das NICHT — Type entsteht aus generated `.next/types/app/.../route.ts` nur beim `next build`.
- Kostete 11 gefailte Deploys / 2 Tage / 4 Slices.
- Fix: Helpers nach `src/lib/scrapers/` extrahieren, route.ts importiert aus lib/.
- Regel: Nach JEDEM `src/app/api/**/route.ts` Edit → `npx next build` lokal.

### ESLint disable-comment w/ undefined rule (Slice 069)
- `// eslint-disable-next-line @typescript-eslint/no-explicit-any` failt wenn Plugin nicht in eslintrc (Project extends nur `next/core-web-vitals`).
- Fehler: `Definition for rule '@typescript-eslint/no-explicit-any' was not found`.
- Fix: typgerechter Cast (`as unknown as (k: string) => string`) oder `unknown` + enger Cast — kein disable-comment.

### Vercel Env + Module-Level + CSP
- `NEXT_PUBLIC_*` NIEMALS als "Sensitive" markieren → werden beim Build nicht injected.
- KEIN `createClient()` auf Module-Level → Lazy-Init via Proxy/Getter, sonst crasht Vercel Build.
- CSP `img-src`: Domains aus DB ableiten (`SELECT DISTINCT substring(image_url FROM '^https?://[^/]+')`), nicht raten. Spielerbilder sind `img.a.transfermarkt.technology`.

---

## 8. Cross-Cutting / Operational

### Data Contract Changes (NICHT als UI-Change behandeln)
- required → optional (Feld, Prop, DB Column) = Contract Change → alle Consumer greppen.
- optional → required = Breaking → Migration + Backfill nötig.
- Form-Validation ändern (disabled, required weg) → downstream prüfen bei null/leer.
- Regel: Jede Änderung die beeinflusst WELCHE Werte in DB geschrieben werden → `/impact` oder manueller Grep VOR Code.

### Service Contract-Change Propagation (J1)
- Service swallow→throw ist Breaking-Change für Caller. ALLE Caller greppen + try/catch auditen.
- Konkret: `applyClubReferral.throw` ohne Consumer-Fix → onboarding trapped User (createProfile OK, clubFollow throw, Retry scheitert an unique-handle).
- Fix-Pattern für "best-effort" Side-Effects (club-follow, referral, avatar): separates try/catch wrappen, `console.error` + continue (Avatar-Upload-Pattern).
- Audit: nach swallow→throw PR immer `grep -rn 'serviceName' src/`.

### Cross-Club-Contamination via API-Football (Slice 081d)
- Club hat 62 Spieler (realistisch ~30). Duplikate haben 0 Appearances + Name+Contract-Match zu echten Spielern anderer Clubs (verschiedene `api_football_id`).
- Beispiel: Aston Villa 11 Rows waren Duplikate von Werder-Bremen/Real-Madrid-Spielern (Mio Backhaus, Marco Friedl, Felix Agu, Olivier Deman).
- Detect: SELF-JOIN auf `(first_name, last_name, contract_end)` + `club_id <> club_id` + target `last_appearance_gw = 0`.
- Fix: `club_id = NULL` (nicht DELETE — reversibel, kein FK-Cascade).
- Guard: INV-39. Nach neuen sync-players-daily Runs: per-Club squad-size gegen Baseline vergleichen.

### TM Player-Matching Trikot-Check (Phase B)
- Name-based Search auf TM liefert false-positives bei identischen Namen (z.B. "Bara Ndiaye").
- Fix: Nach name+club scoring (≥30), scrape TM-Profile + compare `shirt_number`. Mismatch bei beiden NOT NULL → SKIP. Match oder one-sided NULL → accept.
- Impact: Threshold 50→30 (Recall↑), 0 shirt-mismatches in ~1000 Runs.
- Parser: `parseShirtNumber` in `src/lib/scrapers/transfermarkt-profile.ts` (3 HTML-Varianten).

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
- `grep -oP` mit `\K` scheitert silent (Locale: "supports only unibyte and UTF-8").
- Fix: `sed -n 's/.*"key"\s*:\s*"\([^"]*\)".*/\1/p'`.
- Worktree-Agents haben KEINEN Zugriff auf `.claude/skills/` → Fallback Main-Repo-Path oder Task gut verpacken.
