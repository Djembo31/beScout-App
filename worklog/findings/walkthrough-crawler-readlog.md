# Phase 0 Read-Log — Walkthrough Crawler

Date: 2026-04-25 | Agent: Remote Overnight

## What I understood (10 Bullets)

1. **App routes (21 pages):** `/, /market, /manager, /fantasy, /community, /missions, /transactions, /founding, /inventory, /rankings, /airdrop, /profile, /profile/[handle], /profile/settings, /player/[id], /clubs, /club/[slug], /club/[slug]/admin, /compare, /bescout-admin` — all under `src/app/(app)/`.

2. **Auth pattern:** jarvis-qa@bescout.net / JarvisQA2026! (SMOKE_EMAIL / SMOKE_PASSWORD env-vars). Login via `/login` form, `Anmelden`-button, then `waitForURL` away from `/login`. TR locale via `bescout-locale` cookie with leading-dot domain.

3. **Playwright config projects:** setup, unauthenticated, smoke, synthetic, authenticated, bots, admin. New `walkthrough` project can be added pointing to `e2e/full-walkthrough.spec.ts`. `fullyParallel: false`, `workers: 1`.

4. **Existing e2e foundation:** `synthetic-users.spec.ts` (3 profiles: Discovery/Power/TR-Locale), `beta-smoke.spec.ts` (10-flow smoke), `e2e/full-check/` (per-page deep suites for market/community/profile/settings/player-detail). Crawler MUST be additive — never overwrite synthetic-users.

5. **Tab-URL params (critical for crawl):** `/market?tab=marktplatz|portfolio|watchlist|kaufen`, `/manager?tab=kader`, `/community?tab=...`. Redirect: `/market?tab=portfolio` → `/manager?tab=kader`. Params must be sourced from component source, not guessed.

6. **Vercel cron schedule:** ALL 11 crons are daily or less-frequent (0 3/4/5/6/12 * * *). Hobby tier compliant. Adding a daily 03:00 UTC walkthrough cron is safe (stays within 2-cron Hobby limit — but wait, 11 crons is already Pro territory? vercel.json lists 11. Assuming Pro plan active).

7. **CSP headers:** connect-src allows *.sentry.io, *.ingest.de.sentry.io. img-src allows supabase, wikimedia, transfermarkt, api-sports. remotePatterns in next.config.mjs matches. No external API calls in crawler skeleton (by design).

8. **Business compliance rules:** Never call `/buy`, `/sell`, `/offer` endpoints — crawler is READ-ONLY. Ghost-row pattern (from Slice 192 context in task brief): `#0` IDs + empty names + default-MID position = zombie holdings from null-player join. Auth-race bug (Slice 193 context): stale auth state causing double-render on sensitive pages.

9. **MISSING FILES documented:**
   - `worklog/proofs/192-holdings-null-player-guard.md` — does NOT exist (latest proof is 190-cron-registry-audit.md)
   - `worklog/proofs/193-auth-state-perf.md` — does NOT exist
   - Ghost-row pattern info synthesized from task brief description + common-errors.md Section 1

10. **npm scripts:** `test:smoke` and `test:synthetic` are `PLAYWRIGHT_BASE_URL=https://bescout.net playwright test --project=...`. New script `test:walkthrough` should follow same pattern. `pnpm exec playwright test e2e/full-walkthrough.spec.ts --list` must list ≥1 test without requiring a running server (base URL env var = remote target).

## Discrepancies Found

- Proof files 192 + 193 referenced in task brief do not exist in `worklog/proofs/`. Last existing slice number in proofs is ~190. Proceeded with synthesized patterns from task description.
- `docs/plans/` directory did not exist — created.
- `e2e/walkthrough/` directory did not exist — created.
- `worklog/findings/` directory did not exist — created.
