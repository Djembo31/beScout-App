# Review — Slice 364 (Research-Fee REIN in Plattform-Topf, E3-2d)

**verdict: PASS**
**Reviewer:** reviewer-Agent (Cold-Context) · time-spent: 6 min · 2026-06-24

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NITPICK | migration:33 | Locked-balance-Guard liest `wallets` 2× via Scalar-Subquery statt die `FOR UPDATE`-Row mitzunehmen. **Pre-existing im Live-Body** (nicht von 364 eingeführt, identisch in 363). Kein Money-Bug (gleiche Row/Txn). | Keine Aktion in 364 (Scope-Out korrekt). Bei künftigem Touch `locked_balance` ins initiale `SELECT … INTO v_buyer_balance` ziehen. |

## One-Line
Ja — ein Senior merged das: exakter Live-Body-Rewrite mit genau einem additiven Booking-Block, Fee-Konstante verbatim, Einfügestelle + AR-44 korrekt, Money-Smoke beweist Zero-Sum + 1 Ledger-Row + korrektes Δ.

## AC-Coverage (alle grün)
AC-1 Topf-Δ=platform_fee (200) · AC-2 Zero-Sum (t) · AC-3 1 Ledger-Row (ref=research_id) · AC-4 price=0-Guard · AC-5 Fee-Konstante `(v_price*80)/100` verbatim (S356) · AC-6 `'research'` im CHECK · AC-7 alle 4 Vor-Guards intakt · AC-8 AR-44 anon=false · AC-9 tsc EXIT 0 / INV-18 unberührt.

## Positive
- D87 sauber: Live-`pg_get_functiondef` als Baseline (nicht stale Migrationsdatei) — genau der S356-Lehrsatz.
- Konstanten-Audit (nicht nur ILIKE-Präsenz) im Smoke: `fee_constant_intact` fängt Wert-Drift.
- Single-Path-Muster bewusst gewählt (wie IPO 360), keine unnötige Branching-Komplexität.

## Learnings
Keine neue Fehler-Klasse — saubere Wiederholung eines in errors-db.md (S356/S330) kodifizierten Musters. Empfehlung: Slice 365 (Bounty) trägt denselben `fee_constant_intact`-AC.
