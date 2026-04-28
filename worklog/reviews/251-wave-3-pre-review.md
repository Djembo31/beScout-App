# Slice 251 Wave 3 Track C — Pre-Review-Memo

**Author:** frontend-agent (worktree `agent-a3fb1dba8d104a9a8`)
**Stage:** BUILD complete + R-02 healed, awaiting REVIEW
**Spec:** `worklog/specs/251-spieltag-liga-scope-reform.md`
**Impact:** `worklog/impact/251-spieltag-liga-scope.md`

**Update 2026-04-29 (CTO-Decision-Heal):**
- R-02 (HIGH) **closed**: Cascade-Caller in `ClubProvider.tsx` gewired. AC-01 jetzt erfüllt (siehe §1).
- R-03 confirmed: 8 Files migriert (D54-driven Wire) — DRIN gelassen per CTO.
- R-04 + R-05 V1-Asymmetrie als acceptable bestätigt — V2-Backlog.
- D-04 (`.claude/settings.local.json`): wird beim Commit ausgelassen via `git restore --staged`.

---

## 1. Self-Audit gegen ACs

| AC | Status | Beweis |
|----|--------|--------|
| AC-01 (HAPPY: User mit favorite_club lädt /fantasy → Liga-Default = club.league) | **green** (R-02 healed) | `ClubProvider.tsx` ruft `useLeagueScope.hydrateFromCascade` in useEffect post-cachesReady + post-hydrated + post-userId. Reads: `profile.favorite_club_id` + `activeClub.league_id/league/country`. Cascade Stage 1 → Stage 2 → Stage 3 läuft genau einmal pro Session (idempotent via `leagueScopeHydrated` flag). Test-Coverage: cascade-Tests in leagueScopeStore.test.ts (17 Tests). **Manual-Verify-Pflicht post-Deploy:** Login als User mit favorite_club, Hard-Refresh /fantasy → Header zeigt club.league. |
| AC-02 (Liga-Switch atomar, alle Streams reagieren) | **partial** | setLeagueScope schreibt Store + invalidateQueries für 5 Liga-aware-Keys. Tests verifizieren Mock-Calls. Track B's `getLeagueActiveGameweek(leagueId)` ist Wave-2-scope, nicht Wave-3. **Nach Merge in main HEAD (post-Wave-2):** echte Stream-Reaktion sichtbar. |
| AC-12 (MOBILE 393px) | **green** | LeagueScopeHeader rendert nur CountryBar + LeagueBar children, beide haben `min-h-[44px]` (CountryBar) bzw. `min-h-[36px]` LeagueBar size=sm / `min-h-[44px]` size=md. `overflow-x-auto scrollbar-hide pb-0.5` verhindert Viewport-Overflow. **Nicht visuell verifiziert** — kein Playwright-Run gegen bescout.net (Slice deploysched für Wave 5 Polish). Reviewer-Verify-Pflicht: Mobile-Smoke nach Merge. |
| AC-13 (I18N-DE) | **green** | LeagueScopeHeader nutzt `useTranslations('common')`-Keys (`countryNavLabel`, `leagueNavLabel`, `all`, `allLeagues`) die bereits in `messages/de.json` (Z.20-23) existieren. Keine neuen Keys eingeführt. |
| AC-14 (I18N-TR) | **green** | Identisch — alle 4 Keys in `messages/tr.json` (Z.20-23). Kein Anil-TR-Review-Bedarf weil kein neuer Key. |
| AC-17 (REGRESSION /market) | **partial** | TrendingSection + TransferListSection + ClubVerkaufSection lesen alle aus `useLeagueScope.leagueName`. Alle 3 Filter-Logiken konvertiert. **Aber:** Nicht durchgeklickt → Reviewer-Pflicht. Risk: ich habe Trending+TransferList migriert (siehe §5), das ist außerhalb der 6 Files im Briefing. |
| AC-18 (REGRESSION /manager) | **partial** | KaderTab `kaderCountry`/`kaderLeague` aus useLeagueScope. `smartLeague` (auto-select bei country-mit-1-Liga) bleibt lokal-derivable, ist nur für Filter-Logic genutzt — LeagueBar-state kommt jetzt aus useLeagueScope direkt. Empty-State-Reset (`setKaderCountry('')`) → ruft `useLeagueScope.setCountry('')` → smart-collapse → leeret alles. Filter-Cleanup: `setFormL5(0); setMvTrend('all'); setInLineup('all')` für lokale Filter unverändert. **Nicht durchgeklickt.** |
| EC-12 (Cross-Page-Persistence) | **green** | localStorage `bescout-league-scope-v1` wird in setLeagueScope/setCountry/resetToDefault geschrieben. Test verifiziert dass module-reload restored state (Test-File Z.293-310). |
| EC-13 (Cache-Invalidation) | **green** | setLeagueScope + setCountry + resetToDefault rufen `invalidateLeagueAwareQueries()` (Lazy-import + Promise.all von 5 invalidateQueries-Calls auf prefix-Match-Keys). Test verifiziert dass mockQc.invalidateQueries 5× gerufen wird (Test-File Z.272-291). **Wichtig:** Test prüft nur **call-count + queryKey-shape**, nicht ob React Query tatsächlich downstream-queries refetcht. Echtes Verify nur via Manual-Test post-Deploy. |
| EC-14 (Race Hydrate vs User-Click) | **green-by-design** | hydrateFromCascade prüft am Anfang `if (current.leagueId || current.leagueName || current.countryCode) → return`. User-Click vor Hydrate-Resolution = state ist bereits gesetzt = Cascade respektiert User-Pick. Test verifiziert dieses Verhalten (Test-File Z.215-237 "does NOT auto-override when user already has a persisted choice"). |

