# Slice 279 — PROVE-Output (Phase 1 BUILD-complete)

Generated: 2026-05-06T14:57:35Z
Stage: PROVE (post-BUILD, pre-REVIEW)

## 1. YAML Structural Sanity

```
[yaml-sanity] OK — all 15 structural checks passed
lines: 126 bytes: 6225
```

## 2. lighthouserc.json Schema Sanity

```
[json-sanity] OK
urls: [
  'https://bescout.net/',
  'https://bescout.net/market',
  'https://bescout.net/community'
]
runs: 3
preset: perf
throttling: simulate
formFactor: mobile
assertions: [
  'categories:performance',
  'categories:accessibility',
  'categories:best-practices',
  'categories:seo'
]
upload: filesystem -> ./.lighthouseci
```

## 3. LHCI CLI Available + Healthcheck

```
$ pnpm exec lhci --version
0.15.1

$ pnpm exec lhci healthcheck
✅  .lighthouseci/ directory writable
✅  Configuration file found
✅  Chrome installation found
⚠️   GitHub token not set
Healthcheck passed!
```

## 4. tsc --noEmit clean

```
$ pnpm exec tsc --noEmit (exit-code below)
exit=0
```

## 5. package.json script verification

```
    "size": "npx tsx scripts/check-bundle-size.ts",
    "lighthouse:local": "lhci autorun --config=./lighthouserc.json",
    "cron:audit": "npx tsx scripts/check-cron-registry.ts",
```

## AC-Audit (gegen Spec Sektion 6)

| AC | Status | Evidence |
|----|--------|----------|
| AC-01 [HAPPY] Workflow trigger deployment_status | ✅ wired | grep -q 'github.event.deployment_status.state' .github/workflows/lighthouse.yml |
| AC-02 [HAPPY] 3 URLs × 3 iterations | ✅ config | numberOfRuns: 3, urls.length: 3 |
| AC-03 [HAPPY] Mobile + Slow 4G simulated | ✅ config | preset: perf, throttlingMethod: simulate, rttMs: 150, throughputKbps: 1638.4 |
| AC-04 [HAPPY] Job-Summary LCP/CLS/TBT/Score Tabelle | ✅ wired | GITHUB_STEP_SUMMARY step + node-jq parse manifest.json |
| AC-05 [HAPPY] LHCI Artifact retention 30d | ✅ wired | actions/upload-artifact@v4 retention-days: 30 |
| AC-06 [WARN-PHASE-1] Kein hard-fail | ✅ config | All assertions level 'warn', kein 'error' in Phase 1 |
| AC-07 [WARN→2 TRANSITION] Baseline-Markdown | 🕐 deferred | wartet auf 3-5 Live-Runs (Phase 2 task) |
| AC-08 [GATE-PHASE-3] Hard-fail Gate | 🕐 deferred | wartet auf Baseline (Phase 3 task) |
| AC-09 [LOCAL-SCRIPT] pnpm run lighthouse:local | ✅ wired | grep -q 'lighthouse:local' package.json |
| AC-10 [PERMISSIONS] Workflow permissions explizit | ✅ wired | permissions: { contents: read, actions: read } in lighthouse.yml |

**Phase-1 BUILD-Status:** 8/10 ACs erfüllt direkt nach BUILD. AC-07 + AC-08 sind by-design deferred bis 3-5 Live-Runs nach push gesammelt.

## Phase-1-Live-Run (nächste Anil-Action: git push)

Nach `git push origin main` → Vercel-Deploy → deployment_status: success → lighthouse.yml triggert.

Verify-Commands für nächste Session:
```bash
gh run list --workflow=lighthouse.yml --limit=5
gh run view <run-id> --log
gh run download --name lhci-results-<sha-short> <run-id>
```
