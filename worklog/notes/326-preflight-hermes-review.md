# Slice 326 Preflight — Hermes Review Anchor for Claude

Date: 2026-06-15
Purpose: Make the next Claude session account for Hermes' review before starting the large `clubs.league` String→UUID migration.

## Current truth

- Current HEAD may be a handoff-only commit. Treat the latest real technical baseline as Slice 325 (`b385c3af`) unless a newer feature commit exists.
- Slice 325 is DONE: `create_club_by_platform_admin` now sets `league_id` as a drift-stop.
- Slice 326 is NOT implemented yet. It is the full `clubs.league` String→UUID migration.

## Hermes review verdict

The recent work is strategically correct and aligned with Anil's goal:

- stabilize BeScout from a grown prototype into a professional platform;
- remove bridge/workaround/source-of-truth drift;
- prefer one truth per semantic field;
- harden server/RPC truth before growth/monetization;
- keep slices small unless a migration must be one coherent unit.

Slice 325 was the right XS move: stop future drift without starting orphan foundation code.

## Gaps to account for before Slice 326 BUILD

1. Handoff / active status drift
   - Auto-handoff may say `HEAD b385c3af` while the actual HEAD is a later handoff-only commit.
   - Start with `git status --short --branch && git log --oneline -5`.
   - Name both: actual HEAD and last real feature/RPC baseline.

2. `worklog/log.md` chronology drift
   - The file says "Neueste oben", but newer entries 316–325 may appear far below older 315 entries.
   - Do not trust only the first 100 lines of `worklog/log.md` for current state.
   - Use `worklog/active.md`, `memory/session-handoff.md`, and `git log` as current-state authority.
   - Optional docs hygiene: repair log chronology before or after Slice 326 if it causes confusion.

3. `worklog/active.md` wording drift
   - If it still says Slice 325 is "in Arbeit", correct it to DONE before starting 326.

4. Generated audit churn
   - Pre-commit/audit tools may leave untracked `worklog/audits/{audit-stale,type-truth,wiring}-2026-06-14.md` files.
   - Do not add them unless the slice explicitly updates audit reports. Clean/ignore before commit.

5. Slice 325 remaining soft-null edge
   - Current RPC maps `league_id` via league name. Unknown `p_league` still yields `NULL`.
   - In Slice 326, close this properly by moving writers/readers to `league_id` truth or fail-closed on unknown league; do not leave a new nullable drift path.

## Slice 326 must be one coherent L-slice

Do NOT split into orphan foundation pieces. Include code + consumer wiring + migration/drop in one verified plan, or explicitly stage waves inside the same slice.

Required 326 plan elements:

1. Add `getLeagueById(id)` in `src/lib/leagues.ts` only with real consumers in the same slice.
2. Expose `player.leagueId` from `dbToPlayer` via `club.league_id`; `player.league` remains display name derived from league lookup.
3. Convert filter truth from league name to league id in all listed consumers:
   - market/TrendingSection
   - TransferListSection
   - ClubVerkaufSection
   - KaderTab including smartLeague
   - rankings/page + PlayerRankings prop thread
   - portfolio/BestandView
   - LeagueBar listbuilder
4. Decouple club cache from `clubs.league`:
   - SELECT `league_id`, not `league` string;
   - derive display name through `getLeagueById(league_id)?.name`;
   - verify league cache initializes before club cache.
5. Keep `leagueName` only as display/localStorage compatibility; `leagueId` is truth.
6. Pre-DROP grep must cover `src/`, `scripts/`, `messages/`, `worklog/`, and `.claude/rules/` where relevant.
7. DROP `clubs.league` only after all runtime readers/writers are ID-backed and tests pass.

## Suggested preflight commands

```bash
git status --short --branch
git log --oneline -8
grep -R "clubs\.league\|\.league ===\|filterLeague\|leagueName" src scripts messages .claude/rules worklog -n | head -200
pnpm exec tsc --noEmit
```

## Acceptance bar for Slice 326

- No runtime read depends on `clubs.league` after migration.
- No UI filter compares league display names as truth.
- `leagueId` is used for filtering; `leagueName` only for display/backcompat.
- Unknown league write path is fail-closed or impossible through typed/id-based writer.
- Tests cover at least mapper/cache/filter behavior.
- Pre-commit audits are clean and generated audit churn is not accidentally committed.
