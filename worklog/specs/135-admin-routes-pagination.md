# Slice 135 — Admin-Routes Silent-Cap-Cleanup (Folge-Fix aus Slice 134)

**Stand:** 2026-04-22
**Größe:** M (4 Files, gleicher Pattern wie 134, Admin-Only — Non-Blocker)
**CEO-Scope:** Nein (Bug-Fix, gleiche Pattern-Klasse wie 134, Admin-routes → Claude solo OK)
**Priorität:** P1 (Kanban-Item "1000-row-cap Audit rest cron-routes")

---

## Ziel (ein Satz)

Die 4 verbleibenden nicht-paginated `.select()`/`.in()` Queries auf `player_external_ids` (>5677 Rows) und `players` (4556 Rows) in den Admin-/TM-Sync-Routes werden auf `.range()`-Loop umgestellt — sodass Admin-Tools (sync-contracts, backfill-ratings, backfill-positions, TM-Search-Batch) nicht mehr silent auf 1000 Rows gecappt arbeiten.

---

## Betroffene Files

| File | Unpaginated Query | Impact |
|---|---|---|
| `src/app/api/admin/sync-contracts/route.ts:94` | `player_external_ids.in('source', [api_football_squad, api_football_fixture])` (~5677 Rows) | apiToLocal-Map hatte 1000 statt 5677 Einträge → 4677 API-IDs ohne Lookup → silent skip von Contract-Sync für 80%+ der Spieler |
| `src/app/api/admin/backfill-ratings/route.ts:52-58` | `player_external_ids` (~5677) + `players.select('id, club_id, first_name, last_name, position')` unfiltered (~4556) | Player-Rating-Backfill arbeitete auf 1000/4556 Spielern → 78% Coverage-Lücke bei manuellem Rerun |
| `src/app/api/admin/backfill-positions/route.ts:46-49` | `player_external_ids` (~5677) | Position-Backfill skippt 80%+ der mapped Spieler silent |
| `src/app/api/cron/transfermarkt-search-batch/route.ts:82-85` | `player_external_ids.eq('source', 'transfermarkt')` (check DB-count in Proof) | Mapped-TM-Set unvollständig → Duplikate-Scrape + Cloudflare-Block-Risk wachsend |

**Nicht betroffen** (safe):
- `club_external_ids` / `clubs` Queries in allen 4 Files (~140 Rows)
- `fixtures` in backfill-positions (per-GW gescoped)
- `players.select(...).limit(limit*5)` in TM-search-batch (explicit limit)

---

## Acceptance Criteria

1. Alle 4 Files nutzen `.range()`-while-loop + explicit `.error`-throw pro Chunk (Slice 086/088/133/134 Pattern).
2. `tsc --noEmit` clean, keine neuen Type-Cast-Warnings.
3. `npx vitest run` full services suite weiterhin 998/998 grün.
4. Grep-Audit vor/nach: 0 verbleibende unpaginated `player_external_ids.select()` in `src/app/api/**` ohne `.range()/.limit/.eq('id')/.single`.

---

## Edge Cases

1. **Sync-contracts**: `if (!extIds?.length) return NextResponse.json({ error: 'No mapped players' })` bleibt erhalten — nach Pagination `extIds` ist Array (kein nullable).
2. **Backfill-ratings**: `Promise.all` bleibt, aber die destructure wechselt von `{ data: ... }` auf direktes Array (gleiche Umstellung wie footballData.ts in 134).
3. **Backfill-positions**: Simple sequential call — kein Promise.all, direkte Variable-Zuweisung.
4. **TM-search-batch**: `mapped`-Set-Build zählt nur player_id, keine weitere Daten-Abhängigkeit.
5. **Chunk-Error mid-loop**: throw sofort, kein partial-result — analog zu 134.

---

## Proof-Plan

1. **DB-Count**: TM-source Zeilen-Count via Supabase MCP → `135-db-evidence.txt`.
2. **TSC**: `npx tsc --noEmit` → `135-tsc.txt`.
3. **Vitest**: full services suite → `135-vitest.txt`.
4. **Grep-Audit Delta**: vor/nach grep für unpaginated `player_external_ids.select()` + `players.select()` in admin routes → `135-grep-delta.txt`.

---

## Scope-Out

- **Live-Run der Admin-Routes:** Admin triggert manuell, UI-Surface nicht betroffen. Nicht Teil dieses Slices.
- **Tests für Admin-Routes:** Route-Handler-Tests sind komplexer zu mocken (NextResponse, supabaseAdmin-Client). Audit-Delta + tsc + services-suite reichen als Regression-Guard.
- **Helper-Funktions-Extraction:** `paginatePlayerExtIds()` könnte jetzt in 3 Files identisch sein. DRY-Refactor post-Beta (separater Tech-Debt-Slice).
