# BeScout App

BeScout is a Next.js 14 / TypeScript / Supabase football fan-engagement platform.

Current product truth lives in:

1. `memory/current-product-truth.md`
2. `CLAUDE.md`
3. `memory/decisions.md`
4. `worklog/active.md`
5. `worklog/audits/2026-06-12/stabilization-master-audit.md`
6. `worklog/beta-phase.md`

If this README conflicts with those files, those files win.

---

## Current product scope

BeScout is a B2B2C fan-engagement platform:

- Clubs use BeScout as a fan economy / CRM / revenue tool.
- Fans use Scout Cards, Market, Manager, Fantasy, Club/Community and Profile/Reputation loops.
- Current scope targets 7 leagues, not the older Sakaryaspor-only pilot scope.
- Phase 1 is a closed-loop platform-credit economy. User-facing copy must avoid investment, ROI, profit, ownership and cash-out promises.

See `memory/current-product-truth.md` for the canonical compact version.

---

## Current stabilization mode

The project is in stabilization mode, not broad feature-expansion mode.

Primary steering doc:

- `worklog/audits/2026-06-12/stabilization-master-audit.md`

Current stabilization sequence:

1. Product Truth Freeze.
2. Page Contract Audit: `/market` + `/player/[id]`.
3. Page Contract Audit: `/` + `/manager`.
4. Page Contract Audit: `/fantasy` + `/clubs` + `/club/[slug]`.
5. Source-of-Truth Boundaries.
6. Test Confidence Audit.
7. Dead Artifact Inventory.

Do not use the old MVP-starter assumptions that said Supabase/Auth/Trading are future work. They are no longer current.

---

## Stack

- Next.js 14 App Router
- TypeScript strict
- Tailwind CSS
- Supabase
- TanStack React Query v5
- Zustand v5
- next-intl
- Vitest
- Playwright

---

## Commands

Use pnpm, not npm.

```bash
pnpm install
pnpm dev
pnpm type-check
pnpm test
pnpm test:e2e
```

Common project checks:

```bash
pnpm run audit:silent-fail:check
pnpm run audit:compliance
pnpm run audit:tr-strings
```

---

## Process

This repo follows the BeScout SHIP loop from `CLAUDE.md`:

```text
SPEC -> IMPACT -> BUILD -> PROVE -> LOG
```

Every non-trivial change should have:

- a spec under `worklog/specs/`,
- proof under `worklog/proofs/`,
- review under `worklog/reviews/`,
- a log entry in `worklog/log.md`,
- current status in `worklog/active.md`.

---

## Historical note

This README replaced an obsolete MVP-starter README that described BeScout as mock-data/future-Supabase. That was historical prototype context and is no longer the project reality.
