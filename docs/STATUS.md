# BeScout Status

> Letzte Aktualisierung: 28.02.2026 (Session 162)
> Für Session-Details → `memory/sessions.md`. Für Archiv → `memory/sessions-archive.md`.

## Aktueller Stand

**242 Migrations** + 2 Edge Functions (send-push v2, create-demo-accounts) + 2 pg_cron Jobs + 13 Gamification-Triggers + 21 Sponsor-Placements.

**23 Routes** | **195 Unit Tests** (Vitest) | **70 E2E Tests** (Playwright) | Build: 0 Fehler

### Infrastruktur
- Next.js 14.2.35 / TypeScript strict / Tailwind / Supabase / next-intl
- GitHub: `Djembo31/beScout-App` (private, CI/CD via GitHub Actions)
- Sentry Error Tracking + PostHog Analytics (EU)
- Supabase: `skzjfhvgccaeplydsunz` (eu-west-1)

### Daten
- 20 Clubs (TFF 1. Lig 2025/26), 566 Spieler, 505 Player Images (89%)
- 100 IPOs, 380 Fixtures (38 GW), 15 Bounties, 10 Votes
- 33 Achievements, 12 Rang-Stufen, 3 Gamification-Dimensionen

### Features (alle live)
- Trading + IPO + Fantasy + Scoring + Predictions
- Community (Scouting Zone, 7 Content-Filter, Research Paywall 80/20)
- Gamification v4 (3-Dim Elo, DPC Mastery, Score Road, Streak Shields)
- Club Dashboard (12 Admin-Tabs, 3 Rollen: Owner/Admin/Editor)
- Club-Abos (Bronze/Silber/Gold, 5 Perks server-enforced)
- Bounties + Success Fee + Liquidierung
- Notifications (Realtime WebSocket, 6 Preference-Kategorien)
- Sponsor Tracking (Impressions + Clicks + Admin KPI-Dashboard)
- Private Ligen, Salary Cap, Referral (Double-Sided)
- Demo-Modus, Pitch-Seite, Geofencing (Flag OFF)
- MiCA/CASP-konform (Cookie Consent, Trading Disclaimers)

---

## Letzte 3 Sessions

### Session 160 (28.02.2026) — Fantasy Security Deep Dive
- 8 Critical Fixes: Auth guards auf 5 admin RPCs, REVOKE auf 6 RPCs + 3 Tables, Lineups RLS locked check
- 4 Migrations (DB-only, keine Client-Änderungen)

### Session 159 (28.02.2026) — Wallet & Trading Security
- 11 Fixes: locked_balance Race Condition, auth.uid() Guards, REVOKE Trading RPCs
- 8 Migrations + 2 Client-Dateien (bounties.ts, wallet.ts)

### Session 158 (28.02.2026) — Trading Must-Fix
- 4 Fixes: Double-Submit Ref Guards, SellModal Liquidation UI, mapRpcError deutsch

---

## Migration-Übersicht (225 total)

| Range | Inhalt |
|-------|--------|
| #1-#82 | Core: Trading, IPO, Fantasy, Scoring, Community, Auth, RLS |
| #83-#107 | Bounties, Liquidation, Moderation, Streaks, Offers, Admin |
| #108-#117 | Phase 7: Captain, Tiers, Liga, Radar, Watchlist, Missions |
| #118-#127 | Waves, Monetarisierung, Push, Abo, Multi-Club, Airdrop |
| #128-#140 | TFF Reset, Security Hardening, Sponsors, Fantasy-Global |
| #141-#156 | State Migration, Harmony (Fees, Gamification, Arena, Abo) |
| #157-#171 | i18n, Nav, Crowd Scouting, Gamification v4 Rewrite |
| #172-#186 | Audit Fixes, pg_cron, Trading Deep Dive (12 RPC Bugs) |
| #187-#195 | Score Road, Predictions, Beta Must-Haves, Nav Umbau |
| #196-#199 | Security (auth.uid()), Gamification Triggers, Notifications |
| #200-#207 | Demo, Geofencing, Realtime Fix, Salary Cap, Ligen, Referral, Sponsors |
| #208-#218 | Performance (auth RPC, explicit cols), API-Football RPCs, Success Fee |
| #219-#225 | Security Deep Dive: Wallet locked_balance, Trading auth guards, Fantasy auth guards, REVOKE, Lineups RLS |
