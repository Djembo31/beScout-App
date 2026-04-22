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

## Zuletzt

- **Slice 151d** (2026-04-23) — ESLint-Rule + Pattern D18 + Audit-Script (Phase 1 Complete). Commit `016bcb74`.
- **Slice 151c+151c.2** (2026-04-23) — MembershipSection Money-Path + RPC-Idempotency-Hardening. Commit `a76ddc62`.
- **Slice 151b** (2026-04-23) — useClubActions Follow-Button Migration (Pilot 1). Commit `789c0816`.
- **Slice 151a** (2026-04-23) — useSafeMutation Primitive. Commit `a840beb8`.
- **Slice 150** (2026-04-23) — Mutation Race-Audit. Commit `2aa36564`.

## Phase 1 Mutation-Hardening — COMPLETE

- Primitive gebaut: `useSafeMutation` mit synchronous pending-guard + Sentry + Auto-Toast
- 2 Piloten migriert: useClubActions (Follow) + MembershipSection (Subscribe)
- 1 Server-Hardening: subscribe_to_club RPC 60s-Idempotency-Window (live)
- Pattern D18 + Money-RPC Idempotency-Subsection in common-errors.md
- Audit-Script + ESLint-Rule als Defense gegen neue Regressions

## Phase 2 Next — Money-Tier-1 (CEO-delegated per Anil)

Top-Candidates:
- Slice 152: AdminFoundingPassesTab (Kill-Switch-Money)
- Slice 153: AdminWithdrawalTab (Club-Withdrawal)
- Slice 154: OffersTab + useOffersState (Buy/Sell Offers)
- Slice 155: BuyModal / PlayerTrading (Scout-Card-Trading)

Session idle. Bereit fuer Phase 2 oder neuer Direktive.
