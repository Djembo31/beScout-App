# Active Slice

```
status: active
slice: 282a
stage: PROVE (AC-01 Live-Run post-push offen)
spec: worklog/specs/282a-ops-recovery.md
impact: skipped (kein Service/RPC/DB — e2e-Test, GHA-YAML, Baseline-JSON, Docs)
proof: worklog/proofs/282a-ops-recovery.md
review: worklog/reviews/282a-review.md (Self-Review PASS — kein src/-Produktionscode, 1:1 errors-infra-Patterns)
```

## Slice 282a — Ops-Recovery nach 5-Wochen-Pause (M)

**Trigger:** Anil 2026-06-11 — Re-Onboarding-Session, Track-Auswahl „282 a".
**Scope (4 Tracks):**
- **A** Synthetic-Daily-Fix — Player-Link-Click-Timeout (33/36 Tage rot seit 2026-05-07). Root-Cause: `first()`-Locator auf live-re-rendernder /market-Liste nie „stable". Fix: href + goto.
- **B** Silent-Fail-Triage — 79 HIGH > Baseline 76 (stale seit Slice 238). Neue HIGHs reviewen (u.a. live-score-sync `.in('id', leagueIds)`), dann `.audit-baseline.json` updaten.
- **C** Nightly-Audit Master-Tracker — `nightly-audit.yml` auf SO-4-Pattern patchen + ~26 Duplicate-Issues batch-closen (45 → ≤5 offene).
- **D** Hygiene — stale Worktree `agent-a0ce80579fb4a81de` remove, Tooling-Diff committen (Hooks/settings/workflow.md/.agents-Migration), `beta-phase.md` auf LIVE-Realität (D71) korrigieren.

**Ausgeschlossen:** Slice 282 useHomeData (nächster), Lighthouse-Phase-3, Notion-Drift (Anil-Action).

## Zuletzt

- **Slice 281** (2026-05-06) — Synthetic-Daily-GHA-Verkabelung (XS, Self-Review PASS).
- **Slice 280** (2026-05-06) — Bundle Tree-Shaking −374 KB Total-FLJS (M, Reviewer PASS).
- **Slice 279** (2026-05-06) — Lighthouse-CI Baseline + GHA-Gate (M, Reviewer PASS).

Nächstes: Slice 282 — Cold-Start Phase 3 (`useHomeData`-Konsolidierung), Lighthouse-Baseline-Voraussetzung erfüllt.
