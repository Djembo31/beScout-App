# Slice 117 — Data-Quality Closure (Status + Action-Plan)

## Ziel (1 Satz)
Bring alle 7 Ligen auf >95% MV-Coverage durch gezielte Re-Scrape-Wellen + CSV-Imports.

## Aktueller Stand (DB verifiziert 2026-04-20)

| Liga | Total | MV% | MV=0 | Contract missing | Re-Scrape-Bar (TM+active) |
|------|-------|-----|------|------------------|---------------------------|
| Bundesliga | 568 | **97.4%** | 15 | 15 | 10 |
| 2. Bundesliga | 543 | **96.1%** | 21 | 10 | 14 |
| Serie A | 645 | 93.0% | 45 | 47 | 37 |
| La Liga | 681 | 92.4% | 52 | 40 | 24 |
| Premier League | 636 | 89.2% | 69 | 66 | 55 |
| Süper Lig | 608 | 83.2% | 102 | 58 | 72 |
| TFF 1. Lig | 756 | **74.3%** | 194 | 159 | 89 |

**Total 498 Players mit MV=0** (davon 301 re-scrape-bar, 197 unmapped).

## mv_source Breakdown

| Quelle | Total | MV=0 | TM-mapped | Aktiv |
|--------|-------|------|-----------|-------|
| transfermarkt_verified | 3.673 | 207 | 3.603 | 3.519 |
| unknown | 551 | 395 | 170 | 141 |
| transfermarkt_stale | 332 | 2 | 149 | 278 |

## Strategie — 3 Phasen

### Phase 1 — Re-Scrape "stale" (278 aktive)
```bash
cd C:\bescout-app
npx tsx scripts/tm-rescrape-stale.ts --limit=500
```
- Default mv_source='transfermarkt_stale'
- Läuft lokal via Playwright (Cloudflare-Block auf Vercel)
- Erwartung: ~50-70% Success-Rate = 150-200 Players auf verified
- Dauer: ~20-25 min bei 2.5s Rate-Limit

### Phase 2 — Re-Scrape "unknown" mit TM-Mapping (141 aktive)
```bash
npx tsx scripts/tm-rescrape-stale.ts --mv-source=unknown --limit=200
```
- Zielt auf `mv_source='unknown'` AND active (matches>0 || last_gw>0)
- Erwartung: ähnliche Success-Rate → 80-100 Players auf verified
- Dauer: ~15-20 min

### Phase 3 — TFF 1. Lig CSV-Import (197 unmapped total, 105 TFF1)
- CSV-Workflow via Admin-UI (bestehend seit Slice 079)
- Manuell einzutragen durch Anil mit TM-Profile-URLs
- Alternative: `scripts/tm-search-scrape-unknown.ts` (Search-based Mapping-Finder)

```bash
npx tsx scripts/tm-search-scrape-unknown.ts --league="TFF 1. Lig" --limit=50
```
- Sucht nach Name+Club auf TM, findet URLs
- Schreibt player_external_ids bei Match
- ~30% Success-Rate bei eindeutigen Namen (aus Slice 075 Evidence)

## Nicht-Angehen (Scope-Out)

- **207 "verified MV=0"** Players — TM sagt tatsächlich MV=0 (Jugend, Retired, Ersatzbank). Kein Rescrape-Fix.
- **228 `last_appearance_gw=0 OR NULL` mit MV=0** — Ghost-Kandidaten, aber könnten auch Winter-Transfers sein. Manueller Review > Auto-Delete.

## Acceptance Criteria

1. Phase 1 executed → stale-count sinkt von 332 auf <100
2. Phase 2 executed → unknown+TM-mapped+active sinkt von 141 auf <50
3. Post-run: alle Ligen außer TFF1 auf >95% MV-Coverage
4. TFF1 (mit Phase 3): auf >85% (vorher 74.3%)
5. Keine Regressions auf verified count
6. Post-Run DB-Check SQL dokumentiert

## Execution Notes

- Scripts MÜSSEN lokal laufen (Playwright + Cloudflare-Bypass)
- Anil hat Erfahrung mit diesen Scripts aus Slice 081/082/099
- Rate-Limit bei 2500ms default (TM-Compliance)
- Bei HTTP 429: Script macht Exponential-Backoff
- Snapshot vor Run: `SELECT mv_source, COUNT(*) FROM players GROUP BY mv_source`

## Proof-Plan (nach Anil's lokalem Run)

- `worklog/proofs/117-phase1-rescrape-output.txt` — Script-Log
- `worklog/proofs/117-phase2-rescrape-output.txt`
- `worklog/proofs/117-post-stats.sql.txt` — Vorher/Nachher mv_source-Counts
- Per-Liga MV% Table vor/nach

## Scope-Out → Slice 118+

- Phase 3 CSV-Import (braucht Anil manuelle Zeit)
- Ghost-Audit für die 228 inaktiven-MV=0-Player
- 501 Contract-Missing Players — auto-filled beim erfolgreichen Re-Scrape (TM liefert contract_end mit)
