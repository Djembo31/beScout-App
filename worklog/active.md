# Active Slice

```
status: active
slice: 153a
stage: LOG
spec: worklog/specs/153-player-trading-ferrari-refactor.md
impact: skipped (Hook-Layer-Refactor ohne DB/RPC/Service-Change, API rueckwaertskompatibel — 3 Consumer gegrept ok)
proof: worklog/proofs/153a-trading-vitest.txt + 153a-errorTag-audit.txt + 153a-ferrari-diff.txt
review: worklog/reviews/153a-review.md (verdict PASS, 4 NITs, Finding #1 inline gefixt)
```

## Zuletzt

- **Slice 152d** (2026-04-23) — WalletProvider Elimination, Phase 2 COMPLETE. Commit `78c7f409`.
- **Slice 152c** (2026-04-23) — Welle 2 Mutation-Consumer (Money-Path). Commit `a59a7209`.
- **Slice 152b** (2026-04-23) — Welle 1 Read-only Wallet-Consumer. Commit `0e10fe12`.
- **Slice 152a** (2026-04-23) — useWallet Query-Hook + 13 TDD-Tests. Commit `753e8f83`.
- **Slice 151b-RESET** (2026-04-23) — Club-Follow State-Sync. Commit `04b4492f`.

## Carry-Over aus Phase 2

- ✅ P2.1 (`useOffersState.test.ts` Assertion): Commit `f215d0c0`
- 🟡 P2.2 (`queryClient` Konvention): wird in 153a umgesetzt, Codification 160
- 🔴 P2.3 (`balance_after=null` events.mutations): deferred Slice 156

## Slice-153 Struktur (D22 Sub-Slice-Gating)

| Welle | Scope | Gate |
|-------|-------|------|
| **153a** | `features/market/mutations/trading.ts` — 4 Hooks auf `useSafeMutation` | SPEC → BUILD → REVIEW → PROVE → LOG → 153b |
| **153b** | `components/player/detail/hooks/usePlayerTrading.ts` — 7 Handler Refactor | nach 153a-PASS |

## Phase-Status

| Phase | Status |
|-------|--------|
| Phase 1 Mutation-Hardening | ✅ Komplett (151a-d + 151c.2) |
| Phase 1.5 ClubProvider-RESET | ✅ Komplett (151b-RESET) |
| Phase 2 Money-Cleanup | ✅ Komplett (152a-d) |
| **Phase 3 UX-Hotspots** | 🟡 **In progress** (153 aktiv) → 156 → 157 → 158 |
| Phase 4 Rest + Norm | ⏳ Spaeter (159 Profile, 160 Codification) |

## Ferrari-Blueprint

- Mutation-Pattern: `src/lib/hooks/useToggleFollowClub.ts`
- Cross-Mutation-Shared-State (pgBouncer-safe): `src/lib/hooks/useWallet.ts:200-202`
- Primitive: `src/lib/hooks/useSafeMutation.ts`

Reviewer-Briefing: **„Jede Abweichung zu useToggleFollowClub/useWallet ist ein Finding. Money-Path — Cold-Context-Review Pflicht."**
