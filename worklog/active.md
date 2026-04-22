# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Zuletzt: Slice 144 (2026-04-22) — B3 TM-Squad-Page-Scraper (M)

Squad-Page-Scraper implementiert + lokal getestet. Dry-Run auf Süper-Lig
zeigt 18/18 Clubs, 366 matched players, 28 transfer-detected, 52 unknown.
BUILD + PROOF komplett, Full-Run wartet auf Anil (`--allow-transfers` y/n).

**Next:** Anil triggered entweder
- `npx tsx scripts/tm-squad-scrape-local.ts` (shirt-drift fix, kein Transfer-Apply)
- `npx tsx scripts/tm-squad-scrape-local.ts --allow-transfers` (28 Transfers live)
