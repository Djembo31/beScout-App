# Current Sprint — Jarvis Cortex v1

## Stand (2026-04-08, Session Ende — Wave 0-5 + CI + Missions E2E)
- **Tests:** tsc CLEAN, vitest 2347/2347 gruen lokal UND im CI (170 Files)
- **Branch:** main (17 Commits heute gepusht)
- **Migrations:** 47 (2 neu: missions_deactivate_dead_duplicates, notifications_allow_mission_reference)
- **CI:** Seit 2026-02 rot → nach 2-teiligem Fix gruen (vitest config + fire-and-forget promise)
- **Node:** 20 → 24, actions v4 → v6

## Erledigt 2026-04-07 Abend + 2026-04-08 (Manager Team-Center Wave 0-5)
Alle 6 Waves auf prod deployed:
- Wave 0: useLineupBuilder Hook Extraction
- Wave 1+2: Foundation Skeleton + 3-Tab Hub + Kader Migration aus /market
- Wave 3: Aufstellen-Tab mit Direct Event Join
- Wave 4: Historie-Tab + W4.4 Cross-Tab Action
- Wave 5: Cleanup, Refactor, Tests, Code Review Polish

Plus Visual QA + PageHeader `nextEvent` Pille Fix (war hardcoded null).

## Erledigt 2026-04-08 Nachmittag (17 Commits)

### Wave 5 Sweep + Infrastructure
- Wave 5 T5.3 Visual QA + Wave 5 T5.4 Cleanup
- 2 pre-existing Test-Failures gefixt (AchievementUnlockModal, business-flows FLOW-11)
- AutoDream v3 Consolidation (38 Sessions overdue → 0)
- /reflect drafts-queue 3 → 0 (2 stale gelöscht, 1 promoted zu testing.md Visual QA playbook)
- stale smoke-mid1.yml geloescht
- **CI Resurrection:** vitest.config.ts exclusion logic + fire-and-forget promise fix → erster gruner CI seit Feb
- GitHub Secret SUPABASE_SERVICE_ROLE_KEY gesetzt + ci.yml test job mit env block → Integration-Tests laufen auch im CI
- Node 20 → 24 Upgrade, actions checkout/setup-node v4 → v6
- 8 pre-existing ESLint warnings explizit dokumentiert

### B1 Missions E2E Audit + Polish (4 Commits)
- **Phase A** (3c23199): Code→DB key alignment — `daily_trade` → `daily_trade_2`, `weekly_5_trades` → `weekly_trade_5`, `first_ipo_buy` entfernt (nicht in DB). Plus buy/sell differenziert.
- **Phase B** (701c071): Migration deactivate 5 dead mission_definitions (weekly_3_posts, weekly_research, daily_visit_players, weekly_diverse, weekly_follow_3) → 30 → 25 active
- **Phase C** (929eeca): Neue triggers (daily_post, daily_unlock_research, daily_buy_1, daily_sell_1) + MissionHintList Rollout in Market/Manager/Home
- **Phase E Bug Fix** (be63858): Migration `notifications_allow_mission_reference` — CHECK constraint extended um 'mission' als 11. reference_type (Claim-Notifications crashten silent)

E2E live verifiziert als jarvis-qa:
- Claim-Flow: wallet increment, mission state, tickets, notification — ALLE durchlaufen
- MissionHintList sichtbar auf /manager (Fantasy hints) und /market (Trading hints mit BRAND-NEW daily_buy_1/daily_sell_1)
- Home bedingt ausgeblendet für new user (by design)

## Naechste Prioritaet (fuer naechste Session)
1. **B2 Following Feed E2E** — selbes Pattern wie B1 (Discovery → Audit → Fix → Live-Test)
2. **B3 Transactions History E2E** — selbes Pattern
3. Onboarding ohne Club-Bezug (project_onboarding_multi_club.md)
4. Chip/Equipment System (project_chip_equipment_system.md)

## Board Status
- Alles aus dem ursprünglichen Handoff abgearbeitet
- Keine offenen Krümel
- Keine kritischen Bugs bekannt

## Blocker
- Keine
