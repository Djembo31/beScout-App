# Current Sprint — Architecture Refactoring

## Stand (2026-03-28, Session 265)
- **Tests:** ~2319 (97 neue Hook-Tests in dieser Session), tsc 0 Errors
- **Branch:** main (4 neue Commits total)
- **Refactored Pages:** Fantasy, Market, PlayerDetail, Community, AdminEvents, ClubContent, ProfileView, Home, KaderTab, OffersTab, AdminPlayersTab, LineupPanel

## Erledigt (Session 265) — Refactoring Round 4
- useHomeData: 30 Tests nachgeholt
- KaderTab: 732→480 LOC, useKaderState hook, 16 Tests
- OffersTab: 632→490 LOC, useOffersState hook, 12 Tests
- AdminPlayersTab: 806→550 LOC, useAdminPlayersState hook
- ClubContent: 769→530 LOC, PublicClubView + SpielplanTab als Components
- LineupPanel: 1011→886 LOC, useLineupPanelState hook
- Net: -1233 Zeilen aus Components, 97 Tests gruen

## Naechste Prioritaet
- Refactoring abgeschlossen — alle grossen Files (<800 LOC) unter Kontrolle
- Feature-Arbeit: naechstes Feature aus Roadmap
- AdminPlayersTab Tests nachholen
- LineupPanel Tests nachholen

## Bekannte Issues
- 20 pre-existing test failures in CI
- useMarketData.test.ts hat pre-existing tsc Errors
- demo-platform Account existiert nicht
- Vercel Preview ist SSO-geschuetzt

## Blocker
- Keine
