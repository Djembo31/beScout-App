# Active Slice

```
status: in-progress
slice: 414
title: Welle 1.6 — OrderDepthView eigene Orders aus Best-Ask/Spread/Depth excludieren
size: S (Frontend — kein Money/RPC; is_own-Filter, schließt Welle 1.5/1.6)
stage: BUILD
spec: inline (unten)
impact: skipped (Display-only; nutzt vorhandenes PublicOrder.is_own, kein Service/Type-Change)
proof: Live-Walk-Verify (jarvis hält eigene Douglas-Order @200) + tsc
review: self-review (Frontend, kein Money)
```

## INLINE-SPEC Slice 414 (Welle 1.6, letzter 1.5/1.6-Punkt)
**Problem:** `OrderDepthView` aggregiert ALLE Sell/Buy-Orders inkl. der **eigenen** des Betrachters → Best-Ask/Spread (Z.180-189) + hervorgehobene günstigste Zeile zeigen evtl. die eigene Order, die man gar nicht kaufen kann. Inkonsistent mit `buy_player_sc`/`buy_from_order` (matchen nur `user_id != p_user_id`) + trading.md S7-303 F-1.
**Lösung:** in `askLevels`+`bidLevels`-useMemos `if (o.is_own) continue;` — `PublicOrder.is_own` ist server-seitig projiziert (get_public_orderbook, kein userId/Service-Change). Best-Ask/Spread/Highlight folgen automatisch. Eigene Orders bleiben im „Meine Orders"-Bereich sichtbar (anderswo).
**AC:** (1) eigene Orders nicht in askLevels/bidLevels. (2) tsc 0. (3) Live: jarvis sieht bei Douglas (eigene @200-Order) NICHT seine Order als Best-Ask. **PROVE = im Live-Walk mitverifiziert.**

## 413 (vorige) — DONE (Welle 1.5 komplett)
**Anil-Entscheid 2026-06-27:** 1.5d = ABLEHNEN (beide). 1.5a=tier-basiert · 1.5c=created_at DESC · 1.5e=beide setzen price_change_24h. fee_config-Count=1 (global) → 1.5c geldneutral.

## 412 (vorige) — DONE

## INLINE-SPEC Slice 412 (Welle 1.5b + 1.5f)
**Problem (live-verifiziert, kein Raten):**
- `addToast` übersetzt NICHT (rendert `message` roh, ToastProvider:81). Im selten genutzten P2P-Offers-Tab leaken dadurch:
  - `useOffersState.ts` 5× `addToast('<bloßer Key>',…)` (offerAccepted/offerRejected/counterCreated/offerCancelled/invalidPrice) → **Roh-Key-Leak** in UI bei jedem erfolgreichen Offer.
  - `OffersTab.tsx:249` (`result.error` roh) + `:252` (`e.message` roh) → **Roh-RPC-Error-Leak** (BSD-Wort + Deutsch im TR-Locale, §4-Verstoß).
  - (`useOffersState` showError-Pfade sind sauber — mappen via mapErrorToKey.)
- `idempotency_pending` (RPC-Reject bei Rapid-Doppelklick) fehlt in errorMessages → fällt auf 'generic' statt freundlicher „wird verarbeitet"-Meldung (1.5f).
**Lösung:** useOffersState `useTranslations('offers')` + 5 Keys übersetzen · OffersTab `useErrorToast().showError` statt roher addToast (2 Stellen) · errorMessages ERROR_MAP+KNOWN_KEYS `idempotencyPending` + i18n DE/TR.
**AC:** (1) kein bloßer-Key/roher e.message-addToast mehr im Offers-Tab (grep). (2) idempotency_pending → mapErrorToKey ≠ 'generic'. (3) tsc grün + JSON-Gate de/tr. (4) Money-RPC/Logic unberührt.

## 411 (vorige) — DONE (Welle 1.4 komplett)

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
