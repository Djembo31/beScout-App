# Active Slice

```
status: idle
slice: 279
stage: LOG (commit pending push)
spec: worklog/specs/279-lighthouse-ci-baseline.md
impact: skipped (neue Workflow-Datei + Config, keine Service/RPC/DB)
proof: worklog/proofs/279-build-prove.md
review: worklog/reviews/279-review.md (PASS, 2 minor Spec-Drifts F-01+F-02 in Spec gefixt)
```

## Slice 279 — Lighthouse-CI Baseline + GHA-Gate (Cold-Start-Track Foundation)

Phase 1 BUILD complete. Files live:
- `.github/workflows/lighthouse.yml` — neuer Workflow, deployment_status-trigger, 3 URLs × 3 runs Mobile-Slow-4G
- `lighthouserc.json` — pre-existing orphan (commit 8aad8428 vom 2026-04-19) auf Phase-1-Config aktualisiert
- `package.json` — neuer Script `lighthouse:local`

**Anil-Action für Phase-1-Live:** `git push origin main` → Vercel-Deploy-success → Workflow läuft automatisch. Verify: `gh run list --workflow=lighthouse.yml --limit=5`.

**Phase 2 (deferred bis 3-5 erfolgreiche Live-Runs gesammelt):** `worklog/audits/2026-05-06/lighthouse-baseline.md` mit Mean ± StdDev pro Metric → ableitbare Gate-Schwellen.

**Phase 3 (separater LOG-Step nach Anil-Approval der Schwellen):** `lighthouserc.json` `assertions`-Block auf `error`-Level mit konkreten Schwellen → hard-fail Gate live.
