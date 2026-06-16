---
name: Journey 2 — Frontend Audit
description: UI/UX Audit des IPO-Kauf-Flows fuer Operation Beta Ready Phase 2.
type: project
status: audit-complete
created: 2026-04-14
agent: frontend
---

# Journey #2 — Frontend Audit (IPO-Kauf)

## Summary
**19 Findings: 3 CRITICAL + 5 HIGH + 5 MEDIUM + 6 LOW.** 6 Beta-Gates: J2F-01, -02, -03, -04, -05, -08.

## CRITICAL

### J2F-01 i18n-Key-Leak in Buy-Error
- `src/features/market/components/MarketContent.tsx:137` `<span>{trade.buyError}</span>`
- via `useTradeActions.ts:38` `buyError = buyMutError?.message` → `mutations/trading.ts:16,33` → `services/ipo.ts:90-109` throw 'invalidQuantity'/'maxQuantityExceeded'/'playerLiquidated'/'clubAdminRestricted' + `trading.ts:12-32` mapRpcError → 'insufficientBalance'/'orderNotFound'/'cannotBuyOwn'/'noMatchingOrders'/'permissionDenied'/'generic'
- User sieht literal "insufficientBalance"
- **Fix:** `const tErr = useTranslations('errors'); buyError = tErr(rawKey, {}, { fallback: tc('unknownError') })`

### J2F-02 Multi-League Liga-Logo fehlt: PlayerIPOCard Header
- `src/features/market/components/marktplatz/PlayerIPOCard.tsx:59-105`
- `Player` Type hat `leagueLogoUrl`/`leagueShort`, wird ignoriert
- **Fix:** `<LeagueBadge logoUrl={player.leagueLogoUrl} short={player.leagueShort} size="xs" />` neben PositionBadge

### J2F-03 Multi-League Liga-Logo fehlt: EndingSoonStrip
- `src/features/market/components/marktplatz/EndingSoonStrip.tsx:60-66`
- Club-Name nur als Text — "FC Bayern" vs "Bayern Alzenau" ununterscheidbar
- **Fix:** LeagueBadge size=12px

## HIGH

### J2F-04 BuyConfirmModal schliessbar waehrend Pending
- `BuyConfirmModal.tsx:91` + `MarketContent.tsx:225` kein `preventClose` Prop
- Backdrop/ESC waehrend 200-500ms RPC-Latenz → Mutation laeuft kontextlos weiter
- **Fix:** `<Modal ... preventClose={isPending}>`

### J2F-05 TradeSuccessCard kein CTA → Bestand
- `TradeSuccessCard.tsx:166-172` nur "Zum Spieler →"
- Journey-Ziel "→ Bestand sichtbar" wird nicht vollendet
- **Fix:** Zweiter Button "Zum Bestand" → `setTab('portfolio')`. Neue Keys DE+TR.

### J2F-06 EndingSoonStrip dead `onBuy`/`buyingId` Props — kein Direct-Buy
- `EndingSoonStrip.tsx:14-19` deklariert, `:60-94` ignoriert
- User braucht 3 Extra-Klicks fuer Urgency-Kauf
- **Fix:** Icon-Buy-Button neben Preis → `onBuy(p.id)`

### J2F-07 ipoEarlyAccess Lock-Badge ohne Error-Mapping
- `PlayerIPOCard.tsx:159-164` + `trading.ts:12` mapRpcError
- Free-Tier klickt Buy → falls RPC blockt → faellt auf 'generic' → kein Upgrade-Path
- **Fix:** mapRpcError ergaenzen `if (lower.includes('early access')) return 'earlyAccessRequired'` + Upgrade-CTA-Key

### J2F-08 TradingDisclaimer fehlt im BuyConfirmModal
- `BuyConfirmModal.tsx` — Disclaimer nur am Tab-Footer (MarktplatzTab.tsx:205)
- Kauf-Entscheidungs-Moment ohne Compliance-Hinweis (MiCA/CASP-Gate)
- **Fix:** `<TradingDisclaimer variant="inline" />` vor Z236

## MEDIUM

- **J2F-09** BuyConfirmModal Inhalts-Dichte auf iPhone-SE 375x667 (Guthaben-Warnung unter Fold)
- **J2F-10** Kein Parallel-Mutation-Guard in `executeBuy` (useTradeActions.ts:75-86)
- **J2F-11** Error-Toast ohne Retry-Action
- **J2F-12** IPO-Progress-Bar 3x divergent implementiert (shared Component post-Beta)
- **J2F-13** CountdownBadge Re-Render jede Sekunde — Mobile Battery

## LOW

- **J2F-14** IPO Fee-Breakdown fehlt (BuyConfirmModal:206-212 nur Market-Branch)
- **J2F-15** ClubCard-Name-Truncate auf 393px 2-col (~10 Chars schneidet)
- **J2F-16** "Nur Ansicht" Fallback ohne Status-Kontext (Geplant vs Beendet)
- **J2F-17** "CR"-Kuerzel hartkodiert in MarketHeader + BuyConfirmModal
- **J2F-18** Kein CTA zu "Geplant"-Tab bei leerem "Laufend"
- **J2F-19** TradeSuccessCard "SC"-Kuerzel hartkodiert

## Multi-League Liga-Logo Gap Map

| Component | Gap |
|-----------|-----|
| PlayerIPOCard Header | JA (J2F-02) |
| EndingSoonStrip | JA (J2F-03) |
| ClubCard | OK (Text vorhanden) |
| ClubAccordion | via PlayerIPOCard (J2F-02) |
| BuyConfirmModal PlayerIdentity | Offen — Reviewer-Task |
| TradeSuccessCard | Minor |
| BestandPlayerRow | OK |

## LEARNINGS

- `mapRpcError` returnt Raw-i18n-Keys — Caller muessen `t()` aufrufen, tut aktuell keiner. Audit: `grep -rn 'setError(err.message)\|<span>{.*Error}' src/`
- Dead `onBuy`/`buyingId` Props nach Feature-Pivots — Reviewer: "Werden alle deklarierten Props genutzt?"
- E2E-Rule: Letzten Screen einer Journey gegen SSOT-Ziel pruefen
- SSOT Multi-League-Progress-Map braucht Component-Granularitaet pro Journey
