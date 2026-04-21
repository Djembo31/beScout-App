# Slice 134 — P0 Silent-Fail 1000-Row-Cap Folge-Fixes

**Stand:** 2026-04-22
**Größe:** M (2 Files Core + 1 Test, Money-adjacent cron + admin mapping)
**CEO-Scope:** Nein (Bug-Fix, kein Money/Security-Breaking-Change — aber Money-adjacent → Claude solo, kein Agent-Dispatch)
**Priorität:** P0 (Scope-Out aus Slice 086 Reviewer + Briefing 2026-04-22 Option A)

---

## Ziel (ein Satz)

Die drei verbleibenden nicht-paginierten `.select()`/`.in()` Queries auf die großen Tabellen `player_external_ids` (>9000 Rows) und `players` (>4500 Rows) in `gameweek-sync` Phase-A-Mapping und `footballData.ts` (getMappingStatus + importGameweek) werden in `.range()`-while-loops eingebettet mit explicit error-throw — sodass `sync_matches`/Admin-Mapping-UI nicht mehr silent auf 1000 Rows gecappt werden.

---

## Betroffene Files

| File | Was | Warum |
|---|---|---|
| `src/app/api/cron/gameweek-sync/route.ts` | Phase-A Mappings (L595-615): `player_external_ids` + `players` per `.range()`-loop laden statt Eager-Select; explicit `.error`-Check pro Chunk | `player_external_ids` hat keinen league-filter (~9000 Rows bei 2 sources × 4500 Spieler) → silent 1000-Cap verfälscht api_football_id-Map → Spieler unmapped → 0-Stats für Scoring |
| `src/lib/services/footballData.ts` | `getMappingStatus` L373-384 + `importGameweek` L431-439: `player_external_ids` und `players` paginieren | Admin-UI `/bescout-admin/mapping` zeigt Mapping-Status mit `playersMapped: 1000` statt echter Zahl; `importGameweek` baut `apiPlayerMap` nur aus 1000 extIds → ~3500 Spieler-Mappings fehlen → Scoring-Gaps im manuellen Import |
| `src/lib/services/__tests__/footballData.test.ts` | 2 neue Tests (Mapping-Chunking >1000, importGameweek extId-Pagination) | Regression-Guard — ohne Test rutscht der Pattern beim nächsten Refactor zurück |

**Nicht betroffen:**
- gameweek-sync L1244-1271 (bereits gefixt Slice 086+087, Code-Kommentar bestätigt)
- gameweek-sync L1583-1590 + L1596-1602 (`players UPDATE RETURNING .select('id')`) — Monitoring-Count-Blind-Spot, nicht Daten-Integrität. Update selbst läuft vollständig auf DB-Seite. Out-of-Scope, separater Task wenn nötig.
- `club_external_ids` + `clubs` Queries (~140 Rows total, safe unter 1000-Cap)

---

## Acceptance Criteria

1. **gameweek-sync Phase-A:** `player_external_ids`-Query returnt ALLE mapped player-IDs (verifizierbar via `count(*) FROM player_external_ids WHERE source IN ('api_football_squad','api_football_fixture')` = service-side-total).
2. **gameweek-sync Phase-A:** `players.in('club_id', allLeagueClubIds)` paginiert safely (heute 400-700/Liga, future-proof für multi-Liga wenn Aufruf ändert).
3. **footballData `getMappingStatus`:** `playersMapped` ist echter Count aller `player_external_ids`-Rows mit `source='api_football_squad'` (nicht mehr 1000-gecapped).
4. **footballData `importGameweek`:** `apiPlayerMap.size` entspricht echter extIds-Rows-Total; `playerPositions`-Map deckt alle `players` ab (nicht 1000-gecapped).
5. **Error-Propagation:** Jeder Chunk-Error wirft (no silent-fail, kein `return result.errors.push(...)` auf DB-Error im Chunk-Loop).
6. **Tests:** Neue Tests in `footballData.test.ts` simulieren >1000 Rows Szenario und grün.
7. **TSC:** `npx tsc --noEmit` clean.

---

## Edge Cases

