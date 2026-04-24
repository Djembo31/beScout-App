# Slice 181b — Radix Migration-Plan (Folge-Slices Roadmap)

**Datum:** 2026-04-24
**Vorgaenger:** Slice 181 (Wrapper + 2 Pilots live)
**Status:** PLANNING — schedulebar als 181b/c/d/e/f/g/h (siehe Batches)

## Ziel

48 verbleibende `Modal`-Konsumenten + 1 verbleibender `ConfirmDialog`-Konsument
auf die neuen Radix-Wrappers (`Dialog` / `AlertDialog`) migrieren. Anschliessend
alte Custom-Components entfernen (181h).

## Pattern (pro Site)

1. Import-Rename: `import { Modal }` → `import { Dialog }` (analog `ConfirmDialog` → `AlertDialog`)
2. Component-Rename im JSX: `<Modal ...>` → `<Dialog ...>` (Props identisch)
3. Test-Mock-Update: `vi.mock('@/components/ui', () => ({ Modal: ... }))` → `Dialog: ...`
   - Falls Test radix-mocks nutzt: `import { createRadixDialogMock } from '@/test-utils/radix-mocks'` + `vi.mock('@radix-ui/react-dialog', () => createRadixDialogMock())`
4. Playwright-Smoke: Modal oeffnet + schliesst (ESC/X/Cancel) + preventClose-Pfad bei Mutation
5. Visual-Diff vs Pre-Migration-Screenshot (qa-visual)

## Migration-Risiken

| Risiko | Mitigation |
|--------|-----------|
| `mobileFullScreen`-Variante visual-drift | Pre-Migration Screenshot `393px` aller Sites mit `mobileFullScreen`-Prop |
| `preventClose` mid-mutation: ESC bricht | Test fuer jeden Pilot der `useSafeMutation` nutzt |
| Z-Index-Stacking nested Modals | Manuell pruefen alle Sites mit `<Modal>` innerhalb von `<Modal>` (z.B. EventDetailModal) |
| Footer-Layout-Drift | Visual-Diff (Sticky-Footer vs Inline-Buttons) |
| Test-Mock cascade (Button → index → supabase) | Wenn Test bricht: `vi.mock('@/lib/supabaseClient', ...)` hinzufuegen (siehe Slice 181 AlertDialog.test) |

---

## Batch 181b — Admin-Pages (LOW risk, 11 Files)

Reine Admin-UI ohne User-Money-Path. Schnellster Win.

```
src/components/admin/AddAdminModal.tsx
src/components/admin/CreateClubModal.tsx
src/components/admin/EventFormModal.tsx
src/components/admin/InviteClubAdminModal.tsx
src/components/admin/AdminOverviewTab.tsx
src/components/admin/AdminVotesTab.tsx
src/components/admin/AdminPlayersTab.tsx
src/components/admin/AdminBountiesTab.tsx
src/components/admin/FanChallengesTab.tsx
src/app/(app)/bescout-admin/AdminUsersTab.tsx
src/app/(app)/bescout-admin/AdminSponsorsTab.tsx
```

**Proof:** Admin-Page-Smoke gegen bescout.net + Bundle-Budget.

---

## Batch 181c — Community + Help + Sonstige (LOW-MEDIUM risk, 11 Files)

```
src/components/community/CreatePostModal.tsx
src/components/community/CreateBountyModal.tsx
src/components/community/CreateResearchModal.tsx
src/components/community/BountyCard.tsx
src/components/player/detail/CommunityTab.tsx
src/app/(app)/founding/page.tsx
src/app/(app)/profile/settings/page.tsx
src/components/profile/FollowListModal.tsx
src/components/fan-wishes/FanWishModal.tsx
src/components/layout/FeedbackModal.tsx
src/components/help/ShortcutsModal.tsx
src/components/help/Glossary.tsx
src/components/player/detail/GameweekScoreBar.tsx
```

**Proof:** Community Smoke (CreatePost + CreateResearch flow) + Visual.

---

## Batch 181d — Fantasy + Gamification (MEDIUM risk, 12 Files)

Hat Reward-Modals die nicht als „Trading" gelten aber State haben.

