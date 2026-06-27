# Review — Slice 427 (Gameweek-Status per-Liga)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-27 · **Time-spent:** 9 min

## Verdict: PASS

Eng am Spec, chirurgisch, money-neutral. Alle 6 Prüfpunkte faktisch bestätigt (Code gelesen, nicht angenommen). Beide Call-Sites threaden korrekt, deps exhaustive, Backward-Compat sauber, kein Import-Zyklus, Legacy-Cap ehrlich als Schuld dokumentiert.

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | INFO | `scoring.queries.ts:429` | Events-Query zählt alle Stati inkl. `registering` für `eventCount` (gewollt, Test deckt). Kein Bug. | akzeptiert |
| 2 | NIT | `scoring.queries.test.ts` | Edge #2 (leere Liga, `leagueClubIds=[]`) war ungetestet (Mock inspiziert `.in()`-Args nicht). | **gefixt** — Test `AC-04b` ergänzt (6 Tests grün) |
| 3 | NIT | `useClubEventsData.ts:48,90` | `getGameweekStatuses(1, 38, leagueId)` hardcoded `38`-Oberbound trotz leagueId — harmlos (GW-Map nur aus realen Liga-Fixtures), Spec dokumentiert. | bewusst akzeptiert |

## Prüfpunkte (faktenbasiert bestätigt)

1. **Events-Liga-Filter via clubIds:** ✅ `events.league_id` NULL → separate `clubs`-Query + `.in('club_id', ids)` (database.md-konform). Leere Liga = leeres Set, kein Fehler.
2. **1000-Cap:** ✅ Liga-Filter (~380 < 1000) schließt latenten Cap. null/global-Pfad behält Cap bewusst (kein Consumer, JSDoc + Scope-Out dokumentiert).
3. **Beide Call-Sites AdminGameweeksTab:** ✅ Load (Z.28) + post-sim refresh (Z.53) threaden beide `league_id` (S149b abgedeckt).
4. **useClubEventsData deps:** ✅ useEffect `[clubId, leagueId]`, useCallback `[leagueId]` — exhaustive-deps-konform.
5. **Backward-Compat:** ✅ `= null`-Default + optional Param, no-arg bricht nicht.
6. **Import-Zyklus:** ✅ club.ts importiert scoring NICHT — kein Zyklus.

## AC-Coverage
AC-01 ✅ · AC-02 ✅ · AC-03 ✅ (tsc) · AC-04 ✅ (+AC-04b) · AC-05 ✅ · AC-06 ⏳ post-Deploy (Live-Screenshot, gebündelt mit 428/429).

## One-Line
Sauberer, chirurgischer Display-Fix mit korrektem Backward-Compat-Default und ehrlichem Scope-Out des Legacy-Cap-Pfads — ein Senior merged das.
