# Slice 144g Review — 2026-04-22

**Verdict:** PASS

**Reviewer:** Cold-Context-Reviewer-Agent (Opus 4.7 1M)

**Scope reviewed:**
- Spec: worklog/specs/144g-contract-null-on-missing-tm.md
- Debug-Evidence: worklog/proofs/144g-debug.txt
- Parent Context: worklog/reviews/144f-review.md
- Code-Change: scripts/tm-rescrape-stale.ts:266-271 (updates-Object)
- Consumer: src/lib/services/players.ts:114-121 (calcContractMonths)
- Consumer: src/components/player/detail/PerformanceTab.tsx:80,187 (Gated Render)
- Invariant: src/lib/__tests__/db-invariants.test.ts:2017-2055 (INV-38)
- Trigger-Audit: grep BEFORE/AFTER UPDATE ON players in supabase/migrations/

## Findings

| # | Severity | Location | Issue | Suggested Fix |
|---|----------|----------|-------|---------------|
| — | — | — | Keine Issues gefunden | — |

## Positive

- **Semantic-Honesty-Win:** `contract_end=null` bedeutet jetzt "TM hat kein aktuelles Feld", nicht mehr "historischer Wert bleibt als Lie". Passt zu 144e-Pattern (null = no data > stale data).
- **Mirror-Fix zu Line 274:** `contractChanged` Counter hat bereits null-Guard (`contract !== null && contract !== p.current_contract`), also zaehlt ein null-flip nicht als contractChanged. Das passt, weil der Delta nicht user-sichtbar als Transfer-Event interpretiert werden sollte.
- **Trigger-Audit-grün:** 3 BEFORE/AFTER UPDATE Trigger auf players existieren (`trg_player_reference_price` BEFORE UPDATE, `trg_recalc_floor_on_trade` BEFORE UPDATE WHEN last_price IS DISTINCT, `watchlist_price_alert` AFTER UPDATE OF floor_price) — keiner feuert auf `contract_end`. FK-Constraint auf contract_end gibt es nicht (ist plain DATE).
- **Consumer-Chain null-safe verifiziert:**
  1. `players.ts:114` `calcContractMonths(null)` → `return 0`
  2. `types/index.ts:58` `contractMonthsLeft: number` (non-nullable, immer 0-safe)
  3. `PerformanceTab.tsx:187` `{player.contractMonthsLeft > 0 && ...}` gatet den gesamten Contract-Card-Render → Card verschwindet, kein "Invalid Date"
  4. `getContractInfo(0)` in PlayerRow.tsx:77 → urgent=true (≤6 months), Card wäre "red expiring now" — aber Gate verhindert Render
  5. `PlayerIPOCard.tsx:46` nutzt auch `getContractInfo(player.contractMonthsLeft)` — null-transformiert zu 0, harmlos wenn nicht gerendert.
- **INV-38 verbessert:** DB-Invariant prüft `WHERE contract_end IS NOT NULL AND contract_end < cutoffIso AND mv_source != 'transfermarkt_stale'`. Mit dem Fix werden die 3 WER-Players von `contract_end=2022-07-01, mv_source=verified` (= INV-38-Violation nach 144f) zu `contract_end=NULL, mv_source=verified` (= kein Violation, weil IS NULL skippt den Filter). Also heilt 144g aktiv INV-38-Regressionen aus 144f.
- **Exact Scope:** 1-Zeile Policy-Change, kein Parser-Change, kein Type-Change, keine Schema-Migration.

## 6-Punkte-Self-Check

1. **Reversibel?** JA — Single-File-Change in scripts/, kein Runtime-State. DB-Rollback per `UPDATE players SET contract_end = '2022-07-01' WHERE id = '<lynen-id>'` etc. (3 Zeilen SQL). Old-Values sind im 144f-Proof dokumentiert.
2. **FK/Trigger-safety?** JA — 0 Trigger auf contract_end (nur floor_price + last_price + reference_price), 0 FK-Constraints. `contract_end IS NULL` ist valid DB-State, DATE nullable per Column-Definition (confirmed types/index.ts:547 `contract_end?: string | null`).
3. **null-Consumer-safety:** JA — 12 Consumer gegrept, alle null-tolerant: `calcContractMonths` (explicit early-return 0), `PerformanceTab` (gated render via >0), `PerformanceTab.tsx:219` color-Klassen sind non-null, `sync-contracts/route.ts` liest `contract_end: string | null`, DB-Invariants filtern `contract_end IS NULL` aus.
4. **Scope-Creep vermieden?** JA — exakt 1 Zeile, `if (contract !== null) updates.contract_end = contract` entfernt, direkte Property-Assignment. Keine Parser-Tweaks, keine UI-Copy-Änderungen.
5. **Konsistenz zu 144f?** JA — Iterativer Folgefix derselben Scraper-Logik: 144f markierte mv_source=verified korrekt, 144g zieht contract_end in dieselbe "verified = whatever TM currently shows" Semantik. Kein Split-Brain mehr (verified MV + stale contract).
6. **Test-Coverage/Impact:**
   - `src/lib/services/__tests__/players.test.ts:125` testet explizit "contract_end not in mock → calcContractMonths returns 0" — deckt null-Path.
   - `src/components/player/__tests__/PlayerRow.test.tsx:41-62` testet getContractInfo für 3/10/24/6 months — null-Path impliziert OK via calcContractMonths return 0.
   - `db-invariants.test.ts:INV-38` wird GRÜNER nach Rerun (statt 3 false-positives aus 144f).
   - Keine neuen Tests nötig (1-Zeile, Pattern-Invariant-Regression hinreichend abgedeckt).

## Learnings fuer Knowledge Capture

- **Potenzielles common-errors.md-Update:** "Scraper-Policy: `null` vs `keep-old` entscheidet über Data-Liar-Risk". Wenn Parser-null als "ignore, old value is better" interpretiert wird, akkumuliert die DB historische Werte die nie invalidiert werden. Policy sollte Default "always write, null = no data" sein, nur mit explicit conservative-flag überschreibbar.
- **Pattern-Kandidat memory/patterns.md:** "Iterative Data-Hygiene-Slice-Klasse (144c/d/e/f/g)" als Workflow-Pattern: jeder nachgelagerte Fix deckt einen Blindspot des vorherigen auf (144e reunited club_id, 144f verified mv, 144g verified contract_end).

## Time-spent
~14 min (Reviewer-Agent Cold-Context)
