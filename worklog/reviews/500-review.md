# Review — Slice 500: Discovery-Liste in React Query (W4)

**Typ:** Self-Review (Primary-Claude) · **Grund:** S-Slice, Frontend React-Query-Migration = etabliertes Pattern (S143/S371), **kein Money/Security**, Tests grün. Cold-Context-Reviewer nicht proportional (kein Blast-Radius auf Money-Pfad). · **Datum:** 2026-07-01
**Verdict:** PASS

## Risiko-Checks
1. **Behavior-Preservation:** UI identisch; nur Datenquelle useState/useEffect → useQuery. `loading`=isLoading, `dataError`=isError, Retry=refetch() korrekt gemappt. Filter/Group/„Deine Vereine"-Logik lesen weiter aus `clubs` (jetzt Query-Data). ✓
2. **onSettled-Blast-Radius:** `invalidateQueries(['clubs','withStats'])` prefix-matcht beide activeOnly-Varianten, refetcht NUR mounted Queries (auf Nicht-/clubs-Seiten nur stale-Mark). useToggleFollowClub von 15 Files genutzt → additive Invalidation, kein Verhalten der anderen Caller geändert. ✓
3. **Optimistic-Korrektheit:** `setQueryData(qk.clubs.withStats(true), …)` = exakter Key der Page (activeOnly:true); Bump ±1 + `Math.max(0,…)`; Rollback bei Error; onSettled reconciled. Server committed VOR onSettled → Refetch-Wert == Optimistic → kein Flicker (keepPreviousData). ✓
4. **§0 kein neues Duplikat:** `useNextFixtures` (managerData) wiederverwendet statt 3. Wrapper. Neuer `useClubsWithStats` = einziger RQ-Wrap um `getClubsWithStats` (vorher 0 Hooks). ✓
5. **Edge:** nextFixtures-undefined → optional chaining `nextFixtures?.get()`; leere Liste → `= []` default; Disabled-Query n/a (kein enabled-Gate). ✓
6. **Tests:** ClubsDiscoveryPage 7/7 (Service-Mock via renderWithProviders-QueryClient) · useClubActions/ClubProvider/ClubContent 33/33 (onSettled-Change kompatibel) · tsc 0. ✓

## Item 2 (fanRanking-Freshness) — verifiziert bereits erledigt
`useFanRanking` staleTime 30s (FIX-06/J9F-08). Kein Bau nötig, MASTERPLAN reconcilen.

## Findings
Keine. Slice ist merge-reif.

## PROVE-Hinweis
Refactor-ohne-sichtbaren-Behavior-Change → Proof = Tests grün + diff-stat (PROVE-Tabelle). Live-Walk `/clubs` post-Deploy als Zusatz-Gate (Follow-Flow visuell).
