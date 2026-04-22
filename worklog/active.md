# Active Slice

```
status: active
slice: 152d
stage: BUILD
spec: worklog/specs/152-wallet-provider-to-query.md
impact: skipped (Welle 3 = Provider-Delete + 4 Test-Mock-Migrations, Cross-Cutting)
proof: worklog/proofs/152d-welle3-vitest.txt
review: worklog/reviews/152d-review.md
```

## Phase 2 Money-Cleanup — KOMPLETT nach 152d

- 152a Foundation — commit `753e8f83`
- 152b Welle 1 Read-only × 10 — commit `0e10fe12`
- 152c Welle 2 Mutation × 6 (Reviewer-PASS nach HIGH-Fixes) — commit `a59a7209`
- 152d Welle 3 Provider-Delete (Reviewer-PASS, 1 NIT inline gefixt) — pending commit

**Next:** Slice 153 — usePlayerTrading + trading.ts Ferrari-Refactor (useSafeMutation + onMutate/onError).

## Slice-152 Sub-Struktur

Slice 152 (WalletProvider → useWallet Query) wird in 4 Sub-Slices gebaut fuer saubere Rollback-Punkte und Reviewer-Gated Money-Path-Wellen:

- **152a (now, BUILD):** Foundation — `useWallet` Hook + `useIsBalanceFresh` + 3 Helpers + 13 TDD-Tests. Keine Consumer-Migration. Self-Review.
- **152b (next):** Welle 1 — 10 read-only Consumer migrieren (`balanceCents` read). Self-Review (triviale Substitution).
- **152c:** Welle 2 — 5 Mutation-Consumer (`setBalanceCents`/`refreshBalance` → `setWalletBalance`/`invalidateWallet`). **Reviewer-Agent pflicht** (Money-Path Behavior-Change).
- **152d:** Welle 3 — `WalletProvider` loeschen + 5 Test-Files migrieren + `AuthProvider.signOut` → `removeWalletFromCache`. **Reviewer-Agent pflicht** (Cross-Cutting).

## Zuletzt

- **Slice 151b-RESET** (2026-04-23) — Club-Follow State-Sync: ClubProvider shrunk (255→128 LOC), 3 neue Query-Hooks, 7 Consumer migriert. Audit-Klassen A+C+D adressiert. Commit `04b4492f`.
- **Slice 151d** (2026-04-23) — ESLint-Rule + Pattern D18 + Audit-Script (Phase 1 Complete). Commit `016bcb74`.
- **Slice 151c+151c.2** (2026-04-23) — MembershipSection Money-Path + RPC-Idempotency-Hardening. Commit `a76ddc62`.
- **Slice 151b** (2026-04-23) — useClubActions Follow-Button Migration (Pilot 1, von 151b-RESET erweitert). Commit `789c0816`.
- **Slice 151a** (2026-04-23) — useSafeMutation Primitive. Commit `a840beb8`.

## Phase 1 + Phase 2a DONE

Mutation-Hardening Phase 1 (151a-d + 151c.2) + State-Sync 151b-RESET abgeschlossen.

## Phase 2 Next — Money-Tier (Slices 152-155)

Nach Option Z (User-Entscheidung):
- **Slice 152:** WalletProvider.balanceCents → useWallet Query (207 LOC → ~40 LOC, Audit Klasse A+C)
- **Slice 153:** usePlayerTrading refactor — useSafeMutation fuer Buy/Sell/Offers, optimisticallyAddHolding in onMutate
- **Slice 154:** MembershipSection Optimistic (aktuell kein optimistic nur Invalidate — Audit Tier 1 #2)
- **Slice 155:** useTradeActions + TipButton Audit-Tier 1 Klasse E

Danach Stop fuer Beta-Test-Runde. Phase 3+ (UX-Hotspots: Events, Watchlist, Votes, Profile) post-Beta.
