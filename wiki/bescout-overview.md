---
title: BeScout — Produktuebersicht
type: research
created: 2026-04-07
updated: 2026-04-21
tags: [produkt, value-prop, positionierung, core, beta-readiness]
sources: [Codebase-Analyse, Business Rules, Memory Files, worklog/log.md slices 100-125]
---

# BeScout — Produktuebersicht

B2B2C Fan-Engagement-Plattform. Fans werden zu "Scouts" — sie monetarisieren ihr Fussball-Wissen durch Scout Cards, Fantasy, Trading und Community-Content.

## Value Proposition

**Fuer Fans:** "Verdiene mit deinem Fussball-Wissen"
- Scout Cards kaufen/handeln (Spieler-Marktwerte steigen/fallen)
- Fantasy Lineups aufstellen (Punkte durch echte Performance)
- Research schreiben + Bounties loesen (Community belohnt Wissen)
- Equipment sammeln + einsetzen (Mystery Boxes, Scoring-Boosts)

**Fuer Clubs:** "Fan-Engagement das Geld bringt"
- Revenue Share aus Trading (1% jeder Trade)
- IPO-Einnahmen (85% des Erloeses)
- Fan-Daten + Engagement-Analytics
- Eigenes Admin-Dashboard (12 Tabs)

## Core Features (LIVE)

| Feature | Status | Notizen |
|---------|--------|---------|
| Scout Card Trading | Live | Linear Pricing-Asset-Model (Slice 108), Floor Price Client-side, IPO-Launch |
| Fantasy Tournaments | Live | Lineups, Scoring, Chips, Predictions, Wildcards |
| Equipment System | Live | 5 Typen, 4 Raenge, Mystery Box Drops |
| Community | Live | Posts, Research (Paywall), Bounties, Votes |
| Gamification | Live | 3-Dim Elo, 12 Tiers, 33 Achievements, Missions |
| Club Admin | Live | 12-Tab Dashboard, Subscriptions, IPO, Liquidation |
| Push Notifications | Live | 35 Typen, Deep Links, Batch-Support |
| Scout Missions UI | Live | `src/components/missions/` — MissionHintList, MissionBanner, AchievementsSection |
| Following Feed | Live | `src/components/social/FollowingFeedRail.tsx` |
| Transactions History | Live | `/app/(app)/transactions/page.tsx` — infinite scroll |
| Founding Pass Page | Live | `/app/(app)/founding/page.tsx` + Admin-Tab |
| BSD Kill-Switch | Live | `KILL_SWITCH_LIMIT_EUR = 900.000` in AdminFoundingPassesTab |
| Multi-League Support | Live | 7 Ligen, 4.556 Players (BL, BL2, Serie A, La Liga, PL, Süper Lig, TFF 1. Lig) |
| Home Dashboard RPC | Live | Slice 109 — konsolidiert 4 per-user queries in 1 RPC |
| Market Dashboard RPC | Live | Slice 122/123 — konsolidiert 4 weitere per-user queries |
| Auth+Wallet Robustness | Live | Slice 110 — isFetching, isBalanceFresh, Button-Guards bei stale balance |
| Observability Stack | Live | Sentry (Slice 088/092/096), silent-fail-audit (Slice 085/090/092/093), logSilentRejects/Catch Helpers |
| Sentry Release-Tracking | Live | Slice 118 — withSentryConfig wrapper (braucht VERCEL env vars) |
| Husky Pre-commit Hook | Live | tsc --noEmit + eslint on staged files |
| Nationality Flag-Icons | Live | Slice 102 + 120 — ISO-Mapper, 95.4% Coverage, 235 kB Bundle-Split |

## Data-Quality (Stand 2026-04-21)

- **4.556 non-liquidated Players** auf 7 Ligen
- **Marktwert-Coverage:** BL 97.4%, BL2 96.1%, Serie A 93%, La Liga 92.4%, PL 89.2%, Süper Lig 83.2%, TFF 1. Lig 74.3%
- **Pricing-Asset-Model:** 3.604 Rows via Slice 114 Backfill auf Linear-Formel korrigiert
- **Nationality-Coverage:** 4.348/4.556 (95.4%) mapped
- **Stadia Images:** 139 Files, nach Slice 106 + Phase-2 Compression auf ~33 MB komprimiert (−446 MB)

## Performance (Stand nach Slice 104/107/116/120/121/122/123)

- **/home LCP:** 5086 → 874ms (nach Slice 104), 3740ms logged-in (Slice 109)
- **/market LCP:** 3018ms logged-in (Slice 107 Data-Waterfall-Fix), weitere Konsolidierung via 122/123 (10 → 5 Requests cold-load)
- **CLS:** 0.14 → Target <0.10 (Slice 116 loading-Skeletons, Post-Deploy-Messung ausstehend)
- **Bundle-Splits:** country-flag-icons −235 kB (Slice 120), research.ts lazy (Slice 121)

## Noch nicht gebaut / offen fuer Pre-Beta

| Feature | Prio | Blocker |
|---------|------|---------|
| KYC Integration (Sumsub/Veriff) | 1 | Malta Ltd Voraussetzung |
| Club Package Feature-Gates | 2 | Sales-Tier Differenzierung (clubs.package_tier Column) |
| TFF1 CSV-Import final 105 Players | 2 | Manuell via Admin-UI |
| Ghost-Audit 228 inaktive MV=0 Players | 3 | Review vor Delete |
| 393 unknown-MV=0 Players Final-Mapping | 3 | TM-Search oder CSV |
| Vercel Sentry Env-Vars setzen | 1 (CTO-task) | SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT |

## Siehe auch
- [[business-model]] — Revenue Streams, Licensing, Club-Pakete
- [[scout-cards]] — **Pricing-Asset-Model**, IPO, Trading, Liquidation
- [[product-roadmap]] — Ungebaute Features, Technische Gaps
- [[vergleich-competitors]] — Positionierung im Markt
- [[early-feedback-freundeskreis]] — Erste User-Validierung
