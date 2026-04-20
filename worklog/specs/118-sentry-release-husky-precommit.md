# Slice 118 — Sentry Release-Tracking + Husky Pre-commit (Operational Hygiene)

## Ziel (1 Satz)
Source-Map-Upload zu Sentry bei jedem Deploy via `withSentryConfig`, plus Husky-Gate (tsc + eslint on staged files) vor JEDEM Commit.

## Root-Cause

Fehlend operational hygiene:
- `next.config.mjs` wrapped nicht `withSentryConfig()` → keine source-maps upload → Error-Stacks ohne original-Code
- Kein Git-Hook → tsc errors können eingecheckt werden (manche Slice-Failures hätten hier gecatcht werden können)

## Changes

### `next.config.mjs`
```js
import { withSentryConfig } from '@sentry/nextjs';
// ...
const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};
export default withSentryConfig(
  withBundleAnalyzer(withNextIntl(nextConfig)),
  sentryConfig,
);
```

Release-Name wird automatisch aus `VERCEL_GIT_COMMIT_SHA` gesetzt (Next.js Convention).

Ohne `SENTRY_AUTH_TOKEN`: Build bleibt stabil, nur source-map-upload silent deaktiviert.

### `.husky/pre-commit`
```bash
#!/usr/bin/env bash
set -e
echo "[pre-commit] tsc --noEmit..."
npx tsc --noEmit

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\.(ts|tsx|js|jsx|mjs)$" | tr '\n' ' ')
if [ -n "$STAGED_FILES" ]; then
  echo "[pre-commit] ESLint staged..."
  npx eslint --no-error-on-unmatched-pattern $STAGED_FILES
fi
echo "[pre-commit] OK"
```

- tsc über ganzen codebase (fast, ~3s incremental)
- eslint nur auf staged files (schnell)
- vitest NICHT im hook — zu lang (70s+ full suite)

### `package.json`
- `husky` als devDependency
- `"prepare": "husky"` Script bei `npm install` installiert auto-hooks

## Required Vercel Env-Vars (Anil manual)

Für full Sentry-Integration in Production:
- `SENTRY_AUTH_TOKEN` — auth token aus sentry.io (User Settings → Auth Tokens, scope `project:releases`)
- `SENTRY_ORG` — org-slug (z.B. `bescout`)
- `SENTRY_PROJECT` — project-slug (z.B. `bescout`)

Ohne: build läuft durch, source-maps werden generiert aber nicht hochgeladen.

## Acceptance Criteria

1. `next build` PASS mit withSentryConfig wrapper
2. `.husky/pre-commit` ist executable
3. Pre-commit hook fängt `tsc` errors
4. Pre-commit hook fängt eslint errors auf staged files
5. `npm install` triggert `prepare` → husky-Install
6. Bei gesetzten Sentry-Env-Vars: source-maps werden hochgeladen (Vercel-only, lokal silent)

## Proof

- `worklog/proofs/118-build.txt` — `npx next build` output clean
- `worklog/proofs/118-husky-verify.txt` — hook executable, einmal manuell getriggert
