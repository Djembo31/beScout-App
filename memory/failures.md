---
name: failures
description: Quick-Lookup für wiederkehrende Failure-Modes. Konsolidiert Post-Mortems aus decisions.md + worklog/log.md. Ziel: "was sind meine 3 typischen Fehler beim X?" in 30 Sekunden beantwortbar.
type: reference
---

# Failures — Quick-Lookup-Index

**Zweck:** Die Decisions (`decisions.md`) und Errors (`.claude/rules/errors-*.md`) sind kontext-reich, aber lang. Dieses File ist die **Kurzliste der typischsten Failure-Modes**, gruppiert nach Domain. Eine Zeile pro Failure, Deep-Link zur Referenz.

**Pflege:** Bei jedem Post-Mortem ODER Reviewer-Finding mit Production-Impact → hier Eintrag anlegen (oder bestehenden kontern/schärfen).

---

## Session-Level Failure-Modes

Dinge die ich (Claude) als Orchestrator wiederholt falsch mache.

| Code | Failure | Symptom | Prevention | Ref |
|------|---------|---------|------------|-----|
| S-01 | **Memory-First statt Evidence-First** | Status-Fragen mit Memory beantworten, nicht mit `git log`/file-read | `ship-status-gate` injiziert git log bei Status-Prompts. Vor "was ist offen": Memory ignorieren, Evidenz prüfen. | `feedback_verify_before_claiming_open.md` |
| S-02 | **Parallel-Dispatch-Opportunity verpasst** | >3 Files cross-domain sequentiell als Solo-Claude bearbeitet | Stage-Check: wenn backend+frontend gleichzeitig betroffen → Worktrees + Parallel-Agents. | CLAUDE.md Slice 085 Standard |
| S-03 | **Self-Review bei nicht-mechanischer Arbeit** | Skip Reviewer-Agent bei angeblich "trivialem" Pattern das doch neu ist | D35 klar: nur nach 2+ PASS-Iterations identischen Patterns. Bei NEUEM Pattern-Element zurueck zu reviewer-Agent. | D35 |
| S-04 | **TaskCreate/TaskList nicht genutzt bei >3 Sub-Steps** | Vergesse Sub-Steps, "Mini-Refactor" bleibt halbfertig | Hook-Gate (Slice 188 Task 6). Plus: self-check vor BUILD. | CLAUDE.md task-reminder |
| S-05 | **Stale-Reference infektiös werden lassen** | `MEMORY.md` oder `active.md` verlinkt File das nicht existiert | D7 self-heal: sofort in selber Session Referenz auflösen (File anlegen ODER Link entfernen). | D7 |
| S-06 | **Post-Deploy-Check vergessen nach git push** | Vercel silent-build-fail, X Commits blockiert | D36-Protokoll: `mcp__vercel__list_deployments` nach jedem push. Fehlt Commit → `vercel deploy --prod --yes` foreground. | D36 |
| S-07 | **Re-Audit-Grep vor Component-Deletion skippen** | `rm components/X` ohne Grep — Build breaks auf Prod weil 2 Caller vergessen | D37: `grep -rn "import.*X.*from" src/` vor JEDER Deletion. Non-negotiable. | D37 |

---

## Database / RPC Failure-Modes

| Code | Failure | Symptom | Prevention | Ref |
|------|---------|---------|------------|-----|
| DB-01 | **Silent Error-Swallow** | `{ data }` ohne `{ error }`-destructure, null-return statt throw | `grep -rn 'const { data } = await supabase' src/lib/services/`. Service immer: `if (error) throw new Error(error.message)`. | `errors-db.md` Service Error-Swallowing |
| DB-02 | **PostgREST 1000-row Cap** | `.select()` ohne `.range()` auf >1000 rows, silent truncate | `.range(offset, offset+999)` in while-loop. `.limit(10000)` hilft NICHT. | `errors-db.md` PostgREST 1000-row cap |
| DB-03 | **.in() >100 UUIDs URL-Limit** | `data=undefined, error=undefined` wenn id-Array >100 | Chunk in 100er Batches. Loader-Query mit 1000-Cap parallel prüfen. | `errors-db.md` `.in()` Chunking |
| DB-04 | **RPC Return-Shape camel/snake Drift** | Service-Cast lügt: alle Felder `undefined` | `pg_get_functiondef()` → Return-Shape → Service-Cast byte-vergleichen. | `errors-db.md` RPC Response Mismatch |
| DB-05 | **Silent-Cast ohne Discriminator** | `return data as {...}` ohne `if (!data.success) throw` | Discriminated-Union Shape + Pre-Cast-Guard. Slice 165/168. | D24 + `errors-db.md` Silent-Cast |
| DB-06 | **SECURITY DEFINER ohne auth.uid()-Guard** | RPC als anon aufrufbar → Exploit | REVOKE anon + GRANT authenticated + `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE`. | `errors-db.md` auth.uid()-Guard |
| DB-07 | **CREATE OR REPLACE ohne Patch-Audit** | Zwischen-Patches silent reverted (Guards weg) | `pg_get_functiondef()` als Source-of-Truth, nicht erster CREATE-File. Migration-Header mit Patches-List. | `errors-db.md` PATCH-AUDIT |
| DB-08 | **Money-RPC ohne Idempotency** | Network-Retry lockt 2× / deducted 2× | `p_idempotency_key TEXT DEFAULT NULL` + `check_or_reserve_dedup_key`. D30. | `errors-db.md` Money-RPC Idempotency-Blueprint |
| DB-09 | **RLS-Policy Trap (nur SELECT)** | Neue Tabelle: INSERT/UPDATE/DELETE silent fail | Jede RLS-Tabelle: 4 Ops policies. `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`. | `errors-db.md` RLS Policy Trap |
| DB-10 | **NULL-in-Scalar-Subquery (Money!)** | `IF (SELECT COALESCE ...) < y` skipped bei leerem Set | `SELECT x INTO v_x; IF COALESCE(v_x, 0) < y`. Alle Money-Migrations auditieren. | `errors-db.md` PL/pgSQL NULL-Scalar |

