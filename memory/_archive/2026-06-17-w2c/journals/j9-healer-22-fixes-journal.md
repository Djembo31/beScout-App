# Frontend Journal: J9 Healer — 22 autonome Fixes (Liga-Rang)

## Gestartet: 2026-04-14
## Aggregate-Quelle: memory/journey-9-audit-aggregate.md

### Verstaendnis
- Was: 22 Autonome FIX-Items aus J9-Audit (Liga-Rang). Group A (Crash), B (i18n+Realtime), C (A11y), D (Wording), E (Tech-Debt).
- Betroffene Files: types, airdrop, rankings (GlobalLeaderboard, FriendsLeaderboard, ClubLeaderboard, SelfRankCard, MonthlyWinners), gamification (FanRankOverview, FanRankBadge, TierBadge), rankings/page.tsx, de+tr.json, queries/fanRanking, services/airdropScore
- Risiken: Multi-League Pattern (Tier-Propagation), i18n-Key-Leak, Modal preventClose (nicht direct hier), Realtime-Subscription bei REPLICA IDENTITY DEFAULT

### Plan
Group A (P0 Crash-Prevention + Type-Safety):
- FIX-01: AirdropTier Union um 'silver' erweitern + Service-Mapping
- FIX-02: TIER_CONFIG Fallback zu bronze bei unexpected tier
- FIX-03: Filter rank > 0 in Leaderboards (bis Backfill-Migration live)
- FIX-16: TradingDisclaimer auf /rankings Page

Group B (i18n + Realtime-Polish):
- FIX-04: "Monats-Sieger" → "Top-Platzierungen des Monats" / TR "Ayın Üst Sıralamaları"
- FIX-05: FanRankOverview Season 1 hardcoded → useCurrentLigaSeason?.name
- FIX-06: fanRanking/scoutScores staleTime 5min → 30s + Realtime-Subscribe user_stats/fan_rankings
- FIX-07: FanRankBadge label hardcoded → i18n Keys
- FIX-08: MonthlyWinners reward_cents Disclaimer-Badge
- FIX-17: "Aufstieg" → "Neuer Rang erreicht" / "Yeni Rütbeye Ulaşıldı"

Group C (A11y + Mobile):
- FIX-09: rankings page PlayerRankings filterCountry/filterLeague reset (State-only OK)
- FIX-10: formatMonth toLocaleDateString Fallback
- FIX-11: GlobalLeaderboard Tab-Buttons aria-selected + role="tab"
- FIX-12: TierBadge aria-label + role="status"
- FIX-13: rankings/page pb-24 lg:pb-8
- FIX-14: FanRankOverview Empty-State CTA /fantasy
- FIX-15: SelfRankCard DeltaPill flex-wrap für 393px

Group D Wording:
- FIX-18: tier_promotion DE hardcoded → Anil-known; Note only

Group E Tech-Debt:
- FIX-19: gamification.ts RANG_DEFS vs rules/gamification.md Threshold-Mismatch → Doku
- FIX-20: Tier-System-Doku (post-beta)
- FIX-21: LastEventResults import ungenutzt check
- FIX-22: rankings/index.ts barrel dead-code check

### Runden-Log
- Runde 1: Dateien lesen, planen, FIX-01..22 umsetzen
