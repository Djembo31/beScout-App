# Active Slice

```
status: active
slice: 151b-RESET
stage: PROVE
spec: worklog/specs/151b-RESET-club-follow-state-sync.md
impact: skipped (client-side refactor, 12 Consumer in Spec kartografiert)
proof: worklog/proofs/151b-RESET-tsc-vitest.txt
review: worklog/reviews/151b-RESET-review.md (PASS, 2 MEDIUM + 3 LOW — #1/#5/#6 fixed, #2/#3/#4 deferred)
```

## Zuletzt

- **Slice 151d** (2026-04-23) — ESLint-Rule + Pattern D18 + Audit-Script (Phase 1 Complete). Commit `016bcb74`.
- **Slice 151c+151c.2** (2026-04-23) — MembershipSection Money-Path + RPC-Idempotency-Hardening. Commit `a76ddc62`.
- **Slice 151b** (2026-04-23) — useClubActions Follow-Button Migration (Pilot 1). Commit `789c0816`. **→ wird durch 151b-RESET erweitert.**
- **Slice 151a** (2026-04-23) — useSafeMutation Primitive. Commit `a840beb8`.
- **Slice 150** (2026-04-23) — Mutation Race-Audit. Commit `2aa36564`.

## Slice 151b-RESET — Club-Follow State-Sync

**Trigger:** User-Report "0 vs 4 Scouts, blinzelt, Unfollow/Follow syncht nicht". Audit Commit `f0cfbc6b` identifizierte 3 Anti-Pattern-Klassen.

**Approach (Option Z, CEO-approved):**
- ClubProvider.followedClubs / primaryClub / isFollowing / toggleFollow **entfernen** (Server-Daten)
- Neue Query-Hooks: useFollowedClubs / usePrimaryClub / useToggleFollowClub (useSafeMutation)
- useClubActions auf reines Query-Cache-Pattern (localFollowing/localFollowerDelta raus)
- useCountUp in ClubHero + ClubStatsBar via useDeferredValue stabilisieren
- 12 Consumer migrieren

**Size:** L (14 non-test + 3 test Files, cross-domain: Provider + Layout + Pages + Hooks)

Nächstes: Stage BUILD direkt nach Spec-Approval (kein DB/RPC → IMPACT: skipped — nur client-side Refactor, Consumer via Grep bereits kartografiert in Spec).