---

## Frontend / UI Failure-Modes

| Code | Failure | Symptom | Prevention | Ref |
|------|---------|---------|------------|-----|
| FE-01 | **setState-Race in Mutation-Handler** | Double-click → 2× DB-Write | `useSafeMutation` aus `@/lib/hooks/useSafeMutation.ts`. D17. | `errors-frontend.md` React setState Race |
| FE-02 | **Modal ohne preventClose bei isPending** | ESC/Backdrop mid-transaction → State-Verlust | `<Modal open preventClose={isPending}>`. Sweep Slice 166. | `errors-frontend.md` Modal preventClose |
| FE-03 | **Tailwind data-* nur auf Utilities** | Radix `data-[state=open]:anim-modal` animiert nicht | `anim-*` in `@layer utilities {}`, nicht plain CSS. | `errors-frontend.md` Tailwind data-* |
| FE-04 | **Dynamic Tailwind-Class** | `border-[${var}]` JIT-fail | `style={{ borderColor: hex }}` + static class. | `errors-frontend.md` CSS Gotchas |
| FE-05 | **i18n-Key-Leak via err.message** | User sieht `handleReserved` statt "Handle vergeben" | Service wirft i18n-key, Consumer resolved via `t(mapErrorToKey(...))`. | `errors-frontend.md` i18n-Key-Leak |
| FE-06 | **Multi-League Props-Propagation** | Neue Field nur in 2/8 Call-Sites → Pilot OK, Multi-Liga broken | Jedes `club*`-Field braucht spiegelbildlich `league*`. Alle Render-Sites greppen. | `errors-frontend.md` Multi-League |
| FE-07 | **useCountUp auf volatile data** | Optimistic/Stale/Real-Wechsel → 2-3 Animations-Zyklen | `useDeferredValue` davor. | `errors-frontend.md` useCountUp |
| FE-08 | **Singleton→useQueryClient exhaustive-deps** | ESLint warn bei strict, Runtime-Impact meist Null | Alle `queryClient.*`-Reads in enclosing deps. Plus: `vi.hoisted` für shared-mock. | `testing.md` Pattern 5 |

---

## Infrastructure / Deployment Failure-Modes

