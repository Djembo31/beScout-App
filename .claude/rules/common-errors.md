---
description: Haeufigste Fehler die bei JEDER Arbeit relevant sind
---

## DB Columns + CHECK Constraints
→ Single Source: `database.md` (Column Quick-Reference + CHECK Constraints)

## External-Site Scraper-Regex silent-break (2026-04-19 — Slice 078)
- Fremder Site (Transfermarkt) aendert Markup → unser Regex matcht nicht mehr → parser returnt `null` → DB behaelt 0/null → **Daten-Lücke wird silent grösser bei jedem Rerun**.
- **Slice 078 Konkret:** TM hat 2026-04 von `data-header__box--marketvalue` auf `data-header__market-value-wrapper` umgestellt. Reihenfolge Zahl/Währung umgedreht (`€ X Mio.` → `X,XX <span class="waehrung">Mio. €</span>`). 433 Stammspieler hatten MV=0 in DB trotz echtem TM-Wert (Morgan Rogers €80M etc.).
- **Regel:** Jeder externe HTML-Parser braucht Regression-Tests mit **echten HTML-Fixtures** (nicht synthetisch!).
  - Workflow: Sanity-Script dumpt HTMLs in `tmp/` nach einem Markup-Update, Fixtures werden in Tests eingefroren.
  - `src/lib/scrapers/transfermarkt-profile.test.ts` als Template.
- **Audit-Signal:** Wenn die "completeness" bei gleichbleibendem Scraping stagniert oder Scraper wenig updated → Parser-Sanity-Check mit manueller Stichprobe.
- **Entity-Drift:** HTML kann `€`, `&#8364;`, `&euro;` schreiben — Regex end-mit-`€` bricht bei Entity-Form. Im Slice 078 bewusst aufs `€` Matching verzichtet (endet bei `(Mio|Tsd)\.`), weil CSS-Scope bereits eindeutig ist.

## PostgREST silent 1000-row cap auf Full-Scans (2026-04-19 — Slice 078)
- `.limit(1000)` ohne `.range()` auf Supabase-Queries liefert **max 1000 Rows selbst wenn mehr existieren** — PostgREST-default cap.
- **Slice 078 Konkret:** `scripts/tm-profile-local.ts` Full-Scan hat statt erwarteter ~4500 mappings nur 1000 geladen → 139 nach Filter → nur 3 von 7 Ligen wurden scraped (andere 4 wurden von der 1000-row-Cap nicht abgedeckt).
- **Regel:** Bei >1000 Rows immer `.range(offset, offset+999)` in while-Loop nutzen:
  ```ts
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data } = await supabase.from('t').select(...).range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    // process ...
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  ```
- **Audit-Signal:** Script "loaded X mapped players" obwohl DB viel mehr Kandidaten hat — count vergleichen.

## Supabase Client
- `.single()` wenn 0 Rows moeglich → HTTP 406 Error → `.maybeSingle()` nutzen
- Regel: Wenn "existiert dieser Datensatz garantiert?" → NEIN → `.maybeSingle()`
- Audit-Signal: HTTP 406 Fehler in Logs/QA → systematisch alle Service-Calls pruefen

## React/TypeScript
- Hooks VOR early returns (React rules)
- `Array.from(new Set())` statt `[...new Set()]` (strict TS)
- `Array.from(map.keys())` statt `for (const k of map.keys())` (strict TS)
- `Modal` braucht IMMER `open={true/false}` prop
- `PlayerPhoto` Props: `first`/`last`/`pos` (nicht firstName/lastName)
- Barrel-Exports bereinigen wenn Dateien geloescht werden
- NIEMALS leere `.catch(() => {})` — mindestens `console.error`
- Cancellation Token in useEffect: `let cancelled = false; return () => { cancelled = true; }`
- `floor_price ?? 0` — IMMER Null-Guard auf optionale Zahlen
- `entry.rank ?? 999` — Airdrop rank ist nullable

## CSS / Tailwind
- `::after`/`::before` mit `position: absolute` → Eltern MUSS `relative` haben
- `overflow: hidden` allein reicht NICHT als Containing Block
- `flex-1` auf Tabs → overflow auf iPhone → `flex-shrink-0` nutzen
- Dynamic Tailwind Classes NIEMALS: `border-[${var}]/40` → Tailwind JIT scannt nur statische Strings. Nutze `style={{ borderColor: hex }}` + statische Class (`border-2`)

## Turkish Unicode
- `I`.toLowerCase() = `i̇` (NICHT `i`) → NFD + strip diacritics + `ı→i`
- SQL: `translate(lower(name), 'şçğıöüİŞÇĞÖÜ', 'scgiouISCGOU')`

## API-Football
- Substitution: `time.elapsed` (NICHT `time.minute`!), `player`=OUT, `assist`=IN
- Null guards: `evt.player?.id` und `evt.assist?.id` koennen null sein
- `grid_position` kann kaputt sein: fehlende GK-Row, Duplikate, >11 Starters
- API-Football hat KEINE Market Values → nur Transfermarkt

