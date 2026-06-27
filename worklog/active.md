# Active Slice

```
status: idle
slice: 418
title: Welle-1-Cleanup — 2 Funde aus 417 gefixt (kaputter useOffersState-Test + Orphan useOpenBids-Hook) — DONE
size: S (Ops/Cleanup: Test-Mock + Dead-Code-Removal; kein Money/Security/User-facing-Verhalten)
stage: LOG (DONE)
spec: inline (Ops-Lane, Slice 352)
impact: inline (Consumer gegrept: beide Funde lokal, kein externer Reader)
proof: worklog/proofs/418-cleanup-tests.txt (full vitest 233/233 Files, 3301 grün, 0 fail)
review: self-review (Ops, kein Money/Security) — full vitest green = Regressions-Beweis
```

## Inline-Spec (Ops-Lane)
**Fund #1 — kaputter Test `useOffersState.test.ts` (25 Fehler, CI seit S412 rot):** S412 führte `useTranslations('offers')` in `useOffersState` ein (Toast-Übersetzung), ohne den next-intl-Mock im Test zu ergänzen → `useTranslations`-Context-Throw. setup.ts mockt next-intl NICHT global; Schwester-Test `useTradeActions.test.ts:64` zeigt das Muster. **Fix:** `vi.mock('next-intl', () => ({ useTranslations: () => (key) => key }))` ergänzen (Identity = was die Assertions `t('offerAccepted')→'offerAccepted'` erwarten).

**Fund #2 — Orphan `useOpenBids()` (no-arg):** `features/market/queries/offers.ts:20`, 0 Consumer (grep-verifiziert). Liest `qk.offers.openBids`, der NUR vom toten Primer `marketDashboard.ts:74` geschrieben wird. `BestandView` liest `open_bids` aus dem Dashboard-Query-Result (nicht aus dem Cache) → Primer-Entfernung verhaltensneutral. **Fix (vollständiger Cleanup, kein Orphan-Verschieben):** (a) `useOpenBids()` raus, (b) Primer-Zeile 74 + JSDoc-Note raus, (c) Key `qk.offers.openBids` (keys.ts:166) raus. Player-Detail-`useOpenBids(playerId)` (misc.ts) bleibt — anderer Hook.

## AC
1. `useOffersState.test.ts` 25/25 grün. 2. Orphan-Hook + Primer + Key entfernt, tsc 0. 3. FULL vitest grün (CI-Beweis). 4. keine offene `qk.offers.openBids`/`useOpenBids()`-Referenz mehr.

## Zuletzt
- **Slice 417** (2026-06-27) — Offers Eigen-Gebot-Leak server-SSOT, live-verified (S, PASS).

Nächstes: Welle 2 Spieltag/Scoring [Money].
