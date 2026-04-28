# Slice 251 Wave 3 Track C — Review

**Verdict:** REWORK
**Reviewer:** reviewer-agent (cold-context)
**Branch:** `worktree-agent-a3fb1dba8d104a9a8` @ Worktree-WIP (uncommitted)
**Base:** 4cef6b95 (vor Wave 2). Main HEAD: `f867cd44` (Wave 2 done)
**Time-spent:** ~50 min

## Executive Summary

Track C liefert sauberen Store + Header + Cascade-Caller. Die Pflicht-ACs für **Wave-3-Scope** (8 Files migriert, Cascade gewired, localStorage-Versioning, 5×invalidate, 22 Tests grün) sind geliefert.

ABER: **die Hauptmotivation des Slices** — `/fantasy/spieltag` zentral auf Liga-Scope ziehen — ist nur halb umgesetzt. `useGameweek(gwEvents, activeClub?.league_id)` bleibt **Wave-1-Bridge**, statt auf `useLeagueScope(s => s.leagueId)` umzustellen. Dadurch reagiert die Spieltag-Page beim Header-Switch nicht vollständig (kein League-Switch ohne ClubSwitch). Das ist der zentrale UX-Bug aus dem Audit, der Wave 3 lösen sollte.

Plus: ein Race-Condition-Pattern in setLeagueScope/setCountry/resetToDefault bei dem Tests gegen `mockQc.invalidateQueries.toHaveBeenCalledTimes(5)` mit dem Cascade-Stage-Write-zu-Storage ein latentes Test-Flakiness-Risiko haben.

Plus zwei sichere Wave-2-Konflikte beim Rebase auf main HEAD.

REWORK statt PASS, weil F-01 (Spieltag-Bridge) den Slice um seinen Kern-Use-Case bringt. Healer-Pass kann das in einem Single-File-Edit lösen.

## Findings

### Critical (Block-Merge)

