# Active Slice

```
status: idle
slice: 410
title: Club-Treasury-Ledger korrekte Quellen-Labels (ipo_fee / p2p_fee statt pauschal trade_fee) — DONE
size: S (Money/CEO — SECURITY DEFINER Trigger trg_trades_book_club_treasury, geldneutral Re-Label)
stage: LOG (DONE)
spec: worklog/specs/410-club-ledger-source-labels.md
impact: inline (Spec §4 — kein Service/UI/Type/i18n-Change; get_club_balance-Bucket+UI+i18n vorab vorhanden)
proof: worklog/proofs/410-ledger-labels-smoke.txt
proof-note: AC1-6 PASS; force-rollback ipo_fee/trade_fee/p2p_fee korrekt + Zero-Sum net_delta=300, ACL unverändert
review: worklog/reviews/410-review.md — PASS (2 NIT: toter buy_order_id-Forward-Compat-Zweig, hardcoded DE-desc §11)
```

## CEO-ENTSCHEID RESOLVED (2026-06-27, Anil)
- **249.800 cents (4 Wallets) historischer buy-Offer-Refund → STEHEN LASSEN.** Phase-1-Spielgeld (D99) + Launch-Reset wischt eh; RPC-Fix (409) stoppt künftige Leaks. Kein Refund-Slice.
- **Welle 1 sauber abschließen** gewählt → 410 (IPO/P2P-Ledger-Label) + danach 1.4d Buy-Limit-Doc.

## Zuletzt
- **Slice 410** (2026-06-27) — Club-Ledger Quellen-Labels: IPO-Anteil→`ipo_fee`, P2P→`p2p_fee` statt pauschal `trade_fee` (Trigger-Discriminator). Reviewer PASS, geldneutral (force-rollback Zero-Sum + ACL erhalten), DONE.
- **Slice 409** (2026-06-27) — P2P-Offer Escrow-Robustheit (Refund-Symmetrie, 4 Stellen), Reviewer PASS, 4× Zero-Sum diff=0, DONE.
- **Slice 408** (2026-06-27) — Trading-Vokabular Markt/Kaufgebot, DE+TR Live PASS, DONE.
- **Slice 407** (2026-06-27) — P2P-Offer-Fee auf 6% (=Markt, 3,5/1,5/1), Reviewer PASS, Zero-Sum diff=0, DONE.
- **Slice 406** (2026-06-27) — Club-Treasury Single-Source (Counter-Orphan raus + DROP), Reviewer PASS, 3× Zero-Sum diff=0, DONE.

## Inline-Notiz
Slice 409 DONE — Escrow-Lock/Unlock-Asymmetrie in P2P-Offers über 4 Stellen geheilt (accept_offer Fulfillment-Doppelbelastung + expired/insufficient-Branch-Leak + expire_pending_offers Leak). Fix = Refund spiegelt Lock (`balance += total, locked -= total`), Fulfillment konsumiert nur locked. 4× force-rollback Zero-Sum diff=0 (vorher je −100), Reviewer PASS. Pattern → trading.md Escrow + errors-db.md S409. **Welle 1.4 (Fee + Vokabular + Escrow) komplett bis auf 1.4d (Buy-Limit-Doc) + Mini-Slice IPO-Ledger-Label.** Offen: CEO-Entscheid 249.800 cents historischer Refund (s.o.).

**Geseedet PERMANENT (NICHT aufräumen, E2E-Beweis):** jarvis-Order Douglas @200 CR (96d3ce14, OPEN rem 1) + bot031-Order @300 CR (9405452f, filled). jarvis hält 4 Douglas. (406/407-Smokes force-rollback → keine neuen Artefakte.)

Nächstes (Welle 1.4-Härtung, D112): **1.4b** UI-Klarheit „Instant-Kauf vs Angebot machen" (CTO, nach Code-Check) · **1.4c** offers-Robustheit (Escrow/Expiry/counter) · **1.4d** Buy-Limit-gated-Doc · Mini-Slice IPO-Ledger-Label `trade_fee`→`ipo_fee` · dann 1.5/1.6. Kanon: `memory/session-handoff.md`.
