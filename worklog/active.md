# Active Slice

```
status: idle
slice: 411
title: Welle 1.4d — Buy-Limit-Doc: FEATURE_BUY_ORDERS gated + Fork-B + Live-Stand (stale Kommentar heilen) — DONE
size: XS (Doc/Ops — Kommentar-Edit featureFlags.ts, kein Money/Security-Verhalten; lean ceremony Slice 352)
stage: LOG (DONE)
spec: inline (unten)
impact: skipped (Comment-only, kein Behavior/Shape-Change)
proof: worklog/proofs/411-buy-orders-live-state.txt
proof-note: live 0 open buy-orders + SUM(locked)=0 global; stale „10 offen" geheilt, Fork-B verankert. WELLE 1.4 ABGESCHLOSSEN.
review: self-review (Ops/Doc, kein Money/Security)
```

## INLINE-SPEC Slice 411 (1.4d, Doc/Ops lean)
**Problem:** `featureFlags.ts:28` behauptet „10 Buy-Orders seit 26d offen, 0 Fills" — **stale**. Live (2026-06-27): 0 offene Buy-Orders, 41 historische alle `cancelled`+refunded, `SUM(wallets.locked_balance)=0` global. Fork-B-Entscheid (D112) ist im Flag-Kommentar nicht verankert.
**Lösung:** Kommentar zu `FEATURE_BUY_ORDERS` aktualisieren — Fork-B (orders+offers beide, Buy-SEITE des CLOB bleibt gated bis Matching-Engine) + live-verifizierter sauberer Stand. Comment-only, kein Code-Verhalten.
**AC:** (1) stale „10 offen" raus, durch live-Stand ersetzt. (2) D112/Fork-B referenziert. (3) tsc grün (Comment-Change). **PROVE:** Live-Query-Output (0 open / locked=0) als Proof-Datei. **Schließt Welle 1.4 ab.**

## 410 (vorige) — DONE
- Club-Treasury-Ledger Quellen-Labels (ipo_fee/p2p_fee), Reviewer PASS, geldneutral, Commit `98d6ecb6`.

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
