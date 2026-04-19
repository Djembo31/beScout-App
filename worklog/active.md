# Active Slice

```
status: in_progress
slice: 083
stage: BUILD
spec: worklog/specs/083-altbestand-filter.md
impact: inline (spec Zeile 22-32, grep-verifiziert)
proof: worklog/proofs/083-after.txt (pending)
started: 2026-04-20
```

## Slice 083 — Altbestand-Filter `getPlayersByClubId`

Filter-Kriterium: `mv_source != 'transfermarkt_stale'` (nach Phase A).

**Rollout-Reihenfolge (Sicherheit):**
1. BUILD + MERGE Infrastruktur
2. NICHT pushen bis Wellen (Phase A.2) durch
3. Nach Wellen: Push → Deploy → QA

## Phase A — Fundament komplett (vorher)
- 081, 081b, 081c, 081d, 082 (siehe log.md)
- 4 CI-Guards: INV-36/37/38/39
- 2364 stale / 4556 (52%)

## Phase A.2 — Wellen (Anil lokal, BLOCKER fuer 083-Push)

```bash
# Welle 1 DE (~1h)
npx tsx scripts/tm-rescrape-stale.ts --league="Bundesliga" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="2. Bundesliga" --limit=500 --rate=3000

# Welle 2 TR (~1h)
npx tsx scripts/tm-rescrape-stale.ts --league="Süper Lig" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="TFF 1. Lig" --limit=500 --rate=3000

# Welle 3 EU-Top (~2h)
npx tsx scripts/tm-rescrape-stale.ts --league="Premier League" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="La Liga" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="Serie A" --limit=500 --rate=3000
```
