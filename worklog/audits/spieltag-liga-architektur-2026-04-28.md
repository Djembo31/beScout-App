# Audit — /fantasy/spieltag Liga-Architektur

**Datum:** 2026-04-28
**Trigger:** Anil-Direktive Deep-Dive — Spieltag zerfasert, Liga nicht durchgehend.
**Methode:** CTO-Code-Mapping + 2 Domain-Agents (fantasy-scoring-expert + fm-mechanics-expert). Tester-Persona-Walker abgebrochen (Heredoc-Locale-Bug bei Türkei-Strings) — keine Live-Screenshots.
**Verdict-Konsens beider Agents:** **REWORK**.

## Anils Befund (Zitat)

> "Spieltag muss sich auf eine Liga konzentrieren. Eine Liga ist vorgewählt, GW muss sich auf die Liga beziehen — Bundesliga GW30 ≠ TFF1 GW30. Tabs/Submenus, vor allem Ranking, sollen sich nur auf eine Liga beziehen. Alles ist verteilt, keine Struktur."

**Bestätigt — die Kritik ist strukturell, nicht kosmetisch.**

## Strukturelle Diagnose

Die Page hat **drei voneinander isolierte Daten-Streams** und **vier verteilte Liga-Stores**:

```
                    /fantasy
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Events-Stream   Fixtures-Stream  Gameweek-Stream
   (Liga-aware)    (Liga-blind)     (Liga-blind, MIN-aggregiert)
        ▲              ▲              ▲
        │              │              │
   fantasyStore    no-store         leagueGw-query
   .fantasyLeague  (loadFixtures   (clubs MIN(active_gw))
                    ohne Filter)
        │
        │  (PLUS toter selectedLeagueId in SpieltagTab.tsx)
        │  (PLUS Cross-Page-Drift: marketStore/managerStore/rankings-local)
```

Ergebnis: User wählt "Bundesliga", sieht aber Fixtures aus 7 Ligen, GW-Nummer ist `MIN(alle clubs)`, Topspiel kommt aus `activeClub`, Saison-Stats sind cross-league aggregiert.

## Findings (Severity-Sort)

| # | Finding | Severity | Money? | File |
|---|---------|----------|--------|------|
| 1 | `getLeagueActiveGameweek()` ist `MIN(clubs.active_gameweek)`, nicht per-Liga | **P0** | nein | `src/lib/services/club.ts:585-596` |
| 2 | Liga-Filter wirkt nur auf Events, NICHT auf Fixtures/GW/Topspiel/Stats | **P0** | nein | `src/app/(app)/fantasy/FantasyContent.tsx:124-134` |
| 3 | Toter Liga-Selector (kein onClick, disabled bei 1 Liga) | **P0** | nein | `src/components/fantasy/SpieltagTab.tsx:75,184-205` |
| 4 | `LEAGUE_FALLBACK = TFF 1. Lig` Pilot-Hardcode (widerspricht D1) | **P0** | nein | `src/components/fantasy/SpieltagTab.tsx:26-37` |
| 5 | `maxGameweek = 38` hardcoded (TFF1=34, BL=34) | **P0** | nein | `src/components/fantasy/SpieltagSelector.tsx:20` |
| 6 | Lineup Player-Eligibility cross-Liga möglich (DE-Holding in TR-Lineup) | **P0** | **JA** | `src/features/fantasy/services/events.mutations.ts` (verifizieren) |
| 7 | Wildcards-Pool global statt per-Liga | P1 | indirekt | `get_wildcard_balance(p_user_id)` RPC |
| 8 | `dashboardStats` über `events` (alle Ligen) statt `filteredGwEvents` | P1 | nein | `FantasyContent.tsx:137-165` |
| 9 | Page-Level Manager-Ranking pro Liga **fehlt komplett** (RankingTab ist Match-Ratings) | P1 | nein | — |
| 10 | CountryBar/LeagueBar **nicht sticky** → Liga-Kontext beim Scroll weg | P1 | nein | `FantasyContent.tsx:228-241` |
| 11 | Cross-Page Liga-State drift (Market/Manager/Rankings/Fantasy je eigener Store) | P1 | nein | `src/features/*/store/` |
| 12 | `score_event(gameweek)`-async-Liga-Race latent | P2 | ja-latent | `score_event` RPC |
| 13 | Mobile 393px: Pflicht-Scroll vor erstem Fixture wegen 5+ Filterzeilen | P2 | nein | gesamte Page |
| 14 | `isClubAdmin`-Buttons zeigen für falsche Liga | P2 | nein | `SpieltagTab.tsx:208-240` |

## Schema-Drift (Type-Truth-Lücke, D43-Familie)

`DbLeague` Type hat `active_gameweek` + `max_gameweeks` — Frontend liest sie nirgends:

