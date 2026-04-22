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

- **Slice 152d** (2026-04-23) — WalletProvider Elimination, Phase 2 COMPLETE. Reviewer-PASS + 1 NIT inline gefixt. Commit `78c7f409`.
- **Slice 152c** (2026-04-23) — Welle 2 Mutation-Consumer (Money-Path). Reviewer-REWORK (2 HIGH + 1 MEDIUM pgBouncer-Violation) → Fixes → PASS. Commit `a59a7209`.
- **Slice 152b** (2026-04-23) — Welle 1 Read-only Wallet-Consumer (10 Files + 2 Test-Mock-Fixes). Commit `0e10fe12`.
- **Slice 152a** (2026-04-23) — useWallet Query-Hook + 4 Helpers + 13 TDD-Tests. Commit `753e8f83`.
- **Slice 151b-RESET** (2026-04-23) — Club-Follow State-Sync. Ferrari-Blueprint etabliert. Commit `04b4492f`.

## Phase-Status nach dieser Session

| Phase | Status | Commits |
|-------|--------|---------|
| Phase 1 Mutation-Hardening | ✅ Komplett | 151a-d + 151c.2 |
| Phase 1.5 ClubProvider-RESET | ✅ Komplett | 151b-RESET (`04b4492f`) |
| **Phase 2 Money-Cleanup** | ✅ **Komplett** | 152a-d (`753e8f83` / `0e10fe12` / `a59a7209` / `78c7f409`) |
| Phase 3 UX-Hotspots | 🟡 Pending | Slice 153 (usePlayerTrading Ferrari-Refactor) → 156 (Events+FantasyStore) → 157 (Watchlist) → 158 (Community Votes) |
| Phase 4 Rest + Norm | ⏳ Spaeter | Slice 159 (Profile), 160 (Norm-Codification `.claude/rules/mutations.md` + ESLint D18b) |

## Session-Artefakte

- **Audit:** `worklog/audits/state-sync-architecture-2026-04-23.md` — 5 Anti-Pattern-Klassen, 18 Features (Commit `f0cfbc6b`)
- **Spec:** `worklog/specs/152-wallet-provider-to-query.md` — 4-Wellen-Plan, 22 Files kartografiert
- **Reviews:** `worklog/reviews/152a-review.md` / `152b-review.md` / `152c-review.md` / `152d-review.md`
- **Proofs:** `worklog/proofs/152-usewallet-tests.txt` / `152b-welle1-vitest.txt` / `152c-welle2-vitest.txt` / `152d-welle3-vitest.txt` + 5 Playwright-Screenshots (`152-*.png`) + Smoke-Report (`152-money-path-report.md`)
- **Decisions:** D20-D23 in `memory/decisions.md` — Query-Cache-SoT / Ferrari-Blueprint-Pattern / Sub-Slice-Gating / API-Swap-vs-Struktur-Upgrade-Trennung

## Nahtlos-Naechste-Session

**Start-Punkt:** Slice 153 — `usePlayerTrading` + `features/market/mutations/trading.ts` Ferrari-Refactor (raw `useMutation` → `useSafeMutation` + `onMutate` + `onError` + `errorToast` + `errorTag`).

**Blueprint:** `src/lib/hooks/useToggleFollowClub.ts` (Mutation-Pattern) + `src/lib/hooks/useWallet.ts` (Cross-Mutation-Shared-State-Pattern mit pgBouncer-safe onSuccess/onSettled-Split).

**Reviewer-Agent-Briefing:** "Jede Abweichung zu useToggleFollowClub/useWallet ist ein Finding. Money-Path — Cold-Context-Review pflicht."

**152c-Backlog-Carry-over** (Slice 153 oder 158):
- useOffersState.test.ts: `toHaveBeenCalledWith(queryClient)` statt `toHaveBeenCalled()`
- Konventions-Entscheidung: globaler Singleton `@/lib/queryClient` vs Hook-scoped `useQueryClient()` (trading.ts nutzt Singleton, usePlayerTrading nutzt Hook-scoped)
- RPC-Shape `balanceAfter=null` statt `=0` in events.mutations bei Free-Events
