# Active Slice

```
status: active
slice: 153b
stage: SPEC
spec: worklog/specs/153-player-trading-ferrari-refactor.md (Welle B, Zeile 63-78)
impact: pending
proof: pending
review: pending
```

## Zuletzt

- **Slice 153a** (2026-04-23) — trading.ts Ferrari-Refactor, 4 Mutation-Hooks. PASS mit 4 NITs, Finding #1 inline. Commit `9d417e68`.
- **Slice 152d** (2026-04-23) — WalletProvider Elimination, Phase 2 COMPLETE. Commit `78c7f409`.
- **Slice 152c** (2026-04-23) — Welle 2 Mutation-Consumer (Money-Path). Commit `a59a7209`.
- **Slice 152b** (2026-04-23) — Welle 1 Read-only Wallet-Consumer. Commit `0e10fe12`.
- **Slice 152a** (2026-04-23) — useWallet Query-Hook + 13 TDD-Tests. Commit `753e8f83`.

## Slice-153 Struktur (D22 Sub-Slice-Gating)

| Welle | Scope | Status |
|-------|-------|--------|
| **153a** | `features/market/mutations/trading.ts` — 4 Hooks | ✅ PASS + COMMIT `9d417e68` |
| **153b** | `components/player/detail/hooks/usePlayerTrading.ts` — 7 Handlers | 🟡 AKTIV (SPEC) |

## 153b Scope

- `usePlayerTrading.ts` — 350 Zeilen, 7 async Handler mit useRef-Mutex + manual setState
- Refactor auf `useSafeMutation`-Instanzen, Optimistic-Updates in `onMutate`, Rollback in `onError`
- `useRef`-Mutexe raus (`buyingRef`, `ipoBuyingRef`, `sellingRef` — safeTrigger deckt das)
- `setBuying`/`setIpoBuying`/`setSelling`/`setCancellingId` raus — Mutation gibt `isPending`
- `setBuyError`/`setSellError` raus — Mutation `error`
- Public-API-Shape bleibt kompatibel (Consumer BuyModal, SellModal, Trading/Bids-Panels)
- Playwright-Proof: Buy → Balance-Update sichtbar → Kader-Tab zeigt Player (Money-Flow-Smoke)
- Rollback-Proof: Insufficient-Funds → Holdings zurück auf N-1

## 153a Learnings (fuer 153b uebernehmen)

- `gcTime: 60_000` in Test-QueryClient-Helper (sonst zombie-ed optimistic-writes)
- Phantom-Rollback-Pattern: `ctx?.prev === undefined` → `removeQueries`, nicht `setQueryData`
- Optimistic-Scope eng halten — nur deterministische Felder
- errorToast weglassen wenn Consumer inline-Error macht (Doppel-Toast vermeiden)

## Carry-Over aus Phase 2

- ✅ P2.1 (`useOffersState.test.ts` Assertion): Commit `f215d0c0`
- ✅ P2.2 (`queryClient` Konvention): 153a applied auf trading.ts. Codification Slice 160.
- 🔴 P2.3 (`balance_after=null` events.mutations): deferred Slice 156

## Phase-Status

| Phase | Status |
|-------|--------|
| Phase 1 Mutation-Hardening | ✅ Komplett |
| Phase 1.5 ClubProvider-RESET | ✅ Komplett |
| Phase 2 Money-Cleanup | ✅ Komplett |
| **Phase 3 UX-Hotspots** | 🟡 In progress (153a ✅, 153b aktiv) |
| Phase 4 Rest + Norm | ⏳ Spaeter |

## Ferrari-Blueprint

- Mutation-Pattern: `src/lib/hooks/useToggleFollowClub.ts`
- Cross-Mutation-Shared-State (pgBouncer-safe): `src/lib/hooks/useWallet.ts:200-202`
- Primitive: `src/lib/hooks/useSafeMutation.ts`
- **NEU Pilot 153a:** `src/features/market/mutations/trading.ts` — Reference fuer Money-Path-Mutations