## RLS Policy Trap (Session 255 — SC Blocking war komplett kaputt)
- Neue Tabelle mit RLS MUSS Policies fuer ALLE Client-Ops haben (SELECT + INSERT + DELETE)
- SELECT-only = Client kann lesen aber NICHT schreiben → silent failure
- IMMER nach Migration pruefen: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`
- NIEMALS `console.error` ohne `throw` bei kritischen DB-Writes → silent failure ist der schlimmste Bug

## RPC Anti-Patterns (Top 5 Bugs)
- `::TEXT` auf UUID beim INSERT (5x in Session 93)
- Record nicht initialisiert vor Zugriff in falscher Branch
- FK-Reihenfolge falsch (Child INSERT vor Parent)
- NOT NULL Spalte fehlt im INSERT
- Guards fehlen (Liquidation-Check in allen Trading-RPCs)

## Vercel / Deployment
- `NEXT_PUBLIC_*` Env-Vars NIEMALS als "Sensitive" auf Vercel → werden beim Build NICHT injected
- KEIN `createClient()` auf Module-Level → Lazy-Init (Proxy/Getter), sonst crasht Vercel Build
- CSP `img-src` Domains aus DB ableiten, nicht raten: `SELECT DISTINCT substring(image_url from '^https?://[^/]+')`
- Spielerbilder = `img.a.transfermarkt.technology` (NICHT api-sports.io)

## Shell / Hooks (Windows Git Bash)
- `grep -oP` mit `\K` scheitert SILENT auf Windows (Locale-Bug: "supports only unibyte and UTF-8 locales")
- Fix: `sed -n 's/.*"key"\s*:\s*"\([^"]*\)".*/\1/p'` statt `grep -oP`
- Worktree-Agents haben KEINEN Zugriff auf `.claude/skills/` — Fallback auf Main-Repo-Path oder Task gut verpacken

## Data Contract Changes (NICHT als UI-Change behandeln)
- required → optional (Feld, Prop, DB Column) = Contract Change → ERST alle Consumer greppen
- optional → required = Breaking Change → Migration + Backfill noetig
- Form-Validierung aendern (disabled, required entfernen) → Pruefen: Was passiert downstream wenn der Wert null/leer ist?
- REGEL: Jede Aenderung die beeinflusst WELCHE Werte in die DB geschrieben werden → `/impact` oder manueller Grep BEVOR Code geschrieben wird

## UX Konsistenz
- Spieler-Anzeigen MUESSEN Link zu `/player/[id]` haben (Ausnahme: Picker-UIs)
- `<button>` NICHT in `<Link>` wrappen (invalid HTML) → stattdessen `href` Prop oder Wrapper-Komponente

## PL/pgSQL NULL-in-Scalar (2026-04-11 — CRITICAL Money Bug)
- `IF (SELECT COALESCE(x, 0) FROM t WHERE ...) < y` ist FALSCH wenn keine Row existiert
- Scalar-Subquery auf leeres Result-Set → NULL (COALESCE laeuft per-Zeile, nicht auf leere Sets)
- `NULL < y` = NULL = falsy in PL/pgSQL IF → Guard wird UEBERSPRUNGEN
- Richtig: `SELECT x INTO v_x; IF COALESCE(v_x, 0) < y THEN reject`
- Oder: `IF NOT FOUND THEN reject` (sicherstes Pattern)
- Audit: `grep 'SELECT COALESCE.*FROM.*WHERE' supabase/migrations/`

## Service Error-Swallowing (2026-04-11 — Tickets Pop-In, 2026-04-13 — Full Hardening)
- `if (error) { console.error(...); return null; }` → React Query cached null als SUCCESS
- Kein Retry, UI zeigt Skeleton/Empty fuer 30s (staleTime)
- Kritisch bei Auth-Race: RPC wirft 'Nicht authentifiziert', Service schluckt
- Richtig: `if (error) { logSupabaseError(...); throw new Error(error.message); }`
- React Query retried automatisch (3x backoff) → nach ~1s ist Auth ready
- **SCHLIMMSTE Variante:** `const { data } = await supabase...` OHNE error-Destructuring
  - Error komplett unsichtbar: kein log, kein throw, data=null wie "keine Rows"
  - Audit: `grep -rn 'const { data } = await supabase' src/lib/services/`
- **2026-04-13: 117 Fixes in 61 Services — alle Saeulen gehaertet, 1192 Tests gruen**

## Service Contract-Change Propagation (2026-04-14 — Journey #1 Reviewer)
- Service-Aenderung `if(error) console.error → throw` ist Breaking-Change fuer Caller
- Pattern: Nach JEDEM swallow→throw Refactor IMMER alle Caller greppen + try/catch-Logik auditen
- Concrete Falle: `applyClubReferral.throw` ohne Consumer-Fix → onboarding/page.tsx trapped User:
  createProfile OK, clubFollow throw, User gefangen (Retry scheitert an unique-handle)
- Fix-Pattern: Bei "best-effort" Side-Effects (club-follow, referral, avatar) in separates try/catch
  wrappen, `console.error` + continue (analog Avatar-Upload-Pattern)
- Audit-Signal: Service-PR aendert return-shape oder error-Semantik → vor Merge `grep -rn 'serviceName' src/`

## i18n-Key-Leak via Service-Errors (2026-04-14 — J1 Reviewer, J3 bestaetigt + erweitert)
- `throw new Error('handleReserved')` in Service → `err.message === 'handleReserved'` (Raw-Key)
- Wenn Caller `setError(err.message)` macht → User sieht literal "handleReserved" unuebersetzt
- Fix-Pattern: Caller resolved known Keys via `t(msg)` Lookup (`mapErrorToKey(normalizeError(err)) → te(key)`)
- Konvention: Service wirft I18N-KEYS, Consumer muss via `t()` resolven. Dokumentieren in Service-JSDoc.
- Audit: `grep -n 'throw new Error' src/lib/services/` → Keys sammeln, gegen Caller-`setError(err.message)` pruefen
- **J3 Evidence (2026-04-14):** J2 hat nur `handleBuy` gefixt, aber `handleSell`/`handleCancelOrder`/`placeBuyOrder` blieben offen (raw-key-leak). Pattern ist SYSTEMATISCH — **nach JEDEM swallow→throw-Refactor ALLE gleichartigen Consumer-Pfade greppen, nicht nur den direkt betroffenen.** Das gleiche Service (useTradeActions/trading.ts) hat 4 aehnliche Methoden, nur 1 war gefixt.
- **Triple-Red-Flag Service-Error Pattern (J3 Healer A):** `throw new Error(\`Price exceeds maximum (${X} $SCOUT)\`)` = (a) DE/EN-Mix, (b) $SCOUT-Ticker im User-Face, (c) dynamischer Wert in Error-Message. Regel: **Error-Messages NIE dynamische Werte enthalten** — dynamic gehoert in Pre-Submit-Hints, nicht Post-Error.

## Modal preventClose Pattern (2026-04-14 — J2F-04 + J3F-06..08)
- Jeder Modal mit `useMutation.isPending` → IMMER `preventClose={isPending}` setzen
- Schuetzt vor ESC/Backdrop-Click-State-Verlust mitten in DB-Transaction (200-500ms Latenz auf 4G)
- Ohne preventClose: User drueckt ESC → Mutation laeuft weiter, UI verliert State (Balance-Before, Pending-Qty), kein Success-Feedback
- Heuristik fuer Healer-Sweep: `Modal` + (`isPending|cancelling|selling|buying|submitting`) im gleichen File → preventClose nachruesten
- J3-Fund: BuyModal (`buying \|\| ipoBuying`), SellModal (`selling \|\| cancellingId !== null \|\| acceptingBidId != null`), LimitOrderModal (`false` + TODO fuer Feature-Live)
- Audit: `grep -rn '<Modal' src/components/ | grep -v preventClose` — Modals ohne preventClose bei Money/Trading-Context pruefen

## RLS Policy qual=true auf sensiblen Tabellen (2026-04-17 — Slice 014 AUTH-08, erweitert Slice 019-021)
- `CREATE POLICY x ON t FOR SELECT TO authenticated USING (true)` ist equivalent zu "keine Zugriffskontrolle fuer authenticated" — jeder eingeloggte User liest alle Rows.
- Bei sensiblen Tabellen (holdings, transactions, activity_log, user_stats, orders): **Portfolio-/Stat-/Trading-Leak** systemweit. Client kann fremde User enumerieren.
- Fix-Pattern: `USING (auth.uid() = user_id OR EXISTS(admin-check))`. Admins behalten Cross-User-Zugriff ueber explizite Branch.
- Cross-User-Reads OHNE Admin-Rolle: SECURITY DEFINER RPC + REVOKE anon + GRANT authenticated (AR-44-Template) — bypasst RLS fuer Aggregate wie "distinct holder count per player" oder "Orderbook mit handle+is_own statt user_id".
- **Regression-Guard LIVE (Slice 019):** `INV-26` in `db-invariants.test.ts` scannt sensible Tabellen-Whitelist gegen `qual='true'` oder `qual=NULL` via neuer Audit-RPC `public.get_rls_policy_quals(p_tables text[])`. EXPECTED_PERMISSIVE dokumentiert bewusste Ausnahmen (aktuell nur `user_stats.Anyone can read stats` fuer Leaderboard).
- Audit-Command (manuell): `SELECT tablename, policyname, qual FROM pg_policies WHERE schemaname='public' AND qual='true' ORDER BY tablename`
- **Bekannte Instanzen (historisch):**
  - **Slice 014 (holdings):** `holdings_select_all_authenticated (qual=true)` → `holdings_select_own_or_admin` + `get_player_holder_count(uuid)` RPC.
  - **Slice 020+021 (orders):** `orders_select (qual=true)` → `orders_select_own_or_admin` + `get_public_orderbook(uuid, text)` RPC projiziert `handle` (via LEFT JOIN profiles) + `is_own` (via auth.uid()). user_id verschwindet komplett aus cross-user-Reads. 8 UI-Consumer-Sites migriert von `order.user_id === uid` auf `order.is_own`, von `profileMap[order.user_id]?.handle` auf `order.handle`.
- **Rollout-Pattern bei RLS-Tighten ohne Markt-Stoerung (Slice 020+021 Split):**
  1. Projection-RPC deployen (SECURITY DEFINER, keine user_id im Return).
  2. Service-Layer auf RPC umstellen, UI-Consumers migrieren — RLS bleibt noch qual=true.
  3. Deploy + Verify Orderbook-UX online.
  4. Erst DANN RLS tighten (DROP qual=true, CREATE own-or-admin) + AUTH-NN Test + INV-26 Whitelist entfernen.
  Verhindert Deploy-Race (RLS-Tighten ohne Code-Deploy = 10-30min Markt-Stoerung).

## SECURITY DEFINER + authenticated-Grant ohne auth.uid()-Guard (2026-04-17 — Slice 005 A-02)
- **NEBEN** dem anon-REVOKE-Pattern (unten J4) existiert die **authenticated-to-other-user Exploit-Klasse**:
  SECURITY DEFINER RPC mit `p_user_id uuid` Parameter + `authenticated`-Grant + keinem auth.uid()-Check im Body
  → jeder eingeloggte User kann fremde user_id schicken und RPC im Namen des anderen Users ausfuehren.
- J4 hatte das fuer `earn_wildcards` mit anon-Exploit. Slice 005 (2026-04-17) fand 4 RPCs mit authenticated-Exploit:
  `rpc_lock_event_entry` (fremdes Wallet/Tickets locken), `renew_club_subscription` (fremdes Wallet deducten),
  `check_analyst_decay` (Score-Penalty), `refresh_airdrop_score` (Score-Recompute).
- **Fix-Pattern:** REVOKE authenticated + defense-in-depth Body-Guard:
  ```sql
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  ```
  `IS NOT NULL` skippt fuer service_role (Cron), `IS DISTINCT FROM` reject authenticated-to-other-user.
- **Prevention:** Bei SECURITY DEFINER RPC mit `p_user_id` immer entscheiden: (a) direkter Client-Aufruf → Guard Pflicht, (b) nur Cron/internal → REVOKE authenticated.
- **Regression-Guard:** INV-21 in `db-invariants.test.ts` + `public.get_auth_guard_audit()` RPC fangen neue Drift automatisch.

## SECURITY DEFINER RPC ohne REVOKE (2026-04-14 — J4 LIVE-EXPLOIT)
- J4-Backend-Audit hat `earn_wildcards` RPC live exploited (anon konnte 99.999 Wildcards minten, reverted)
- Root-Cause: `SECURITY DEFINER` RPC OHNE `REVOKE EXECUTE FROM anon, authenticated` + `auth.uid() = p_user_id` Guard
- Weitere betroffene RPCs mit gleichem Pattern: `spend_wildcards`, `get_wildcard_balance`, `refund_wildcards_on_leave`, `admin_grant_wildcards` (letztere mit p_admin_id brittle)
- Regel: Jedes `CREATE OR REPLACE FUNCTION ... SECURITY DEFINER` MUSS begleitet sein von:
  1. `REVOKE EXECUTE ON FUNCTION X FROM anon, authenticated;`
  2. `GRANT EXECUTE ON FUNCTION X TO authenticated;`
  3. `IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE 'Nicht authentifiziert'` Guard im Body (bei trust-client Parametern)
- Audit: `grep -rn 'SECURITY DEFINER' supabase/migrations/ | xargs -I {} grep -L 'REVOKE EXECUTE' {}` → RPCs ohne REVOKE-Block
- Full SECURITY DEFINER-Audit vor Beta-Launch PFLICHT (AR-27 J4)

## ConfirmDialog statt native alert/confirm (2026-04-14 — J4 Healer A)
- `window.alert()` + `window.confirm()` sind systematisch durch `ConfirmDialog` Component zu ersetzen
- Live-Location: `src/components/ui/ConfirmDialog.tsx` (neu, J4)
- Pattern: preventClose built-in, loading/disabled-Props fuer double-click-Schutz, `confirmVariant: 'gold' | 'danger'` wiederverwendbar
- Grund: native-Dialoge sind unstyled (Browser-default), blockieren Main-Thread, nicht i18n-ready, ignorieren preventClose
- J4-Fund: 6 Stellen in EventDetailModal + useLineupSave + AufstellenTab (`alert()`) + LeaguesSection (`confirm()`, nicht in J4-Scope)
- Regel: KEINE native alert/confirm in User-Flows. Lint-Regel empfohlen `no-restricted-globals: ["alert", "confirm"]`
- Audit: `grep -rn 'window.alert\|window.confirm\|\\balert(\|\\bconfirm(' src/components/ src/features/`

## Multi-League Props-Propagation-Gap (2026-04-14 — J3 Frontend + Reviewer, J4 bestaetigt)
- Neues optionales Player-Feld (z.B. `leagueShort?`) auf Type hinzugefuegt → nur 2 von 8 Render-Call-Sites bedient
- TSC/Tests merken NICHTS (optional Prop, kein Error)
- Visual-QA im Pilot (1 Liga) uebersieht's, Fehler tritt erst im Multi-League-Betrieb auf
- Regel: Neues Player-Feld → **ALLE Render-Call-Sites manuell auditieren** (Grep alle `<PlayerRow`, `<PlayerHero`, `<TradingCardFrame`, `<PlayerIdentity`, `<PlayerIPOCard` etc.)
- Teil des `/impact` Skills fuer Player-Type-Aenderungen
- J3-Fund: TradingCardFrame Front+Back + PlayerHero + TransferListSection hatten 0 Liga-Logos trotz vollstaendigem Player-Type seit 2026-04-07
- **J4-Erweiterung (2026-04-14):** FantasyEvent + UserDpcHolding Types hatten `club*` Fields aber KEIN `league*`. Same Pattern. Fix via client-side Cache-Lookup `getClub() → getLeague()` Zero-RPC-Change. Regel: **Jedes Type mit `club*` Field MUSS spiegelbildlich `league*` Fields haben.**

## RPC Response camelCase/snake_case Mismatch (2026-04-11 — Mystery Box)
- RPC `jsonb_build_object('rewardType', ...)` → camelCase im Response
- Service castet `data as { reward_type: ... }` → snake_case → ALLE Felder undefined
- TypeScript faengt das NICHT (as = unchecked assertion)
- Richtig: Service-Cast MUSS die ECHTEN Keys der RPC matchen
- Check: `pg_get_functiondef()` → Return-Shape → Service-Cast vergleichen
- Audit: Neuer RPC deployed? → Service-Datei pruefen ob Cast echte Keys nutzt

## RPC INSERT Column-Mismatch gegen Live-Schema (2026-04-14 — J5 AR-42 + AR-42b)
- `CREATE OR REPLACE FUNCTION` parst den Body aber validiert KEINE Column-Existenz der referenzierten Tabellen
- Fehlender/falscher Column-Name wird erst beim RPC-CALL geworfen (PG 42703), NICHT beim apply_migration
- Silent fail: Transaction rollback, User sieht "Open Error" Toast, Ticket-Kosten revertiert aber Reward weg, 0 Rows in Target-Table
- **AR-42 (2026-04-08 tot):** RPC `open_mystery_box_v2` INSERT `user_equipment(...equipment_rank...)` — Spalte heisst `rank`. 6d Equipment-Drops tot.
- **AR-42b (seit RPC existiert tot):** Gleicher RPC INSERT `transactions(...amount_cents...)` — Spalten heissen `amount` + `balance_after` (NOT NULL). bCredits-Drops NIE funktioniert.
- **Regel:** Nach JEDER `CREATE OR REPLACE FUNCTION`-Migration, die INSERT/UPDATE auf eine Tabelle macht: `\d+ target_table` oder `SELECT column_name FROM information_schema.columns WHERE table_name=X` pruefen und Body-Statements matchen.
- **Audit-Pattern:** `SELECT DISTINCT p.proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND pg_get_functiondef(p.oid) ILIKE '%suspected_column%'` um cross-RPC-Hits zu finden.
- **Fix-Migration-Verify:** `pg_get_functiondef(oid) ~ 'expected_pattern' AS correct, ~ 'buggy_pattern' AS bug` nach Apply.
- **Watchlist (J5 Audit 2026-04-14, 2026-04-15 CLEARED):** Die 5 Verdächtigen (`adjust_user_wallet`, `claim_welcome_bonus`, `get_club_balance`, `request_club_withdrawal`, `send_tip`) haben `amount_cents` nur als Parameter-Name oder Column-Name anderer Tabellen (`welcome_bonus_claims.amount_cents`, `club_withdrawals.amount_cents`, `tips.amount_cents` — alle bestätigt). Alle transactions-INSERTs nutzen korrekt `(user_id, type, amount, balance_after, ...)`. Kein AR-42b-artiger Bug. Watchlist CLEARED.

## Server-Validation Pflicht fuer Money/Fantasy-RPCs (2026-04-17 — Slice 023 B4)
- Client-only Validation (Formation-Check, Slot-Count, GK-Required, Captain-Slot) ist **umgehbar via direkten RPC-Call**. Client-UX ist nicht die Wahrheit — RPC muss die einzige Quelle sein.
- Konkreter Bug: `rpc_save_lineup` akzeptierte `p_formation='xxx-not-a-formation'` ungeprueft, schrieb es direkt in `lineups.formation`. Kein ACID-Guard fuer die Scoring-Logik die spaeter annimmt Formation sei in Allowlist.
- Fix-Pattern: Im RPC-Body Stage-6.5 Block (zwischen v_all_slots-Build und teuren DB-Joins) folgende Checks hintereinander:
  1. Formation-Allowlist (`TRIM(p_formation) = ANY(ARRAY['1-4-4-2', ...])`) — sonst `invalid_formation`
  2. GK-Required (`p_slot_gk IS NULL` → `gk_required`)
  3. Slot-Count-Match: `v_def_f != v_def_n` → `invalid_slot_count_def` (analog mid, att)
  4. Extra-Slot-Check: `v_def_n < 4 AND p_slot_def4 IS NOT NULL` → `extra_slot_for_formation`
  5. Captain/Wildcard-Slot-Empty-Check (CASE-Expression pro slot_key)
- Reihenfolge wichtig: BILLIGE Early-Exits (Formation-String-Match, NULL-Checks) VOR teuren DB-Joins (insufficient_sc SELECT, salary_cap SELECT).
- Audit via Body-Scan: `SELECT pg_get_functiondef(oid) ~ 'invalid_formation' AS ok FROM pg_proc WHERE proname = 'rpc_save_lineup'` — in INV-27 automatisiert (Slice 023).
- Regel: **Jeder Money/Fantasy-RPC der Client-Inputs nutzt MUSS sie ALLE selbst validieren.** Annahme "Client hat's geprueft" = Security-Theater.

## pg_cron Wrapper-RPC Fail-Isolation (2026-04-17 — Slice 024 B5)
- Cron-Job der mehrere Items in einer Loop verarbeitet: **ein RAISE EXCEPTION auf Item #2 blockt den ganzen Batch** (ohne Isolation). Alle nachfolgenden Items werden nicht verarbeitet.
- Fix-Pattern: `BEGIN ... EXCEPTION WHEN OTHERS THEN ... END` pro Item innerhalb der FOR-Loop:
  ```sql
  FOR v_item IN SELECT ... LOOP
    BEGIN
      v_result := public.target_rpc(v_item.id);
      IF (v_result->>'success')::BOOLEAN THEN v_ok := v_ok + 1;
      ELSE v_skipped := v_skipped + 1; v_errors := v_errors || jsonb_build_array(...); END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errored := v_errored + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'item_id', v_item.id, 'reason', 'EXCEPTION: ' || SQLERRM
      ));
    END;
  END LOOP;
  ```
- Return-Shape: `{success, scored, skipped, errored, errors, ran_at}` — erlaubt Monitoring via `cron.job_run_details` + zukuenftige Alert-Hooks auf `errored > 0`.
- Safety-Bound: `LIMIT 50` im FOR-Loop verhindert runaway (falls Schedule-Drift viele Items aufstaut).
- Audit: `SELECT * FROM cron.job_run_details WHERE jobname='X' ORDER BY start_time DESC LIMIT 10` — Laufzeit + status + return_message.
- Regel: **Batch-Cron-RPCs brauchen per-Item-Try/Catch**. Keine "happy-path only"-Loops in Cron-Pfaden.

## Holdings Zombie-Row Auto-Delete-Trigger (2026-04-17 — Slice 025)
- RPCs wie `accept_offer`, `buy_from_order`, `buy_player_sc` decrementieren seller-holdings via `UPDATE holdings SET quantity = quantity - X`. Wenn `quantity` auf 0 faellt, bleibt Row als Zombie stehen. CHECK `(quantity >= 0)` erlaubt 0 — daher kein Automatischer Error.
- Symptome: Portfolio-UI zeigt `0`-qty Eintraege; Aggregationen (SUM, COUNT DISTINCT) zaehlen leer-Holdings mit; neue Decrement-RPCs uebersehen den Pattern.
- Fix-Ansatz-Vergleich:
  - (a) Inline-RPC-Patch (3-4 Call-Sites UPDATE → UPDATE + DELETE-when-zero) — viel Code-Duplikation, fragil fuer zukuenftige RPCs.
  - (b) **Trigger-Approach (BEST):** `AFTER UPDATE OF quantity ON holdings FOR EACH ROW WHEN (NEW.quantity = 0) EXECUTE FUNCTION delete_zero_qty_holding()` — zero-touch, future-proof.
- Trigger-Body: `DELETE FROM public.holdings WHERE id = OLD.id; RETURN NULL;` — OLD.id ist in AFTER-Trigger verfuegbar.
- Keine CHECK-Verschaerfung noetig: Trigger bridged UPDATE→DELETE atomisch innerhalb derselben Transaction. `CHECK (quantity >= 0)` bleibt.
- Regel: **Bei Decrement-Patterns pruefen ob Trigger statt RPC-Patch die saubere Loesung ist.** Trigger = "Datenintegritaet automatisch"; RPC-Patch = "jeder neue Caller muss daran denken".
- Audit: `SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.holdings'::regclass AND tgisinternal = false` — neue Trigger sichtbar.

## Transaction-Type → activityHelpers-Sync (2026-04-17 — Slice 027)
- RPC schreibt neue `transactions.type` (z.B. `subscription`, `admin_adjustment`, `tip_send`, `offer_execute`) → User sieht **raw-string in Transactions-History-UI** (nicht lokalisiert).
- Root-Cause: `src/lib/activityHelpers.ts` mapped type → i18n-Key. Neuer type nicht gemappt → `return type` Default gibt snake_case-String.
- Audit-Query: `SELECT DISTINCT type, COUNT(*) FROM transactions GROUP BY type ORDER BY count DESC` vs. grep-Check der types in activityHelpers.ts:
  ```sql
  -- DB DISTINCT:
  SELECT DISTINCT type FROM transactions;
  ```
  ```bash
  # Code mapped:
  grep "type === '" src/lib/activityHelpers.ts | grep -oP "'\K[^']+"
  ```
- Nach JEDEM RPC der `INSERT INTO transactions` macht: activityHelpers.ts pruefen + DE/TR-Labels ergaenzen (CEO-Gate per `feedback_tr_i18n_validation.md`).
- **Slice 027-Fund (2026-04-17):** 4 types im Live-DB (`subscription`/`admin_adjustment`/`tip_send`/`offer_execute`) waren ungemappt. Briefing behauptete "10 Types fehlen" — war stale, nur 4 aktuell, andere bereits gefixt.
- Regel: **Neue transaction.type-Schreiber triggern immer 3-File-Change:** activityHelpers.ts (icon+color+key) + messages/de.json + messages/tr.json.

## Public Wrapper + Internal RPC Pattern (Event-Entry, 2026-04-17 — Slice 041)
- Bei RPCs mit `p_user_id`-Param und auth-context-relevant: Pattern aus 2 Funktionen statt 1
  - **Public Wrapper** `rpc_name(args_ohne_user_id)`: SECURITY DEFINER, GRANT authenticated, PERFORM `internal_rpc(args, auth.uid())`
  - **Internal RPC** `internal_rpc(args, p_user_id)`: REVOKE authenticated, GRANT service_role only
- Verhindert auth-to-other-user-Exploit (analog AR-44) ohne explicit auth_uid_mismatch-guard im body.
- **Slice 032b/041 Beispiel:** `lock_event_entry(p_event_id)` → `rpc_lock_event_entry(p_event_id, auth.uid())`. Direct-call von `rpc_lock_event_entry` returned 403 — by design.
- **Audit-Pattern:** wenn ein RPC `rpc_*` heisst → pruefen ob ein Wrapper ohne prefix existiert. Falls ja: clients muessen wrapper aufrufen.
- **Doku-Pflicht:** beide RPCs brauchen `COMMENT ON FUNCTION` der das Pattern erklaert (sonst stolpert naechste Person).
- **Unterschied zu Slice 035 internal-helper:** dort fuer trigger-context (interne caller). Hier fuer auth-context-injection (client-context).

## AR-44 Guard in Trigger-Aufruf-Pfad (2026-04-17 — Slice 035)
- Trigger ruft AR-44-hardened RPC mit `p_user_id = NEW.seller_id` (anderer User als auth.uid())
- Guard `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE` trippt
- Trigger faengt mit `EXCEPTION WHEN OTHERS THEN RAISE WARNING` → silent failure
- Side-Effect (z.B. score-refresh) wird nie ausgefuehrt → fremde User haben stale Daten
- **Slice 035 Fund:** `trg_fn_trade_refresh` ruft `refresh_airdrop_score(NEW.seller_id)`. Sellers (bot-003, bot-039) hatten `airdrop_scores.updated_at = NULL` trotz mehrerer Trades.
- **Fix-Pattern:** Internal-Helper-RPC `_<fn>_internal(p_user_id)` ohne guard. REVOKE PUBLIC/anon/authenticated, GRANT service_role only. Trigger (SECURITY DEFINER, owner = postgres) kann internal aufrufen. Public wrapper behaelt guard fuer client-direct-call:
  ```sql
  CREATE OR REPLACE FUNCTION _refresh_airdrop_score_internal(p_user_id uuid)
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN ... END $$;
  REVOKE ALL ... FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ... TO service_role;

  CREATE OR REPLACE FUNCTION refresh_airdrop_score(p_user_id uuid)
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'auth_uid_mismatch';
    END IF;
    RETURN _refresh_airdrop_score_internal(p_user_id);
  END $$;

  -- Trigger uses internal directly
  PERFORM _refresh_airdrop_score_internal(NEW.seller_id);
  ```
- **Audit-Pflicht beim AR-44 Hardening:** pruefen ob hardened RPC von Triggern aufgerufen wird → sofort Internal-Helper extrahieren. Andernfalls: cumulative silent-fail.

## Postgres ON CONFLICT: CHECK validiert INSERT-Tuple-Defaults BEFORE routing (2026-04-18 — Slice 075c)

- `INSERT INTO t (col_a, col_b) VALUES (...) ON CONFLICT (unique_col) DO UPDATE SET ...` **validiert CHECK-Constraints gegen die INSERT-Tuple-Defaults**, bevor es den UPDATE-path nimmt.
- Wenn CHECK-violation durch DEFAULT-Werte entsteht (z.B. `dpc_total=10000` default + `max_supply=300` default + CHECK `dpc_total <= max_supply`), failt der ganze UPSERT — auch wenn die Ziel-row bereits existiert (d.h. UPDATE-path eigentlich korrekt wäre).
- **Supabase `.upsert([arr], { onConflict: 'key' })` erbt das Problem**: selbst wenn alle payload-rows existing sind, schlaegt die gesamte Batch fehl mit `23514: new row violates check constraint`.
- **Fix**: echtes `.update(...).eq('id', ...)` statt `.upsert()` — umgeht ON-CONFLICT-Pre-Validation komplett.
- Pattern: `pre-query api_xyz_id → id` map, dann `Promise.all(batch.map(t => supabase.from(T).update(payload).eq('id', t.id)))` in chunks von 20-50.
- Audit: `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE contype='c' AND conrelid='T'::regclass` — Constraints die DEFAULTS verletzen koennten.
- **Slice 075 Evidence**: sync-players-daily 4074/5019 payloads errored trotz pre-filtering, weil INSERT-tuple mit defaults (dpc_total=10000 vs max_supply=300) sofort CHECK-fail.

## Vercel Hobby Cron-Limit + Function Timeouts (2026-04-18 — Slice 071 + 075)

- **Hobby Plan**: max 2 Cron-Jobs (die aeltesten 2 in vercel.json werden auto-scheduled — Rest wird ignoriert ohne Deploy-Fehler), max 1×/Tag Frequenz pro Job, Deploy rejected bei comma-Schedule `0 6,14,22 * * *` → Redirect zu `vercel.com/docs/cron-jobs/usage-and-pricing`.
- **Pro Plan**: 40 Cron-Jobs, 300s function-timeout (NICHT 900s wie manchmal behauptet).
- **Function-Timeout bei HTTP-Trigger**: auch mit `export const maxDuration = 300;` im route.ts wird 300s als Hard-Limit durchgesetzt. Cron-Schedule-Runs koennen laenger laufen als HTTP-Trigger (bis 900s Pro / 3600s Enterprise).
- **Symptom**: 504 Gateway Timeout mit "FUNCTION_INVOCATION_TIMEOUT" nach 300s.
- **Implication fuer Cron-Design**: Sync-Routes die per-Row-DB-Ops machen (`for (entry) { await supabase.update().eq() }`) timeouten bei 1000+ rows. **Zwingend Batch-Pattern**: 1× pre-query via `.in(all_ids)`, dann chunked concurrent UPDATEs via `Promise.all` (20-50 parallel).
- Messung Slice 075: sync-injuries **60s-timeout → 28s**, sync-players-daily **300s-timeout → 17s** (reines API + pre-query) nach Batch-Refactor.

## Transfermarkt Cloudflare-Block fuer Vercel-IPs (2026-04-18 — Slice 075 Debug)

- `transfermarkt-search-batch` findet 0/20 matches obwohl URL + Regex + HTML-Struktur korrekt sind.
- Root-Cause: Transfermarkt nutzt Cloudflare, das Vercel-Datacenter-IPs **aggressiv blockiert** → HTTP 200 mit leerem/challenge-HTML (keine `profil/spieler/XXXXX` Links).
- Verifikation: `curl` vom lokalen PC zu derselben URL returnt volle HTML mit 10+ Links.
- **Workaround-Optionen**: (a) Proxy/VPN-Service mit Residential-IPs, (b) Transfermarkt Partner-API (kostet), (c) manuelle Bulk-Imports aus CSV, (d) andere Marktwert-Quelle (Comunio, ESPN).
- **Debug-Mode** via `?debug=true&threshold=X`: returnt `debug_trace[].parsed` → 0 parsed = Cloudflare-Block bestaetigt.

## Next.js Route-Handler: Named-Exports brechen Build (2026-04-18 — Slice 069 Healing)
- `export function helper(...)` in `src/app/api/.../route.ts` ist **verboten** unter Next.js 14+ App-Router
- Nur erlaubt: HTTP-Method-Handlers (`GET`/`POST`/`PUT`/`DELETE`/`PATCH`/`HEAD`/`OPTIONS`), plus `runtime`/`dynamic`/`dynamicParams`/`revalidate`/`fetchCache`/`maxDuration`/`generateStaticParams`/`config`
- Jeder andere Named-Export → `next build` Type-Error: `'OmitWithTag<...>' does not satisfy the constraint '{ [x: string]: never; }'`
- `tsc --noEmit` FAENGT DAS NICHT — der Type-Check entsteht aus generated `.next/types/app/.../route.ts` nur waehrend `next build`
- Gleiches gilt fuer `type`-exports — nur `type` lokal deklarieren, export nur aus `lib/`-Files
- **Kritisch:** Bug kann wochenlang verborgen sein, weil `tsc` lokal clean ist und `next build` nur im Deploy-CI laeuft
- **Slice 069-Fund:** Slice 064 + 068 hatten `export function parseMarketValue/parseSearchResults/normalizeName/scoreMatch` in route.ts → **alle 11 Vercel-Deploys seit 2026-04-18 gefailt, Cron-Pipeline nicht live**
- **Fix-Pattern:** Helpers nach `src/lib/scrapers/` (oder `src/lib/<domain>/`) extrahieren, route.ts + tests importieren aus lib/
- **Regel:** Nach JEDEM Edit in `src/app/api/**/route.ts`: `npx next build` lokal laufen ODER zumindest pruefen ob neue Exports nur die erlaubten Symbole enthalten.

## ESLint disable-comment mit undefined Rule (2026-04-18 — Slice 069 Healing)
- `// eslint-disable-next-line @typescript-eslint/no-explicit-any` failt wenn `@typescript-eslint` Plugin NICHT in eslintrc registriert ist
- Project-eslintrc ist `{ "extends": "next/core-web-vitals" }` — kein `@typescript-eslint` direkter Plugin
- `next build` schlaegt fehl: `Error: Definition for rule '@typescript-eslint/no-explicit-any' was not found`
- **Slice 069-Fund:** 3 Occurrences (Slice 048 TR-i18n NotificationDropdown + Slice 052 playerMath.test) — blockten alle Deploys
- **Fix-Pattern:** Statt `as any` + disable-comment nutze:
  - Typgerechten Cast: `(fn as unknown as (k: string, p?: Record<string, unknown>) => string)(...)`
  - Oder `unknown` + enger Cast am Verwendungsort
- **Regel:** Wenn `as any` noetig scheint, erst pruefen ob typgerechter Cast moeglich ist. Disable-comments mit Rule-Namen nur wenn Plugin installiert.

## auth.users DELETE NO-ACTION-FK-Pre-Cleanup (2026-04-17 — Slice 028)
- `DELETE FROM auth.users WHERE id IN (...)` scheitert an NO-ACTION-FK-Constraints in anderen Tabellen (Postgres: `23503: violates foreign key constraint`). Die Standard-CASCADE-Tables (profiles, wallets, holdings) werden automatisch gecleant — die NO-ACTION-Tables nicht.
- Bekannte NO-ACTION-Tables auf `auth.users`: `user_tickets`, `ticket_transactions`, `transactions`, `trades`, `events.created_by`, `ipo_purchases`, `mystery_box_results`, `welcome_bonus_claims`, `chip_usages`, `mentorships`, `community_poll_votes`, `verified_scouts`, `fan_rankings`, `user_cosmetics`, `user_daily_challenges`, `user_founding_passes`, `user_scout_missions`, `liquidation_events`, `liquidation_payouts`, `sponsors.created_by`, `fee_config.updated_by`, `club_votes.created_by`, `bounty_submissions.reviewed_by`, `player_valuations` (23 Tables, Stand 2026-04-17).
- Pre-Audit-Pattern:
  ```sql
  -- 1. Liste NO-ACTION-FKs auf auth.users
  SELECT nsp.nspname||'.'||cls.relname AS tbl, att.attname AS col,
    CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' ELSE 'other' END
  FROM pg_constraint con JOIN pg_class cls ON con.conrelid=cls.oid
  JOIN pg_namespace nsp ON cls.relnamespace=nsp.oid
  JOIN pg_class ref_cls ON con.confrelid=ref_cls.oid
  JOIN pg_namespace ref_nsp ON ref_cls.relnamespace=ref_nsp.oid
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY ck(attnum, ord) ON TRUE
  JOIN pg_attribute att ON att.attrelid=cls.oid AND att.attnum=ck.attnum
  WHERE con.contype='f' AND ref_nsp.nspname='auth' AND ref_cls.relname='users'
    AND con.confdeltype='a';

  -- 2. Row-Counts fuer target-Users pro NO-ACTION-Table
  SELECT 'user_tickets' AS tbl, COUNT(*) FROM user_tickets WHERE user_id IN (...)
  UNION ALL ...;

  -- 3. Wenn Rows vorhanden: vorher loeschen, dann auth.users DELETE
  ```
- Achtung: `information_schema.constraint_column_usage` liefert bei cross-schema-FKs (public → auth) KEINE Treffer. Immer `pg_constraint` direkt nutzen.
- Regel: **Bevor User-Delete (DEV-Accounts, GDPR-Request, etc.): NO-ACTION-FK-Audit Pflicht.** Rollback nicht moeglich (auth.users mit hashed password nicht restorable ohne Backup).