```
src/components/fantasy/CreateEventModal.tsx
src/components/fantasy/CreatePredictionModal.tsx
src/components/fantasy/EventSummaryModal.tsx
src/components/fantasy/SpieltagTab.tsx
src/components/fantasy/ErgebnisseTab.tsx
src/components/fantasy/LeaguesSection.tsx
src/components/fantasy/spieltag/FixtureDetailModal.tsx
src/components/gamification/MysteryBoxModal.tsx
src/components/gamification/AchievementUnlockModal.tsx
src/components/gamification/EquipmentPicker.tsx
src/components/inventory/EquipmentDetailModal.tsx
src/components/onboarding/WelcomeBonusModal.tsx
```

**Spezial:** MysteryBoxModal hat `preventClose` waehrend `open_mystery_box_v2`
RPC laeuft. Test verifizieren dass ESC/Backdrop blockiert.

**Proof:** Fantasy + MysteryBox Smoke + Bundle.

---

## Batch 181e — Trading/Money (HIGH risk, 8 Files — eigener Slice mit voller Smoke-Suite)

**KEIN BIG-BANG.** Diese Sites laufen direkt auf Wallet-Mutationen. CEO-Scope-naehe.

```
src/features/market/components/shared/BuyConfirmModal.tsx
src/features/market/components/shared/BuyOrderModal.tsx
src/features/market/components/marktplatz/ClubVerkaufSection.tsx
src/features/market/components/portfolio/OffersTab.tsx
src/components/trading/SellModalCore.tsx
src/components/player/detail/BuyModal.tsx
src/components/player/detail/OfferModal.tsx
src/components/player/detail/LimitOrderModal.tsx
```

**Pflicht-Proof:**
- Vor-Migration `qa-visual` Screenshots (393px + Desktop) aller 8 Sites
- Nach-Migration Visual-Diff
- Manueller Smoke-Run gegen bescout.net: Buy + Sell + Place-Order + Cancel-Order
- preventClose-mid-mutation Test mit Network-Throttle
- Bundle-Budget gruen

**Empfehlung:** 181e in 2 Sub-Slices splitten — 4 Files je Sub-Slice, je voller Smoke.

---

## Batch 181f — ConfirmDialog → AlertDialog (1 verbleibender, 1 File)

Nur 1 Site uebrig nach Pilot-Migration (AufstellenTab):

```
src/components/fantasy/EventDetailModal.tsx (2 ConfirmDialog-Usages, kombiniert mit Modal-Migration in 181d)
```

**Empfehlung:** In 181d zusammen migrieren (gleiches File hat Modal + ConfirmDialog).

---

## Batch 181g — JoinConfirmDialog Custom-Refactor (1 File, separater Custom-Component-Refactor)

```
src/features/fantasy/components/event-detail/JoinConfirmDialog.tsx
```

Hat eigenen Custom-Dialog (`absolute inset-0 z-50`). Migration auf `AlertDialog`
ist Refactor, nicht Drop-in. Eigener Slice.

---

## Batch 181h — Cleanup (alte Components entfernen)

NACHDEM 181b-g durch sind:

1. `Modal` aus `src/components/ui/index.tsx` entfernen (Lines 110-230)
2. `ConfirmDialog` File loeschen (`src/components/ui/ConfirmDialog.tsx`)
3. Re-Export im `index.tsx` entfernen
4. Bundle-Budget neu messen — sollte ~30kB shared sinken

---

## Bundle-Budget-Strategie

- **Slice 181 (heute):** +25kB Headroom pro Route, shared bleibt 170kB
- **Slice 181b-d (low/medium):** Bundle-Budget unveraendert lassen (Headroom genuegt)
- **Slice 181e (Trading):** Re-mess + ggf. korrigieren (heavy chunks)
- **Slice 181h (Cleanup):** Bundle-Budget per Route ~25kB senken (alte Modal weg)

## Reviewer-Pflichten pro Folge-Slice

Jeder Folge-Slice braucht Cold-Context-Reviewer-Pass gegen:

- `errors-frontend.md` "Modal preventClose Pattern" — Mutation-State-Linkage korrekt
- `ui-components.md` Mobile-First — `393px` visual identisch
- `business.md` — Falls Trading: Wording-Compliance (sollte unveraendert sein, aber pruefen)
- Bundle-Budget Gate (`pnpm run size`) — vor Commit

## Verweise

- Slice 181 Spec: `worklog/specs/181-radix-ui-primitives-foundation.md`
- Slice 181 Impact: `worklog/impact/181-radix-foundation.md`
- Wrapper-Source: `src/components/ui/Dialog.tsx` + `AlertDialog.tsx` + `DropdownMenu.tsx`
- Test-Helper: `src/test-utils/radix-mocks.ts`
- Bundle-Budget: `bundle-budget.json`
