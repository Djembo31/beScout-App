# Slice 086 — P0 Silent-Fail Fixes

## Ziel (1 Satz)
Zwei Silent-Fail-Bugs aus /optimize Audit schließen: gameweek-sync `.in()` chunking + footballData fixtures `.select()` pagination.

## Betroffene Files

| Path | Fix |
|------|-----|
| `src/app/api/cron/gameweek-sync/route.ts` | Line 1256 — `.in('player_id', leaguePlayerIds)` chunked (100er-Batches) |
| `src/lib/services/footballData.ts` | Line 357 — `.select()` on fixtures mit paginated `.range()`-Loop |

## Acceptance Criteria

1. `gameweek-sync/route.ts:1256` — wenn leaguePlayerIds > 100, wird in 100er-Batches gechunked
2. `footballData.ts:357` — all fixtures-Rows geladen (nicht nur erste 1000), via `.range()`-while-loop
3. `npx tsc --noEmit` clean
4. Existing tests grün (vitest auf tangierte Files)
5. Money-Invariant-Check: kein Change an Scoring-Logik, nur Chunking-Mechanik

## Edge Cases

- leaguePlayerIds leer / 0 Items → skip chunking, direct call OK
- leaguePlayerIds < 100 → 1 Chunk, funktioniert identisch
- fixtures 0 Rows → Loop terminiert sauber
- Supabase-Error in einem Chunk → throw mit Chunk-Index im Error-Message (nicht silent)
- gameweek-sync kann anderswo im File weitere `.in()` mit big arrays haben → Scope-Out dieser Slice, Iter-2

## Proof-Plan

- `npx vitest run <tangierte tests>` → grün
- Manueller Scan: `grep -n "\.in(" src/app/api/cron/gameweek-sync/route.ts` und für Line 1256 die Chunk-Pattern sehen
- Silent-Fail-Audit rerun: Line 1256 + Line 357 NICHT mehr als HIGH gelistet
- Money-Invariant SQL unverändert (kein Scoring-Change)

## Scope-Out

- Andere `.in()` Calls in gameweek-sync (Line 241, 482, 521, 599, 712, 1247, 1270, 1256, 1354) — separate Slice falls Audit sie zeigt
- clubs/sync-contracts `.select()` — separate Slice falls Gold-% es fordert
- Silent-Fail-Audit Script selbst erweitern (bereits in /optimize)
