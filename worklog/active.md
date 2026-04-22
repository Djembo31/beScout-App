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

## Zuletzt (Session 2026-04-23)

- **Slice 153b** (2026-04-23) — usePlayerTrading Ferrari-Refactor, 7 Handler zu 6 useSafeMutations. REWORK→PASS nach 5 inline-Fixes. 39 Tests. Commit `565e2c1b`.
- **Slice 153a** (2026-04-23) — trading.ts Ferrari-Refactor, 4 Mutation-Hooks. PASS mit 4 NITs (Finding #1 inline gefixt). 22 Tests. Commit `9d417e68`.
- **Slice 152d** (2026-04-23) — WalletProvider Elimination, Phase 2 COMPLETE. Commit `78c7f409`.
- **Slice 152c** (2026-04-23) — Welle 2 Mutation-Consumer (Money-Path). Commit `a59a7209`.
- **Slice 152b** (2026-04-23) — Welle 1 Read-only Wallet-Consumer. Commit `0e10fe12`.

## Phase-Status

| Phase | Status |
|-------|--------|
| Phase 1 Mutation-Hardening | ✅ Komplett (151a-d + 151c.2) |
| Phase 1.5 ClubProvider-RESET | ✅ Komplett (151b-RESET) |
| Phase 2 Money-Cleanup | ✅ Komplett (152a-d) |
| **Phase 3 UX-Hotspots** | 🟡 In progress (**153 ✅**, 156 → 157 → 158 pending) |
| Phase 4 Rest + Norm | ⏳ Spaeter (159 Profile, 160 Codification) |

## Nahtlos-Naechste-Session

**Start-Punkt:** Slice 156 — `features/events/` Event+Fantasy-Store Ferrari-Refactor.

**Scope (aus Spec 153-scope-out):**
- Event-Entry-Mutations (`lockEventEntry`, `unlockEventEntry`) auf `useSafeMutation`
- FantasyStore (Lineup-Building) Mutations auf Ferrari-Pattern
- **P2.3 Carry-over:** RPC `lock_event_entry` / `unlock_event_entry` sollen `balance_after=null` (nicht `=0`) returnen bei Free-Events. Migration + Service-Cast + Consumer-Update.

**Blueprint:** `src/features/market/mutations/trading.ts` (Slice 153a) + `src/lib/hooks/useToggleFollowClub.ts`.

**Reviewer-Briefing (Money-Path):** Jede Abweichung zu 153a/b Ferrari-Referenz ist Finding. Phantom-Rollback + pgBouncer-onSettled strikt.

## Knowledge-Capture-Backlog (aus 153a/b Reviews)

- **memory/patterns.md:** „Optimistic-Scope-Entscheidungstree" (wann deterministic-field optimistic vs. wann nicht) + „Cancel-with-id Dual-Guard" (mut.isPending statt local-state-id).
- **common-errors.md §1:** Erweitern um `te(key)` silent-catch Pattern.
- **common-errors.md §5:** Erweitern um fire-and-forget logSilentCatch Pflicht.
- **Test-Pattern:** `gcTime: 60_000` im Test-QueryClient-Helper dokumentieren.
- **Ferrari-Blueprint-Doc:** `resetOnModalOpen`-Konvention (mut.reset() in openXModal fuer stale-error-Clearance).

## Carry-Over aus Phase 2/3

- ✅ P2.1 (`useOffersState.test.ts` Assertion): Commit `f215d0c0`
- ✅ P2.2 (`queryClient` Konvention): 153a applied. Codification Slice 160.
- 🔴 P2.3 (`balance_after=null` events.mutations): deferred Slice 156

## Ferrari-Blueprint-Referenz

- Mutation-Pattern: `src/lib/hooks/useToggleFollowClub.ts`
- Cross-Mutation-Shared-State (pgBouncer-safe): `src/lib/hooks/useWallet.ts:200-202`
- Primitive: `src/lib/hooks/useSafeMutation.ts`
- **Money-Path Piloten:** `src/features/market/mutations/trading.ts` (153a) + `src/components/player/detail/hooks/usePlayerTrading.ts` (153b)
