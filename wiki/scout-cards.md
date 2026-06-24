---
title: Scout Cards (DPC)
type: research
created: 2026-04-07
updated: 2026-04-21
tags: [trading, ipo, karten, floor-price, liquidation, core-feature, pricing-asset-model]
sources: [trading.md, memory/decision_pricing_asset_model.md, worklog/log.md slices 108/111/114/122/123]
---

# Scout Cards (Digital Player Contracts)

Kern-Asset der Plattform. Der Club verkauft **Anteile am Spieler** als digitale Karten. Fans kaufen Cards; bei Marktwert-Wachstum wird der Wert proportional geteilt (Community Success Fee).

## Pricing-Asset-Model (MONEY-KRITISCH, Slice 108)

### Einheit
```
1 Credit = 0,01 € (ICO-Peg, Phase 2 — in Pilot/Beta wertloses Spielgeld)
1 BIGINT-cent (DB-Feld, Speicher) = 1/100 Credit = 1/10.000 € (ICO-Peg)
```
> Speicher = BIGINT „cents" (1 Credit = 100 Speicher-cents). Der €-Bezug gilt erst beim ICO (Phase 2).

### Card-Preis (Formel, fix pro Tranche)
```
ipo_price (Speicher-cents) = MV_EUR / 10
ipo_price (Credits)        = MV_EUR / 1.000
ipo_price (€, ICO-Peg)     = MV_EUR / 100.000
```

**Bekir-Baseline (Sivasspor-DB, verifiziert):**
- Marktwert 1.000.000 € → ipo_price **100.000 Speicher-cents = 1.000 Credits = 10 € pro Card (ICO-Peg)**
- Marktwert 4.000.000 € (Livan Burcu) → 400.000 Speicher-cents = 4.000 Credits = 40 € pro Card (ICO-Peg)

### Community-Anteil (10% Cap)
- **Max 10.000 Cards pro Spieler** = 10% des MV tokenisierbar
- Verein kann weniger ausgeben → entsprechend kleinerer Community-Anteil
- Card-Preis bleibt **fix**, unabhängig von ausgegebener Menge
- 90% des Spielers bleibt beim Verein (nicht-tokenisiert)

### Beispiel: 1 Mio € → 5 Mio € Liquidation (800 Cards verkauft) — €-Werte = ICO-Peg (Phase 2)
| Partei | IPO-In | Liqui-Out | Netto |
|--------|--------|-----------|-------|
| Club | +6.800 € (85% von 8k) | +Rest aus Transfer | Großteil behält |
| 800 Holder gemeinsam | −8.000 € | +40.000 € (Linear Payout) | +32.000 € (5× ROI) |
| Platform | +800 € | — | +800 € |
| PBT | +400 € | teils finanziert Payout | ≤+400 € |

## IPO Lifecycle

```
announced → early_access (Silber+ only) → open → ended | cancelled
```

- **Fester Preis pro Tranche**, max 4 Tranchen pro Spieler, min 500 Cards/Tranche, 30 Tage Cooldown
- **Early Access**: Silber+ Abo (server-seitig in RPC)
- `success_fee_cap_cents` einmalig VOR First IPO gesetzt, danach immutable

## Floor Price Hierarchy (RPC `recalc_floor_price`)

```
MIN(offene Sell-Orders) → active IPO-Preis → last_price → existing floor_price
```

Slice 112: `reference_price` als Fallback entfernt (Tech-Debt, war nur 0,1% des MV).

## Liquidation (Slice 108 Linear Formula)

`liquidate_player` RPC berechnet pro Card: **`fee_per_card_cents = MV_EUR / 10`** (linear, nicht tier-based).

3 Geldquellen für Holder-Payout:
1. **Community Success Fee** aus Transfer-Erlös (linear MV-proportional)
2. **PBT Treasury** (akkumulierte 1,5% Trading-Fees)
3. **Mastery + CSF Multiplier** cap 1,15× (Gamification-Layer)

Cap via `success_fee_cap_cents` greift vor Formel (max 10 Mio Speicher-cents = 100k Credits).

## Fee-Split

- **Trading (6% total):** Platform 3,5% + PBT 1,5% + Club 1%
- **IPO (100% total):** Club 85% + Platform 10% + PBT 5%
- **P2P Offers (3% total):** Platform 2% + PBT 0,5% + Club 0,5%

## Branding

- UI: "Scout Card" / "SC" / "Credits" (in Zahlen-Kontext)
- Code: weiterhin "dpc" (DB, TS, i18n Keys)
- Umbenennung seit 2026-03-16 (vorher: "DPC")

## Historische Drift-Korrekturen

- **Slice 108** (2026-04-20): Tier-Table in `liquidate_player` RPC durch Linear-Formel ersetzt (war ~1,5× über Formel).
- **Slice 114** (2026-04-20): 3.604 Rows backfilled (3.195 active IPOs + 409 Pre-IPO-Players). Pool-Wert 3.195 € → 305.976 € (96× Korrektur). 1 User (Livan Burcu Union Berlin) behält 1 Early-Bird-Card zum historischen 100-Credits-Preis.
- **Slice 111** (2026-04-20): Import-Scripts (`enrich-from-transfermarkt.mjs`, `createPlayer()`) nutzen jetzt MV-Formel statt Flat-Default 10.000 cents.

## Siehe auch
- [[business-model]] — Fee-Split Details, 7 Revenue Streams
- [[fantasy-tournaments]] — Scout Cards werden für Lineups gebraucht (min_sc_per_slot)
- [[equipment-system]] — Equipment wird an SC-Slots angelegt
- [[compliance]] — Wording-Regeln (Credits = Platform Credits, nicht Investment; „$SCOUT-Coin" nur für zukünftigen ICO, Phase 2)
- `memory/decision_pricing_asset_model.md` — autoritative Formel-Referenz
- `.claude/rules/trading.md` — Code-Patterns + Pricing-Section
