# BeScout Status

> Letzte Aktualisierung: 02.03.2026 (Session 176)
> Für Session-Details → `memory/sessions.md`. Für Archiv → `memory/sessions-archive.md`.

## Aktueller Stand

**247 Migrations** + 2 Edge Functions (send-push v2, create-demo-accounts) + 2 pg_cron Jobs + 13 Gamification-Triggers + 21 Sponsor-Placements.

**24 Routes** | **195 Unit Tests** (Vitest) | **70 E2E Tests** (Playwright) | Build: 0 Fehler

### Infrastruktur
- Next.js 14.2.35 / TypeScript strict / Tailwind / Supabase / next-intl
- GitHub: `Djembo31/beScout-App` (private, CI/CD via GitHub Actions)
- Sentry Error Tracking + PostHog Analytics (EU)
- Supabase: `skzjfhvgccaeplydsunz` (eu-west-1)

### Daten
- 20 Clubs (TFF 1. Lig 2025/26), 566 Spieler, 505 Player Images (89%)
- 100 IPOs, 380 Fixtures (38 GW, echte API-Football Daten), 15 Bounties, 10 Votes
- 33 Achievements, 12 Rang-Stufen, 3 Gamification-Dimensionen
- 6.446 Fixture Player Stats (GW1-28), 6.517 Player Gameweek Scores
- 497/566 Spieler gemappt (api_football_id), 20/20 Clubs gemappt
- Active Gameweek: 28, 36 Events (GW1: 12, GW2: 12, GW28: 12)

### Features (alle live)
- Trading + IPO + Fantasy + Scoring + Predictions
- **Progressive Scoring** — Import (wiederholbar) + Auswerten (einmal) + Live-Scores auf Pitch
- **Per-Fixture Deadline Locking** — Spieler sperren individuell zum Fixture-Anstoß
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
- Admin-Architektur 3-Ebenen (Fan / Club / BeScout Platform)
- i18n (DE + TR, next-intl)

---

## Letzte 5 Sessions

### Session 176 (02.03.2026) — Live-Setup GW 28
- active_gameweek von 2 auf 28 gesetzt (aktueller TFF 1. Lig Spieltag)
- 12 Events für GW 28 erstellt (running), GW 2-28 Scores synced (6.517 total)
- GW 2 Events retroaktiv gescored (2 mit Teilnehmern), 10 leere → ended

### Session 175 (02.03.2026) — Progressive Scoring + Auto-Trigger
- scoring.ts Monolith aufgeteilt: importProgressiveStats + finalizeGameweek + getProgressiveScores
- SpieltagTab: Import-Button (sky, wiederholbar) + Auswerten-Button (gold, einmal)
- EventDetailModal: Live-Scores auf Pitch (60s Polling), Running-Total-Banner

### Session 174 (01.03.2026) — Per-Fixture Deadline Locking
- Spieler sperren individuell zum Fixture-Anstoß statt alle gleichzeitig
- Server-Enforcement in submitLineup(), UI LIVE-Badges + Partial-Lock-Banner
- Lock-Status dynamisch aus fixtures.played_at — keine Migrations nötig

### Session 173 (01.03.2026) — API-Football Live-Daten Pipeline
- 20 Clubs gemappt, 497/566 Spieler, 380 echte Fixtures, 6.446 Stats importiert
- Alte simulierte Fixtures + Stats komplett ersetzt (Migration)
- FPL-style Fantasy-Punkte berechnet (calcFantasyPoints)

### Session 172 (01.03.2026) — i18n String Extraction
- DashboardTab + AdminSettingsTab: 37 neue Keys (de + tr)
- SUPABASE_SERVICE_ROLE_KEY in Vercel gesetzt

---

## Migration-Übersicht (247 total)

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
| #219-#241 | Security Deep Dive (8 Bereiche), Community REVOKE anon |
| #242-#247 | Admin-Architektur (3-Ebenen), Live-Daten Migration (replace simulated fixtures) |

## Security Status

### Security Deep Dive ✅ 9/9 COMPLETE
- [x] Admin/Club Manager (Session 162)
- [x] Market/Kaufen (Session 162)
- [x] Bounties/Liquidation (Session 162)
- [x] Navigation/Layout (Session 162)
- [x] Profile/Social (Session 162)
- [x] Notifications (Session 162)
- [x] Wallet/Trading (Session 162)
- [x] Fantasy (Session 162)
- [x] Auth/Onboarding (Session 169)

### Quality Pipeline ✅ COMPLETE
- [x] Baseline UI Audit: alle 22 Pages (~500+ Fixes, Sessions 163-164)
- [x] Accessibility Audit: 32 Files, 50+ Fixes (Session 165)
- [x] Motion Performance Audit: 3 Files, 3 Fixes (Session 165)
- [x] All component groups + app-level files audited (Sessions 165-168)
