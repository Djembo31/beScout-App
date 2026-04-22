# Slice 148 — /clubs Discovery: GW-Consistency via played_at ordering + Gençlerbirliği logo fix (S)

**Datum:** 2026-04-22
**Groesse:** S (1-Code-Change in service + 1 Data-Fix)
**CEO-Scope:** nein (UI-Verhalten + Data-Hygiene)

## Ziel

1. **GW-Inkonsistenz:** `/clubs` Discovery zeigt manchmal verschiedene GWs für Clubs derselben Liga (z.B. PL: 1 Club GW 31, 10 Clubs GW 34, 1 Club GW 35). Service nimmt `ORDER BY gameweek ASC` → wählt niedrigste GW auch wenn played_at weit in Zukunft (verschobenes Spiel mit niedriger GW).
2. **Gençlerbirliği Logo:** DB zeigt `https://media.api-sports.io/football/teams/997.png` — laut Anil falsches Wappen.

## Root-Cause (GW)

Live DB-Evidence (PL clubs):
- GW 31: 1 Club (played_at 2026-05-22) — verschobenes Spiel, weit in Zukunft, aber niedrigste GW-Nummer
- GW 33: 8 Clubs (played_at 2026-04-18, alle stale > 6h) → werden im JS-filter entfernt
- GW 34: 10 Clubs (played_at 2026-04-21 bis 2026-04-27, 1 stale)
- GW 35: 1 Club (played_at 2026-05-02)

Current logic `ORDER BY gameweek ASC` wählt für den verschobenen Club GW 31 (niedrigste Nummer). Für die anderen Clubs auch die niedrigste mögliche, verschiedene GWs entstehen.

**Richtige Semantik:** "Nächstes Spiel in Zeit" = `ORDER BY played_at ASC` (oder mit NULL-fallback auf gameweek).

## Betroffene Files

- `src/features/fantasy/services/fixtures.ts` Line 472 — `.order('gameweek', ...)` → `.order('played_at', ...)` + gameweek als Tiebreaker
- `src/features/fantasy/services/__tests__/fixtures.test.ts` — ggf. Test-Expectations anpassen
- DB-Update: `clubs.logo_url` für Gençlerbirliği (TBD nach Anil-Input)

## Acceptance Criteria

1. Service `getNextFixturesByClub` ordert by `played_at ASC NULLS LAST, gameweek ASC`
2. Pro Liga zeigen max 1-2 distinct GWs (current + next round) — getestet via DB-Query nach Code-Change
3. tsc clean
4. Existing tests green (6 in fixtures.test.ts — nextFixture describe block)
5. Gençlerbirliği `logo_url` korrigiert (wenn Anil API-ID/URL liefert)

## Proof-Plan

- `worklog/proofs/148-db-check.txt` — per-league distinct-GWs after fix (SQL query simuliert service)
- `worklog/proofs/148-tests.txt` — vitest output der 6 fixture-Tests
- `worklog/proofs/148-genclerbirligi.txt` — Pre/Post logo_url UPDATE

## Scope-Out

- Liga-GW-State-Machine (global current_gw pro Liga tracken) — aufwendiger, nicht nötig wenn played_at-order reicht
- Fixture-Sync-Fix (stale scheduled → finished transition) — Slice 140 Territory
- Weitere Club-Logos — separater Audit-Slice wenn gewünscht

## Risk-Mitigation

- Service-Change ist 1-Zeile mit Tiebreaker
- Existing Tests müssen gleich gehen (played_at war in mocks wohl sortiert nach gw)
- Data-Fix Gençlerbirliği: reversibel via UPDATE zurueck
