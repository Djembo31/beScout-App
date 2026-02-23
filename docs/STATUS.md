# BeScout Status

> Letzte Aktualisierung: 23.02.2026 (Session 136)
> Für Session-Details → `memory/sessions.md`. Für Archiv → `memory/sessions-archive.md`.

## Aktueller Stand

**207 Migrations** + 1 Edge Function (send-push v2) + 2 pg_cron Jobs + 13 Gamification-Triggers + 21 Sponsor-Placements.

**22 Routes** | **195 Unit Tests** (Vitest) | **55 E2E Tests** (Playwright) | Build: 0 Fehler

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

### Session 136 (23.02.2026) — Memory-System Refactoring
- CLAUDE.md 334→107 Zeilen, MEMORY.md 208→80, sessions.md 2712→108
- Neues 3-Schichten-Gehirn: CLAUDE.md + MEMORY.md + Topic-Files
- `current-sprint.md` + `sessions-archive.md` neu erstellt
- docs/ aufgeräumt: 21 obsolete Dateien gelöscht, ROADMAP/TODO/STATUS aktualisiert

### Session 135 (23.02.2026) — E2E + Unit Tests
- 55 E2E Tests (10 Specs, Playwright), 146 neue Unit Tests (195 gesamt)
- gamification, achievements, activityHelpers, settledHelpers, utils getestet

### Session 134 (23.02.2026) — QA-Audit Fix Sprint
- 11 Bugs gefixt (1C+3H+5M+2L), 9 Dateien
- Critical: Bounty `balance_cents` → `balance` (Erstellung war kaputt)

---

## Migration-Übersicht (207 total)

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
