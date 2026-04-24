# Slice 181e2 — Self-Review

**Datum:** 2026-04-24
**Reviewer:** Primary-Claude (Self-Review per D35 — mechanical-pattern-slice, jetzt 42 Vorgänger-Sites)
**Verdict:** PASS

## Scope

Modal→Dialog Migration Batch 4b (Player-Detail Trading, 4 Files, 4 JSX-Sites).

## Check-List

### ✓ Pattern-Korrektheit
- Import-Rename (`Modal` → `Dialog`) in 4 Files
- JSX-Rename (Opening + Closing Tags) in 4 Sites
- Props 1:1 beibehalten (`open`, `onClose`, `title`, `subtitle`, `preventClose`, `footer`)
- Keine API-Drift, keine Semantik-Änderung

### ✓ Test-Cascade (3 Test-Files updated)
- SellModalCore.test.tsx: direkt-Test → Mock `Modal:` → `Dialog:`
- SellModal.test.tsx: mockt `@/components/ui` (SellModal ist Thin-Wrapper, aber der UI-Mock ist eigen) → Mock `Modal:` → `Dialog:`
- OfferModal.test.tsx: direkt-Test → Mock `Modal:` → `Dialog:`
- LimitOrderModal: kein dediziertes Test-File (nur transitiv über PlayerContent.test.tsx, das aber LimitOrderModal als ganze Component mockt — nicht durch `Modal:`-Mock)
- 160/160 Tests in components/trading + components/player/detail grün

### ✓ Money-Path-Integrität (kritischster Punkt)
- **BuyModal.tsx**: `preventClose={buying || ipoBuying}` — Mid-RPC-Guard für `buy_player_sc` + `buy_from_pool`, via `useSafeIdempotentMutation` (Slice 178d) → Idempotency-Key läuft durch Modal-Close unabhängig
- **SellModalCore.tsx**: `preventClose={busy}` — Mid-RPC-Guard für `sell_player_sc` + `place_sell_order` + `accept_offer` (busy = OR der 4 flags: selling, placing, cancelling, acceptingBid)
- **OfferModal.tsx**: `preventClose={offerLoading}` — Mid-RPC-Guard für `create_offer` Escrow-Lock
- **LimitOrderModal.tsx**: `preventClose={false}` — bewusst, Feature ist Placeholder (TODO-Kommentar bleibt, bei Live-Mutation MUSS umgestellt werden analog BuyModal)

Wrapper bietet triple-Defense (onOpenChange gated + onPointerDownOutside preventDefault + onEscapeKeyDown preventDefault) — identisch zu altem Modal.

### ✓ Visual-Regression-Risiko
- 42 Vorgänger-Sites (181/b/c/d/e1) ohne Regression
- Radix rendert strukturgleich; Animationen via `@layer utilities` aktiv
- BuyModal Props include `footer`-prop — Wrapper handled sticky-footer identisch

### ✓ Build-Gates
- tsc --noEmit clean
- vitest: 160/160 Tests grün
- pnpm run size: /market 375kB (Budget 385kB), /player/[id] 407kB (Budget 415kB) — both under

## Findings

Keine. Pattern trivial, Test-Mock-Expansion korrekt, Money-Path preventClose erhalten.

## Post-Deploy Actions (Pflicht nach Push)

Per Spec AC-6+7:

1. **Buy-Flow gegen bescout.net**: Login `jarvis-qa@bescout.net` → Marktplatz → Spieler → Buy → Confirm-Modal öffnet + preventClose während `buy_player_sc` RPC
2. **Sell-Flow**: Spieler mit Holdings → Sell → preventClose während `sell_player_sc`
3. **Place-Order**: SellModalCore → Limit-Tab → place_sell_order → preventClose
4. **Network-Throttle Test (kritisch)**: Chrome DevTools Slow-3G → Confirm-Click → ESC während RPC-Flight → Modal bleibt offen
5. **Counter-Offer**: OffersTab → Inkomming → Counter → Dialog öffnet + schließt via X-Button

Kein Agent-Dispatch für Post-Deploy-Smoke (Money-Path = selbst).

## Decision-Trail

Per D35 qualifiziert (jetzt 42 Vorgänger-Sites). Money-Path-Kontext: Self-Review ok, **kein RPC/DB-Change**, preventClose-Pattern vollständig im Wrapper erhalten.