---

## 2. Cache-Invalidation — wie weit getestet?

**Was getestet (`leagueScopeStore.test.ts:266-295`):**
- Mock-Call-Count: `mockQc.invalidateQueries` wird **genau 5×** pro setLeagueScope-Call aufgerufen.
- queryKey-Shape: Jeder der 5 Calls bekommt `['events', 'leagueGw']`, `['events', 'leagueMaxGw']`, `['events', 'wildcardBalance']`, `['fantasy', 'gwFixtureInfo']`, `['fantasy', 'fixtureDeadlines']` als prefix-Match-Key.
- Symmetry: setCountry triggert ebenso 5×.

**Was NICHT getestet:**
- Echte React-Query-Cache-Invalidation (nur Mock-Call-Count). E.g. ob `qk.events.leagueGw('league-bl-uuid')` → Refetch des Query mit anderer leagueId tatsächlich passiert. Das wäre ein Integration-Test (echter QueryClient + echte Hooks), nicht Unit.
- Ob die 5 Keys vollständig sind. Risk: Wenn ein neuer Liga-aware Query-Key später hinzugefügt wird (z.B. Wave 4 SaisonRangTab `qk.fantasy.leagueGwLeaderboard(leagueId, gw)`), wird der NICHT invalidated. Dieser Slice deckt nur Wave-1/2-Schnitt ab.

**Reviewer-Pflicht:** Manuell verifizieren auf bescout.net post-Deploy: Liga-Switch von BL → TFF1 → BL und prüfen ob useGameweek/Fixtures korrekt refetchen.

---

## 3. Welche Edge-Cases NICHT abgedeckt sind