| Code | Failure | Symptom | Prevention | Ref |
|------|---------|---------|------------|-----|
| INF-01 | **Vercel Hobby hourly Cron silent-reject** | Auto-Deploy seit X Stunden tot, keine Notification | D36 Post-Push-Check. `vercel.json` grep nach `"0 * * * *"`. | D36 + `errors-infra.md` Vercel Hobby |
| INF-02 | **Named Export in route.ts** | `next build` TypeError `OmitWithTag` | Nur GET/POST/...+config. Helpers raus nach `@/lib/scrapers/`. `npx next build` lokal nach Edit. | `errors-infra.md` Next.js Route Named Exports |
| INF-03 | **tsconfig includet scripts/** | `next build` Vercel schlägt fehl: missing `playwright` | `"exclude": [..., "scripts", "tmp"]`. | `errors-infra.md` tsconfig excludes |
| INF-04 | **Vercel "Sensitive" auf NEXT_PUBLIC_**  | Build-Zeit kein inject → `process.env.NEXT_PUBLIC_X = undefined` | NEXT_PUBLIC_* NIEMALS "Sensitive" markieren. Delete+Recreate wenn versehentlich. | `errors-infra.md` Vercel Sensitive |
| INF-05 | **Shell case promiskuös in Hook** | `*"merge"*` matched `fix(api): prevent merge conflict` | Start-of-Command anchor: `"git merge"|"git merge "*)`. UNQUOTED strip bei Flag-Check. | D15 + `errors-infra.md` Shell-case |
| INF-06 | **Two-lockfile drift** | CI failed 22× konsekutiv | `pnpm-lock.yaml` only. `packageManager: "pnpm@X"` in package.json. | `errors-infra.md` Two-lockfile |
| INF-07 | **Cron-API-Count ≠ DB-Count** | External API dropped rows → Cron advanced zu früh | `allDone = apiAllDone && dbTruthAllDone`. D12. | D12 + `errors-infra.md` Cron-Guard |
| INF-08 | **CSP blocks Sentry silent** | JS-Events silent gedroppt | `connect-src` mit `*.sentry.io *.ingest.de.sentry.io`. | `errors-infra.md` CSP Sentry |
| INF-09 | **Hook-Override auto-gen Files** | Session-Handoff Rich-Content weg nach Stop-Hook | Marker-Block-Merge (awk state-machine) statt Full-Write. D31. | D31 + `errors-infra.md` Hook-Merge |

---

## Scraper / External Data Failure-Modes

| Code | Failure | Symptom | Prevention | Ref |
|------|---------|---------|------------|-----|
| SC-01 | **Scraper Default-Poisoning** | Parser-Fallback (MV=500K) sieht aus wie echte Daten | `mv_source` column + cluster-detection via GROUP BY. INV-36/37/38. | `errors-scraper.md` Default-Poisoning |
| SC-02 | **Regex-Drift bei HTML-Change** | 433 Spieler mit MV=0 silent | Regression-Tests mit echten Fixtures. Entity-Drift (€/&#8364;/&euro;). | `errors-scraper.md` Regex Drift |
| SC-03 | **Cloudflare-Block für Vercel-IPs** | HTTP 200 mit leerem Challenge-HTML | CSV-Import-UI, Proxy, TM Partner-API. Debug-Mode `?debug=true`. | `errors-scraper.md` Cloudflare |
| SC-04 | **null-keep statt null-write** | Parser null → DB behält alten Wert → data-liar | `updates.contract_end = parsed` always. D16. | D16 + `errors-scraper.md` null-Policy |
| SC-05 | **Nested-tr + non-greedy Regex** | Squad-Scrape bricht mitten in Row ab | Depth-counter state machine, nicht `.*?`. | `errors-scraper.md` Nested-tr |

---

## Money-Path Failure-Modes (CEO-Scope, kritisch)

| Code | Failure | Symptom | Prevention | Ref |
|------|---------|---------|------------|-----|
| M-01 | **Wallet-Double-Deduct via Retry** | Network-Retry → 2× locked_balance | Idempotency-Blueprint D30. `check_or_reserve_dedup_key` VOR Wallet-Deduct. | D30 |
| M-02 | **Missing Server-Validation** | Client-Guard umgehbar via direktem RPC-Call | RPC = einzige Wahrheit. Billige Early-Exits in RPC (Allowlist, Slot-Count, Captain-Empty). | `errors-db.md` Server-Validation |
| M-03 | **Transactions mutable (kein append-only)** | UPDATE/DELETE auf transactions erlaubt → Audit-Trail korrumpiert | REVOKE UPDATE/DELETE + BEFORE-Trigger raising. D28. | D28 |
| M-04 | **Money-RPC Pricing-Drift** | Frontend-Tiers weichen von RPC-Formel ab | RPC-Body = einzige Wahrheit. Test-Invariant `calcSuccessFee() === RPC-Formel`. | `errors-db.md` Pricing-Formel Drift |
| M-05 | **Fee-Split falsch berechnet** | Trading Fee ≠ 6% (3.5+1.5+1) | CEO-approved BIGINT cents. Test vor jedem Fee-Change. | `business.md` Fee-Split |

---

## Wiederkehrende 3-Typical-Fehler beim...

**...neuen RPC schreiben:** DB-04 (Return-Shape Drift) · DB-06 (auth.uid()-Guard vergessen) · DB-08 (Idempotency vergessen bei Money)

**...neuer Service:** DB-01 (Error-Swallow) · DB-02 (1000-row Cap) · FE-05 (i18n-Key-Leak)

**...neuer Cron-Route:** INF-01 (Hobby-Tier) · INF-02 (Named Exports) · INF-07 (DB-Truth-Guard vergessen)

**...Modal/Dialog bauen:** FE-01 (setState-Race) · FE-02 (preventClose vergessen) · FE-03 (Tailwind data-* nicht @layer utilities)

**...Scraper ändern:** SC-01 (Default-Poisoning) · SC-02 (Regex-Fixture-Test fehlt) · SC-04 (null-keep statt null-write)

**...Hook schreiben:** INF-05 (Shell-case) · INF-09 (Auto-File-Override) · S-05 (Stale-Reference)

---

## Usage

- **Vor neuem Feature-Slice:** Scan der relevanten Domain-Table (DB/FE/INF/SC/M), vergleich mit Spec-Files-Liste
- **Bei Reviewer-Finding:** Code hier? → vorhandener Eintrag verlinken. Neu? → Eintrag anlegen.
- **Bei 3× gleichem Fehler in einer Woche:** Entry in eigenen Code-Gate umwandeln (Hook, CI, Test-Invariant).

**Size-Budget:** Soft-Ziel <20 KB. Bei Überschreitung splitten nach Domain.
