# Impact — Slice 326 clubs.league String→UUID Vollmigration

**Datum:** 2026-06-15 · **Slice:** 326 (L, Migration+Service+UI) · **Trigger:** Schema-DROP `clubs.league` (Pflicht-IMPACT)

## DB-Dependency-Check für DROP-Sicherheit (verifiziert via pg_catalog)

| Achse | Ergebnis | DROP-Blocker? |
|-------|----------|---------------|
| Views lesen `clubs.league` (Name) | **0** | nein ✅ |
| Trigger auf `clubs` | **0** | nein ✅ |
| Constraints auf `league`-Namensspalte | **0** (nur `clubs_league_id_fkey` auf league_id) | nein ✅ |
| RPCs lesen `clubs.league` (Name, ohne league_id) | **2** | **JA** ⚠️ |
| Daten: 134 Clubs, NULL `league_id` | **0** | nein — kein Backfill ✅ |

### ⚠️ 2 RPC-DROP-Blocker (vor DROP fixen, Wave B)

- `public.get_player_data_completeness` — liest `clubs.league` im Body
- `public.get_club_by_slug` — liest `clubs.league` im Body

Beide müssen in Wave B auf `league_id` (+ Join `leagues` für Display-Name, falls Name im Return-Shape gebraucht) umgestellt werden, BEVOR `ALTER TABLE clubs DROP COLUMN league` läuft. Sonst Runtime-Break (PostgREST/RPC-Error). → via `pg_get_functiondef('public.<name>'::regprocedure)` Body lesen, Return-Shape prüfen (bricht Service-Cast falls `league` im JSON erwartet wird).

**Diese 2 RPCs waren in der src-Layer-Inventur NICHT sichtbar** — reiner DB-Layer-Fund. Bestätigt Pflicht-IMPACT bei Schema-DROP.

## src-Layer Consumer (aus Explore-Inventur)

| Kategorie | Anzahl | Wave |
|-----------|--------|------|
| Filter-Wahrheit (Name-Vergleich → league_id) | ~12 | A |
| Display-Labels (`{club.league}` → getLeagueById(id).name) | ~25 | B |
| SELECT-Listen (`clubs.ts`, `club.ts` ×3) | 4 | B (beim DROP) |
| Writer (`platformAdmin.createClub` + RPC-Signatur) | 1+RPC | A |
| Tests (Mock-leagueId + Filter-Asserts) | ~10 | A+B |

## Side-Effects

- **RLS:** `clubs` RLS unberührt — DROP einer Spalte ändert keine Policy. Kein Re-Grant nötig.
- **Caching/Invalidation:** `PlayerRankings` queryKey enthält `filterLeague` (Name) → Wechsel auf ID ändert Cache-Key. Natürliche Invalidation (alte Name-Keys verwaisen). Kein Persist-Map/Set betroffen (Slice 267 N/A).
- **Cache-Order (Slice 286):** League-Cache MUSS vor Club-Cache ready sein, da Display-Resolver `getLeagueById(club.league_id)` aus League-Cache liest. Init-Order in `ClubProvider` verifizieren.
- **Realtime:** keine Realtime-Subscription auf `clubs.league`. Kein Effekt.

## Migration-Plan (Wave B, irreversibel)

1. Alle ~25 Display-Stellen + 2 RPCs + 4 SELECT-Listen auf `league_id`/Resolver umgestellt + live grün.
2. 4-Achsen-Pre-DROP-Grep clean (`src/ scripts/ messages/ .claude/rules/`) — speziell `scripts/seed-demo.sql` (kein tsc-Schutz, Slice 324).
3. Migration `BEGIN; ALTER TABLE clubs DROP COLUMN league; COMMIT;` via `mcp__supabase__apply_migration`.
4. Post-DROP-Smoke: `information_schema.columns` → 0 rows; App-Regression-Walk je Liga.

## Rückwärts-Kompatibilität

- **Wave A** ist voll backward-compatible: String-Spalte bleibt, nur Filter lesen jetzt ID. Live-Deploybar als eigenständiger Zustand.
- **Wave B DROP** ist Breaking für jeden ungesehenen `clubs.league`-Leser → daher 4-Achsen-Grep + 2-RPC-Fix als harte Gates vor DROP.
- `leagueName` bleibt im Store/localStorage als Display-Backcompat (Hermes Punkt 5). Kein Migration-Bedarf für persistierte Werte.

## Verdict

DROP ist sicher durchführbar nach Fix der 2 RPCs + ~25 Display-Stellen. Daten sauber (0 NULL league_id). Keine Views/Trigger/Constraints blockieren. → BUILD Wave A starten.