```typescript
// src/types/index.ts:306-318
export interface DbLeague {
  id: string;
  name: string;
  active_gameweek: number;   // ← existiert, ungenutzt
  max_gameweeks: number;     // ← existiert, ungenutzt
  ...
}
```

Stattdessen wird `clubs.active_gameweek` aggregiert (`MIN()`), was bei async-Liga-Cycles falsche GW liefert. Klassischer DB→Service-Drift.

## Soll-Architektur (Konsens beider Agents)

1. **Globaler `useLeagueScope` Store** (zustand) — `{leagueId, leagueName}` SSOT, localStorage-persisted, von **allen 4 Pages** konsumiert (Market/Manager/Rankings/Fantasy).
2. **Default-Cascade:**
   `profile.favorite_club_id → getClub(...).league` → `activeClub.league` → erste aktive Liga aus `getActiveLeagues()`. **`LEAGUE_FALLBACK` löschen.**
3. **Sticky League-Header** auf Top-Level (oder FantasyContent outermost) — ersetzt CountryBar+LeagueBar als floating element. Single-Source.
4. **Alle Hooks/Services bekommen `leagueId`:**
   - `useLeagueActiveGameweek(leagueId)` — REWRITE: liest `leagues.active_gameweek`, nicht `clubs.MIN`
   - `getFixturesByGameweek(gw, leagueId)` — `.eq('league_id', leagueId)`
   - `SpieltagSelector maxGameweek={league.max_gameweeks}` — pro Liga
   - `pickTopspiel(fixtures, clubId, leagueId)` — Fallback "höchster MV-Sum der Liga"
   - `dashboardStats` per-Liga-aggregiert (Saison-Punkte/Wins/AvgRank pro Liga)
5. **Neuer Page-Level `Saison-Rang`-Tab** pro Liga — füllt Lücke zwischen Per-Event-Leaderboard und Mini-League. Das ist was Anil mit "Ranking-Tab pro Liga" meint.
6. **Admin-Logic gated:** `isAdmin && league.id === activeClub.league_id` für Simulate/Finalize.

## Open Questions für CEO-Approval (vor /spec)

1. **Liga-Default-Quelle:** `profile.favorite_club.league` (zero-config) ODER explizite neue Spalte `profile.favorite_league` (User-Wahl)?
2. **Wildcards-Scope:** Pro-Liga (FPL-konform, mehr Engagement) oder global (current, weniger Komplexität)? **Money/Progression-Path → CEO.**
3. **Lineup-Eligibility cross-Liga:** Verifizieren ob `submit_event_lineup` RPC bereits Spieler-Club-Match gegen Event-Fixture erzwingt. Wenn nein: **P0 Money-Risk** (Spam-Vektor: 1 Holding für 7 Ligen-Lineups).
4. **Topspiel-Pick wenn User-Liga ≠ activeClub-Liga:** Höchster MV-Sum-Match der gewählten Liga? Sponsor-Match? Default-Fixture in GW1?

## Empfohlene Slice-Struktur (L-Slice)

Sub-Slices:
- **A** Schema-Foundation: `leagues.active_gameweek` per-Liga füllen + Cron-Owner.
- **B** Service-Layer: `getLeagueActiveGameweek(leagueId)` rewrite, `getFixturesByGameweek(gw, leagueId)` Liga-Filter, Tests.
- **C** Store-Reform: globaler `useLeagueScope`, Default-Cascade, Migration der 4 Page-Stores.
- **D** UI-Reform: Sticky-Header, toten Liga-Selector löschen, `maxGameweek` per-Liga, dashboardStats per-Liga.
- **E** Manager-Ranking-Tab pro Liga (neuer Page-Level-Tab).
- **F** Lineup-Eligibility-Verify (Spec.6 — eigener Slice falls Gap).
- **G** Wildcards-Migration auf per-Liga (CEO-approved, separat).

## Limitierungen dieses Audits

- **Tester-Persona-Walker abgebrochen** — Heredoc-Locale-Bug mit Türkei-Strings → keine Playwright-Screenshots. Live-Visual-Verify auf bescout.net steht aus (kann ich via `mcp__playwright__browser_navigate` nachholen wenn gewollt).
- **Lineup-Eligibility (P0 #6) nicht final verifiziert** — der RPC-Body wurde nicht gelesen. Falls Bug bestätigt: separater Hot-Fix-Slice vor Reform-Slice.

## Quellen

- fantasy-scoring-expert verdict: REWORK, 8 P0/P1/P2-Klassifikationen, 124k tokens
- fm-mechanics-expert verdict: REWORK, Cross-Page-Konsistenz-Tabelle, 149k tokens
- CTO-Code-Mapping: 12 Files (FantasyContent, SpieltagTab, SpieltagBrowser, SpieltagSelector, FantasyNav, RankingTab, FormationTab, useGameweek, fantasyStore, events.queries, fixtures.service, types)
