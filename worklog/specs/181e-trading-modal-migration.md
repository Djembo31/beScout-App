# Slice 181e — Modal→Dialog Migration Batch 4: Trading/Money (HIGH risk)

**Datum:** geplant fuer naechste Session
**Vorgaenger:** Slices 181, 181b, 181c, 181d (38/47 Sites done)
**CEO-Scope:** Indirekt — Money-Path UI, kein RPC/Wording-Change

## Ziel

8 Trading-Money-Modals von altem `Modal` auf neuen Radix-`Dialog` (Slice 181-Wrapper) migrieren. Pattern ist 38× erfolgreich validiert in 181b/c/d. Trading-Risiko liegt nicht im Code-Pattern, sondern in **Visual-Regression** und **preventClose-mid-Mutation-Race**.

## Site-Liste (Reihenfolge nach Sub-Slice-Split)

### 181e1 (Marktplatz/Orderbook, 4 Files)
1. `src/features/market/components/shared/BuyConfirmModal.tsx`
2. `src/features/market/components/shared/BuyOrderModal.tsx`
3. `src/features/market/components/marktplatz/ClubVerkaufSection.tsx`
4. `src/features/market/components/portfolio/OffersTab.tsx`

### 181e2 (Player-Detail Trading, 4 Files)
5. `src/components/trading/SellModalCore.tsx`
6. `src/components/player/detail/BuyModal.tsx`
7. `src/components/player/detail/OfferModal.tsx`
8. `src/components/player/detail/LimitOrderModal.tsx`

## Pflicht-Pattern (pro Sub-Slice)

1. **Pre-Migration qa-visual Baseline** — Playwright gegen bescout.net (CURRENT prod):
   - Login `jarvis-qa@bescout.net` (PW in `e2e/mystery-box-qa.spec.ts:5`)
   - Modal trigger pro File (z.B. Buy-Button auf Player-Detail, Confirm-Modal Open-State)
   - Screenshot 393px + 1280px → `worklog/proofs/181e1-baseline-<file>.png`
2. **Code-Migration** (drop-in, gleiche Mechanik wie 181b/c/d):
   - `import { Modal }` → `import { Dialog }`
   - `<Modal ...>` → `<Dialog ...>` (Props 1:1)
   - `</Modal>` → `</Dialog>`
   - Test-Mock-Renames (siehe Test-Files-Liste unten)
3. **tsc + vitest** — alle betroffenen Tests gruen.
4. **Bundle** — `pnpm run size` gruen.
5. **Commit + Push** → Vercel Auto-Deploy
6. **Post-Deploy Smoke** (gegen bescout.net):
   - Buy-Flow: Modal oeffnet, preventClose blockt ESC waehrend RPC, Toast nach Success
   - Sell-Flow: gleiche Verifikation
   - Place-Order: Limit-Order open + cancel
   - **Network-Throttle Test**: Slow-3G im Devtools, Confirm-Click → ESC sollte nicht close (kritisch)
7. **Visual-Diff** vs Pre-Migration-Baseline → `worklog/proofs/181e1-diff-<file>.png`

## Test-Files-Liste (zu updaten)

Aus den `Modal:` Mock-Greps (Slices 181b/c/d Pattern):
- `src/components/trading/__tests__/SellModalCore.test.tsx`
- `src/components/player/detail/__tests__/SellModal.test.tsx`
- `src/components/player/detail/__tests__/OfferModal.test.tsx`
- `src/features/market/components/portfolio/__tests__/OffersTab.test.tsx`

Mock-Pattern: `Modal:` → `Dialog:` (1:1 Property-Replace, sonst Test-Cascade-Trap → Production-Code crashed mit "Dialog is undefined").

## Risiken-Mitigation

| Risiko | Mitigation |
|--------|-----------|
| **preventClose-Race**: ESC waehrend `buy_player_sc` RPC → Wallet-Mutation halbfertig | Slice 181-Wrapper hat `onEscapeKeyDown.preventDefault + onPointerDownOutside.preventDefault + onOpenChange-gating` triple-Defense. Test mit Network-Throttle pflicht. |
| **Visual-Drift**: Bottom-Sheet Layout anders als alter Modal | Wrapper rendert identisch, in 38× Migrations bestaetigt. Pre/Post-Diff als Truth. |
| **Test-Cascade-Trap**: AlertDialog-Style fehlend bei Test-Mock | Pattern aus Slice 181b/c/d funktioniert (Modal:→Dialog: Rename reicht). |
| **Mid-Mutation-Wallet-Race**: Idempotency-Key durch Modal-Close abgebrochen | Slice 178d `useSafeIdempotentMutation` haelt key bis Settled. Modal-Wrapper-Wechsel aendert das nicht. |

## Acceptance Criteria

1. `pnpm install --frozen-lockfile` clean (keine Radix-Version-Drift)
2. tsc --noEmit clean
3. Alle betroffenen vitest-Files gruen (mind. 4 Test-Files je Sub-Slice)
4. Bundle: alle 51 Routes within budget
5. Pre/Post-Migration Visual-Diff: kein wahrnehmbarer Unterschied auf Trading-Modals
6. Post-Deploy Smoke gegen bescout.net: Buy + Sell + Place-Order + Cancel — alle gruen
7. Network-Throttle Test: ESC waehrend Mid-Mutation → Modal bleibt offen (preventClose works)

## Empfehlung Reihenfolge

- 181e1 (Marktplatz, 4 Files): kein Smoke-Showstopper, Buy-Confirm + Order-Pattern
- Pause + qa-visual review
- 181e2 (Player-Detail, 4 Files): erweiterte Trading-Pfade

Beide Sub-Slices: separater Commit + separater Push + separater Post-Deploy-Smoke.

## Aus 181b-plan offen (nach 181e)

- 181f: EventDetailModal (kombinierter Modal + ConfirmDialog → Dialog + AlertDialog)
- 181g: JoinConfirmDialog Custom-Refactor → AlertDialog
- 181h: Cleanup — Modal + ConfirmDialog Components entfernen aus `src/components/ui/index.tsx` + `ConfirmDialog.tsx`

## Verweise

- Migration-Plan: `worklog/specs/181b-radix-migration-plan.md`
- Wrapper-Source: `src/components/ui/Dialog.tsx` (Slice 181)
- preventClose-Pattern: `errors-frontend.md` "Modal preventClose Pattern"
- Money-RPC Idempotency: `errors-db.md` "Money-RPC Idempotency-Blueprint"
- Test-Cascade-Trap: dokumentiert in 181-review + 181c testing pattern
