---
description: Business-Regeln und Compliance
---

## Licensing-Phasen (ADR-028)
- Phase 1 (jetzt): DPC Trading (BSD-Credits), Free Fantasy, Votes, Events, Scout Reports
- Phase 3 (nach CASP): $SCOUT Token, Cash-Out, Exchange — NICHT BAUEN
- Phase 4 (nach MGA): Paid Fantasy Entry, Turniere mit Preisen — NICHT BAUEN
- Kill-Switch: BSD-Sales bei EUR 900K stoppen (noch nicht implementiert)

## Wording-Compliance (KRITISCH)
- NIEMALS: Investment, ROI, Profit, Rendite, Dividende, Gewinn, Ownership, "guaranteed returns"
- IMMER: Utility Token, Platform Credits, Scout Assessment, "at BeScout's discretion"
- $SCOUT = "Platform Credits" (nicht Kryptowaehrung)
- DPC = "Digital Player Contract" (nicht Spieleranteil)
- Disclaimers auf JEDER Seite mit $SCOUT/DPC

## Geofencing-Tiers
- TIER_FULL (Rest EU): Alles
- TIER_CASP (EU ohne Gaming): Trading ja, Paid Fantasy nein
- TIER_FREE (DE/FR/AT/UK): Free only
- TIER_RESTRICTED (TR): Content + Free Fantasy only
- TIER_BLOCKED (USA/China/OFAC): Kein Zugang

## i18n
- next-intl, `t()` nutzen, Cookie `bescout-locale`
- Messages in `messages/{locale}.json`
