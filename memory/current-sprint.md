# Current Sprint — Launch Readiness Audit

## Stand (2026-03-30, Session 269)
- **Tests:** tsc 0 Errors, 934/936 Tests passed (2 pre-existing)
- **Build:** Compiled with warnings (ESLint rule config mismatch — pre-existing)
- **Branch:** main (uncommitted — 11 geaenderte Files)
- **Audit:** 7 Domain Agents, vollstaendiger Launch-Readiness Report

## Erledigt (Session 269)
- **Full Platform Audit** mit 7 parallelen Agents (Route, Service, UI, Trading, Community, Profile/Gamification, i18n/Dead Code)
- **IPO Blocker ENTWARNUNG:** Alle 3 RPCs (buy_from_ipo, create_ipo, update_ipo_status) existieren bereits in DB — Audit war False Positive
- **XP/Level aus UI entfernt:** ScoutCard, ProfileView, TopBar, SearchOverlay
- **Cosmetic Rewards entfernt:** Score Road jetzt 100% BSD (11 Milestones, DB + Code aktualisiert)
- **AdminTreasuryTab → Service Layer:** getTreasuryStats() in platformAdmin.ts extrahiert
- **a11y Fixes:** PosFilter aria-label+aria-pressed, TopMoversStrip+PortfolioStrip aria-live
- **Streak Badge in TopBar:** Flame-Icon mit Tage-Zaehler aus localStorage
- **i18n Fix:** "Sold Out" → t('soldOut'), 3 neue Keys DE+TR

## Naechste Prioritaet
1. **Commit + Push** dieser Session-Aenderungen
2. **Visual QA auf Vercel** (Economy Tab, Streak Badge, Score Road ohne Cosmetics)
3. **Push Notification UI** (~1h)
4. **Fantasy RPC Missions** (fantasy_top_3, fantasy_perfect_captain)
5. **ESLint Config Fix** (@typescript-eslint/no-explicit-any rule missing)

## Bekannte Issues
- 2 pre-existing test failures (EDITABLE_FIELDS count mismatch)
- ESLint rule definition missing: `@typescript-eslint/no-explicit-any`
- Migration History divergiert

## Blocker
- Keine
