# Slice 185b — Bundle-Budget-Gate

Baseline-Snapshot der Bundle-Sizes + CI-Gate bei Regression.

## Files
- `bundle-budget.json` NEU — thresholds pro Route + shared-bundle.
- `scripts/check-bundle-size.ts` NEU — parst `next build` output, exit 1 bei violations.
- `package.json` — script `"size": "npx tsx scripts/check-bundle-size.ts"`.
- `.github/workflows/ci.yml` — build-Job tee-t output zu `build-output.txt`, danach size-check.

## Baseline (2026-04-24)
- **Shared First Load JS: 162 kB** (budget 170 kB)
- **51 routes** total (app pages + API)
- **Largest routes:**
  - /club/[slug]/admin 387 kB (budget 400)
  - /bescout-admin 379 kB (budget 395)
  - /player/[id] 378 kB (budget 390)
  - /community 364 kB (budget 375)
  - /club/[slug] 362 kB (budget 375)
  - / 358 kB (budget 370)
  - /market 346 kB (budget 360)
- **Budget-Headroom:** ~10-15 kB pro Route (erlaubt kleine Schwankungen, Pro-Slice-Wachstum sichtbar).

## Thresholds-Strategie
- Fuer tracked routes (die wichtigsten): enge Grenzen (+10-15 kB Headroom).
- Fuer untracked routes: `_default: 350 kB` Fallback (nur API-Routes bei 0 oder kleine Statische Seiten betroffen).
- `shared_kb` strikt (170) — jede Wachstum im shared-bundle ist platform-weite Last.

## Usage
```bash
# Lokal:
pnpm run size               # build + check
pnpm run build | npx tsx scripts/check-bundle-size.ts   # pipe mode

# CI:
automatisch in .github/workflows/ci.yml build-Job
```

## AC
1. `pnpm run size` zeigt Tabelle aller routes mit budget/delta/indicator.
2. Exit 1 bei jeder Route ueber Budget oder shared > threshold.
3. Baseline-Snapshot 2026-04-24: 0 violations.
4. CI-Gate im build-Job — PR-Blocker bei regression.

## Scope-Out
- Per-Chunk size-limit (z.B. country-flag-icons <20kb): Slice 185c falls gewuenscht.
- Bundle-Analyzer Report-Upload als CI-artifact: Follow-up.
- Auto-budget-tightening nach optimization-slices: manuelle JSON-Update bleibt.

## Proof
worklog/proofs/185b-bundle-baseline.txt — full pnpm run size output mit 51/51 routes pass.
