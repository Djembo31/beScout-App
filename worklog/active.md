# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
started: —
```

## Letzter Slice: 081d — Ghost-Rows Cleanup ✅

11 Ghost-Rows bei Aston Villa (Cross-Club-Contamination vom 16.04. Sync) auf `club_id=NULL` verschoben. Aston Villa squad: 62 → 51. Money-Invariant identisch. INV-39 als CI-Guard.

## Phase A — Fundament komplett ✅
- 081 Mass-Poisoning:    897 flagged
- 081b Paired-Poisoning: +36 flagged
- 081c Orphan Contracts: +1434 flagged
- 081d Ghost-Rows:       11 orphaned
- 082 Re-Scraper Script: built + smoke-tested
- **4 CI-Guards live**: INV-36, INV-37, INV-38, INV-39

## Vorher: 082 — Re-Scraper Script ✅

`scripts/tm-rescrape-stale.ts` gebaut. Filtert auf `mv_source='transfermarkt_stale'`, scraped via Playwright lokal (Cloudflare-bypass), setzt auf `transfermarkt_verified` bei Success.

Smoke-Test Bundesliga 3/3 gruen — Contract-Ends aktualisiert (Machida 2025→2029, Ngoumou 2022→2027).

## Phase-A Flag-Trilogie (alle DONE)
- 081 Mass-Poisoning (Cluster >=4): 897 flagged
- 081b Paired-Poisoning (+last_name match): +36
- 081c Orphan Stale Contracts (>12 Mon.): +1434
- **Total stale: 2367 / 4556 (52%)**
- 3 CI-Regression-Guards: INV-36/37/38

## Phase A.2 — Lokale Wellen (Anil auszufuehren)

```bash
# Welle 1 — DE-Ligen (~530 Spieler, ~1h)
npx tsx scripts/tm-rescrape-stale.ts --league="Bundesliga" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="2. Bundesliga" --limit=500 --rate=3000

# Welle 2 — TR-Ligen (~550 Spieler, ~1h)
npx tsx scripts/tm-rescrape-stale.ts --league="Süper Lig" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="TFF 1. Lig" --limit=500 --rate=3000

# Welle 3 — EU-Top-3 (~1200 Spieler, ~2h)
npx tsx scripts/tm-rescrape-stale.ts --league="Premier League" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="La Liga" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="Serie A" --limit=500 --rate=3000
```

## Phase A.3 — Nach Wellen

- **Slice 083 reaktivieren**: Frontend-Filter `getPlayersByClubId` mit `AND mv_source != 'transfermarkt_stale'` als stringentem Filter-Kriterium. Spec `worklog/specs/083-altbestand-filter.md` bleibt als Referenz.
- **Slice 081d**: Player-Row-Dedup (Mio Backhaus × 2, Marco Friedl × 2 etc. — ~10 Faelle aus 081b aufgedeckt).

## Nicht in Phase A

- **CI-Blocker** `useMarketData.test.ts:283` — computePlayerFloor referencePrice fallback. CEO-Money-Decision pending.
- **Slice 081d** (Player-Dedup): separate Arbeit mit Holdings-Merge-Logic.
