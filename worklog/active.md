# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
review: —
```

## Session 2026-04-23 — Zusammenfassung (4 Slices committed)

- **159** Tier-2 Batch (ReportModal + PostReplies + FanWishModal) → `a54f5f1c`
- **158** KaderSellModal Ferrari → `29b2580a`
- **157** useOffersState Ferrari → `af1c16c0`
- **156** Event+Lineup Ferrari + RPC-Migration P2.3 → `93f51274` (FAIL→PASS-Zyklus)

Plus: Knowledge-Capture in `common-errors.md` §5 + §2 (CREATE OR REPLACE Patch-Audit, Vote-Toggle-Bug) + `memory/patterns.md` #28 (Ferrari-Blueprint codified) + `memory/decisions.md` D24 (Codification-Retro).

## Phase-Status

| Phase | Status |
|-------|--------|
| Phase 1 Mutation-Hardening | ✅ Komplett (151a-d + 151c.2) |
| Phase 1.5 ClubProvider-RESET | ✅ Komplett (151b-RESET) |
| Phase 2 Money-Cleanup | ✅ Komplett (152a-d) |
| Phase 3 UX-Hotspots | ✅ Komplett (153 + 156 + 157 + 158) |
| Phase 4 Tier-2 Data-Integrity | In progress (159 ✅ — 3 Files done, 3 offen) |
| Phase 5 Admin-Tier-1 | pending (WithdrawalTab + FoundingPassesTab) |
| Phase 6 Codification | ✅ **Komplett** (patterns.md #28 + decisions.md D24 + common-errors §5) |

## Tier-Status

**Tier-1 Money-Path: 7/9 done.** Offen: AdminWithdrawalTab + AdminFoundingPassesTab (Kill-Switch-Scope).

**Tier-2 Data-Integrity: 4/8 done.** Offen: LeaguesSection + AirdropScoreCard + MissionBanner + 10× Admin-Space.

## Nahtlos-Naechste-Session — Slice 160 Kandidaten (priorisiert)

### Option A: Pre-existing Bug-Fix (Toggle-Vote) — XS, ~30 min
- **Scope:** `PostReplies.tsx:171/188` — Client-Intent `voteType=0` fuer Toggle-Off, RPC-Constraint `IN (1,-1)` rejected. Fix: Client sendet `same vote_type` statt `0` (RPC hat internal DELETE-Pfad bei same-vote).
- **Warum jetzt:** Dokumentiert in `common-errors.md §5` (Slice 159 Review Finding). User-facing Bug, trivial zu fixen, kein Scope-Risk.
- **Tests:** +1 Test in `PostReplies.test.tsx` (voteType-toggle-off).

### Option B: Tier-2-Fortsetzung (3 Files) — M, ~2-3h
- `LeaguesSection.tsx` (join private league)
- `AirdropScoreCard.tsx` (claim airdrop)
- `MissionBanner.tsx` (claim mission)
- Pattern: Copy-Paste aus Slice 159 Blueprint, keine Money-Path-Besonderheit.

### Option C: Admin-Tier-1 (2 Files) — M, ~2h (Kill-Switch-Scope, CEO-Approval)
- `AdminWithdrawalTab.tsx` (Process club withdrawal — Money)
- `AdminFoundingPassesTab.tsx` (FP Create/Revoke — Kill-Switch)
- Money-Path + Admin-Scope. CEO-Approval vor Build pflicht.

### Option D: Production-UX-Polish (opt-in Deep-Dive) — Size variiert
- Audit `showError(err.message || err)` Codebase-Scan (aus 157 Review)
- offer.find() pre-compute als mutation-variable (aus 157 Review)
- `aria-label` auf PostReplies Vote-Buttons (aus 159 Review "out-of-scope")

### Empfehlung Start-Punkt

**A → B → C.** Option A ist schnell und schliesst einen live-sichtbaren Bug ab. Option B ist mechanisch (Pattern voll stabil). Option C ist Money+Admin → mehr Care, aber klar abgrenzt. Option D kann opportunistisch in den anderen Slices miterledigt werden.

## Backlog (nicht-Slice-Arbeit)

- `showError(err)` vs `showError(err.message || err)` Codebase-Audit (aus 157 Review)
- useOffersState `offer.find()` pre-compute als mutation-variable (aus 157 Review)
- 10× Admin-Space Files (AdminVotesTab, AdminBountiesTab, ...) — nur wenn Admin-Flows demnaechst getestet werden.

## Key-References

- **Ferrari-Blueprint:** `memory/patterns.md` #28 (Copy-Paste-Template + Blueprint-File-Liste)
- **Mutation-Decision-Genesis:** `memory/decisions.md` D21 (ARCHITECTURE), D22-D24 (PROCESS)
- **Race-Class:** `.claude/rules/common-errors.md` §5 D18 (piloten-liste + Status per 2026-04-23)
- **Migration-Patch-Audit:** `.claude/rules/common-errors.md` §2 (aus Slice 156 FAIL-Review)
- **Vote-Toggle-Bug (Slice 160 Option A):** `.claude/rules/common-errors.md` §5 "Vote-Toggle Client-Intent vs RPC-Constraint"
- **150-mutation-audit:** `worklog/proofs/150-mutation-audit.md` (Tier-Kategorisierung)

## Hygiene-Pass (2026-04-23 Session-End)

- `common-errors.md`: Header aktualisiert (Stand 2026-04-23 / Slices 001-159), D18 Piloten-Liste erweitert um 153a/b+156-159, Vote-Toggle-Bug neu in §5, Cross-Ref zu patterns.md #28.
- `memory/patterns.md`: #28 Ferrari-Blueprint als Copy-Paste-Template codified.
- `memory/decisions.md`: D24 PROCESS Codification-Retro.
- `worklog/active.md`: Dieses File — Slice-160-Kandidaten priorisiert, Nahtloser Uebergang.
