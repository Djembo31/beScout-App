# Slice 409 — P2P-Offer Escrow-Robustheit: Refund-Symmetrie heilen [Welle 1.4c]

**Slice-Type:** Migration (Money)
**Größe:** M
**CEO-Scope:** JA (Money — Wallet-Escrow). Welle 1.4c (D112 Fork-B-Härtung).

## 1. Problem-Statement (Evidence, empirisch bewiesen)
Escrow-Modell (Live-Probe): buy-offer `create_offer` verschiebt `total=price*qty` von `balance`→`locked_balance` (Gesamt-wealth = balance+locked). Korrektes Unlock = **`balance += total, locked -= total`** (so machen es `cancel_offer_rpc` + `reject_offer` RICHTIG). **4 Code-Stellen brechen das:**

| Stelle | Bug | Beweis |
|--------|-----|--------|
| `accept_offer` buy-**Fulfillment** | `balance -= total` UND `locked -= total` → Käufer zahlt **2× total** (balance schon beim create reduziert) | force-rollback Zero-Sum **diff=−100** |
| `expire_pending_offers` (Cron) | `locked -= price` (statt `price*qty`) + **kein** `balance +=` → Käufer verliert reserviertes Geld bei Ablauf | force-rollback Zero-Sum **diff=−100** |
| `accept_offer` **expired**-Branch | `locked -= total`, kein `balance +=` | gleiche Klasse |
| `accept_offer` **insufficient-qty**-Branch | `locked -= total`, kein `balance +=` | gleiche Klasse |

**Historischer Live-Schaden:** 6 abgelaufene buy-Offers (alle qty=1, 0× `offer_unlock`-Tx) → **249.800 cents über 4 Wallets** nie balance-refunded (`67c35b57` 87.000 · `46535ade` 100.000 · jarvis `535bbcaf` 38.000 · `ca37ebe6` 24.800). `locked`-Invariante (locked == Σ pending buy) aktuell **0 Drift** (qty=1 → locked korrekt reduziert; nur balance leakte).

## 2. Lösungs-Design
Eine Migration `20260627160000_slice_409_offer_escrow_robustness.sql` — beide RPCs CREATE OR REPLACE (Bodies aus Live/407-Stand, D87, nur Escrow-Mathe korrigiert):
- **`accept_offer`:**
  - buy-Fulfillment-Branch: `balance -= total` ENTFERNEN → nur `locked -= total` (Escrow konsumieren; balance blieb seit create reduziert). `v_buyer_new_balance` = unverändertes balance.
  - expired-Branch (buy): `balance += total` ergänzen (mirror cancel) + `offer_unlock`-Tx.
  - insufficient-qty-Branch (buy): `balance += total` ergänzen + `offer_unlock`-Tx.
- **`expire_pending_offers`:** SELECT um `quantity` ergänzen; je buy-Offer `balance += price*quantity, locked -= price*quantity` (mirror cancel) + `offer_unlock`-Tx; `v_funds_released += price*quantity`.
- **Historische Reconciliation:** SEPARATE Entscheidung (§9) — Phase-1-Spielgeld + Launch-Reset pending (`project_launch_sequence_reset`); NICHT auto-refunden ohne CEO-OK.

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `supabase/migrations/20260627160000_…sql` | `accept_offer` (3 Branch-Fixes) + `expire_pending_offers` (refund+quantity) |
Kein Service/UI-Edit (Shape unverändert; `v_buyer_new_balance` bleibt im Return).

## 4. Code-Reading-Liste (erledigt, Live D87)
1. `create_offer` buy: `balance -= total, locked += total` (Probe bestätigt dBal −200/dLock +200). ✓
2. `cancel_offer_rpc` + `reject_offer`: korrektes Unlock `balance += total, locked -= total` + `offer_unlock`-Tx = **Referenz-Pattern**. ✓
3. `accept_offer` (407-Stand): buy-Fulfillment `balance -= total, locked -= total` (Doppel); expired+insufficient-Branch `locked -= total` ohne balance. ✓
4. `expire_pending_offers`: `locked -= price` (kein qty), kein balance. ✓
5. Zero-Sum-Modell: Gesamt = Σ(balance+locked) + platform_net + club_ledger_net + Σpbt. ✓
6. Live-Drift-Check: locked-Invariante 0 Drift; balance-Leak 249.800 cents (6 expired). ✓

## 5. Pattern-References
- **S156 PATCH-AUDIT:** Bodies aus Live/407; nur Escrow-Zeilen ändern, Guards/Fee/Routing/Idempotency byte-identisch.
- **trading.md Escrow-Pattern:** „On insert failure: unlock" — Unlock = balance+locked-Reversal (cancel/reject sind die Referenz).
- **errors-db.md PL/pgSQL NULL-in-Scalar / Money-RPC:** GREATEST(0,…) Underflow-Schutz behalten.