| # | Severity | Location | Issue | Suggested Fix |
|---|----------|----------|-------|---------------|
| **F-01** | **P0** | `src/app/(app)/fantasy/FantasyContent.tsx:87` | `useGameweek(gwEvents, activeClub?.league_id ?? null)` ist Wave-1-Bridge. Mit Wave 3 müsste das auf `useLeagueScope(s => s.leagueId)` umgeschrieben werden — sonst ist die Hauptmotivation des Slices („Header-Switch wirkt überall, atomar"; Spec AC-02 + AC-03) NICHT erfüllt. User wechselt Liga im Header → GW + max_gameweeks bleiben aus `activeClub.league_id` → Stale-GW. | `const leagueScopeId = useLeagueScope(s => s.leagueId); const gw = useGameweek(gwEvents, leagueScopeId);`. Wave-1-Bridge-Kommentar löschen. |
| **F-02** | **P0** | `src/app/(app)/fantasy/FantasyContent.tsx:133-167` (`dashboardStats`) | `dashboardStats` filtert auf rohe `events`, nicht `filteredGwEvents`. Wave 2 (commit 62bbcb29) hat das in main bereits auf `filteredGwEvents.filter(...)` migriert + deps `[filteredGwEvents]`. Worktree-Base 4cef6b95 ist davor → Worktree zeigt Wave-1-Stand. **Beim Rebase auf main HEAD f867cd44 entsteht garantierter Konflikt.** | Pre-Merge: dashboardStats-useMemo in Worktree manuell auf `filteredGwEvents` umstellen + deps anpassen. |

### Major (Should-Fix-Before-Merge)

| # | Severity | Location | Issue | Suggested Fix |
|---|----------|----------|-------|---------------|
| **F-03** | **P1** | `src/features/shared/store/leagueScopeStore.ts:142` | Module-Level `const initialPersisted = readFromStorage();` läuft beim Modul-Init — funktioniert, aber nicht idiomatisch für Zustand+SSR. Risiko mittel: Next.js App Router könnte Hydration-Mismatch werfen. | V1 OK, falls Anil Hydration-Mismatch sieht: `persist`-middleware migrieren. |
| **F-04** | **P1** | `src/features/shared/store/leagueScopeStore.ts:150-167` | Race Condition: invalidate-async + Test-Annahme `toHaveBeenCalledTimes(5)`. Aktuell nur Test-Flakiness-Risiko. | Optional: epoch-counter. V1 known-issue im Journal. |
| **F-05** | **P1** | `src/components/providers/ClubProvider.tsx:126-148` | Anon→login-Übergang: Cascade läuft NICHT wenn userId von null→string flippt während andere Guards bereits true sind. Edge: anon → login → Cascade bleibt im Default. | Manual-Verify post-Deploy. Falls broken: zusätzlicher Effect-Trigger. |
| **F-06** | **P1** | `src/app/(app)/clubs/page.tsx:53-60` | Smart-Auto-Select schreibt jetzt globalen Store + invalidiert 5 RQ-Prefixes pro single-league-country-Switch. Pre-Wave-3 war pure UI-Side-Effect. | V1-acceptable, Journal-Note. |

### Minor (Nice-to-have)

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| **F-07** | **P2** | `FantasyContent.tsx:225` | `nonSticky` default flippen, sticky-true call-site fehlt | Wave-4-Backlog |
| **F-08** | **P2** | `SpieltagTab.tsx:26-37,73,75,184` | `LEAGUE_FALLBACK` + `selectedLeagueId`-State + dead Liga-Selector-Button bestehen weiter | Wave-6-Backlog |
| **F-09** | **P2** | `leagueScopeStore.ts:13` | `localeCompare` ist Locale-abhängig, JSDoc sagt "deterministisch" | Cosmetic |
| **F-10** | **P2** | `__tests__/leagueScopeStore.test.ts:340` | `toHaveBeenCalledTimes(5)` magic-number — Test-Drift wenn neuer Liga-aware Key | Optional const-export |
| **F-11** | **P2** | `marketStore.ts:37-38,80-81,106-107` | `selectedCountry/selectedLeague` tot | Wave-6-Backlog |
| **F-12** | **P2** | `managerStore.ts:50-58,96-97,108-109` | `kaderCountry/kaderLeague` tot | Wave-6-Backlog |
| **F-13** | **P2** | `fantasyStore.ts:11-12,28-29,43-44,54-55` | `fantasyCountry/fantasyLeague` tot | Wave-6-Backlog |

### Confirmed-Solid

| # | Status | Location | Was funktioniert |
|---|--------|----------|------------------|
| **F-14** | PASS | `leagueScopeStore.ts:64-97` | EC-03 3-way Schema-Validation (invalid JSON / missing field / wrong types) sauber, alle 3 Cases tested |
| **F-15** | PASS | `leagueScopeStore.ts:62` | Versioned Storage-Key `bescout-league-scope-v1` — Schema-Future-Proof |
| **F-16** | PASS | `leagueScopeStore.ts:177-181` | EC-14 idempotent — User-Pick aus localStorage gewinnt sauber |
| **F-17** | PASS | `ClubProvider.tsx:138-148` | Effect-deps-Array vollständig — exhaustive-deps clean |
| **F-18** | PASS | `lib/queries/keys.ts` + `leagueScopeStore.ts:126-132` | 5 invalidierte Keys sind echt Liga-korreliert oder defensiv-OK |
| **F-19** | PASS | `messages/{de,tr}.json:20-23` | All 4 i18n-Keys (`all`, `allLeagues`, `countryNavLabel`, `leagueNavLabel`) in DE+TR |
| **F-20** | PASS | `KaderTab.tsx:459` | Empty-State-Reset wirkt jetzt als smart-collapse + invalidation |
| **F-21** | PASS | `ClubProvider.tsx:129` | anon-User-Skip acceptable LOW-risk |
| **F-22** | PASS | Service-Duplicate-Check D46 | grep `useLeagueScope` 13 Files, 1 kanonischer Pfad |
| **F-23** | PASS | Test-Coverage Cascade-Stages | 17+5 = 22 Tests, alle Stages + EC-03 + EC-14 + smart-collapse + invalidation |

## Race-Condition-Check writeToStorage

Geprüft, **kein Production-Race**, aber Test-Flakiness-Risiko (siehe F-04):

```
setLeagueScope({id, name, country})
  ├─ set({leagueId, leagueName, countryCode})  // sync
  ├─ writeToStorage(...)                        // sync (localStorage write)
  └─ void invalidateLeagueAwareQueries()        // ASYNC fire-and-forget
        └─ await import('@/lib/queryClient')    // async resolve
        └─ await Promise.all([5×invalidateQueries])
```

- localStorage + Zustand-State sync consistent (EC-12 OK).
- Cache-Invalidation async fire-and-forget — React-Query queues intern, kein Daten-Bug.
- Test-Risk: `toHaveBeenCalledTimes(5)` bei zwei back-to-back-Calls würde failen.
- SSR-Race-Risk geprüft: alle 3 Storage-Funktionen window-guarded.

**Verdict Race:** Keine Action für Wave 3, F-04 als Note in Journal.

## Wave-2-Drift-Audit

**1 echter Konflikt** beim Rebase Worktree-Base 4cef6b95 → main HEAD f867cd44:

| File | Konflikt? | Resolution |
|------|-----------|------------|
| `FantasyContent.tsx` | **JA** (F-02 dashboardStats-Hunks) | Pre-Merge-Heal in Worktree (F-02 fix) |
| `events.ts` | NEIN | Worktree-Base hat bereits Track-A-Code |
| `useGameweek.ts` | NEIN | identisch |
| `club.ts` | NEIN | identisch |
| `wildcards.ts` | NEIN (Single-Arg, Track F nicht in Worktree) | Future-Proof |

**FantasyContent.tsx 4-Hunk-Resolution:**
1. Z.135 Comment „— liga-scoped via filteredGwEvents" → "theirs" annehmen
2. Z.137-139 dashboardStats `events.filter` → `filteredGwEvents.filter` → **theirs**
3. Z.167 deps `[events]` → `[filteredGwEvents]` → **theirs**
4. Z.243-244 `<SpieltagTab leagueId={...}>` → kein Konflikt (Worktree hat KEINE prop, Wave 2 hat nicht eingeführt)

**Action:** Pre-Rebase-Heal F-02 fixen → dann ist Konflikt automatisch resolved (worktree == main).

## Open-Decisions für CTO

1. **F-01 (P0):** useGameweek-Bridge auf useLeagueScope umstellen — Empfehlung: JA, Single-line-Healer-Pass.
2. **F-02 (P0):** dashboardStats pre-Rebase fixen — Empfehlung: JA, dann Worktree-Test aussagekräftig.
3. **F-05/F-21 (P1/PASS):** anon-User-Skip — Empfehlung: V1-acceptable, Manual-Verify Pflicht.
4. **F-06 (P1):** clubs/page Auto-Select — Empfehlung: V1-acceptable (C), Journal-Note.
5. **F-07 (P2):** `nonSticky`-default — Empfehlung: Wave 4 mit Pillar 3.

## Manual-Verify-Pflichten post-Deploy

1. **AC-01 + Cascade Stage 1:** Login als jarvis-qa → /fantasy hard-refresh → Header zeigt favorite_club.league. Hydration-Mismatch in Console? (F-03)
2. **AC-02 atomar Liga-Switch:** Header BL → TFF1 → BL. GW-Selector + max_gameweeks reagieren atomic (post-F-01-Fix). Network-Tab: leagueGw + leagueMaxGw refetch.
3. **AC-03 async-Cycle:** SQL: `UPDATE leagues SET active_gameweek=10 WHERE name='Bundesliga'; UPDATE leagues SET active_gameweek=8 WHERE name='TFF 1. Lig';`. Header-Switch BL → 10. TFF → 8.
4. **AC-12 Mobile 393px:** iPhone 16. CountryBar + LeagueBar nebeneinander, scroll-x, kein Overflow, Touch ≥44px.
5. **EC-12 Cross-Page:** /market BL → Hard-Refresh → Liga noch BL → /fantasy → noch BL → /clubs → noch BL.
6. **F-05 anon→login Edge:** Logout → /fantasy als anon (Liga „—") → Login mit favorite_club → Header switched zu club.league? Wenn nein → F-05 offen.
7. **F-06 single-league:** /clubs → TR-Country (1 Liga = TFF1). Network: 5×invalidate triggert? Akzeptabel?

## Spec-Coverage (Wave-3-Scope)

| AC | Status |
|----|--------|
| AC-01 (HAPPY favorite_club) | PASS-after-deploy |
| AC-02 (Liga-Switch atomar) | **REWORK F-01** |
| AC-03 (Async-Cycle BL=10/TR=8) | **REWORK F-01** |
| AC-04 | n/a (Track F) |
| AC-05 (Empty no favorite + activeClub) | PASS |
| AC-06 (Empty no favorite + no activeClub → Stage 3) | partial F-21 |
| AC-12 (Mobile 393px) | PASS-after-verify |
| AC-13/14 (i18n DE/TR) | PASS |
| AC-17 (REGRESSION /market) | PASS-after-verify |
| AC-18 (REGRESSION /manager) | PASS-after-verify |

## Positive

- Cascade-Idempotency sauber implementiert + getestet
- EC-03 silent-reset mit 3 Corruption-Cases
- R-02 Heal vom Agent selbst zugefügt + dokumentiert
- Pre-Memo ehrlich (D-01 8 statt 6, R-04/R-05 V1-Asymmetrie offen)
- Test-Coverage solide für Wave-3-Scope (22/22)
- Service-Duplicate-Check D46 clean
- i18n-Keys schon in DE+TR

## Learnings für Knowledge Capture

- **errors-frontend.md Kandidat:** „Wave-Bridge-Cleanup-Pflicht" — bei Multi-Wave-Slices muss nachfolgende Wave explicit-grep auf Bridge-Pattern machen. F-01 ist genau dieses Anti-Pattern.
- **workflow.md Kandidat:** Pre-Review-Memo R-Liste sollte „Migration-Surface beyond Konsumenten" enthalten (Hooks + Queries die Konsumenten nutzen Liga-aware?).
- **testing.md Kandidat:** Magic-Number-Asserts an store/hook-internal-Konstanten koppeln (F-10).

## Summary

REWORK weil F-01 (Wave-1-Bridge nicht ersetzt) den Slice um seine Hauptmotivation bringt. Plus F-02 (dashboardStats Wave-2-Konflikt) muss vor Rebase healed sein. Beide Heals sind Single-Edits, ein Healer-Pass mit ~10 Min Aufwand reicht. Nach Heal: PASS, mit 5 Manual-Verifies post-Deploy.

---

## Heal-Pass 2026-04-29 (CTO self-heal, F-01 + F-02)

**Status:** REWORK → PASS (post-Heal)

### F-01 Heal (FantasyContent.tsx Z.83-87)

Wave-1-Bridge weg, useLeagueScope leagueId-Selector vor useGameweek:

```diff
-  // Slice 251 Wave 1 Bridge: pass activeClub.league_id until Wave 3 (Track C, useLeagueScope) lands.
-  // Without this bridge, useGameweek would fetch with leagueId=null, query disabled, currentGw stuck at 1.
-  const gw = useGameweek(gwEvents, activeClub?.league_id ?? null);
+  // Slice 251 Wave 3 Track C — Liga-Scope SSOT (replaces Wave-1 activeClub.league_id Bridge).
+  // Header-Switch wirkt jetzt überall atomar: useGameweek/Fixtures refetchen via 5-Key-invalidate.
+  const leagueScopeId = useLeagueScope((s) => s.leagueId);
+  const fantasyCountry = useLeagueScope((s) => s.countryCode);
+  const fantasyLeague = useLeagueScope((s) => s.leagueName);
+  const gw = useGameweek(gwEvents, leagueScopeId);
```

Bonus: Z.97-101 isolierte useLeagueScope-Selectors entfernt (zusammengefasst mit leagueScopeId-Selector). Imports `getLeaguesByCountry` + `useEffect` weg (Smart-Collapse jetzt im Store).

### F-02 Heal (FantasyContent.tsx Z.132-161)

dashboardStats auf filteredGwEvents (Wave 2 Pattern):

```diff
-  // ── Dashboard stats (for ErgebnisseTab) ──
+  // ── Dashboard stats (for ErgebnisseTab) — liga-scoped via filteredGwEvents ──
   const dashboardStats = useMemo(() => {
-    const scored = events.filter(e => e.isJoined && e.scoredAt && e.userPoints != null);
+    const scored = filteredGwEvents.filter(e => e.isJoined && e.scoredAt && e.userPoints != null);
     ...
-  }, [events]);
+  }, [filteredGwEvents]);
```

→ Worktree post-Heal == main HEAD-Form an dieser Stelle. Wave-2-Konflikt automatisch resolved beim Rebase.

### Verify (CTO)

- `npx tsc --noEmit` — clean (0 errors)
- `npx vitest run src/features/shared/store/__tests__/` — 22/22 grün (17 store + 5 header)
- Pattern-Wiederholung: F-02 ist literally Wave 2's commit 62bbcb29 dashboardStats-Edit → Self-Review acceptable (nicht-novel)

### Verbleibende Wave-2-Drift beim Rebase

Nach F-02-Heal bleibt 1 Konflikt-Surface:

- Z.243-244 `<SpieltagTab leagueId={...} ...>` — main HEAD hat `leagueId={activeClub?.league_id ?? null}` (Wave 2 Track B). Worktree hat das prop NICHT.
- **Resolution post-Rebase:** prop muss von `activeClub?.league_id` auf `leagueScopeId` umgestellt werden (semantisch richtig per Wave 3 SSOT). Single-line-Edit nach Rebase.

### Verdict

**PASS** post-Heal. Bereit für Rebase + Merge. Manual-Verify-Pflichten (7 Schritte oben) bleiben unverändert.
