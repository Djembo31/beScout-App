# Slice 326 Wave A — CTO Review (clubs.league String→UUID, Filter-Wahrheit + Writer)

**Reviewer:** reviewer-Agent (Cold-Context) · **Datum:** 2026-06-15 · **time-spent:** 38 min

## Verdict: PASS

Wave A ist sauber und kohärent migriert. Einziger BLOCKER (Migration-Ordering) bereits gefixt; Live-DB führt die korrekte Signatur. Keine offenen REWORK-Findings. Verbleibend nur MINOR/NITPICK.

> **Scope:** Dies reviewt NUR Wave A (Filter-Wahrheit league_id + Writer-Fix). Wave B (Display-Resolver, 2 RPC-DROP-Blocker, `DROP COLUMN league`) braucht separates REVIEW B + CEO-Approval für den irreversiblen DROP.

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | BLOCKER | `migrations/…_slice_326` vs `…_slice_325` | 326-Migration (p_league_id) hatte früheren Timestamp (120000) als 325 (130000). Greenfield `db reset` → 326 vor 325 → alte `p_league text`-Signatur koexistiert/überschreibt. | **GEFIXT:** 326 umbenannt 120000→140000, läuft nach 325. Live-DB: 1 Overload p_league_id, grants service_role/authenticated/postgres, kein anon. |
| 2 | MINOR | `GameweekStatusBar.tsx:58` | `getLeagueById(leagueId)` render-time Cache-Read ohne cacheVersion-dep → Cold-Load Logo kurz absent. | Kein Regress (Vorgänger `getLeague(leagueName)` identisch), `?? leagueName`-Fallback. Cosmetic. Optional Future: `useLeagueCacheVersion()`. |
| 3 | MINOR | `BestandView.tsx:66-69` | `filterLeagueId = getLeague(filterLeague)?.id` useMemo deps nur `[filterLeague]`, kein cacheVersion → Hard-Refresh-mit-aktivem-Filter Soft-Fail (zeigt alle, kein Crash). | Interaction-driven (Cache warm bei Click), Slice-286 out-of-scope-carve-out. Empfehlung-only. |
| 4 | NITPICK | `marktplatz/LeagueBar.tsx` | Spec §3 listete als Edit, ist dead code (0 Importer, durch LeagueScopeHeader+LeagueBarShared ersetzt). | Stale Spec-Liste. Wave-B Dead-Wrapper-Removal-Kandidat (Slice 280). |

## PATCH-AUDIT (Slice 156) — create_club_by_platform_admin
Slice-325-Body vollständig preserviert (admin-guard, name/slug/short-guards, slug-dup, fee_config-INSERT identisch). Nur Lookup invertiert (id→name statt name→id) + **fail-closed neu** (Hermes Punkt 5: unbekannte Liga → Error statt NULL-Drift). Legacy `league`-String via v_league_name befüllt (NOT NULL bis Wave-B-DROP). AR-44: REVOKE PUBLIC+anon + GRANT authenticated auf neue uuid-Signatur, alte text-Signatur per DROP entfernt.

## Filter-Korrektheit ("Alle"-Semantik + NULL-Safety, Slice 265)
Alle 7+ migrierten Filter geprüft: "Alle" (leagueId/null → Filter inaktiv) erhalten, NULL-safe. Kein Fall wo NULL-leagueId-Item bei aktivem Filter fälschlich erscheint oder bei "Alle" ausgeblendet wird. `smartLeagueId`-Default deterministisch.

## Weitere Checks
- Type-Wahrheit (Slice 200): kein PLAYER_SELECT_COLS-Change nötig (players ohne Liga-Spalte, leagueId via getClub().league_id, clubs.ts:42 SELECT zieht league_id). ✓
- queryKey (PlayerRankings): `filterLeagueId ?? ''` → natürliche Invalidation, kein Persist-Map/Set. ✓
- Mobile 393px: CreateClubModal-Select-Layout unberührt. ✓
- i18n: keine neuen user-facing Strings; RPC-Errors Admin-facing DE (CEO-exempt). ✓

## Positive
- Fail-closed-Härtung schließt exakt den Hermes-Punkt-5-soft-null-Drift den Slice 325 offen ließ.
- getLeagueById nur mit echten Konsumenten (D54).
- "Alle"-Semantik konsequent erhalten (häufigste Migrations-Falle vermieden).
- Migration-Ordering selbst gefunden & gefixt vor Review-Abschluss.

## Learning (Knowledge-Capture)
errors-db.md: "Same-Session-Migration mit FRÜHEREM Timestamp als Vorgänger-Slice" — Filename-Order ≠ Slice-Order. Späterer Slice MUSS höheren Timestamp tragen, sonst Overload-Koexistenz bei greenfield reset. → festgehalten.
