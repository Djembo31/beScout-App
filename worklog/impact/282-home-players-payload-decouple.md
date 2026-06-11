# Impact 282 — Home von /api/players entkoppeln

**Datum:** 2026-06-11 · grep-verifiziert (nicht geraten)

## Konsumenten-Map `useHomeData.players` (vollständig)

`useHomeData` hat genau 1 Konsument: `src/app/(app)/page.tsx:95`. page.tsx reicht `players` an 4 Children + nutzt es selbst:

| Konsument | Nutzung | Ersatz-Quelle |
|---|---|---|
| `page.tsx:106` | `playersError && players.length===0` → Error-Retry-Screen | Error-State der neuen Home-Kern-Queries (trending + dashboard) |
| `page.tsx:205` | `playersLoading` → Spotlight-Skeleton | Loading von trending/ipos/byIds |
| `page.tsx:352-377` | `activeIPOs[0].{id,first,last,club,ipo.progress,ipo.price}` Sidebar-IPO (DEAD — rendert nie) | `useActiveIpos()` + byIds(ipo player_ids) + Shape-Mapping |
| `HomeSpotlight.tsx:206` | topMover-Slot: nur `matchedPlayer?.prices.history7d` (Sparkline); Rest aus holdings | byIds([best.playerId]) |
| `HomeSpotlight.tsx:243` | trending-Slot: `matchedPlayer.{id,imageUrl,first,last,pos}` | byIds([trending[0].playerId]) |
| `LastGameweekWidget.tsx:152` | playerMap.get(row.playerId) für ≤12 Lineup-Rows | byIds(lineup playerIds) — Widget-intern |
| `MarktPuls.tsx:134` → `TopMoversStrip.tsx:16` | global sort/filter by change24h | `/api/players?movers=true&limit=N` (existiert, 5-min-cached, PLAYER_SELECT_COLS) → neuer Hook `useGlobalMovers` |
| `MarktPuls.tsx:139` → TrendingPlayersStrip | trending-Join | byIds(trending ids) — via useHomeData `trendingWithPlayers` (bleibt, neue Quelle) |
| `FollowingFeedRail.tsx:40` | playerMap für Trade-Enrichment (hat bereits Fallback für missing players) | byIds(feed player_ids) — Rail-intern |

## Side-Effects

- **Cache/Keys:** Neu `qk.players.byIds(sortedIds)` + `qk.players.globalMovers(limit)`. `qk.players.all` wird auf Home NICHT mehr geprimed → Navigation Home→Market lädt /api/players erst bei Market-Mount (war vorher pre-warmed — bewusster Trade-off, Market-User zahlen den Fetch dort wo er gebraucht wird).
- **RLS:** `players` + `ipos` sind Client-SELECT-readable (Market nutzt beide via Client-Query heute schon) — kein neuer RPC, kein SECURITY DEFINER.
- **Realtime/Invalidation:** keine — alle neuen Queries sind staleTime-cached reads.
- **Behavior-Change:** IPO-Spotlight/Sidebar kann erstmals rendern (war dead). D63-Intent.
- **Kein Schema-Change, keine Migration.**

## Dispatch-Entscheidung

Single-Domain-Refactor (Frontend + Query-Layer), aber interdependente Kette Hook→page→4 Children. Parallel-Worktrees würden Merge-Konflikte in page.tsx/useHomeData erzeugen. → **Serial-BUILD in 3 Waves** (1: Service+Hooks · 2: useHomeData+page.tsx · 3: 4 Children), tsc nach jedem File. Cold-Context-Review nach BUILD (M-Slice, Behavior-Change).
