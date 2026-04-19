# Slice 081d — Ghost-Rows Cleanup (Aston Villa fehlgeschlagener Sync)

**Status:** SPEC
**CEO-Scope:** JA (club-zuordnung aendert sich, Money-adjacent)
**Stage-Chain:** SPEC → IMPACT (skipped — isoliertes Aston-Villa-Set) → BUILD → PROVE → LOG

## Ziel

11 Ghost-Player-Rows bei Aston Villa (am 2026-04-16 gesynct, 0 Appearances, Name+Contract identisch mit echten Werder-Bremen/Real-Madrid-Spielern) bekommen `club_id=NULL` — sie verschwinden aus Club-Kader-Queries ohne Datenverlust. Holdings nicht betroffen (0).

## Kontext

Anil's Datenqualitaets-Audit brachte den Cross-Club-Contamination-Bug zum Vorschein:
Aston Villa hat 62 Player in DB (echt: ~30). 27 davon am 2026-04-16 neu erstellt, 11 sind exakte Name+Contract-Duplikate von anderen Clubs (Werder, Real Madrid, etc.) mit **unterschiedlichen api_football_ids aber identischen MV+Contract-Werten**.

Wahrscheinliche Ursache: sync-players-daily am 16.04. hat fuer Aston Villa einen verunreinigten Squad-Response von API-Football bekommen (mix aus echten + falschen) und 27 neue Rows angelegt. 11 davon haben Name-Match zu echten Spielern bei anderen Clubs.

## Betroffene Files

- `supabase/migrations/20260420122000_slice_081d_ghost_rows_cleanup.sql` (NEW — UPDATE club_id=NULL)
- `src/lib/__tests__/db-invariants.test.ts` (+INV-39 Ghost-Row-Guard)
- `worklog/proofs/081d-after.txt`

## Acceptance

1. Genau 11 Rows bekommen `club_id=NULL`, alle bei Aston Villa, alle created_at=2026-04-16, alle last_appearance_gw=0.
2. Money-Invariant byte-identisch.
3. Aston Villa Squad-Count sinkt von 62 auf 51.
4. Holdings + Orders + Trades unveraendert (0 betroffene).
5. INV-39 grün: kein Player mit `last_appearance_gw=0 AND exists(same-name-player bei anderem Club mit apps>0)`.

## Edge Cases

1. **Anderer User haelt Holdings auf Ghost-Row**: 0 Holdings — safe.
2. **Falsche Ghost-Detection** (echter Transfer wo Spieler gleichzeitig in 2 Squads)? Bei 0 Appearances und identisch MV+Contract + am gleichen Tag erzeugt = sehr unwahrscheinlich echt.
3. **Reverse Case** (Werder hat Ghost, Aston Villa ist Original)? Probe zeigte av_real_and_other_fake=0. Nur in einer Richtung.

## Proof-Plan

1. Before-Query: Aston Villa squad_size, Ghost-Identifikation.
2. UPDATE ausfuehren.
3. After-Query: Aston Villa squad_size=51, 11 Rows mit club_id=NULL.
4. Money-Invariant unveraendert.
5. INV-39 green.
