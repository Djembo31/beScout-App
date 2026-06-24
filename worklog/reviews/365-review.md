# Review — Slice 365 Bounty-Fee REIN (E3-2e)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-24 · **Verdict:** **PASS** · time-spent: 6 min

## Verdict: PASS — mergebereit

E3 „Fees REIN" damit 5/5 komplett (358 Trading / 360 IPO / 363 Polls / 364 Research / 365 Bounty).

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | migration:111 (GRANT) | GRANT nur `TO authenticated`; 332-Vorversion grantete zusätzlich `postgres, service_role`. Funktional irrelevant (postgres=Owner, service_role behält EXECUTE als BYPASSRLS-Superuser; AR-44 verlangt nur anon-Block + authenticated-Grant). Spiegelt exakt das 364-Muster. RPC wird nur client-getrieben gerufen → unkritisch. | Optional `, postgres, service_role` für 1:1-Parität mit 332 — **nicht erforderlich, NICHT umgesetzt** (Konsistenz mit 360/363/364-Reihe gewählt). |

Keine CRITICAL/REWORK/FAIL.

## AC-Coverage (9/9 ✅)
AC-1 Booking+pot_delta=50 · AC-2 Zero-Sum (1000=950+50) · AC-3 1 Ledger-Row ref_id=bounty_id · AC-4 `IF v_platform_fee>0` · AC-5 Konstante `(v_reward*500)/10000` intakt · AC-6 'bounty' im CHECK · AC-7 alle 3 Pfade + Header ohne search_path · AC-8 AR-44 anon=false · AC-9 tsc EXIT 0, INV-18 unberührt.

## Geprüfte Risiken
1. **Konstanten-Drift (S356):** sauber, 5 % unverändert, nur 1 Block neu (byte-identisch zu 332 außer Booking-Block).
2. **Doppelbuchung über Escrow-Trigger:** ausgeschlossen — `trg_bounties_settle` bei 'completed' flippt nur Flag, bewegt kein Geld. Einzige Buchung im RPC, `v_platform_fee` global berechnet → deckt user/club-escrow/club-nonescrow.
3. **AR-44:** REVOKE FROM PUBLIC,anon + GRANT TO authenticated vorhanden, anon_can=false verifiziert.
4. **Booking-Stelle:** VOR success-RETURN, NACH Payout + allen Reject-Pfaden.
5. **Header-Drift:** kein search_path ergänzt (Original erhalten).
6. **Zero-Sum/Integer-Leak:** `v_creator_net = v_reward - v_platform_fee` exakt, kein Leak.

## Positive
- Live-Body als Baseline (D87) → S156-FAIL-Klasse mustergültig vermieden (1:1 gegen 332 gegengeprüft).
- Force-Rollback-Smoke mit Zero-Sum-Assert + no_search_path_drift-Check.
- 364-Lehre übernommen: Topf-Saldo aus Ledger-SUM (nicht get_platform_balance mit Admin-Guard).
