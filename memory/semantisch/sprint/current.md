# Current Sprint — Operation Beta Ready

## Stand (2026-04-14, CTO-Mode aktiviert)
- **Tests:** tsc CLEAN
- **Branch:** main (10 Commits seit letztem Sprint-Update)
- **Migrations:** 61 lokal / 44 remote (Drift dokumentiert, kein Action)
- **CI:** Build + Lint + Tests gruen (Live-DB Tests intentional skip in CI)
- **CTO Tools live:** Sentry MCP scoped + Vercel CLI + GitHub gh + Supabase MCP + Playwright MCP

## Erledigt 2026-04-13/14 (Polish Sweep KOMPLETT + Vision-Reset)

### Polish Sweep — alle 29/29 Pages ✅ (Commit 27de0eb)
- Phase 1 Critical Path: Home, Market, Fantasy, Player Detail, Profile, Inventory
- Phase 2 Supporting: 12 Pages compliance-clean
- Phase 3 Auth/Onboarding: 5 Pages
- Phase 4 Admin: 2 Pages  
- Phase 5 Legal: 4 Pages

### Multi-League Expansion ✅ (Commit 8a5014d)
- 7 europaeische Ligen, 134 Clubs, 4.263 Spieler
- Filter-Hierarchie auf MarktplatzTab+BestandView+KaderTab+FantasyContent+Rankings
- Liga-Logos ueberall (PlayerIdentity, Scout Card, Rows)
- Admin CreateClub Dropdown
- i18n DE+TR

### Service-Hardening DONE ✅ (Commits c8d844e+c00fa87+de763f1)
- 117 Silent-Null Fixes in 61 Services
- Trading + Fantasy + Saeulen 3-6 alle gehaertet
- 1192 Tests gruen
- 3 dead code removals

### CTO-Vision-Reset (2026-04-14)
- CEO Anil hat Operation Beta Ready authorisiert
- 50 Mann in Pipeline warten auf Beta-Access
- Tools eingerichtet (Sentry MCP, Vercel CLI, GitHub gh)
- SSOT erstellt: `memory/operation-beta-ready.md`

## Naechste Session (Prioritaet — autonom mit Status-Report am Ende)

### Phase 0 — Inventory (60-90 Min)
- 2 Explore Agents parallel: Frontend-Inventory + Backend-Inventory
- Output: Feature-Map + User-Journey-Map

### Phase 1 — Pre-Launch Cleanup (parallel)
- **1.1 Fan-Seed Phantom SCs loeschen** — 11 SCs in casual01/casual06 (Live-Beweis 2026-04-14)
- **1.2 Test-Account SC-Cleanup** — 90 SCs in 6 Accounts (waiting CEO decision welche behalten)
- **1.3 14 RPCs DPC-Sanitize** — Backend Agent + Reviewer
- **1.4 Migration-Drift Doku** — quick-doc
- **1.5 Live-DB Tests** — verified intentional, kein Action

### Approval-Triggers (CEO NUR hier einbinden)
1. Geld-Migrations
2. Compliance-Wording
3. Architektur-Lock-Ins
4. Externe System-Touchpoints

## Offene Punkte (Backlog — post-Beta)

### Imperium-Tracks (DEFERRED)
- **BeScout Liga** (memory/project_bescout_liga.md, 6 Design-Fragen offen)
- **Multi-League v2** (Cross-League Suche, Compare, Rankings)
- **FormBars Enrichment** (memory/project_formbars_enrichment.md)
- **Globale Expansion** (EN/ES/FR/IT, Multi-Currency)
- **B2B Sales Onboarding** (post-Sakaryaspor Pilot)
- **Token-Phase 3+** (CASP/MGA: Cash-Out, Exchange, Paid Fantasy)
- **Creator Economy** (Research-Posts, Polls, Bounties weiter)

### Open Questions for CEO (Spec-Session 15 Min)
1. Beta-User Profile (Hardcore? Casuals? Mix?)
2. Failure-Tolerance (was darf nie kaputt?)
3. Performance-Erwartung (Mobile 4G TR? Desktop?)
4. Welche Test-Accounts behalten?
5. RPC-Names `buy_player_dpc`/`calculate_dpc_of_week` — rename oder legacy?
6. PostHog hooked?
