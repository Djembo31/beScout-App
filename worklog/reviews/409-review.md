# Review — Slice 409 (P2P-Offer Escrow-Robustheit)

**Reviewer:** Cold-Context reviewer-Agent · 2026-06-27 · time-spent ~9 min
**Verdict: PASS**

## Findings
| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | LOW (Audit-Nuance) | accept_offer buy-Fulfillment offer_execute-Tx | `amount=-total` aber `balance_after`=unveränderte balance (Zahlung kam aus locked) → Ledger-Zeile buchhalterisch leicht irreführend. balance=SSOT, Zero-Sum hält, KEIN Money-Leak. | Akzeptiert (Spec §11 Scope-Out; saubere Ledger-Glättung = optionaler Folge-Slice) |
| 2 | INFO | Historische 249.800 cents (4 Wallets) | Reconciliation bewusst Scope-Out (§9), CEO-Entscheid offen. | Korrekt offen; RPC-Fix stoppt künftige Leaks |

## One-Line
Senior merged das: chirurgischer Escrow-Fix, line-by-line byte-identisch zum 407-Stand außer den 4 belegten Stellen, Zero-Sum live über alle 4 Pfade bewiesen, Guards/Fees/Routing/Idempotenz unangetastet.

## Belege (Kurz)
1. **PATCH-AUDIT vs 407-Baseline:** Guards (auth/liquidation/club-admin/advisory-lock/24h/circular), Fee 350/150/100, book_platform_treasury('p2p'), pbt-Insert, floor-recompute, RETURN-Shape — alle byte-identisch. Nur die 4 Escrow-Stellen geändert. Kein Silent-Revert (406-Counter-Removal + 358-Treasury + 407-Fee erhalten).
2. **Escrow buy-Fulfillment:** Käufer genau 1× belastet (create balance−total + Fulfillment locked-Konsum), Verkäufer +seller_net, Zero-Sum hält (AC-1 diff=0, −100 statt −200).
3. **sell-Pfad** unverändert (else-Branch, balance−total, kein locked) — AC-4 diff=0.
4. **expire** refundet price*quantity (AC-3 qty3 Round-Trip), FOR UPDATE SKIP LOCKED erhalten, offer_unlock-Tx liest neue balance.
5. **GREATEST(0,…)** Underflow-Schutz in allen 4 Stellen. ACL kein anon (expire = service_role/cron).
6. **offer_unlock** kein neuer transactions.type (cancel/reject nutzen ihn schon) → kein CHECK-Drift.

## Knowledge (Reviewer-Vorschlag, umgesetzt)
Escrow-Refund-Symmetrie-Regel → `trading.md` Escrow-Pattern + `errors-db.md` (S409): „Unlock = balance += total UND locked -= total (mirror cancel/reject); Fulfillment konsumiert NUR locked".
