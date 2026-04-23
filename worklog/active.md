# Active Slice

```
status: active
slice: 160
stage: LOG
spec: worklog/specs/160-vote-toggle-fix.md
impact: skipped (UI-only client fix + service side-effect guard, kein DB/migration)
proof: worklog/proofs/160-vote-toggle-fix.txt
review: worklog/reviews/160-review.md (CONCERNS → Finding #1 HIGH in-slice resolved)
```

## Session 2026-04-23 — Slice 160 ready to commit (5 Slices committed total)

- **160** Vote-Toggle Batch + Side-Effect-Guard (4 Files UI + 4 Handler + Service + 2 Tests) → pending commit
- **159** Tier-2 Batch (ReportModal + PostReplies + FanWishModal) → `a54f5f1c`
- **158** KaderSellModal Ferrari → `29b2580a`
- **157** useOffersState Ferrari → `af1c16c0`
- **156** Event+Lineup Ferrari + RPC-Migration P2.3 → `93f51274`

Plus: Knowledge-Capture (common-errors.md §5 Vote-Toggle FIXED, patterns.md #28 Ferrari-Blueprint, decisions.md D24 Codification-Retro).

## Phase-Status

| Phase | Status |
|-------|--------|
| Phase 1 Mutation-Hardening | ✅ Komplett (151a-d + 151c.2) |
| Phase 1.5 ClubProvider-RESET | ✅ Komplett (151b-RESET) |
| Phase 2 Money-Cleanup | ✅ Komplett (152a-d) |
| Phase 3 UX-Hotspots | ✅ Komplett (153 + 156 + 157 + 158) |
| Phase 4 Tier-2 Data-Integrity | In progress (159 ✅, 160 ✅ — Community-Vote-Bug-Class-Fix) |
| Phase 5 Admin-Tier-1 | pending (WithdrawalTab + FoundingPassesTab) |
| Phase 6 Codification | ✅ Komplett (patterns.md #28 + decisions.md D24 + common-errors §5) |

## Tier-Status

**Tier-1 Money-Path: 7/9 done.** Offen: AdminWithdrawalTab + AdminFoundingPassesTab (Kill-Switch-Scope).

**Tier-2 Data-Integrity: 5/8 done.** Offen: LeaguesSection + AirdropScoreCard + MissionBanner + 10× Admin-Space.

## Nahtlos-Naechste-Session — Slice 161 Kandidaten

### Option A: Tier-2-Fortsetzung (3 Files) — M, ~2-3h (ehemalige Option B aus 159)
- `LeaguesSection.tsx` (join private league)
- `AirdropScoreCard.tsx` (claim airdrop)
- `MissionBanner.tsx` (claim mission)
- Pattern: Copy-Paste aus Slice 159 Blueprint (`memory/patterns.md #28`), Standard-Mutation-Race-Fix.

### Option B: Admin-Tier-1 (2 Files) — M, ~2h (Kill-Switch-Scope, CEO-Approval)
- `AdminWithdrawalTab.tsx` (Process club withdrawal — Money)
- `AdminFoundingPassesTab.tsx` (FP Create/Revoke — Kill-Switch)
- Money-Path + Admin-Scope. CEO-Approval vor Build pflicht.

### Option C: Service-Hardening aus Slice 160 Reviewer Finding #2 (MEDIUM)
- `votePost` Service silent-cast hardening: `if (data?.success === false) throw new Error(data.error)` VOR cast.
- Cross-Service-Audit für gleiche Pattern: `data as { ... }` ohne Discriminator-Check.
- Könnte M sein wenn systematisch durchgezogen (common-errors.md §1 Silent-Fail-Klasse).

### Option D: useSafeMutation-Migration Vote-Handler (Slice 160 Reviewer Finding #5 LOW, Tier-2-Roadmap)
- `useCommunityActions.handleVotePost` + `usePlayerCommunity.handleVotePlayerPost` + `EventCommunityTab.handleVote` auf `useSafeMutation` migrieren (D18 Race-Class-Pattern).
- Reiner Ferrari-Blueprint-Apply, kein Scope-Risk.

### Empfehlung Start-Punkt

**A → D → B.** Option A ist mechanisch (Pattern stabil). Option D ist Ferrari-Konsolidierung (logisch nach 160 da Handler schon gefixt wurden). Option B ist Money+Admin — mehr Care.

## Backlog (nicht-Slice-Arbeit)

- `showError(err)` vs `showError(err.message || err)` Codebase-Audit (aus 157 Review)
- useOffersState `offer.find()` pre-compute als mutation-variable (aus 157 Review)
- 10× Admin-Space Files (AdminVotesTab, AdminBountiesTab, ...) — nur wenn Admin-Flows demnaechst getestet werden.
- `aria-label` auf PostReplies Vote-Buttons (aus 159 Review "out-of-scope")

## Key-References

- **Ferrari-Blueprint:** `memory/patterns.md` #28
- **Mutation-Decision-Genesis:** `memory/decisions.md` D21-D24
- **Race-Class:** `.claude/rules/common-errors.md` §5 D18
- **Migration-Patch-Audit:** `.claude/rules/common-errors.md` §2
- **Vote-Toggle-FIXED:** `.claude/rules/common-errors.md` §5 "Vote-Toggle Client-Intent vs RPC-Constraint (Slice 159 Finding → Slice 160 FIXED)"
- **Slice 160 Review:** `worklog/reviews/160-review.md` (CONCERNS → resolved via Side-Effect-Guard Fix in-slice)
- **150-mutation-audit:** `worklog/proofs/150-mutation-audit.md`
