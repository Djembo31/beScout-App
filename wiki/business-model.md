---
title: Business Model
type: decision
created: 2026-04-07
updated: 2026-04-21
tags: [revenue, fees, licensing, b2b, pricing, treasury, pricing-asset-model]
sources: [business.md, trading.md, memory/business-context.md, memory/decision_pricing_asset_model.md, decision_pilot_token_strategy.md]
---

# Business Model

## Revenue Streams (7 aktiv, 7 identifiziert aber ungebaut)

### Aktiv

| Quelle | Platform | PBT | Club | Creator |
|--------|----------|-----|------|---------|
| Trading | 3.5% | 1.5% | 1% | — |
| IPO | 10% | 5% | 85% | — |
| Research Unlock | 20% | — | — | 80% |
| Bounty | 5% | — | — | 95% |
| Polls | 30% | — | — | 70% |
| P2P Offers | 2% | 0.5% | 0.5% | — |
| Club Abos | 0% | 0% | 100% | — |

### Identifiziert, nicht gebaut

1. Sponsor Flat Fees (500-5K EUR/Event)
2. Event Boost / Featured Placement
3. Chip/Power-Up Sales (FPL-Style)
4. B2B Event-as-a-Service Overage
5. Event Analytics / Data Licensing
6. Post-Game Insights (Soft Paywall)
7. Guaranteed Prize Pool Subsidies

## B2B Sales-Pakete (noch nicht implementiert)

| Paket | Preis/Jahr | Kader | Credits-Pool |
|-------|-----------|-------|----------|
| Baslangic | 11.5K EUR | 30 | 100K |
| Profesyonel | 23K EUR | 50 | 500K |
| Sampiyon | 46K EUR | Unbegrenzt | 2M |

## Community Success Fee (groesster Hebel)

**Linear Pricing-Asset-Model** (Slice 108, CEO-Regel verifiziert 2026-04-20 gegen Sivasspor-DB):

- Card-Preis fix: `ipo_price = MV_EUR / 10 Speicher-cents` (= MV_EUR / 1.000 Credits = MV_EUR / 100.000 € beim ICO-Peg)
- 1 Credit = 0,01 € (ICO-Peg, Phase 2; Speicher = 100 Speicher-cents pro Credit)
- Max 10.000 Cards tokenisierbar = 10% des Marktwerts. Verein behält 90%.
- Bei Liquidation: Payout skaliert 1:1 mit MV-Growth
  - 1 Mio € MV (Entry 10 € pro Card) → 5 Mio € MV (Exit 50 € pro Card) = **5×**
  - 1 Mio € MV → 15 Mio € MV = **15×** (nicht 150× wie im alten Tier-Model)
- Cap `success_fee_cap_cents` (max 10 Mio Speicher-cents = 100k Credits) greift VOR Formel — Verein-Schutz bei High-MV-Spielern

**Historisch (pre-Slice 108):** Tier-Table im `liquidate_player` RPC zahlte ~1,5× über Linear-Formel. Per Slice 108 ersetzt, Slice 114 hat 3.604 existierende Rows backfilled (Pool-Wert +96× Korrektur). Siehe [[scout-cards]] für Details.

## Licensing-Phasen

| Phase | Timeline | Was | Blocker |
|-------|----------|-----|---------|
| Phase 1 (jetzt) | Live | Credits, Free Fantasy, Trading | Max 900K EUR Credits-Sales |
| Phase 2 | ~2026-M11 | $SCOUT-Coin (ICO), Cash-Out, Exchange | gültige Token-Lizenz (Route: volle CASP vs MiCA Title II / NCA-Notification — Anwalts-Entscheidung vor ICO) |
| Phase 3 | ~2026-M14 | Paid Fantasy, Turniere mit Preisen | MGA Gaming-Lizenz |

## Platform Treasury (deflationaer)

- **Fees = Burn** — 6% Trading Fee verlaeesst permanent den Umlauf
- **Rewards = kontrolliertes Minting** — Welcome Bonus, Missions, Achievements
- **Post-Token: Buyback & Burn** — 20% Platform-Fees → $SCOUT-Coin zurueckkaufen (Phase 2)

## Token-Allokation (Phase 2, nach gültiger Token-Lizenz)

Migration 13% | Pre-ICO 8% | Main ICO 15% | Team 12% | Referral 12% | Liquidity 5% | Engagement 18% | Legal 5% | Reserve 12%

## Founding Pass (geplant, nicht gebaut)

| Tier | Preis | Scout Credits | Referral Bonus |
|------|-------|---------------|----------------|
| 1 | 9.99 EUR | 100 SC | 2% |
| 2 | 49.99 EUR | 500 SC | 5% |
| 3 | 99.99 EUR | 1.000 SC | 10% |
| 4 | 199.99 EUR | 2.500 SC | 20% |

Limit: 10.000 total. Kill-Switch bei 900K EUR.

## Siehe auch
- [[bescout-overview]] — Produktuebersicht
- [[scout-cards]] — **Pricing-Asset-Model Formel-Details + Liquidation-Mechanik**
- [[compliance]] — Wording, Geofencing, Disclaimers
- [[vergleich-competitors]] — Fee-Vergleich mit Sorare (6.5%), Socios (variabel)
- `memory/decision_pricing_asset_model.md` — autoritative Pricing-Referenz (Slice 108/114)
