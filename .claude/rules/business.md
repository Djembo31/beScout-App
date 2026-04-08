---
description: Business-Regeln, Compliance und Geofencing
---

## Licensing-Phasen (ADR-028)
- Phase 1 (jetzt): Scout Card Trading ($SCOUT-Credits), Free Fantasy, Votes, Events, Scout Reports
- Phase 3 (nach CASP): $SCOUT Token, Cash-Out, Exchange — NICHT BAUEN
- Phase 4 (nach MGA): Paid Fantasy Entry, Turniere mit Preisen — NICHT BAUEN
- Kill-Switch: BSD-Sales bei EUR 900K stoppen — IMPLEMENTIERT in `src/app/(app)/bescout-admin/AdminFoundingPassesTab.tsx` (`KILL_SWITCH_LIMIT_EUR = 900_000`, Progress Bar + `fpKillSwitchError` Toast)

## Wording-Compliance (KRITISCH)
- NIEMALS: Investment, ROI, Profit, Rendite, Dividende, Gewinn, Ownership, "guaranteed returns"
- IMMER: Utility Token, Platform Credits, Scout Assessment, "at BeScout's discretion"
- $SCOUT = "Platform Credits" (nicht Kryptowaehrung)
- Scout Card = "Digitale Spielerkarte" (nicht Spieleranteil, kein Eigentum)
- Code-intern bleiben Variable/DB-Column-Namen mit "dpc" (nur UI umbenannt)
- Disclaimers auf JEDER Seite mit $SCOUT/DPC (TradingDisclaimer Component)

## Geofencing-Tiers
| Tier | Laender | Zugang |
|------|---------|--------|
| TIER_FULL | Rest EU | Alles |
| TIER_CASP | EU ohne Gaming | Trading ja, Paid Fantasy nein |
| TIER_FREE | DE/FR/AT/UK | Free only, kein Paid Fantasy |
| TIER_RESTRICTED | TR | Content + Free Fantasy only |
| TIER_BLOCKED | USA/China/OFAC | Kein Zugang |

## Sales-Pakete (B2B, fuer Club-Onboarding)
| Paket | Kader | Werbeflaechen | BSD-Pool |
|-------|-------|--------------|----------|
| Baslangic | 30 | 2 | 100K |
| Profesyonel | 50 | 5 | 500K |
| Sampiyon | unbegrenzt | 10+ | 2M |
- Implementierung ERST wenn erster Club-Deal real wird

## Fee-Split Uebersicht
| Quelle | Platform | PBT | Club | Creator |
|--------|----------|-----|------|---------|
| Trading | 3.5% | 1.5% | 1% | — |
| IPO | 10% | 5% | 85% | — |
| Research | 20% | — | — | 80% |
| Bounty | 5% | — | — | 95% |
| Polls | 30% | — | — | 70% |
| P2P Offers | 2% | 0.5% | 0.5% | — |
| Club Abos | 0% | 0% | 100% | — |

## Platform Treasury (ADR-026)
- Fees = impliziter Burn (deflationary)
- Rewards = kontrolliertes Minting (Welcome Bonus, Missions, Achievements)
- Airdrops = Treasury-Redistribution (post-Pilot)

## i18n
- next-intl, `t()` nutzen, Cookie `bescout-locale`
- Messages in `messages/{locale}.json`
- Aktuell: DE + TR
