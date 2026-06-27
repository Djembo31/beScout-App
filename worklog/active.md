# Active Slice

```
status: idle
slice: 409
title: Welle 1.4c — P2P-Offer Escrow-Robustheit: Refund-Symmetrie heilen (4 Stellen) — DONE
size: M (Money/CEO — accept_offer 3 Branches + expire_pending_offers; Doppelbelastung + balance-Leak)
stage: LOG (DONE)
spec: worklog/specs/409-offer-escrow-robustness.md
impact: skipped (2 RPCs, kein Service/UI-Shape-Change; Consumer §3 gegreppt)
proof: worklog/proofs/409-money-smoke.txt
proof-note: AC1-7 PASS; 4 force-rollback Zero-Sum diff=0 (Doppelbelastung+Leak gefixt), Guards/Fee/ACL erhalten
review: worklog/reviews/409-review.md — PASS (1 LOW Audit-Nuance §11, 1 INFO Reconciliation)
```

## OFFENER CEO-ENTSCHEID (Slice 409 §9)
Historische 249.800 cents (4 Wallets) aus den 6 alten abgelaufenen buy-Offers nie balance-refunded. CTO-Empfehlung: **stehen lassen** (Phase-1-Spielgeld D99 + Launch-Reset pending, 1 Wallet=jarvis-Test). RPC-Fix verhindert künftige Leaks. → Anil entscheidet refund-jetzt vs. Reset.

## Zuletzt
- **Slice 409** (2026-06-27) — P2P-Offer Escrow-Robustheit (Refund-Symmetrie, 4 Stellen), Reviewer PASS, 4× Zero-Sum diff=0, DONE.
- **Slice 408** (2026-06-27) — Trading-Vokabular Markt/Kaufgebot, DE+TR Live PASS, DONE.
- **Slice 407** (2026-06-27) — P2P-Offer-Fee auf 6% (=Markt, 3,5/1,5/1), Reviewer PASS, Zero-Sum diff=0, DONE.
- **Slice 406** (2026-06-27) — Club-Treasury Single-Source (Counter-Orphan raus + DROP), Reviewer PASS, 3× Zero-Sum diff=0, DONE.

## Inline-Notiz
Slice 409 DONE — Escrow-Lock/Unlock-Asymmetrie in P2P-Offers über 4 Stellen geheilt (accept_offer Fulfillment-Doppelbelastung + expired/insufficient-Branch-Leak + expire_pending_offers Leak). Fix = Refund spiegelt Lock (`balance += total, locked -= total`), Fulfillment konsumiert nur locked. 4× force-rollback Zero-Sum diff=0 (vorher je −100), Reviewer PASS. Pattern → trading.md Escrow + errors-db.md S409. **Welle 1.4 (Fee + Vokabular + Escrow) komplett bis auf 1.4d (Buy-Limit-Doc) + Mini-Slice IPO-Ledger-Label.** Offen: CEO-Entscheid 249.800 cents historischer Refund (s.o.).

**Geseedet PERMANENT (NICHT aufräumen, E2E-Beweis):** jarvis-Order Douglas @200 CR (96d3ce14, OPEN rem 1) + bot031-Order @300 CR (9405452f, filled). jarvis hält 4 Douglas. (406/407-Smokes force-rollback → keine neuen Artefakte.)

Nächstes (Welle 1.4-Härtung, D112): **1.4b** UI-Klarheit „Instant-Kauf vs Angebot machen" (CTO, nach Code-Check) · **1.4c** offers-Robustheit (Escrow/Expiry/counter) · **1.4d** Buy-Limit-gated-Doc · Mini-Slice IPO-Ledger-Label `trade_fee`→`ipo_fee` · dann 1.5/1.6. Kanon: `memory/session-handoff.md`.
