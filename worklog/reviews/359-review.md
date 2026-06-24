# Review — Slice 359 (offer_buy CHECK-Fix)

**Reviewer-Agent (Cold-Context), 2026-06-24 · time-spent: 9 min**

## Verdict: CONCERNS → adressiert (PASS-Äquivalent nach Fix)

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | MEDIUM | `db-invariants.test.ts:646-658` | expected-Array hatte 35 Werte (mit offer_buy), Live-CHECK 37 — `pbt_liquidation` + `success_fee` (Slice-330-Drift) fehlten im Snapshot. AC4-„synchron"-Behauptung war damit nicht ganz wahr. | ✅ **GEFIXT** — beide Werte ergänzt, Array jetzt 37 = Live. Proof AC4 korrigiert. |
| 2 | LOW | `359-smoke.txt` AC4 | Proof-Text überoptimistisch („synchron") trotz Finding #1. | ✅ **GEFIXT** — Text auf „37==37, vollständig synchron" präzisiert. |

## One-Line
Der Money-Fix (CHECK + accept_offer side='sell') ist sauber, additiv, korrekt bewiesen; das angefasste INV-18-Array war nur halb synchron (330-Drift) — nach 1-Zeilen-Nachzug vollständig.

## Belege (Reviewer)
- **CHECK-Superset:** Migration-ARRAY 37 Werte, alle alten erhalten + offer_buy. DROP+ADD validiert als Superset → kein bestehender Row invalidierbar. ✅
- **Smoke valide:** side='sell' Force-Rollback gegen das exakte 358-Failure-Szenario: `rpc_success=true`, `buyer_txn_type=offer_buy`, `zero_sum_ok`, `p2p_booking_ok`. Beweist Bug-Tod + 358-Integration auf dem Pfad. ✅
- **5. Sync-Punkt:** Reviewer fand, dass das INV-18-expected-Snapshot der 5. (excluded, CI-unsichtbare) Sync-Punkt der S330-CHECK-Achse ist — Slice 330 hinterließ dort 2 nicht-getrackte Werte. In 359 mit-reconciled. → Knowledge: errors-db.md S330 um 5. Sync-Punkt erweitert.

## Positive
Saubere S330-Einordnung mit Live-Evidence (`offer_buy`-Count=0), Force-Rollback-Smoke gegen exaktes Failure-Szenario, Money-Sorgfalt trotz „kein Fee-Change", 0 Frontend/i18n-Änderung (Typ war schon bekannt).

## Resultat
Mergefähig nach Finding-#1-Fix (erledigt). Keine offenen Blocker.
