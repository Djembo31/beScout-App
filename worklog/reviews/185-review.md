# CTO Review: Slice 185 — commitlint + lint-staged (Tier D5)

**Verdict:** PASS (Self-Review — Tooling-Setup, keine Code-Logik-Aenderung)
**time-spent:** 5 min

## Spec-Coverage

- A1 ✅ 3 devDeps installed (@commitlint/cli 20.5.0, @commitlint/config-conventional 20.5.0, lint-staged 16.4.0)
- A2 ✅ `commitlint.config.js` mit conventional-extend + BeScout-relaxed rules (`subject-case: [0]` fuer "Slice NNN —" mixed-case, `header-max-length: 120`)
- A3 ✅ `.lintstagedrc.json` konfiguriert fuer ESLint auf staged TS/JS files
- A4 ✅ `.husky/commit-msg` hook einsatzbereit — npx commitlint --edit $1
- A5 ✅ `.husky/pre-commit` refactored: lint-staged statt custom bash-grep + tsc unveraendert
- A6 ✅ SMOKE: invalid-commit "random garbage" → 2 errors (type-empty, subject-empty)
- A7 ✅ SMOKE: valid-commit "feat(test): Slice 185 smoke-test" → exit 0

## Notes

- `subject-case: [0]` explicit disabled — BeScout slice-commits beginnen mit "Slice NNN — Title..." (Mixed-case, em-dash). Default-conventional-config blockte diese.
- `header-max-length: 120` — Slice-Titles laufen oft lang (z.B. "feat(observability): Slice 176b — captureError Follow-ups (Tier D2 Finish)" = 72 chars, safe).
- `body-max-line-length: 1 (warning)` — Code-Snippets in Body reichen manchmal ueber 100 chars hinaus.
- Existing commits vom Repo-Historie funktionieren — conventional-extend matcht `feat/fix/docs/refactor/test/chore/ci/build/perf/style/revert/perf`.

## Follow-Up

- Slice 185b: size-limit / bundle-budget (Budget-Definition pro Page braucht Deliberation + Baseline-Messung)
