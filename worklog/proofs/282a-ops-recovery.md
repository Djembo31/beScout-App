# Proof Slice 282a — Ops-Recovery (2026-06-11)

## AC-02 — Silent-Fail-Check grün

```
> bescout-app@0.1.0 audit:silent-fail:check
scanned 1145 files, found 173 candidates (79 HIGH, 94 MEDIUM)
[--check] baseline: 173 total, 79 HIGH, 94 MEDIUM
✅ audit within baseline
```

Triage der 3 neuen HIGHs (Full-JSON-Diff aktueller Tree vs. Temp-Worktree auf Baseline-Commit 630c15a6):

```
--- NEUE HIGH (3) ---
src/app/api/cron/live-score-sync/route.ts:172 [in-without-chunking] .in('id', leagueIds)
src/lib/services/cronHealth.ts:68 [in-without-chunking] .in('home_club_id', clubIds)
src/lib/services/cronHealth.ts:81 [in-without-chunking] .in('home_club_id', clubIds)
--- WEGGEFALLENE HIGH (0) ---
```

- live-score-sync:172 — `leagueErr` explizit gehandelt, leagueIds = distinct league_ids im Live-Window (≤7). Chunking unnötig → akzeptiert.
- cronHealth:68+81 — clubIds per-Liga (`.eq('league_id', ...)`, ≤24 IDs). Service ist bewusst fail-open (try/catch → HEALTHY). → akzeptiert.

## AC-04 — Issue-Count 45 → 2

```
$ gh issue list --state open    (vorher: 45)
67 🚨 Master-Tracker: Synthetic-User-Suite Failures (post-Slice-281)
63 🚨 Master-Tracker: Beta Smoke Cold-Start-Transients (post-Slice-SO-4)
$ gh issue list --state open --json number -q '. | length'
2
```

43 `🔍 Nightly Audit`-Duplicates (#41–#102) batch-closed mit Triage-Kommentar.

## AC-03 — nightly-audit.yml Master-Tracker-Pattern

`listForRepo` (Label `nightly-audit`) → Title-Heuristik `/Master[- ]?Tracker/i` → ältestes-offenes-Fallback → `createComment`; `issues.create` nur wenn kein Master existiert. YAML: `√ YAML Lint successful.`

## AC-05 — Worktrees clean

```
$ git worktree list
C:/bescout-app  e8e4acb1 [main]
```

(agent-a0ce80579fb4a81de unlocked + removed, Branch deleted. Dirty-Check vorher: nur CRLF-Noise in settings.local.json.)

## AC-08 — tsc clean

`npx tsc --noEmit` → exit 0 (Background-Task bao572g92, 2026-06-11).

## Track A — Synthetic-Fix

Root-Cause-Beweis: Run 27336160129 Warm-Up-Log zeigt `[warm-up] ✅ bescout.net responded 200 (warm)` bei Attempt 1 — Cold-Start ist NICHT die Ursache. Failure ist `locator.click: Timeout 30000ms` (`2 × waiting for element to be visible, enabled and stable … 14 × retrying click action`) auf live-re-rendernder /market-Liste. Fix: href-Extraktion + `page.goto()`.

`pnpm exec playwright test --list --project=synthetic` → 3 Tests geparst.

## AC-01 — Synthetic-Live-Run (post-push)

→ siehe Abschnitt unten (nach Push dispatcht + verifiziert).