## 6. Acceptance Criteria
- **AC-1 [HAPPY] buy-Fulfillment Zero-Sum:** create buy-offer → seller accept → Zero-Sum diff=0; Käufer-Kosten = exakt total (nicht 2×); locked −total, balance unverändert. FAIL-IF: diff≠0.
- **AC-2 [HAPPY] expire Zero-Sum:** create buy-offer → expire → diff=0; balance zurück, locked −total. FAIL-IF: diff≠0.
- **AC-3 [HAPPY] expire qty>1:** qty=3 buy-offer expire → balance += price*3 (nicht price*1). FAIL-IF: Teil-Release.
- **AC-4 [REGRESSION] sell-offer accept unverändert:** sell-offer fulfillment Zero-Sum diff=0 (buyer balance −total, kein locked-Pfad). FAIL-IF: diff≠0.
- **AC-5 [REGRESSION] cancel/reject unverändert** (waren korrekt) — force-rollback diff=0.
- **AC-6 [PATCH-AUDIT]:** accept_offer behält auth_uid_mismatch + book_platform_treasury('p2p') + Fee-Konstanten 350/150/100 + pbt-Insert + circular/limit-Guards. FAIL-IF: fehlt.
- **AC-7 [BUILD] tsc + vitest grün** (offers/accept Service-Tests).

## 7. Edge Cases
| Fall | Verhalten | AC |
|------|-----------|----|
| buy-offer qty>1 expire | balance += price*qty | AC-3 |
| locked underflow | GREATEST(0, locked-total) behalten | alle |
| sell-offer (kein lock) | accept/expire unberührt (kein balance+=) | AC-4 |
| expire batch (mehrere) | je Offer eigener Refund + offer_unlock-Tx, FOR UPDATE SKIP LOCKED behalten | AC-2 |
| receiver-gebundenes Offer | Auth-Logik unberührt | AC-6 |

## 8. Self-Verification
```sql
-- nach Apply: 4 Smokes (force-rollback) → je diff=0
-- accept_offer functiondef: buy-branch hat KEIN 'balance = balance - v_total_cost' mehr im buy-Zweig
-- expire_pending_offers functiondef: enthält 'balance = balance +' und 'quantity'
```

## 9. Open-Questions
- **CEO (Pflicht):** Historische 249.800 cents (4 Wallets) jetzt refunden ODER für Launch-Reset stehen lassen? **CTO-Empfehlung: stehen lassen** (Phase-1-Spielgeld D99, Launch-Reset wischt eh, 1 Wallet=jarvis-Test; Refund = Reset-Busywork). RPC-Fix verhindert künftige Leaks — das ist der Wert.
- **Autonom (CTO):** Migrations-Timestamp, offer_unlock-Tx-Parität in expire/Branches.

## 10. Proof-Plan
- `worklog/proofs/409-money-smoke.txt` — 4 force-rollback Smokes (buy-fulfillment diff=0, expire diff=0, expire-qty3, sell-regression diff=0) + functiondef-Checks + Vorher/Nachher (die −100-Beweise von vor dem Fix dokumentiert).

## 11. Scope-Out
- Historische Reconciliation (CEO-Entscheid §9). · Transaction-Ledger-Nuance (buy-fulfillment hat offer_lock −total + offer_buy −total = −2total im Log bei −total real-Wallet; balance ist SSOT, Log ist Audit; offer_unlock-Tx in expire/Branches gleicht es für die Refund-Pfade aus) — Fulfillment-Ledger-Glättung optional Folge-Slice. · Portfolio-Offers-Tab-Wording (1.4b Scope-Out).

## 12. Stage-Chain
SPEC ✅ → IMPACT skipped (2 RPCs, kein Service/UI-Shape-Change; Consumer §3) → BUILD (1 Migration) → REVIEW reviewer-Agent (Money-Pflicht) → PROVE (4 force-rollback Zero-Sum + functiondef) → LOG.

## 13. Pre-Mortem (M, Money)
1. **buy-fulfillment-Fix bricht sell-Pfad** → getrennte IF/ELSE, nur buy-Zweig ändern; AC-4 Regression.
2. **expire-Fix vergisst quantity** → AC-3 qty>1.
3. **Guard/Fee silent-revert** (accept_offer full rewrite) → AC-6 + Reviewer PATCH-AUDIT.
4. **v_buyer_new_balance falsch** (RETURNING nach locked-only-Update) → liest balance (unverändert) korrekt; Transaktion balance_after stimmt.
5. **offer_unlock-Tx fehlt → Audit-Drift** → in expire + beide Branches ergänzen (Parität zu cancel/reject).
