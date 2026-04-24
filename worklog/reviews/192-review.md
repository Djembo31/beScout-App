# CTO Review: Slice 192 — Defensive Guard fuer NULL-Player Holdings

**Reviewer:** reviewer-Agent (Cold-Context, Opus 4.6)
**Datum:** 2026-04-24
**Time-spent:** ~35 minutes

## Verdict: REWORK

Die Defense-in-Depth-Idee ist korrekt und matcht `patterns.md` #25 (throw statt swallow). Der Proof-Doc ist hervorragend. Die Tests sind clean. Aber der Fix adressiert nur einen von drei Pfaden, die `HoldingWithPlayer[]`-Daten in den `qk.holdings.byUser(userId)`-Cache schreiben — und verwandelt bei den anderen beiden Pfaden eine UX-Krankheit (Ghost-Rows) in ein hartes UI-Crash (Mapper-Throw via Error-Boundary).

## Spec-Coverage
- [x] Service-Filter in `getHoldings()` mit Observability-Log
- [x] Mapper-Throw bei `h.player == null`
- [x] 3 Unit-Tests, alle gruen
- [x] JSDoc + Caller-Contract dokumentiert
- [ ] **Cache-Priming-Pfade audited** — FEHLT (siehe Finding #1/#2)
- [ ] Service-Test fuer Filter-Branch — FEHLT (nice-to-have)

## Findings

### #1 CRITICAL — Cache-Prime ohne player-Nest crashed Mapper
- **File:** `src/lib/queries/marketDashboard.ts:64`
- **Issue:** `primeMarketDashboardCaches` schreibt `dash.holdings` in `qk.holdings.byUser(userId)`. Die Daten kommen aus RPC `get_market_user_dashboard` (migration `20260420230000`), die Holdings **ohne `player`-Nest-Object** returnt (nur `id, user_id, player_id, quantity, avg_buy_price, created_at, updated_at`). `HoldingWithPlayer`-Cast ist unsafe. Nach Slice 192 crashed `dbHoldingToUserDpcHolding` fuer JEDE Row sobald User von `/market` zu `/fantasy/aufstellen` navigiert — weil `h.player === undefined` → Mapper throws. **Regression: ghost-rows → komplett leerer Kader + Error-Boundary.**
- **Fix:** Option A (minimal): In `primeMarketDashboardCaches` nur priming wenn `dash.holdings[0]?.player != null` (sonst skip — lass `useHoldings()` selbst laden). Option B (sauber): RPC `get_market_user_dashboard` um `player`-join erweitern, analog zu `get_home_dashboard_v1`. Option C: Type fixen — `MarketUserDashboard.holdings` als `DbHolding[]` (ohne player) typen und `primeMarketDashboardCaches` entfernt die Holdings-Prime-Line.

### #2 HIGH — Inkonsistente Filter-Coverage zwischen Cache-Primers
- **File:** `src/lib/queries/homeDashboard.ts:42`
- **Issue:** `primeHomeDashboardCaches` schreibt `dash.holdings` in gleichen Cache-Key. RPC ist zwar besser (INNER JOIN auf `players` + SECURITY DEFINER umgeht RLS → im Normalfall kein NULL), **aber das NULL-Player-Szenario aus Slice 192 wird hier nicht gefiltert** — wenn ein Ghost-Player existiert (INV-39 Cross-Club-Contamination) oder ein Player-FK dangling waere, ginge das durch. Konsistenzproblem: ein Pfad filtert, der andere nicht.
- **Fix:** Gemeinsame Filter-Helper aus `wallet.ts` extrahieren (`filterValidHoldings()`) und in beiden `prime*`-Funktionen anwenden.

### #3 MEDIUM — All-Ghost-Edge-Case rendert Empty-State silent
- **File:** `src/lib/services/wallet.ts:77-86`
- **Issue:** Wenn ALLE Holdings NULL-Player haben, sieht User silent einen leeren Kader — identisch zum New-User-State. Kein Toast, keine Retry-Option, nur console.error (kein Sentry-Event ohne `logSilentCatch`).
- **Fix:** (a) `logSilentCatch('getHoldings.ghostRows', new Error(...))` aus `@/lib/observability/silentRejects` statt raw `console.error` — gibt Sentry-Breadcrumb (konsistent mit dem Observability-Stack laut `memory/pattern_observability_stack.md`). (b) Bei `ghosts.length === rows.length && rows.length > 0` throw werfen statt filter — waere ehrlicher und triggert React-Query-Retry (RLS-Race loest sich oft in 1-2s).

### #4 MEDIUM — Mapper-Throw mit Human-String statt i18n-Key
- **File:** `src/features/fantasy/mappers/holdingMapper.ts:19-26`
- **Issue:** `throw new Error('holdingMapper: h.player is NULL ...')` leckt Developer-String ins Error-Boundary. Laut `errors-frontend.md` #i18n-Key-Leak: Service-/Mapper-Throws sollen i18n-Keys werfen, nicht Human-Messages.
- **Fix:** `throw new Error('ghost_holding_row')` werfen, Caller resolved via `mapErrorToKey + te()`. Detaillierte Debug-Infos (`player_id`, Context) gehoeren in `logSilentCatch('holdingMapper.ghost', err, { playerId: h.player_id })` VOR dem Throw.

### #5 LOW — Kein Service-Test fuer Filter-Branch
- **File:** `src/lib/services/__tests__/wallet-v2.test.ts`
- **Issue:** Coverage des zentralen Slice-192-Fixes fehlt auf Service-Level. Mapper-Test alleine greift nur wenn Daten durch den Mapper gehen — die Service-Layer-Garantie (ghost-filtering) ist nicht testgesichert.
- **Fix:** Test-Case erweitern: `it('filters ghost rows with null player')`, Input = Mix aus validem + NULL-player Row, Assertion: nur valide Row im Resultat + `console.error` via `vi.spyOn(console, 'error')`.

### #6 LOW — Root-Cause-Slice fehlt im Backlog
- **File:** `worklog/proofs/192-holdings-null-player-guard.md:84-94`
- **Issue:** Der Proof benennt den Bug als "transient Auth-Race" basierend auf Console-Warnings. Der Follow-up-Slice (`AuthProvider-Perf`) ist Root-Cause — bleibt im Backlog ohne Slice-Nummer. Risiko: fix-the-symptom, not-the-cause.
- **Fix:** Explicit Backlog-Slice anlegen mit Referenz auf diesen Proof.

### #7 LOW — Keine Production-Graceful-Degradation
- **File:** `src/features/fantasy/mappers/holdingMapper.ts`
- **Issue:** Mapper wirft synchron — wenn Aufstellen-Tab `useFantasyHoldings` aufruft und `dbHoldings` eine ghost-Row enthaelt, crashed `useMemo` → React Error-Boundary. Bei keinem Error-Boundary: Whitescreen.
- **Fix:** Verifizieren via grep `grep -rn "ErrorBoundary" src/app/(app)/fantasy`. Wenn keiner: defensive Variante im Hook (`useFantasyHoldings`) — `try { dbHoldingToUserDpcHolding(h) } catch { logSilentCatch(...); return null }.filter(Boolean)` als last-line-of-defense.

## Journal-Review

- **Entscheidungen sinnvoll:** JA — Defense-in-Depth ist die richtige Doktrin fuer Silent-Fails (`common-errors.md` §1). Der Proof ist ausfuehrlich und ehrlich, inkl. "Was dieser Fix NICHT loest"-Sektion.
- **Gap:** Impact-Analyse wurde `skipped (1 Service + 1 Mapper, Frontend-Read-Only)` — das war falsch. Der Mapper-Throw ist ein Data-Contract-Change (required → throws on null), damit haetten alle Consumers inklusive `primeHomeDashboardCaches` + `primeMarketDashboardCaches` auditet werden muessen. Siehe `common-errors.md` §"Data Contract Changes (NICHT als UI-Change behandeln)".

## Positive

- **Root-Cause-Analyse ist Gold-Standard:** Live-MCP-Verification, DB-Query mit real data, Mapping-Default-Pattern-Match 100%, Auth-Console-Warning-Evidence.
- **Symptom-Decoder-Tabelle (`#0 MID 0 CR` = 7 Default-Felder)** ist ein Pattern fuer `common-errors.md`.
- **Mapper-Throw mit player_id im Message** erleichtert Sentry-Filtering extrem.
- **Mapper-Tests decken beide Null-Varianten** sauber ab.
- **JSDoc im Mapper dokumentiert Caller-Contract explicit** — Ferrari-Qualitaet.

## Learnings fuer Knowledge Capture

- **`errors-db.md` neuer Eintrag:** "PostgREST nested-select Auth-Race" mit Symptom-Decoder-Tabelle.
- **`patterns.md` #25 Erweiterung:** "Cache-Priming-Audits" — wenn Service X filtert, muessen ALLE `queryClient.setQueryData(qk.X.*, ...)`-Pfade den gleichen Filter anwenden.
- **`common-errors.md` §"Data Contract Changes"** staerken: "Mapper-Throw-Migration = Contract-Change. Jeder Consumer des Input-Typs muss auditet werden."
- **RPC-Type-Mismatch-Pattern:** `get_market_user_dashboard` returnt `HoldingWithPlayer[]` laut TS-Cast aber liefert RPC-seitig nur `DbHolding[]`. Audit: `grep -rn "as HoldingWithPlayer\[\]" src/lib/services/`.

## Summary

Implementation folgt der richtigen Doktrin und ist sauber gecoded + getestet — aber der Impact-Skip hat zwei kritische Cache-Priming-Pfade uebersehen, die nach Slice 192 Mapper-Throws triggern koennen (`/market` → `/fantasy` Navigation = potenzieller Hard-Crash).

**REWORK:** Finding #1 muss VOR Merge fixed werden. Findings #3 + #4 + #5 sollten mitgemacht werden, Rest ist nice-to-have fuer Follow-up.
