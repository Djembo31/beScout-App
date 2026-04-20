---
title: Product Roadmap & Gaps
type: research
created: 2026-04-07
updated: 2026-04-21
tags: [roadmap, gaps, prioritaeten, ungebaut, backlog, beta-readiness]
sources: [Codebase-Analyse, Session Handoffs, worklog/log.md slices 083-125]
---

# Product Roadmap & Gaps

## Status 2026-04-21 — Pre-Beta-Check

**Was sich seit Wiki-Erstellung (2026-04-07) geändert hat:**
- ✅ Multi-League Expansion (7 Ligen live, 4.556 Players)
- ✅ Data-Quality-Wave (Slice 083-092, 100-106, 117) — 95% MV-Coverage, Ghost-Cleanup, Scraper-Hardening
- ✅ Silent-Fail-Audit + Observability (Slice 085/088/089/090/092/093/096/118)
- ✅ Pricing-Asset-Model komplett eingeführt (Slice 108/111/114 MONEY-Fix)
- ✅ Perf-Wave (Slice 104/107/109/116/120/121/122/123) — LCP −70% auf /home, Bundle-Splits
- ✅ Auth+Wallet Robustness (Slice 110)
- ✅ Security-Hardening (Slice 095 trades RLS tighten)
- ✅ Operational Hygiene (Slice 118 Sentry + Husky)
- ✅ UI-Polish (Slice 113 RewardsTab Milestones, Slice 115 type cleanup)

## Prio 1 — Vor Club-Deals (Pre-Beta Gates)

| Feature | Status 2026-04-21 |
|---------|-------------------|
| Founding Pass UI | ✅ Live (`/app/(app)/founding/page.tsx` + AdminFoundingPassesTab) |
| KYC Integration (Sumsub/Veriff) | ❌ Nicht gestartet — **Blocker: Malta Ltd Voraussetzung** |
| BSD Kill-Switch (900K EUR) | ✅ Live (`KILL_SWITCH_LIMIT_EUR = 900.000`) |
| Scout Missions UI | ✅ Live (`src/components/missions/`) |
| Following Feed UI | ✅ Live (`FollowingFeedRail.tsx`) |
| Transactions History UI | ✅ Live (`/app/(app)/transactions/page.tsx`) |
| Onboarding Multi-Club | ✅ Live ohne Sakaryaspor-Zwang |
| Vercel Sentry Env-Vars | ❌ Ausstehend — CTO-Action (SENTRY_AUTH_TOKEN, ORG, PROJECT) |
| CLS Post-Deploy-Messung (Slice 116) | ❌ Ausstehend — Chrome DevTools auf bescout.net |

**Pre-Beta-Blocker jetzt:** **nur KYC + Vercel Env Vars** (Rest live).

## Prio 2 — Sales-Tier Differenzierung

| Feature | Status |
|---------|--------|
| `clubs.package_tier` Column | ❌ Nicht gebaut |
| Kader-Limit Enforcement (30/50/unbegrenzt) | ❌ Nicht gebaut |
| Werbeflaechen-Limit (2/5/10+) | ❌ Nicht gebaut |
| BSD-Pool Allocation Dashboard | ❌ Nicht gebaut |
| Founding Partner Badge | ❌ Nicht gebaut |
| Success Fee Cap Setting UI | ✅ Live (`set_success_fee_cap` RPC + Admin-UI) |

## Prio 3 — Premium (Sampiyon-Tier)

| Feature | Status |
|---------|--------|
| White-Label Branding | ❌ Nicht gebaut |
| API Access | ❌ Nicht gebaut |
| Fan Council | ❌ Nicht gebaut |
| Fantransfer | ❌ Nicht gebaut |
| Predictive Analytics | ❌ Nicht gebaut |

## Ungebaute Revenue Streams

1. Sponsor Flat Fees (500-5K EUR/Event)
2. Event Boost / Featured Placement
3. Chip/Power-Up Sales (FPL-Style)
4. Event-as-Service Overage
5. Event Analytics / Data Licensing
6. Post-Game Insights (Soft Paywall)
7. Guaranteed Prize Pool Subsidies

