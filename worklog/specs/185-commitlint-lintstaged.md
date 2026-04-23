# Slice 185 — commitlint + lint-staged (Tier D5)

**Typ:** XS-Slice. Money-Path: Nein. Tooling-Setup.

---

## Ziel

Commit-message enforcement (conventional-commits) + formal lint-staged statt custom-bash in `.husky/pre-commit`. Bundle-Budget (size-limit) als 185b ausgelagert (Budget-Definition braucht eigene Deliberation).

---

## Scope

- `@commitlint/cli` + `@commitlint/config-conventional` (regular devDeps)
- `lint-staged` (regular devDeps)
- `commitlint.config.js` — `extends: ['@commitlint/config-conventional']` mit BeScout-Custom-Scopes
- `.lintstagedrc.json` — eslint on *.{ts,tsx,js,jsx,mjs} + tsc --noEmit auf geänderte TS-Files
- `.husky/commit-msg` — new hook `npx commitlint --edit $1`
- `.husky/pre-commit` — refactored auf `npx lint-staged` (eliminiert custom bash-grep)
- `package.json` scripts: optional `lint:staged`

## Acceptance Criteria

1. **A1** — `@commitlint/cli` + `@commitlint/config-conventional` + `lint-staged` in devDeps
2. **A2** — `commitlint.config.js` mit extended conventional + BeScout-Types + scopes (optional)
3. **A3** — `.lintstagedrc.json` konfiguriert für ESLint
4. **A4** — `.husky/commit-msg` hook einsatzbereit — blockt non-conventional commits
5. **A5** — `.husky/pre-commit` refactored auf `npx lint-staged` + `npx tsc --noEmit`
6. **A6** — Test: blocker-commit (message without type) schlaegt fehl
7. **A7** — Test: bypass-commit (valid feat/fix) funktioniert

---

## Scope-Out

- Bundle-Budget (size-limit) — eigener Slice 185b weil Budget-Definition pro Page Deliberation braucht
- Commit-body-length / footer-rules — default aus config-conventional reicht

---

## Proof

`worklog/proofs/185-commitlint.txt`

## Time

~15 min.
