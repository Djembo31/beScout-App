# Frontend Journal: Slice 251 Wave 3 Track C — Liga-Scope SSOT + 5-Page-Migration

## Gestartet: 2026-04-29

### Verständnis
- **Was:** Konsolidiere 4 verteilte Liga-Stores (fantasyStore, marketStore, managerStore, lokale rankings/clubs useState) in einen einzigen `useLeagueScope`-Zustand-Store. Erstelle `LeagueScopeHeader` Sticky-Component. Migriere 6 Konsumenten.
- **Worktree:** `agent-a3fb1dba8d104a9a8` (verifiziert via `git status -s`).
- **Betroffene Files:**
  - NEU: `src/features/shared/store/leagueScopeStore.ts`
  - NEU: `src/components/layout/LeagueScopeHeader.tsx`
  - NEU: 2 Tests
  - MIGRATE: 6 Konsumenten (FantasyContent, MarktplatzTab, ClubVerkaufSection, KaderTab, rankings/page, clubs/page)
- **Risiken (aus Spec/common-errors):**
  - D43 Type-Truth-Drift — alle Cascade-Service-Returns explizit verifizieren
  - D45 Hooks > Text — Smart-Collapse + Cache-Invalidation in Store, nicht in Caller
  - D46 Service-Duplicate — kanonischer Store-Pfad ist `src/features/shared/store/leagueScopeStore.ts`
  - D54 Build-without-Wire — alle 6 Konsumenten echt migrieren, nicht nur Store erstellen
  - EC-03 corrupted localStorage — silent reset + logSilentCatch
  - EC-13 Stale-Cache — invalidateQueries auf 4 keys bei setLeagueScope
  - Slice 192 Auth-Race — beim profile/activeClub-async-Hydration `enabled: !profileLoading` Gate

### Entscheidungen
| # | Entscheidung | Warum |
|---|---|---|
| 1 | LeagueScopeHeader **wird NICHT global mounted**, sondern bleibt als Sub-Component-Lib export. Die 5 Pages mounten `<LeagueScopeHeader />` lokal an der gleichen Stelle wo vorher CountryBar+LeagueBar waren. | Minimale Disruption, jede Page kann eigene Layout-Decisions treffen, kein Layout-Shift. Bonus: Pages die KEINE Liga-Filter haben (wie /trades) werden auch nicht betroffen. |
| 2 | Cache-Invalidation `qk.events.leagueGw._def` Pfad — verifiziert: keys.ts hat `leagueGw: (leagueId) => ['events', 'leagueGw', leagueId]` als Function. Für invalidate `prefix-match` nutze ich Array `['events', 'leagueGw']` als queryKey. | Briefing referenzierte `qk.events.leagueGw._def` — _def ist nicht im qk-Pattern. Stattdessen: invalidateQueries mit `queryKey: ['events', 'leagueGw']` matched alle leagueGw-Cache-Entries. |
| 3 | smart-leagueId-Resolution: `setCountry` setzt nur `countryCode` und leert leagueId+leagueName. Die Auto-select-Logic für "wenn nur 1 Liga im Land, auto-select" bleibt **lokal pro Page** (kein Migration in Store). | V1: minimal disruption. V2 kann das in Store wandern. Spec sagt: "Single-League-Auto-Select-useEffect (clubs/page.tsx L57-63) bleibt vorerst lokal" |
| 4 | Tests: nutze vi.hoisted-Pattern für queryClient mock (testing.md §5). Cascade-Tests mit getClub/getActiveLeagues mocks. | Standard-Pattern. |
| 5 | localStorage Key: `bescout-league-scope-v1` (versioned per Spec EC-03). | Versioned damit zukünftige Schema-Changes resetten können statt crashen. |
| 6 | Stores `fantasyStore`/`marketStore`/`managerStore` Liga-Felder bleiben **vorerst** im Store, werden nur nicht mehr gelesen. Wave 6 löscht sie. | Briefing sagt explizit: "in dieser Wave NICHT löschen — nur Liga-Felder werden in Wave 6 gelöscht, nachdem Pages migriert + grün sind". |

### Fortschritt
- [x] Phase 0: Knowledge Preflight (SHARED-PREFIX, SKILL, LEARNINGS, Spec, Impact, Code-Reading)
- [x] Step 1: Create `leagueScopeStore.ts`
- [x] Step 2: Create `LeagueScopeHeader.tsx`
- [x] Step 3a: Migrate FantasyContent.tsx
- [x] Step 3b: Migrate MarktplatzTab.tsx
- [x] Step 3c: Migrate ClubVerkaufSection.tsx
- [x] Step 3d: Migrate KaderTab.tsx
- [x] Step 3e: Migrate rankings/page.tsx
- [x] Step 3f: Migrate clubs/page.tsx
- [x] Step 4a: Tests for leagueScopeStore
- [x] Step 4b: Tests for LeagueScopeHeader
- [x] Step 5: Self-Verification (tsc, vitest, grep cleanup)

### Runden-Log
(zu füllen während Implementation)
