# Design: ClubContent.tsx Refactoring

## Ziel
ClubContent.tsx von 1299 auf ~500 Zeilen reduzieren durch Extraktion von Tab-Inhalten und inline Components.

## Neue Files

```
src/components/club/
  OverviewTab.tsx         — Uebersicht Tab (8 Sections mit RevealSection)
  SquadTab.tsx            — Spieler Tab (Collection, Filter, Grid/List)
  FixturePlanTab.tsx      — Spielplan Tab (GW-Grouping, Filter, Expansion)
  FixtureCards.tsx        — FixtureRow, NextMatchCard, LastResultsCard, SeasonSummary, getFixtureResult, resultBadge
  SquadOverviewWidget.tsx — Position breakdown widget (GK/DEF/MID/ATT counts)
  ClubSkeleton.tsx        — Loading skeleton
```

## Was in ClubContent.tsx bleibt
- Alle React Query Hooks (10 Hooks)
- Alle useState (11 State-Variablen)
- Alle useEffect (localStorage, Realtime)
- Abgeleitete Berechnungen (filtering, sorting, ownership)
- Handler Functions (follow, etc.)
- Layout: Hero + StatsBar + TabBar + Tab-Routing

## Ansatz
- Reines Refactoring — kein Verhaltenswechsel
- Props-Interface pro extrahiertem Component definieren
- Schrittweise: erst Utilities, dann Tabs (von klein nach gross)
- Nach jedem Schritt: tsc check

## Scope
- IN: File-Splitting, Props-Interfaces
- OUT: Neue Features, State-Management Aenderungen, Tests
