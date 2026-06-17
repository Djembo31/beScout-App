# Frontend Journal: Slice 326 — clubs.league String→league_id UUID Filter (Wave A)
## Gestartet: 2026-06-15

### Verstaendnis
- Filter-Vergleiche von Liga-NAME auf leagueId umstellen. "Alle" = leagueId===null → Filter inaktiv.
- Store SSOT useLeagueScope: leagueId = Wahrheit, leagueName = Legacy-Display.
- Player.leagueId? + DpcHolding.leagueId? existieren. ClubLookup.league_id existiert. getLeagueById(id) existiert.

### Schlüssel-Erkenntnisse
- #4 marktplatz/LeagueBar.tsx ist ORPHAN (0 Konsumenten; alle nutzen LeagueBarShared via @/components/ui). NICHT anfassen.
- #11/#4 Emit-Kette: LeagueBarShared (shared-UI) emittiert name; LeagueScopeHeader resolved getLeague(name)→setLeagueScope({id,name,country}). Store bekommt id BEREITS korrekt. Emit unverändert lassen.
- #12 GameweekStatusBar: getLeague(leagueName) nur Display (short/logo). leagueId im Scope → auf getLeagueById(leagueId) (robuster).

### ARBEITSORT
Main-Repo C:/bescout-app (Briefing-Override "KEIN Worktree"). Fundament ist uncommitted NUR in main; Worktree-Sandbox hat es nicht. Edits via Bash (sandbox-off).

### Fortschritt
- [ ] #1 TrendingSection #2 TransferListSection #3 ClubVerkaufSection
- [ ] #5 KaderTab #6 PlayerRankings #7 rankings/page
- [ ] #8 BestandView #9 FantasyContent #10 clubs/page #12 GameweekStatusBar

### Runden-Log

### Runde 1 — PASS
- Alle 10 in-scope Files gepatcht (Python exact-replace, je count==1 assertion).
- #4 marktplatz/LeagueBar: ORPHAN, unverändert (dokumentiert).
- #11 LeagueScopeHeader / LeagueBarShared-Emit: unverändert (Store-leagueId bereits Wahrheit, shared-UI-Layer).
- VERIFY: npx tsc --noEmit → EXIT 0.
- VERIFY: grep filter-vergleich → 0 echte name-Filter (nur JSDoc-Kommentar leagueScopeStore:35).
- VERIFY: CI=true vitest run (market/manager/rankings/app) → 24 files, 333 tests PASS, EXIT 0.

### Nebenbefund
- FantasyContent: fantasyLeague-Declaration wurde unused → entfernt (sonst TS strict unused-var).
- BestandView: LeagueBarShared emittiert names → filterLeague (name-State) bleibt für Bar, filterLeagueId via getLeague(name)?.id derived → filtert by id.
- DbClub.league_id ist gesetzt; getClubsWithStats SELECT enthält league_id (club.ts:367) → clubs/page Filter runtime-safe.
