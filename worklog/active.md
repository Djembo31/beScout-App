# Active Slice

```
status: active
slice: 163
stage: LOG
spec: worklog/specs/163-create-prediction-modal-ferrari.md
impact: skipped (refactor, kein contract-change — 1 Consumer des entfernten Hooks)
proof: worklog/proofs/163-create-prediction-ferrari.txt
review: worklog/reviews/163-review.md (PASS, 10 Findings LOW/INFO/Backlog)
```

## Session 2026-04-23 — 7 Slices committed

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
| Phase 4 Tier-2 Data-Integrity | In progress (159 ✅, 160 ✅ Vote-Bug, 161 ✅ Leagues+Missions, 162 ✅ Vote-Handler D18) |
| Phase 5 Admin-Tier-1 | pending (WithdrawalTab + FoundingPassesTab) |
| Phase 6 Codification | ✅ Komplett (patterns.md #28 + decisions.md D24 + common-errors §5) |

## Tier-Status

**Tier-1 Money-Path: 7/9 done.** Offen: AdminWithdrawalTab + AdminFoundingPassesTab (Kill-Switch-Scope).

**Tier-2 Data-Integrity: 7/8 done.** Offen: CreatePredictionModal + 10× Admin-Space (AdminVotesTab, AdminBountiesTab, AdminModerationTab, AdminFansTab, AdminSponsorTab, InviteClubAdminModal, AddAdminModal, useAdminEventsActions, useClubEventsActions, useAdminPlayersState).
AirdropScoreCard aus Tier-2-Scope raus (display-only, kein user-Claim, Audit stale).

## Nahtlos-Naechste-Session — Slice 163 Kandidaten

### Option A: CreatePredictionModal Tier-2 — S, ~1h
- Letzter verbleibender Tier-2-Non-Admin-File.
- Ferrari-Blueprint-Apply auf 1 Handler (create_prediction).
- Schliesst Tier-2 Non-Admin-Block komplett ab (8/8 mit Admin-Space Kategorisierung als separate Tier).

### Option B: Admin-Tier-1 Kill-Switch (2 Files) — M, ~2h (CEO-Approval)
- `AdminWithdrawalTab.tsx` (Process club withdrawal — Money)
- `AdminFoundingPassesTab.tsx` (FP Create/Revoke — Kill-Switch)
- Money-Path + Admin-Scope. CEO-Approval vor Build pflicht.

### Option C: Service-Hardening (Silent-Fail-Audit) — S, ~1h
- `votePost` Service silent-cast hardening (Slice 160 Finding #2): `if (data?.success === false) throw` VOR cast.
- Cross-Service-Audit fuer gleichen Pattern: `data as { ... }` ohne Discriminator-Check.
- Silent-Fail-Klasse in common-errors.md §1.

### Option D: Konvention-Codification Slice (patterns.md #28) — XS, ~30min
- Patterns.md #28 explizit erweitern: `useQueryClient()` Hook vs Singleton `queryClient` (Slice 161+162 NIT-duplicates).
- Plus Mini-Cleanup: `useCommunityActions.ts` + `LeaguesSection.tsx` + `MissionBanner.tsx` auf Hook migrieren.

### Option E: useSafeMutation-Test-Pattern Codification — XS, ~30min
- Test-Migration aus 162 als Pattern in `.claude/rules/testing.md` dokumentieren.
- `act() + waitFor()` für useSafeMutation-Handler (statt `await handleX(...)` + direct expect).
- Mock-Template: lucide-react + ToastProvider stubs.

### Empfehlung Start-Punkt

**A → D → B.** Option A ist schnell + schliesst Tier-2-Non-Admin. Option D konsolidiert 2 Session-Findings (NITs aus 161+162). Option B ist Money+Admin — mehr Care, CEO-Approval.

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