1. **Exakt 1000 Rows:** `.range(0,999)` liefert 1000 rows → nächste Iteration `.range(1000,1999)` → kann leer sein → `data.length < PAGE` Stop-Condition greift.
2. **0 Rows Total:** Chunk-Loop läuft 1×, leer, break → Map bleibt leer → downstream Code (fixture-scoring) prüft ohnehin `if (!extIdRes.data?.length) throw` ⇒ OK.
3. **Network-Error mid-chunk:** Sofort throw (no partial-result), analog Slice 086 Pattern.
4. **Exact-multiple-of-page-size:** Letzte volle Page (z.B. 2000 rows → 1000+1000) → dritte Iter returnt `[]` → stop.
5. **Race-Condition Cron:** Zwei parallele `gameweek-sync`-Läufe würden identische Chunks lesen — kein Schreib-Konflikt, nur mehr Last. Kein Scope.
6. **Offline / Supabase down:** Chunk-Query wirft → Phase-A throws → Cron-Run failed visibly in logs, nicht silent 0-Stats.
7. **Große `in('source', [...])` Array-Größe:** Nur 2 Elemente, URL-safe.
8. **PostgREST Timeout 60s:** Realistisch 9-10 Chunks × ~50ms ≈ 500ms — deutlich unter timeout.
9. **Admin-UI Concurrent-Load:** `getMappingStatus`-Call geht durch `supabase` (RLS-Client). Chunks laufen sequentiell — Browser-Latenz-Additiv, aber Admin-UI ist Loading-spinner-OK.
10. **Test-Mock-Drift:** `mockSupabase`-Helper muss `.range()`-Calls mocken können. Check: existierender Mock in `test/mocks/supabase.ts` supported `.range()` bereits (Slice 086/133-Tests laufen).

---

## Proof-Plan

1. **Vitest:** `npx vitest run src/lib/services/__tests__/footballData.test.ts` → `worklog/proofs/134-footballData-tests.txt`
2. **TSC:** `npx tsc --noEmit` output → `worklog/proofs/134-tsc.txt`
3. **DB-Count-Evidence:** SQL-Query pre-fix vs expected-post-fix:
   - `SELECT COUNT(*) FROM player_external_ids WHERE source IN ('api_football_squad','api_football_fixture')` — echter Count
   - Comment: "Before fix: code saw min(count, 1000). After fix: full count via range()-loop."
   → `worklog/proofs/134-db-evidence.txt`
4. **Grep-Audit:** Nach Fix: `grep -rn '\.from.*player_external_ids' src/` zeigt alle Call-Sites mit dem neuen Pattern bzw. dokumentierter Safe-Kontext (eq+limit+single) → `worklog/proofs/134-grep-audit.txt`

**Skipped:** Live-Playwright-Screenshot — betroffene Endpoints sind Cron (kein UI) und Admin-Mapping-Tab (nicht-user-facing, wartet auf Admin-Workflow — nicht Beta-Blocker).

---

## Scope-Out (NICHT in diesem Slice)

- RPC-Konsolidierung (`getMappingStatus` via SECURITY DEFINER) — Post-Beta-Optimization.
- `players UPDATE RETURNING .select('id')` Count-Monitoring-Blind-Spot (L1583+L1596) — separater Follow-Up wenn Multi-Liga-Expansion zeigt dass Count-Log wichtiger wird.
- Refactor `fetchAllInChunks`-Helper extrahieren — Inline-Pattern bleibt konsistent mit 086/088/133. Abstraktion erst bei 4. Vorkommen.
- Reviewer-Agent-Dispatch — Money-adjacent Cron ist Solo-Claude-Regel (CLAUDE.md line 122).
- Post-Deploy-Playwright — kein UI-Surface betroffen.

---

## Risiken + Mitigation

| Risiko | Mitigation |
|---|---|
| Off-by-one in Range-Loop | Exactly like Slice 086/088/133: `range(offset, offset + PAGE - 1)` + `if (data.length < PAGE) break` + `offset += PAGE` |
| Test-Mock returns flat array für alle ranges → Infinite-Loop | Test verwendet deterministic Mock mit length < PAGE nach erstem Chunk |
| importGameweek Break wenn Playern-List leer | Existierender Guard `if (!extIds || extIds.length === 0) { errors.push('Keine gemappten Spieler'); return result; }` bleibt |
| Extra DB-Roundtrips kosten Zeit | ~8-9 Chunks statt 1 Query → +400ms im Cron-Run. Cron-Budget 300s erlaubt das problemlos |

---

## Implementation-Sketch

**gameweek-sync Phase-A (L595-615):**

```ts
// Replace single `player_external_ids` + `players` queries with paginated loaders
async function loadAllExtIds(): Promise<Array<{ player_id: string; external_id: string }>> {
  const PAGE = 1000;
  const out: Array<{ player_id: string; external_id: string }> = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('player_external_ids')
      .select('player_id, external_id')
      .in('source', ['api_football_squad', 'api_football_fixture'])
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`player_external_ids query failed (offset=${offset}): ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as Array<{ player_id: string; external_id: string }>));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}
// analog für players.in('club_id', allLeagueClubIds)
```

**footballData.ts `getMappingStatus`:**
- `player_external_ids` inline paginated (analog oben)
- `Promise.all` beibehalten aber den paginated-Loader im 4. Element als IIFE (gleiches Pattern wie `fixturesPaginated` heute)

**footballData.ts `importGameweek`:**
- Beide Queries (`player_external_ids` + `players.select('id, position')`) paginieren
- `Promise.all([extIdsPaginated, playersPaginated])`

---

## Estimated Time

- gameweek-sync Phase-A refactor: 15 Min
- footballData 2× paginate: 15 Min
- Tests updaten: 10 Min
- Proofs: 5 Min
- **Gesamt: 45 Min**