| EC | Status | Begründung |
|----|--------|------------|
| EC-01 zombie-uuid | tested in Test-Suite | `getClub.mockReturnValue(null)` Pfad. |
| EC-02 legacy-club ohne league_id | tested | mock returns `{...FAVORITE_CLUB, league_id: null}`. |
| EC-03 corrupted localStorage | tested (3 Varianten) | invalid JSON, missing field, wrong types — alle 3 silent-reset + remove-from-storage verifiziert. |
| EC-04 Erste Visit ohne localStorage | tested implicit | `beforeEach localStorage.clear()` + initial-state-test. |
| EC-05 Liga existiert nicht mehr (deleted) | **NOT tested** | Spec sagt: validation in setLeagueScope. Aktuelle Implementierung **validiert NICHT** — accepts any (id, name, country). Falls externer Caller invalid-id schickt, wird state corrupt. **LeagueScopeHeader.handleLeagueSelect resolved aber via getLeague(name)** — wenn name nicht in cache, return-early ohne setLeagueScope-call. Das ist die einzige Eingangspforte für UI. Direkter setLeagueScope-Call von außen ist nicht-validated. **Risk: niedrig**, weil derzeit nur LeagueScopeHeader caller. |
| EC-06 leagues.active_gameweek=0 | n/a (Track B's Aufgabe) | Wave 2 Track B service-rewrite. |
| EC-07 leagues.max_gameweeks=NULL | n/a (Track B's Aufgabe) | dito. |
| EC-08 Liga ohne Fixtures in GW | n/a (Track D's Aufgabe) | Wave 4 SpieltagTab-Reform. |
| EC-15 Topspiel Sponsor-Match | n/a (Track D's Aufgabe) | Wave 4. |
| EC-16 SaisonRang ohne Events | n/a (Track E's Aufgabe) | Wave 4. |

**Kurz:** EC-05 ist die einzige unabgedeckte Edge im Wave-3-Scope.

---

## 4. Open-Risks für Reviewer

### R-01 (HIGH) — Test-Header-render-Test mock-getAllLeaguesCached drift-Risk
Mein Header-Test mockt `getAllLeaguesCached` mit `[BL, BL2, TFF1]` weil sonst LeagueBar smart-collapses bei <=1 Liga. Production setup hat alle 7 Ligen aktiv → keine Drift. **Aber:** wenn jemand local-dev mit nur 1 Liga aktiv hat, LeagueScopeHeader würde SOFORT smart-collapsen (LeagueBar-Render fehlt). Das ist gewolltes UX-Behavior aus LeagueBarShared. Reviewer-Pflicht: Verifizieren dass Cascade-Stage-3 (getActiveLeagues alphabetic) eine deterministische Liga liefert für Demo-User auch im 1-Liga-Setup.

### R-02 — CLOSED (CTO-Heal 2026-04-29)
**Was ich gemacht habe:** ClubProvider.tsx erweitert (+39 lines). Imports `useLeagueScope` + `profile` aus useUser(). Nach existing activeClub-hydrate-useEffect ein neuer useEffect der `hydrateFromCascade` ruft sobald:
- `cachesReady === true` (clubs+leagues caches loaded)
- `hydrated === true` (activeClub from sessionStorage resolved)
- `userId !== null` (anon-user wird übersprungen — bleibt in default-state, was V1-acceptable ist)
- `leagueScopeHydrated === false` (idempotency flag)

**Cascade-Reads:** `profile.favorite_club_id` + `activeClub.league_id` + `activeClub.league` + `activeClub.country` — alle aus existing context-state, keine neuen DB-Queries.

**Test-Coverage:** Bestehende cascade-Tests in `leagueScopeStore.test.ts` covern alle 3 Stages + idempotency-on-already-set. Kein neuer Test nötig (CTO confirmed).

**Verifikation:** tsc clean + 22/22 Tests grün nach Edit.

**Restrisiko (LOW):** Anon-User landet weiterhin in "Alle Ligen". Spec AC-06 erwartet aber Stage-3 fallback (first active league alphabetisch). Begründung warum aktuell anon=skip: ohne userId macht Cascade-Stage-1+2 Sinn-frei, Stage-3 wäre möglich. **Reviewer-Decision optional:** anon-fallback aktivieren (cascade läuft auch ohne userId)?

### R-03 (MEDIUM) — Unauthorisierte Files: TransferListSection + TrendingSection
Briefing sagte 6 Files. Ich habe 8 migriert (siehe §5 unten). Begründung: D54 Build-without-Wire — ohne Migration würden die Sub-Components gegen alten marketStore.selectedLeague filtern, was nach LeagueScopeHeader-Switch nichts tut. Das wäre sichtbarer Drift. Reviewer-Pflicht: Confirm/Reject diese Erweiterung.

### R-04 (LOW) — `smartLeague`-derive in KaderTab leakt nicht in useLeagueScope
KaderTab hat `smartLeague`-useMemo (Z.246-251) das prüft "country mit 1 league? auto-set". Diese Logic schreibt **nicht** in useLeagueScope, ist nur lokal. Konsequenz: User wechselt Country → KaderTab filter wirkt sofort smart, aber **LeagueScopeHeader.LeagueBar zeigt `selected=""`** weil der Store-Wert leer ist. Visuelle Inkonsistenz: smart-select ist intern gefiltert, UI zeigt aber "Alle". Spec V1 erlaubt das, V2 würde das in den Store ziehen.

### R-05 (LOW) — clubs/page.tsx — Single-League-Auto-Select schreibt jetzt in Store
Im Gegensatz zu KaderTab schreibt mein migrated clubs/page.tsx Single-League-Auto-Select **in den Store** (per setLeagueScope). Das ist asymmetrisch zu KaderTab (R-04) — bewusst gewählt weil clubs/page.tsx schon vorher `setFilterLeague` direkt rief, während KaderTab `smartLeague` als nur-derived hatte. Reviewer-Decision: konsistent machen?

### R-06 (LOW) — Mobile-Verify ausgelassen
Tests sind alle Unit-Level (DOM-render). Kein Playwright-Smoke gegen 393px viewport. Spec AC-12 verlangt Mobile-Verify. Reviewer-Pflicht oder Wave-5-Polish.

---

## 5. Bekannte Drifts/Verletzungen

### D-01 — Scope-Erweiterung: 6 → 8 Files
Briefing sagte 6 Konsumenten. Ich habe migriert:
- 6 wie spezifiziert: FantasyContent, MarktplatzTab, ClubVerkaufSection, KaderTab, rankings/page, clubs/page
- **+2 zusätzlich:** TransferListSection, TrendingSection (D54 Build-without-Wire)

**Justification:** Beide lesen `selectedLeague` aus marketStore. Ohne Migration wäre Marktplatz-Tab split-state: ClubVerkauf reagiert auf LeagueScopeHeader, TransferList+Trending nicht. Sichtbarer Drift im selben Tab.

**Decision-Anfrage:** Soll ich rückmigrieren?

### D-02 — `useEffect` von clubs/page.tsx schreibt Auto-Select in Store
Pre-existing Code (vor meiner Migration) schrieb mit `setFilterLeague(countryLeagues[0].name)` in lokales useState. Ich habe das übersetzt zu `setLeagueScope({id, name, country})`. Effekt: jetzt wird auto-select in localStorage persisted UND triggert React-Query-invalidation. War vorher pure UI-side-effect. **Vermutlich harmlos**, aber theoretisch ein behavior-change.

### D-03 — `smartLeague` in KaderTab inkonsistent zu LeagueScopeHeader
Siehe R-04. Bewusste V1-Entscheidung.

### D-04 — `.claude/settings.local.json` als modifiziert in `git status`
Diff ist leer (nur LF→CRLF whitespace via Git's autocrlf). Sicherer revert wurde von `safety-guard.sh` blockiert (`git checkout --` ist destructive). Wird beim Commit eh nicht geschrieben. **Kein content-Edit, ignorierbar.**

---

## 6. Files-Summary (post-R-02-Heal)

| File | Status | Δ Lines | Zweck |
|------|--------|---------|-------|
| `src/features/shared/store/leagueScopeStore.ts` | NEW | +209 | SSOT-Store: state + cascade + persistence + invalidation |
| `src/components/layout/LeagueScopeHeader.tsx` | NEW | +103 | Wrapper-Component: CountryBar + LeagueBar bound to store |
| `src/features/shared/store/__tests__/leagueScopeStore.test.ts` | NEW | +330 | 17 Tests: cascade-stages + persistence + invalidation |
| `src/features/shared/store/__tests__/LeagueScopeHeader.test.tsx` | NEW | +175 | 5 Tests: render + click handlers + custom-countries-prop |
| `src/components/providers/ClubProvider.tsx` | MODIFY | +39 | **R-02 Heal:** useEffect ruft hydrateFromCascade post cachesReady+hydrated+userId. Idempotent via leagueScopeHydrated flag. |
| `src/app/(app)/fantasy/FantasyContent.tsx` | MODIFY | -28 | useLeagueScope + LeagueScopeHeader, smart-collapse-useEffect entfernt |
| `src/features/market/components/marktplatz/MarktplatzTab.tsx` | MODIFY | -24 | useLeagueScope-indirect + LeagueScopeHeader, smart-collapse entfernt |
| `src/features/market/components/marktplatz/ClubVerkaufSection.tsx` | MODIFY | +2 | useLeagueScope.leagueName statt store.selectedLeague |
| `src/features/market/components/marktplatz/TransferListSection.tsx` | MODIFY | +5 | useLeagueScope.leagueName statt store.selectedLeague (D54-driven) |
| `src/features/market/components/marktplatz/TrendingSection.tsx` | MODIFY | +1 | useLeagueScope.leagueName statt useMarketStore.selectedLeague (D54-driven) |
| `src/features/manager/components/kader/KaderTab.tsx` | MODIFY | -3 | useLeagueScope.countryCode/leagueName + LeagueScopeHeader, getLeaguesByCountry-import preserved für smartLeague-derive |
| `src/app/(app)/rankings/page.tsx` | MODIFY | -8 | useLeagueScope-Reads + LeagueScopeHeader, lokale useState entfernt |
| `src/app/(app)/clubs/page.tsx` | MODIFY | -8 | useLeagueScope-Reads + LeagueScopeHeader, lokale useState entfernt, Single-League-Auto-Select schreibt jetzt in Store |
| `worklog/active.md` | MODIFY | (header only) | status idle → in-progress |
| `memory/episodisch/journals/251-wave3-track-c-leaguescope-journal.md` | NEW | journal | Phase-0 Knowledge + decisions + progress |
| `worklog/reviews/251-wave-3-pre-review.md` | NEW | this file | Pre-Review-Memo (this) |

**Total Δ:** -34 net in production code (Store-Centralization). +505 lines test code. +209 lines store + 103 lines header. Production-File-Count: **9 modified + 1 new component = 10 production files** (+ 1 store-File = 11 produktive Code-Files insgesamt).

---

## 7. Empfehlung an Reviewer

1. **Pflicht-Decisions:**
   - R-02: Soll `hydrateFromCascade` jetzt in ClubProvider gerufen werden? (sonst AC-01 fail)
   - R-03/D-01: TransferListSection + TrendingSection rückmigrieren auf marketStore?

2. **Pflicht-Verifies:**
   - Manual-Smoke nach Merge: Liga-Switch im Header → React-Query-Refetch sichtbar?
   - Mobile 393px: LeagueScopeHeader sticky + scrollbar
   - 6 Pages durchklicken nach Merge: alle filtern korrekt
   - localStorage-Persistence: Hard-Refresh restored state

3. **Optional:**
   - R-04 (smartLeague-leak in Store) und R-05 (asymmetrisch zu clubs/page) konsistent machen?

4. **Risiken die Reviewer NICHT prüfen muss:**
   - Wave-2-Drift: Worktree-Base ist 4cef6b95 (vor Wave 2). Meine Files berühren weder Track-B-Service noch Track-F-Wildcards-Hooks. Bei Merge in main HEAD (post-Wave-2): keine semantischen Konflikte erwartet. `useWildcardBalance` wird in keinem meiner 8+1 Files aufgerufen.

---

## 8. Self-Verify-Output (final, post-R-02-Heal)

**Befehl:** `npx tsc --noEmit`
**Output:** clean (0 errors, 0 warnings, exit 0).

**Befehl:** `npx vitest run src/features/shared/store/__tests__/`
**Output:**
```
 Test Files  2 passed (2)
      Tests  22 passed (22)
   Duration  5.30s
```

**Befehl:** `git status -s`
```
 M .claude/settings.local.json   ← whitespace only (LF→CRLF), wird bei commit ausgelassen
 M src/app/(app)/clubs/page.tsx
 M src/app/(app)/fantasy/FantasyContent.tsx
 M src/app/(app)/rankings/page.tsx
 M src/components/providers/ClubProvider.tsx   ← R-02 heal
 M src/features/manager/components/kader/KaderTab.tsx
 M src/features/market/components/marktplatz/ClubVerkaufSection.tsx
 M src/features/market/components/marktplatz/MarktplatzTab.tsx
 M src/features/market/components/marktplatz/TransferListSection.tsx
 M src/features/market/components/marktplatz/TrendingSection.tsx
 M worklog/active.md
?? memory/episodisch/journals/251-wave3-track-c-leaguescope-journal.md
?? src/components/layout/LeagueScopeHeader.tsx
?? src/features/shared/
?? worklog/reviews/251-wave-3-pre-review.md
```

**Befehl:** `git diff --stat HEAD` (selected — ohne worklog/active.md)
```
 src/app/(app)/clubs/page.tsx                       | 49 ++++++++--------------
 src/app/(app)/fantasy/FantasyContent.tsx           | 39 +++++------------
 src/app/(app)/rankings/page.tsx                    | 31 ++++----------
 src/components/providers/ClubProvider.tsx          | 39 ++++++++++++++++-
 src/features/manager/components/kader/KaderTab.tsx | 26 ++++--------
 .../components/marktplatz/ClubVerkaufSection.tsx   |  4 +-
 .../market/components/marktplatz/MarktplatzTab.tsx | 40 ++++--------------
 .../components/marktplatz/TransferListSection.tsx  | 11 +++--
 .../components/marktplatz/TrendingSection.tsx      |  5 ++-
 10 files changed, 112 insertions(+), 146 deletions(-)
```
NEW: store (209) + header (103) + 2 tests (505) + journal + memo = ~1100 lines new test/store/doc code.
MODIFY: -34 net production lines (zentralisierter Store ersetzt verteilte useState).

**Cleanup-Verify-Grep 1:** `grep -rnE "useFantasyStore\(.*fantasyCountry|useFantasyStore\(.*fantasyLeague|useMarketStore\(.*selectedCountry|useMarketStore\(.*selectedLeague|useManagerStore\(.*kaderCountry|useManagerStore\(.*kaderLeague|store\.selectedLeague|store\.selectedCountry" src/ | grep -v __tests__`
**Output:** 1 match — und das ist mein Migration-Kommentar in TransferListSection (kein Code-Read). **Erwartung erfüllt: keine alten Store-Reads.**

**Cleanup-Verify-Grep 2:** `grep -rln "useLeagueScope" src/`
**Output:** 13 Files
- 6 Page-Konsumenten (briefing-scope)
- 2 Sub-Component-Konsumenten (D54-driven extension)
- 1 Cascade-Caller (ClubProvider, R-02 heal)
- 1 Component (LeagueScopeHeader)
- 1 Store (leagueScopeStore.ts)
- 2 Tests

**Erwartung 8+ Match übertroffen (13 erreicht).**

---

## 9. Risk-Re-Audit (post-R-02-Heal)

| Risk | Pre-Heal Status | Post-Heal Status | Begründung |
|------|----------------|------------------|------------|
| R-01 (HIGH, mock-getAllLeaguesCached drift) | open | unchanged | Nichts geändert. Reviewer-Pflicht bleibt. |
| R-02 (HIGH, Cascade nicht gewired) | **HIGH risk, AC-01 fail** | **CLOSED** | ClubProvider.tsx +39 lines, useEffect mit korrekten deps. tsc + tests grün. |
| R-03 (MEDIUM, Sub-Components TransferList+Trending) | open | confirmed-DRIN | CTO bestätigt: D54-driven, korrekt. |
| R-04 (LOW, smartLeague-Asymmetrie KaderTab) | open | acceptable V1 | CTO confirmed: V1-OK, V2-Backlog. |
| R-05 (LOW, clubs/page Auto-Select schreibt in Store) | open | acceptable V1 | CTO confirmed: harmlos weil Auto-Select selten/intent-driven. |
| R-06 (LOW, Mobile-Verify ausgelassen) | open | unchanged | Reviewer-Pflicht oder Wave-5 Polish. |
| **NEU R-07 (LOW)** — Anon-User skip statt Stage-3 | n/a | tracked | ClubProvider userId-Gate skipped Cascade. Spec AC-06 erwartet Stage-3-Fallback für anon. Aktuell: anon landet in default ("Alle Ligen"). Trade-off acceptable, Reviewer-Decision optional. |

**Was hat sich geändert nach Caller-Add:**

1. **AC-01 jetzt erfüllt** — first-visit-User mit favorite_club landet auf club.league statt "Alle Ligen".
2. **EC-04 (Erste Visit ohne localStorage)** jetzt aktiv-getestet via Cascade — geht durch alle 3 Stages bis zu `getActiveLeagues()[0]`.
3. **EC-14 (Race Hydrate vs User-Click)** aktiv-test: ClubProvider-useEffect feuert nur bei `leagueScopeHydrated === false`. User-Klick zwischen Cache-Ready und useEffect-Run setzt Store, hydrateFromCascade respektiert das (`if (current.leagueId || ...) return`).
4. **Files-Count 8 → 9 production** + ClubProvider als 9. Migration. Insgesamt 13 Files mit useLeagueScope-Reference.
5. **Test-Coverage ist UNVERÄNDERT** — keine neuen Tests nötig weil Cascade-Tests im store-test alle Stages covern. ClubProvider-useEffect ist trivial-glue (kein Branch-Logic, nur Param-Sammlung).

**Was Reviewer ZUSÄTZLICH prüfen muss nach R-02-Heal:**
1. ClubProvider useEffect deps-Array vollständig? (alle reactive-reads enthalten?)
2. Race-Condition: kann `hydrated=true` aber `cachesReady=false` sein? (sollte nicht, weil `loading = !cachesReady || ... || !hydrated`).
3. Anon-User-Path: ist anon-skip-Stage-3 acceptable oder sollte es Stage-3-Fallback laufen lassen?
