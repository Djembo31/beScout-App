# JSONB-Return Performance-Audit (Slice 270d v2)

**Datum:** 2026-05-05 Abend
**Trigger:** active.md Self-Audit Item 5 — „JSONB-Return ohne Performance-Audit"

## Messung (DB-Side)

```sql
SELECT pg_size_pretty(pg_column_size(rpc_get_recent_player_scores())::bigint) AS jsonb_size,
       pg_column_size(rpc_get_recent_player_scores()) AS bytes,
       jsonb_array_length(rpc_get_recent_player_scores()) AS array_length;
```

| Metrik | Wert |
|--------|------|
| JSONB-Payload (raw) | **1.619 KB** (~1,6 MB) |
| Bytes | 1.657.808 |
| Array-Length | 15.350 Elemente |
| Bytes/Element | ~108 (UUID + 2 ints in JSONB) |

## Mobile Cold-Start-Schätzung

| Schritt | Mobile 4G | Desktop |
|--------|-----------|---------|
| Network Download (1.6MB raw) | ~1500-2500ms | ~200-400ms |
| Gzip-Compressed (~400KB) | ~400-600ms | ~50-100ms |
| JSON.parse (15k Array) | ~200-400ms | ~50-100ms |
| Map-Build (5er Slots × 4556 Spieler) | ~50-100ms | ~10-20ms |
| **Total Cold-Start** | **~650-1100ms** | **~110-220ms** |

## Konsumenten-Analyse

| Konsument | Anzahl Spieler tatsächlich gebraucht | Verschwendung |
|-----------|--------------------------------------|---------------|
| KaderTab (Mein Kader) | ~30 (User-Holdings) | ~99% (15.000 unbenötigte Slots) |
| TransferListSection | ~50-200 (Players mit Listings) | ~98% |
| ClubAccordion (Marktplatz) | ~4.000-4.556 (Liga-gefiltert) | ~10-30% |
| MarketContent | ~4.500 | ~5% |

**Beobachtung:** ClubAccordion + MarketContent rechtfertigen den Full-Payload. KaderTab + TransferListSection zahlen 99% Overhead.

## Cache-Wirkung im Real-World-Flow

User-Journey: `/market` öffnen → Marktplatz-Tab default → Mount-Cache füllt für Marktplatz → User wechselt zu „Mein Kader" → Cache-Hit aus Marktplatz-Mount.

**Ergebnis:** In der Praxis 1× Cold-Start pro Session × 5min staleTime. Sekundär-Tabs profitieren vom Cache.

## Empfehlung

**Status-Quo akzeptieren für Beta-Launch.** Begründung:
1. ClubAccordion + MarketContent brauchen den Full-Payload eh.
2. KaderTab + TransferListSection profitieren vom Cache (Marktplatz-First-Mount-Pattern).
3. 1× ~700ms Cold-Start pro 5-Min-Window ist akzeptabel mit gzip.

**Slice 271+ als Polish (post-Beta):**
- Wenn Sentry-Performance Mobile P75 LCP > 4s zeigt → Filter-Param hinzufügen
- `rpc_get_recent_player_scores(p_player_ids uuid[] DEFAULT NULL)` — DEFAULT NULL liefert alle
- 2-Tier-Hooks: `useMyPlayerScores(holdings)` + `useAllPlayerScores()` mit separaten QueryKeys
- KaderTab (Holdings-only) wäre dann ~30KB statt 1.6MB

**Anti-Pattern verhindert:** Premature optimization. Ohne Sentry-Daten messen wir nicht wirklich User-Impact, nur theoretische Worst-Case.

## CTO-Decision

PASS-Status-Quo. Slice 270d v2 deployed live ohne User-Beschwerde. Polish nur wenn Performance-Telemetrie es rechtfertigt (Sentry-Performance + Mobile-LCP > 4s P75 für `/market`).
