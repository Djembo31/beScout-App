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

## Session 2026-04-23 — 10 Slices committed

- **165** votePost Silent-Cast Hardening → `a441e540`
- **164** Konvention-Codification (patterns.md #28 + testing.md) → `fee8db16`
- **163** CreatePredictionModal Ferrari (Non-Admin 8/8) → `c9823114`
- **162** Vote-Handler Ferrari (D18 Race-Class Closure, 3 Handler) → `f64a4ee2`
- **161** Tier-2 Ferrari Batch (LeaguesSection + MissionBanner) → `8aff65fa`
- **160** Vote-Toggle Batch + Side-Effect-Guard (4 Files UI + 4 Handler + Service + 2 Tests) → `046501dc`
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
| Phase 4 Tier-2 Data-Integrity | Non-Admin ✅ 8/8 (159 + 160 + 161 + 162 + 163). Admin-Space (10 Files) pending |
| Phase 5 Admin-Tier-1 | pending (WithdrawalTab + FoundingPassesTab) |
| Phase 6 Codification | ✅ Komplett (patterns.md #28 + decisions.md D24 + common-errors §5) |

## Tier-Status

**Tier-1 Money-Path: 7/9 done.** Offen: AdminWithdrawalTab + AdminFoundingPassesTab (Kill-Switch-Scope).

**Tier-2 Data-Integrity Non-Admin: 8/8 ✅ komplett.** Offen: 10× Admin-Space (AdminVotesTab, AdminBountiesTab, AdminModerationTab, AdminFansTab, AdminSponsorTab, InviteClubAdminModal, AddAdminModal, useAdminEventsActions, useClubEventsActions, useAdminPlayersState) — nur wenn Admin-Flows demnächst getestet werden.
AirdropScoreCard aus Tier-2-Scope raus (display-only, kein user-Claim, Audit stale).

## Nahtlos-Naechste-Session — Slice 166 Kandidaten

### Option A: Modal preventClose Sweep — M, ~2h
- LeaguesSection (CreateLeagueModal + JoinLeagueModal) — Slice 161 NIT #2
- CreatePredictionModal — Slice 163 Finding #1
- Modal-Audit: `grep -rn "<Modal" src/ | grep -v preventClose`
- common-errors.md §5 J2+J3 Pattern konsistent applizieren.

### Option B: Admin-Tier-1 Kill-Switch (2 Files) — M, ~2h (CEO-Approval)
- `AdminWithdrawalTab.tsx` (Process club withdrawal — Money)
- `AdminFoundingPassesTab.tsx` (FP Create/Revoke — Kill-Switch)
- Money-Path + Admin-Scope. CEO-Approval vor Build pflicht.

### Option C: RPC-Shape-Konsistenz-Regel (database.md) — XS, ~30min
- Slice 165 Reviewer-Learning: "Jede RPC mit json_build_object MUSS {success: true, ...} im Success-Path setzen" — in database.md codifizieren.
- Audit-Command für bestehende RPCs mit inkonsistenter Shape.
- Verhindert RPC-Drift wie `vote_post` (Success-Path ohne success-flag).

### Option D: Mini-Cleanup Singleton → useQueryClient (161+162) — XS, ~30min
- `useCommunityActions.ts` + `LeaguesSection.tsx` + `MissionBanner.tsx` migrieren auf Hook-Variante.
- Konvention-Konsistenz nach Slice 164 Codification.

### Option E: Admin-Tier-2 Space (10 Files) — L, mehrere Sessions
- AdminVotesTab, AdminBountiesTab, etc.
- Ferrari-Blueprint-Apply, 1-2 Files pro Slice.

### Empfehlung Start-Punkt

**A → C → B.** Option A sweepen akkumulierte Modal-preventClose NITs (Slice 161+163). Option C codifiziert Slice 165 Learning für RPC-Design. Option B ist Money+Admin mit CEO-Approval.

## Backlog (nicht-Slice-Arbeit)

- `showError(err)` vs `showError(err.message || err)` Codebase-Audit (aus 157 Review, 161 NIT #3 duplicate)
- useOffersState `offer.find()` pre-compute als mutation-variable (aus 157 Review)
- 10× Admin-Space Files (AdminVotesTab, AdminBountiesTab, ...) — nur wenn Admin-Flows demnaechst getestet werden.
- `aria-label` auf PostReplies Vote-Buttons (aus 159 Review "out-of-scope")
- Modal `preventClose={mut.isPending}` auf LeaguesSection CreateLeagueModal + JoinLeagueModal (Slice 161 NIT #2)
- Konvention `useQueryClient()` Hook vs Singleton — patterns.md #28 explizit erweitern ODER 161b-Cleanup (Slice 161 NIT #1)
- Service `votePost` silent-cast hardening (Slice 160 Finding #2)

## Key-References

- **Ferrari-Blueprint:** `memory/patterns.md` #28
- **Mutation-Decision-Genesis:** `memory/decisions.md` D21-D24
- **Race-Class:** `.claude/rules/common-errors.md` §5 D18
- **Migration-Patch-Audit:** `.claude/rules/common-errors.md` §2
- **Vote-Toggle-FIXED:** `.claude/rules/common-errors.md` §5 "Vote-Toggle Client-Intent vs RPC-Constraint (Slice 159 Finding → Slice 160 FIXED)"
- **Slice 160 Review:** `worklog/reviews/160-review.md` (CONCERNS → resolved via Side-Effect-Guard Fix in-slice)
- **150-mutation-audit:** `worklog/proofs/150-mutation-audit.md`
