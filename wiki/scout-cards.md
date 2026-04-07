---
title: Scout Cards (DPC)
type: research
created: 2026-04-07
updated: 2026-04-07
tags: [trading, ipo, karten, floor-price, liquidation, core-feature]
sources: [trading.md, card-overhaul.md, card-visual-overhaul.md, types/index.ts]
---

# Scout Cards (Digital Player Contracts)

Kern-Asset der Plattform. User kaufen/verkaufen digitale Spielerkarten. Preis = Markt-basiert.

## Mechanik

- **IPO:** Club launcht Spieler-Karten. Fester Preis pro Tranche, max 4 Tranchen, min 500/Tranche, 30 Tage Cooldown
- **Floor Price:** MIN aller offenen Sell-Orders ODER IPO-Preis Fallback
- **Sell Orders:** 30 Tage Ablauf, dann expire_pending_orders via Cron
- **Fees:** 6% total (Platform 3.5% + PBT 1.5% + Club 1%)
- **Liquidation:** Owner-Only. Irreversibel. Verteilt Success Fees basierend auf Cap

## IPO Lifecycle

```
announced → early_access (Silber+ only) → open → ended | cancelled
```

## Success Fee (der grosse Anreiz)

Wenn ein Spieler transferiert wird:
- DPC-Holder bekommen anteilig basierend auf Marktwert-Tier
- Cap wird VOR erstem IPO gesetzt, aendert sich nie
- Beispiel: 100 $SCOUT Kauf bei 1M EUR → Transfer bei 15M EUR → 150x Return

## Karten-Design

**Front:** Foto, Flag, Jersey#, L5/L15 Score, L5/L15 Apps%, Goals+Assists+Matches, Floor Price (Gold Zone)

**Back:** Market Value, Floor Price, 24h Change, Success Fee Cap, Holdings, Supply, Contract Duration, Percentile Bars

## Branding

- UI: "Scout Card" / "SC"
- Code: weiterhin "dpc" (DB, TS, i18n Keys)
- Umbennung seit 2026-03-16 (vorher: "DPC")

## Siehe auch
- [[business-model]] — Fee-Split Details
- [[fantasy-tournaments]] — Scout Cards werden fuer Lineups gebraucht (min_sc_per_slot)
- [[equipment-system]] — Equipment wird an SC-Slots angelegt
