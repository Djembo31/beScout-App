---
title: Compliance & Legal
type: decision
created: 2026-04-07
updated: 2026-04-07
tags: [legal, mica, casp, mga, wording, geofencing, disclaimers]
sources: [business.md, decision_pilot_token_strategy.md]
---

# Compliance & Legal

## Verbotene Woerter (KRITISCH)

NIEMALS verwenden:
- Investment, ROI, Profit, Rendite, Dividende, Gewinn, Ownership
- "Guaranteed returns", "sichere Gewinne", Finanzprodukt
- Spieleranteil, Eigentum

IMMER verwenden:
- **$SCOUT** = "Platform Credits" (nicht Kryptowaehrung)
- **Scout Card** = "Digitale Spielerkarte" (nicht Spieleranteil)
- "Utility Token", "at BeScout's discretion", "Performance Rewards"

## Geofencing-Tiers

| Tier | Laender | Zugang |
|------|---------|--------|
| TIER_FULL | Rest EU | Alles |
| TIER_CASP | EU ohne Gaming | Trading ja, Paid Fantasy nein |
| TIER_FREE | DE, FR, AT, UK | Free only |
| TIER_RESTRICTED | TR (Tuerkei) | Content + Free Fantasy, KEIN Trading |
| TIER_BLOCKED | USA, China, OFAC | Kein Zugang |

Status: Infrastruktur gebaut (`geofencing.ts` + `useRegionGuard`), Feature-Flag AUS im Pilot.

## Lizenz-Roadmap

| Lizenz | Kosten | Timeline | Schaltet frei |
|--------|--------|----------|---------------|
| Phase 1 (keine) | 0 | Jetzt | Credits, Free Fantasy, max 900K EUR |
| CASP | ~147K EUR | Jahr 2 | $SCOUT Token, Cash-Out, Exchange |
| MGA | TBD | Jahr 2+ | Paid Fantasy, Turniere mit Preisen |

## Disclaimers

TradingDisclaimer-Component PFLICHT auf:
- Market-Seiten, IPO-Seiten, Research-Unlock, Trading-Modals
- Jede Seite die $SCOUT/DPC-Preise zeigt

Inhalt:
- Past performance ≠ future results
- Platform kontrolliert Reward-Distribution
- Kein Eigentum impliziert

## Siehe auch
- [[business-model]] — Licensing-Phasen im Detail
- [[socios-chiliz]] — Regulatorische Probleme bei Fan Tokens (Warnung)
- [[sorare]] — In Frankreich als Gluecksspiel eingestuft (ANJ)
