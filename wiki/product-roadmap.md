---
title: Product Roadmap & Gaps
type: research
created: 2026-04-07
updated: 2026-04-07
tags: [roadmap, gaps, prioritaeten, ungebaut, backlog]
sources: [Codebase-Analyse, Session Handoffs, Feature Specs]
---

# Product Roadmap & Gaps

## Prio 1 — Vor Club-Deals

| Feature | Status | Blocker |
|---------|--------|---------|
| Founding Pass UI | Design ready | Braucht Build |
| KYC Integration (Sumsub/Veriff) | Nicht gestartet | Malta Ltd Voraussetzung |
| BSD Kill-Switch (900K EUR) | Nicht gestartet | Tracking + Auto-Lock Logic |
| Scout Missions UI | Backend fertig | UI fehlt |
| Following Feed UI | Backend fertig | UI fehlt |
| Transactions History UI | Backend fertig | UI fehlt |
| Onboarding Multi-Club | Flow-Validierung | Muss ohne Sakaryaspor funktionieren |

## Prio 2 — Sales-Tier Differenzierung

| Feature | Zweck |
|---------|-------|
| clubs.package_tier Column | Feature-Gates pro Club |
| Kader-Limit Enforcement | 30/50/unbegrenzt |
| Werbeflaechen-Limit | 2/5/10+ |
| BSD-Pool Allocation | Distribution-Dashboard |
| Founding Partner Badge | Fruehe Clubs markieren |
| Success Fee Cap Setting UI | Vor IPO setzen |

## Prio 3 — Premium (Sampiyon-Tier)

| Feature | Zweck |
|---------|-------|
| White-Label Branding | Club-spezifisches Design |
| API Access | Club-Integration |
| Fan Council | Top-100 nach Reputation |
| Fantransfer | Crowdsourced Scouting |
| Predictive Analytics | Churn + Engagement |

## Ungebaute Revenue Streams

1. Sponsor Flat Fees (500-5K EUR/Event)
2. Event Boost / Featured Placement
3. Chip/Power-Up Sales (FPL-Style)
4. Event-as-Service Overage
5. Event Analytics / Data Licensing
6. Post-Game Insights (Soft Paywall)
7. Guaranteed Prize Pool Subsidies

## Technische Gaps

| Gap | Impact |
|-----|--------|
| Wildcard Balance nicht E2E getestet | Fantasy Edge Case |
| Second Chance Chip braucht Bench-Konzept | Fantasy Feature |
| Club-Scoped Events: RPC validiert nicht | Potential fuer Missbrauch |
| Mystery Box Drop-Raten sind Platzhalter | Oekonomie-Balance |
| Notification Rate-Limiting fehlt | Spam-Risiko |

## Siehe auch
- [[business-model]] — Revenue Streams + Licensing-Phasen
- [[bescout-overview]] — Was schon live ist
- [[early-feedback-freundeskreis]] — Beta-Tester verfuegbar fuer Prio 1 Features
