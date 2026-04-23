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

## Session 2026-04-23 — 8 Slices committed

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

## Nahtlos-Naechste-Session — Slice 164 Kandidaten

### Option A: Konvention-Codification (patterns.md #28 + testing.md) — XS, ~45min
- patterns.md #28 explizit erweitern:
  - `useQueryClient()` Hook vs Singleton `queryClient` (Slice 161+162 NIT-Drift — Slice 163 wählt Hook-Variante als Ankerpunkt)
  - Multi-Mutations im Component = distinct Mut-Instanzen (Slice 163 Learning)
  - Forward-Ref `handleClose` im onSuccess = Closure-safe Pattern
- `.claude/rules/testing.md` erweitern:
  - Test-Mock-Expansion für useSafeMutation-Migrations (lucide-react + ToastProvider stubs) — 4× wiederholt in 159/161/162/163
  - `act() + waitFor()` Pattern für Mutation-Tests (statt `await handleX(...)` direct expect)
- Plus optional: Mini-Cleanup 161+162 auf `useQueryClient()`-Hook migrieren.

### Option B: Admin-Tier-1 Kill-Switch (2 Files) — M, ~2h (CEO-Approval)
- `AdminWithdrawalTab.tsx` (Process club withdrawal — Money)
- `AdminFoundingPassesTab.tsx` (FP Create/Revoke — Kill-Switch)
- Money-Path + Admin-Scope. CEO-Approval vor Build pflicht.

### Option C: Service-Hardening (Silent-Fail-Audit) — S, ~1h
- `votePost` Service silent-cast hardening (Slice 160 Finding #2): `if (data?.success === false) throw` VOR cast.
- Cross-Service-Audit fuer gleichen Pattern: `data as { ... }` ohne Discriminator-Check.
- Silent-Fail-Klasse in common-errors.md §1.

### Option D: Admin-Tier-2 Space (10 Files) — L, mehrere Sessions
- AdminVotesTab, AdminBountiesTab, AdminModerationTab, AdminFansTab, AdminSponsorTab, InviteClubAdminModal, AddAdminModal, useAdminEventsActions, useClubEventsActions, useAdminPlayersState
- Ferrari-Blueprint-Apply. 10 Files, 1-2 pro Slice.
- Nur wenn Admin-Flows demnächst getestet werden.

### Option E: Pre-existing Modal preventClose Sweep — M, ~2h
- LeaguesSection (CreateLeagueModal + JoinLeagueModal) — Slice 161 NIT #2
- CreatePredictionModal — Slice 163 Finding #1
- Weitere Modal-Audit: `grep -rn "<Modal" src/ | grep -v preventClose`
- common-errors.md §5 J2+J3 Pattern konsistent applizieren.

### Empfehlung Start-Punkt

**A → C → B.** Option A konsolidiert Session-Learnings (3 Slices haben NITs die sich wiederholen — jetzt codifizieren bevor es mehr werden). Option C adressiert Slice 160 Finding #2 (Silent-Cast-Vulnerability in votePost). Option B ist Money+Admin — mehr Care.

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
