# Slice 190 Proof — CI-Check Cron-Route-Registry-Audit

**Datum:** 2026-04-24
**Scope:** XS (1 Script + 1 package.json entry + 1 CI-Step)
**Ziel:** Verhindert Slice 187b-Typ Silent-Gap (route.ts existiert, vercel.json-Entry fehlt → Cron nie getriggert).

## Files

1. `scripts/check-cron-registry.ts` (NEU, 75 L)
2. `package.json` (+1 Script `"cron:audit"`)
3. `.github/workflows/ci.yml` (+1 Step im lint-Job)

## Audit-Logic

1. Liste alle Directories in `src/app/api/cron/*/` die eine `route.ts` haben → Code-Routes
2. Lese `vercel.json`, extrahiere `crons[].path` → Registered-Paths
3. Diff:
   - **Routes in code MISSING in vercel.json** → Slice 187b Pattern (Cron nie auto-getriggert)
   - **Paths in vercel.json MISSING route.ts** → 404 wenn Vercel Cron triggert
4. Bei Mismatch: print detail → `exit(1)`. Bei OK: `exit(0)`.

## Positive-Test (current state)

```
$ npx tsx scripts/check-cron-registry.ts
=== Cron-Route-Registry Audit ===
Code routes:       11
vercel.json paths: 11

✓ OK — all cron-routes registered in vercel.json

Exit code: 0
```

## Negative-Test (synthetic ghost-route)

Simulated mit temporärer Test-Route:
```
$ mkdir -p src/app/api/cron/test-ghost-route
$ echo 'export async function GET() { return new Response("test"); }' > src/app/api/cron/test-ghost-route/route.ts
$ npx tsx scripts/check-cron-registry.ts

=== Cron-Route-Registry Audit ===
Code routes:       12
vercel.json paths: 11

✗ Routes in code but MISSING in vercel.json (1):
  - /api/cron/test-ghost-route

  Fix: Add entry to vercel.json "crons" array:
    { "path": "<path>", "schedule": "<cron-expr>" }

Exit code: 1  (expected 1 — CI would fail)
```

Test-Directory nach Verify entfernt. Current state verified clean.

## CI-Integration

```yaml
jobs:
  lint:
    steps:
      - run: pnpm run lint
      - run: pnpm run type-check
      - run: pnpm run audit:silent-fail:check
      - run: pnpm run cron:audit       ← NEU (Slice 190)
```

Läuft als letzter Step im lint-Job (schnell, keine network dependencies).

## Acceptance Criteria

| # | AC | Status |
|---|----|----|
| 1 | Script listet alle cron-Routes (11) | ✅ |
| 2 | Script vergleicht mit vercel.json crons[] | ✅ |
| 3 | Exit 0 wenn match | ✅ |
| 4 | Exit 1 + actionable error-message wenn mismatch | ✅ |
| 5 | `pnpm run cron:audit` Script-Entry | ✅ |
| 6 | CI-Step in `.github/workflows/ci.yml` lint-Job | ✅ |
| 7 | Symmetric check: route→json + json→route | ✅ (beide Richtungen) |

## Verified

- `npx tsx scripts/check-cron-registry.ts` exits 0 on current state
- Negative-test (ghost route) exits 1 with clear message
- `npx tsc --noEmit` clean (script uses node:fs/path, no external types)

## Edge-Cases handled

- Directory existiert aber ohne `route.ts` → ignored (nicht als Route gezählt)
- vercel.json ohne `crons` array → `(parsed.crons ?? [])` fallback
- Symmetric diff: code→json AND json→code (beide können Gap sein)
- Exit-Code unterschiedlich je Richtung — konsolidiert auf exit 1 bei any mismatch

## Impact

- Verhindert permanent Slice 187b-Klasse-Gaps (route.ts ohne registry entry)
- Läuft in CI = PR-Gate (können nicht mehr mergen bei Mismatch)
- Läuft auch local via `pnpm run cron:audit` (fast = sub-second)
- Kein Production-Impact (reines Dev-Tool)
