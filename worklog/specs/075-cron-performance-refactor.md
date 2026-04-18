# Slice 075 — Cron Performance-Refactor (Batch-Ops statt Per-Row)

**Datum:** 2026-04-18
**Stage:** SPEC → BUILD
**Size:** M (3 Cron-Routes refactor)
**CEO-Scope:** Nein (Code-Optimierung)

## Ziel

Eliminiere per-Row-DB-Ops in Sync-Crons durch:
1. **Batch-Pre-Query** (1 SELECT mit `.in(ids)`) statt N sequentielle `.maybeSingle()`
2. **Chunked Upsert** (500 Rows pro Batch) statt individuelle Upserts
3. **Parallel API-Fetch** (10 clubs concurrent mit staggered rate-limit)
4. **Scoring-Debug** für transfermarkt-search-batch (0/20 found → Threshold zu streng)

## Warum kritisch

Manual-Trigger-Session (heute) ergab:
- `sync-injuries`: 60s timeout (Vercel limit)
- `sync-players-daily`: 504 timeout 300s (Pro-Tier max)
- `sync-fixtures-future`: 504 timeout 300s
- `sync-transfers`: 504 timeout 300s
- `transfermarkt-search-batch`: run success but 0/20 found = Scoring-Bug

Nach Refactor: alle unter 60s, Gold-Standard erreichbar.

## Betroffene Files

1. **`src/app/api/cron/sync-players-daily/route.ts`** — Batch-Refactor
   - IST: 134 clubs × paginated + individual upserts
   - SOLL: Parallel-fetch (10 clubs × wave), batch-upsert 500/chunk

2. **`src/app/api/cron/sync-injuries/route.ts`** — Batch-Refactor
   - IST: pro Injury separate Player-Lookup
   - SOLL: 1 Pre-Query `.in(allApiIds)` → in-memory lookup → batch-update

3. **`src/app/api/cron/transfermarkt-search-batch/route.ts`** — Scoring-Debug
   - Analyse: why 0/20 found
   - Fix: Threshold anpassen ODER Algorithmus korrigieren

## Acceptance Criteria

- **AC1** sync-players-daily fertig unter **60s** für 134 Clubs
- **AC2** sync-injuries fertig unter **30s** für 7 Ligen
- **AC3** transfermarkt-search-batch findet **>5/20** Players mit korrekten Mappings
- **AC4** tsc clean + next build clean
- **AC5** Live-Test via Playwright (wie Session heute) → alle 3 HTTP 200
- **AC6** get_player_data_completeness nach Run zeigt: min 1 Liga Gold-Tier erreicht

## Batch-Patterns (Template)

```typescript
// PRE-QUERY: alle api_ids auf einmal
const allApiIds = responseItems.map(r => r.player.id).filter(Boolean);
const { data: players } = await supabaseAdmin
  .from('players')
  .select('id, api_football_id, status, club_id')
  .in('api_football_id', allApiIds);
const byApiId = new Map(players.map(p => [p.api_football_id, p]));

// IN-MEMORY DIFF
const updates: UpdatePayload[] = [];
for (const item of responseItems) {
  const p = byApiId.get(item.player.id);
  if (!p) { unmatched++; continue; }
  if (p.status !== newStatus) {
    updates.push({ id: p.id, status: newStatus, ... });
  }
}

// CHUNKED UPSERT
function* chunks<T>(arr: T[], size: number) {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}
for (const chunk of chunks(updates, 500)) {
  await supabaseAdmin.from('players').upsert(chunk);
}
```

## Edge Cases

- `missing_only` param weiterhin gültig
- Concurrent runs → idempotent via onConflict
- API-Rate-Limit: parallel fetches staggered mit `await sleep(100)` zwischen chunks
- Empty responses → skip log + continue
- Supabase `.in()` ist limited auf ~1000 IDs → chunked if needed
- `.upsert()` returns `{error}`, nicht `{data,error}` wenn `{ returning: 'minimal' }`
- Recovery-Logic in sync-injuries bleibt (Guard: nur wenn alle Ligen ran)

## Proof-Plan

1. **Live-Trigger via Playwright** nach Deploy — HTTP 200 + duration_s < 60s
2. **Completeness-Vergleich** — `get_player_data_completeness()` vor/nach
3. **transfermarkt-search-batch** — Response `found > 0`

## Scope-Out

- sync-fixtures-future + sync-transfers Batch-Refactor → Slice 076 (nicht gold-relevant)
- UI für cron-progress/status → separate Frontend-Slice
- Notification bei Sync-Success → später
