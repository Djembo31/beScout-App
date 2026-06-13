# Slice 296 Review — Fantasy Unauth State Explicit + Test (S3 F-3)

**Reviewer:** reviewer-Agent (cold-context) · **time-spent:** 11 min
**Verdict:** CONCERNS → ✅ RESOLVED (sole blocker was the PROVE artifact, created in PROVE stage post-REVIEW per SHIP order)

## Spec-Coverage
- [x] AC-1: Existing 30+ tests preserved (outer `beforeEach` resets to authed)
- [x] AC-2: Unauth shell renders (header/nav/scoring-rules present)
- [x] AC-3: No primary tab body (`spieltag-tab` absent via `&& user` gate)
- [x] AC-4: FantasyDisclaimer stays visible (real render, key-passthrough)
- [x] AC-5: tsc clean (EXIT 0) — `worklog/proofs/296-fantasy-unauth.txt`
- [x] AC-6: Comment documents AuthGuard-reliance + no-CTA (FantasyContent.tsx:237-244)

## Findings
| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | MAJOR | `worklog/proofs/296-fantasy-unauth.txt` missing at review time | ✅ RESOLVED — proof is the PROVE stage, which runs after REVIEW in the SHIP loop; file now created (vitest 10/10 + tsc 0 + grep) |
| 2 | MINOR | Sign-in-CTA regex not exhaustive (catches signIn/login/anmelden/einloggen, not e.g. authPrompt) | Accepted as-is — meaningful, not vacuous; low priority |

## CHECK results (all pass)
1. **beforeEach ordering correct & robust** — outer `resetAuthState()`→authed runs before EVERY test; inner `describe('unauth contract')` beforeEach sets `user=null` only for nested tests, after outer. No leak path. `resetAuthState()` stays correct even if a future outer test is added after the unauth describe.
2. **Decision sound** — verified routing: `(app)/fantasy/page.tsx` is FantasyContent's sole render entry, wrapped in `GeoGate` + `<AuthGuard>` via `(app)/layout.tsx`. AuthGuard's only exemption (`/club/` non-admin) doesn't touch `/fantasy`. AuthGuard redirects `!user`→`/login` + ContentSkeleton → FantasyContent never reaches production `!user`. Page-local CTA would be genuine Auth-UX second-source drift. No product gap.
3. **Assertions non-tautological** — `spieltag-tab` absence is a real consequence of the `&& user` gate; `fantasyDisclaimer` is a REAL FantasyDisclaimer render (not mocked); shell testids are unconditional stubs correctly proving shell-vs-body split.
4. **testing.md compliant** — no resetModules (SO-3 via static imports + mutable `mockAuthState` + beforeEach-reset, Slice-295 precedent), no snapshot, no console-spy, `mock`-prefix satisfies factory-closure rule.
5. **Regex meaningful** — see Finding #2.

## Positive
- Comment block precise: names AuthGuard as single-source, explains `&& user` as defensive, documents no-CTA decision, cross-references the test. Exactly the implicit→explicit goal.
- Clean mock refactor: zero orphaned `mockUser`/`mockProfile` refs (grep-confirmed) → 30+ existing tests genuinely unaffected.
- AC-4 (disclaimer survives unauth) is highest-value: locks compliance copy against future regression.
- Tight scope: no gate-refactor, no E2E creep, behavior-identical.

## Knowledge
Reusable pattern: mutable `mockAuthState` + outer-beforeEach-reset + nested-describe-override for testing auth-gated component contracts without resetModules. Already aligned with testing.md SO-3 + Slice 295 precedent — no new doc needed.
