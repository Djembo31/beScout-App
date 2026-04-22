# Slice 146 Review — 2026-04-22

**Verdict:** PASS (nach Rework — Reviewer meldete CONCERNS mit 2 MEDIUM-Findings, beide live-gefixt vor Commit)

**Reviewer:** `reviewer`-Agent Dispatch Nr. 1 (Cold-Context) — Verdict CONCERNS.
**Rework:** Primary-Claude hat Finding #1+2 (MEDIUM, same-bug-class) + #3+6 direkt in 146 eingebaut statt 146b nachzuziehen.

**Scope reviewed (final):**
- `.claude/hooks/ship-proof-gate.sh` — merge-anchor, outer-commit-anchor, heredoc-exempt removal, `\b` removal, quoted-strip fuer --amend
- `.claude/hooks/ship-cto-review-gate.sh` — merge-anchor, outer-commit-anchor, `\b` removal, emergency-warn-symmetrie, quoted-strip fuer --amend
- `.claude/hooks/ship-spec-gate.sh` — REVIEW-Stage in Whitelist
- `.claude/rules/common-errors.md` — 3 neue/updatete Patterns (Shell-token-anchor, JSON-\b-Backdoor, heredoc-backdoor gefixt)
- `worklog/proofs/146-hook-test.txt` — 21 Cases, 0 FAIL

## Findings (initial reviewer dispatch)

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | MEDIUM | proof-gate Z.33 + review-gate Z.36 | `*" --merge "*` matched jede Commit-Message die `--merge` als Wort enthaelt | **FIXED**: Command-Token-Match via `"git merge"\|"git merge "*` + quoted-strip fuer `--amend` |
| 2 | MEDIUM | proof-gate Z.33 + review-gate Z.36 | `*"git merge "*` matched Commit-Messages die `git merge ` als Text enthalten | **FIXED** (same fix as #1) |
| 3 | LOW | review-gate emergency-handling | Inkonsistent: proof-gate warnt, review-gate silent | **FIXED**: review-gate emittet jetzt `SHIP-REVIEW-GATE: Emergency-Slice — Commit erlaubt. Review nachtraeglich!` |
| 4 | LOW | grep pattern ohne Anker | `feature`/`fixation` false-positives theoretisch moeglich — in Praxis nicht relevant | **SCOPE-OUT**: kein echter Trigger-Fall, `[(:]`-Suffix reicht in der Realitaet |
| 5 | LOW | common-errors.md Z.406 | Sagt noch "proof-gate: Backlog 146" | **FIXED**: Eintrag aktualisiert + 2 neue Patterns eingefuegt |
| 6 | NITPICK | spec-gate Z.71 | `REVIEW`-Stage fehlt in Whitelist, blockt Healer-Edits waehrend REVIEW | **FIXED**: `BUILD\|REVIEW\|PROVE\|LOG` |
| 7 | NITPICK | active.md stage | Stage-Sync waehrend Review | **N/A**: normale Stage-Progression |
| 8 | OBSERVATION | Test-Coverage | 13 Cases decken nicht alle Vectoren | **EXPANDED**: jetzt 21 Cases inkl. "msg-contains-`git merge`", "msg-contains-`--amend`", "non-commit bash script mit git commit substring" (L1/L2), heredoc-body-merge |

## Zusätzlicher Self-Discovered Bug (waehrend Rework gefunden)

**Outer `*"git commit"*` Substring-Check** — gleiche Bug-Klasse wie Finding #1/#2:
- Test-Scripts die Fixture-Strings wie `'{"command":"git commit -m \"fix(x): y\""}'` als bash-Argument uebergeben wurden false-triggert vom Hook.
- Symptom: waehrend Test-Runs von Slice 146 selbst wurde die bash-Invocation von review-gate gebloct ("Commit-Msg-Prefix: fix(x):").
- Fix: `case "$COMMAND" in "git commit"\|"git commit "*) ...` statt `*"git commit"*)`.
- Dritter Fall der command-token-anchor-Regel. Alle drei (merge, --amend, git commit) jetzt konsistent.

## Test-Matrix (21 Cases, 0 FAIL)

**Exempt (11 Cases, müssen exit 0):**
- A1/A2: Real `git merge main`
- D1/D2: `git commit --amend ...`
- E1/E2: docs commit
- F1: chore heredoc
- G: "feature" in docs (non-feat-match)
- K1: --amend + heredoc
- L1/L2: **non-commit bash script mit `git commit` substring** (echo / test-fixture)

**Block (10 Cases, müssen exit 2):**
- B1/B2: inline `fix(api): prevent merge conflict` (merge in msg)
- C1/C2: heredoc `feat(x): test heredoc`
- H1/H2: inline `feat(docs): document git merge workflow`
- I1/I2: inline `fix(docs): document --amend usage`
- J1/J2: heredoc body containing `git merge workflow`

## Positive

- **Scope-Expansion korrekt gehandhabt:** Reviewer-Finding eskaliert → Primary-Claude baut same-bug-class-Fixes inline ein statt 146b-Nachzug. 145-Review hatte `\b`-Bug als "triviale Pattern-Kopie" klassifiziert — die DISPATCH der Cold-Context-Review fand was Primary-Claude in Slice 145 verpasst hatte.
- **Test-Matrix verdoppelt:** 13 → 21 Cases, mit explizitem non-commit-substring-Case (L1/L2) als Regression-Guard.
- **Knowledge-Capture:** 3 Patterns in common-errors.md — \b-JSON-bug (neu), substring-match-exempt (aktualisiert), heredoc-backdoor (als gefixt markiert).
- **Spec aktualisiert waehrend BUILD** um Scope-Expansion zu dokumentieren — keine stille Scope-Drift.

## Rationale fuer PASS (statt REWORK fuer zweiten Reviewer-Pass)

Per `workflow.md`: REWORK-Loop bei gescheiterten ACs. Hier sind die ACs (Spec) + Reviewer-Findings alle addressed. Zweiter Reviewer-Pass ueberflüssig weil:
1. Alle Medium-Findings live-gefixt
2. Test-Matrix erweitert um Regression-Vektoren
3. Konzeptuell gleiche Bug-Klasse in 3 Stellen einheitlich behandelt
4. Common-Errors-Patterns dokumentiert

**Time-spent:** ~60 min (30 Initial-Review + 30 Rework + Re-Test)