## Technische Gaps (Stand 2026-04-21)

| Gap | Impact | Status |
|-----|--------|--------|
| Wildcard Balance nicht E2E getestet | Fantasy Edge Case | offen |
| Second Chance Chip braucht Bench-Konzept | Fantasy Feature | offen |
| Club-Scoped Events: RPC validiert nicht | Potential fuer Missbrauch | offen |
| Mystery Box Drop-Raten sind Platzhalter | Oekonomie-Balance | offen |
| Notification Rate-Limiting fehlt | Spam-Risiko | offen |
| Query-Konsolidierung /fantasy /community /club | Request-Waterfall | offen (Slice 122 Pattern replizierbar) |
| Pattern 9 MEDIUM-Audit (Silent-Fails) | Observability | offen (Backlog) |
| `reference_price` Frontend-Consumers | Tech-Debt | ✅ gefixt (Slice 115) |
| 228 inaktive MV=0 Players (Ghost-Audit) | Data-Hygiene | offen |
| 393 unknown-MV=0 Players (TM-Mapping) | Data-Coverage | offen (Phase 3 CSV) |
| TFF1 105 Players ohne TM-Mapping | Gold-Standard | offen (CSV-Import) |
| 58 MB trace-files in worklog/proofs | Repo-Bloat-Regel | ✅ gefixt (gzip + gitignore Slice 123-Follow-up) |

## Wave-Rewind: Was Slice 083-125 erledigt hat

### Data-Quality Foundation (083-092)
- Slice 083-084: Player-Row-Dedup, activeOnly-Filter
- Slice 086: P0 Silent-Fail Fixes (gameweek-sync chunking)
- Slice 087-092: Observability-Stack (logSilentRejects/Catch, allSettled Sweep)
- Slice 093: CI-Gate silent-fail-audit Baseline
- Slice 094: INV-10 ipo_price Hotfix (3 Cards)

### Security (095-096)
- Slice 095: trades RLS tighten + Club-admin-RPCs + Projection-Pattern
- Slice 096: Sentry.setUser GDPR-conservative

### Multi-League Data (100-106, 117)
- Slice 100-101: Stadia-Images + Nationality-Enrichment (+68 Stadien, 433 Stammspieler)
- Slice 102-103: Flag-Rendering Fix (Full-Name → ISO Mapper) + Ghost-Cleanup
- Slice 105-106: TFF1 Nationality + Stadium-Compression (-98.9%)
- Slice 117: Re-Scrape Welle (+122 verified Players)

### Perf (104, 107, 109, 116, 120, 121, 122, 123)
- Slice 104: Perf-Foundation (next.config, template.tsx, Root-Overlays lazy)
- Slice 107: Data-Waterfall Fixes (Duplicate-Calls + N+1)
- Slice 109: get_home_dashboard_v1 RPC
- Slice 116: CLS-Fix loading-Skeletons (21 dynamic imports)
- Slice 120: country-flag-icons Bundle-Split (-235 kB)
- Slice 121: /market Bundle Hygiene (research.ts lazy)
- Slice 122: get_market_user_dashboard RPC
- Slice 123: useEnrichedPlayers Input-Injection (eliminiert Race-Condition)

### MONEY (108, 111, 114)
- Slice 108: liquidate_player Linear Formula (CEO Pricing-Asset-Model)
- Slice 111: Import-Scripts Formel-aware
- Slice 114: Backfill 3.604 Rows (96× Pool-Wert-Korrektur)

### UX (113, 115)
- Slice 113: RewardsTab Growth-Milestones Redesign
- Slice 115: Player.prices.referencePrice Frontend komplett entfernt

### Tech-Debt (112)
- Slice 112: reference_price Column + Trigger deprecated

### Ops (118)
- Slice 118: Sentry Release-Tracking (withSentryConfig) + Husky Pre-commit (tsc + eslint staged)

## Siehe auch
- [[business-model]] — Revenue Streams + Licensing-Phasen
- [[bescout-overview]] — Core Features live/offen
- [[scout-cards]] — Pricing-Asset-Model Details
- [[early-feedback-freundeskreis]] — Beta-Tester verfuegbar
