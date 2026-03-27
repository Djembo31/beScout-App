# Current Sprint — Architecture Refactoring

## Stand (2026-03-27, Session 264)
- **Tests:** ~2261 (61 neue Hook-Tests), tsc 0 Errors (nur pre-existing)
- **Branch:** main (3 neue Commits)
- **Refactored Pages:** Fantasy, Market, PlayerDetail, Community, AdminEvents, ClubContent, ProfileView, Home

## Erledigt (Session 264) — 3 autonome Runden
- ClubContent: 965→769 LOC, useClubData + useClubActions, 36 Tests
- ProfileView: 418→215 LOC, useProfileData (inkl. Follow + Stats Refresh), 25 Tests
- Home Dashboard: 661→441 LOC, useHomeData (9 Queries + Gamification + Retention)
- Reviewer Agent: ClubContent reviewed, 3 Findings gefixt

## Naechste Prioritaet
- Home Tests nachholen (useHomeData)
- KaderTab (732 LOC) — Market Portfolio, keine Hooks
- OffersTab (632 LOC) — Market Offers, keine Hooks
- AdminPlayersTab (806 LOC) — Admin, partial Hooks
- ClubContent Feinschliff: PublicView + SpielplanTab als Components

## Bekannte Issues
- 20 pre-existing test failures in CI
- useMarketData.test.ts hat pre-existing tsc Errors
- Fantasy LineupPanel (1011 LOC) — groesstes File, braucht Component-Split
- demo-platform Account existiert nicht
- Vercel Preview ist SSO-geschuetzt

## Blocker
- Keine
