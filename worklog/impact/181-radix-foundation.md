# Impact — Slice 181 Radix UI-Primitives Foundation

**Datum:** 2026-04-24
**Slice:** 181
**Spec:** `worklog/specs/181-radix-ui-primitives-foundation.md`

## Surface-Audit

### Modal-Konsumenten (Drop-in-Migration in Folge-Slices)

48 Files importieren `Modal` aus `@/components/ui`:

**Trading/Money (HIGH risk — Smoke-Modals):**
- `src/features/market/components/shared/BuyConfirmModal.tsx`
- `src/features/market/components/shared/BuyOrderModal.tsx`
- `src/features/market/components/marktplatz/ClubVerkaufSection.tsx`
- `src/features/market/components/portfolio/OffersTab.tsx`
- `src/components/trading/SellModalCore.tsx`
- `src/components/player/detail/BuyModal.tsx`
- `src/components/player/detail/OfferModal.tsx`
- `src/components/player/detail/LimitOrderModal.tsx`

**Manager/Kader:**
- `src/features/manager/components/kader/PlayerDetailModal.tsx`
- `src/features/manager/components/aufstellen/EventSelector.tsx`

**Fantasy:**
- `src/components/fantasy/EventDetailModal.tsx` (KOMBINIERT mit ConfirmDialog)
- `src/components/fantasy/CreateEventModal.tsx`
- `src/components/fantasy/CreatePredictionModal.tsx`
- `src/components/fantasy/EventSummaryModal.tsx`
- `src/components/fantasy/SpieltagTab.tsx`
- `src/components/fantasy/ErgebnisseTab.tsx`
- `src/components/fantasy/LeaguesSection.tsx`
- `src/components/fantasy/spieltag/FixtureDetailModal.tsx`

**Community:**
- `src/components/community/ReportModal.tsx` (← **PILOT 1**)
- `src/components/community/CreatePostModal.tsx`
- `src/components/community/CreateBountyModal.tsx`
- `src/components/community/CreateResearchModal.tsx`
- `src/components/community/BountyCard.tsx`
- `src/components/player/detail/CommunityTab.tsx`

**Gamification:**
- `src/components/gamification/MysteryBoxModal.tsx`
- `src/components/gamification/AchievementUnlockModal.tsx`
- `src/components/gamification/EquipmentPicker.tsx`
- `src/components/inventory/EquipmentDetailModal.tsx`
- `src/components/onboarding/WelcomeBonusModal.tsx`

**Admin (LOW risk — admin-only):**
- `src/components/admin/AddAdminModal.tsx`
- `src/components/admin/CreateClubModal.tsx`
- `src/components/admin/EventFormModal.tsx`
- `src/components/admin/InviteClubAdminModal.tsx`
- `src/components/admin/AdminOverviewTab.tsx`
- `src/components/admin/AdminVotesTab.tsx`
- `src/components/admin/AdminPlayersTab.tsx`
- `src/components/admin/AdminBountiesTab.tsx`
- `src/components/admin/FanChallengesTab.tsx`
- `src/app/(app)/bescout-admin/AdminUsersTab.tsx`
- `src/app/(app)/bescout-admin/AdminSponsorsTab.tsx`

**Sonstige:**
- `src/app/(app)/founding/page.tsx`
- `src/app/(app)/profile/settings/page.tsx`
- `src/components/profile/FollowListModal.tsx`
- `src/components/fan-wishes/FanWishModal.tsx`
- `src/components/layout/FeedbackModal.tsx`
- `src/components/help/ShortcutsModal.tsx`
- `src/components/help/Glossary.tsx`
- `src/components/player/detail/GameweekScoreBar.tsx`

### ConfirmDialog-Konsumenten (Drop-in-Migration in Folge-Slice)

**Nur 2 Import-Sites** (kleiner als Spec annahm):
- `src/components/fantasy/EventDetailModal.tsx` (2 uses, kombiniert mit Modal-Migration)
- `src/features/manager/components/aufstellen/AufstellenTab.tsx` (1 use ← **PILOT 2**)

### NICHT auf Modal/ConfirmDialog gebaut (separater Refactor)

- `src/features/fantasy/components/event-detail/JoinConfirmDialog.tsx` — eigener Custom-Dialog mit `absolute inset-0 z-50`. Migration auf AlertDialog = Refactor, nicht Drop-in. Separat in **181c**.

### DropdownMenu — bestehende ad-hoc Patterns

Kein systematisches DropdownMenu im Codebase. Vorhandene "menu"-aehnliche UI-Pattern:
- Sort/Filter-Pills (`SortPills.tsx`) — Tab-aehnlich, kein Dropdown
- TabBar (`TabBar.tsx`) — sticky-tabs, kein Dropdown
- Action-Menus auf Cards/Posts: aktuell keine, oder inline expand-collapse

**Pilot 3 (DropdownMenu):** Neuer Action-Menu-Use-Case — wird in BUILD identifiziert. Vermutung: Post-Card mehr-Punkte-Menu (Report/Share/Delete-Actions) oder Player-Card Quick-Actions.

## Side-Effects-Audit

### Bundle
- `@radix-ui/react-dialog` ~10 kB minified+gzipped
- `@radix-ui/react-alert-dialog` ~5 kB (re-uses Dialog internals)
- `@radix-ui/react-dropdown-menu` ~15 kB (eigene Floating-Logic)
- Plus shared Radix-Internals (`react-primitive`, `react-portal`, `react-focus-scope`, `react-dismissable-layer`, `react-presence`, `react-id`): ~5-8 kB
- **Geschaetzt: +30-35 kB shared** (single load via Next.js shared-chunk).

### Bundle-Budget Update
- Aktuell: 162 kB shared / 170 budget. Headroom 8 kB.
- Post-Radix: ~195-200 kB shared. **Budget muss auf 210 kB erhoeht werden**.
- Per-Route-Impact: minimal (Radix dedupliziert ueber shared-chunk).

### Test-Setup
- Vitest mit JSDOM: Radix nutzt `IntersectionObserver`, `ResizeObserver`, `pointer-events`. Aktuell teilweise gemockt in `vitest.setup.ts`.
- Pruefen: `vitest.setup.ts` braucht ggf. neue Mocks fuer Radix (siehe `radix-mocks.ts` task).

### z-Index-Layering
- Modal aktuell `z-[80]`. Radix-Dialog ueber Portal — neuer Stacking-Context. Pruefen ob nested Modals/Tooltips/Toasts noch korrekt layern.
- Toast aktuell `z-[100]`. Radix-Dialog default Portal: ans Body-Ende → kein z-Index-Konflikt erwartet.

### Animations
- `anim-modal`, `anim-bottom-sheet`, `anim-fade` aus `globals.css` — auf Radix-`data-state="open|closed"` Selektoren mappen.
- Beispiel:
  ```css
  [data-state="open"] { @apply anim-modal; }
  [data-state="closed"] { @apply anim-fade-out; } /* needs new keyframe */
  ```

### Accessibility-Verbesserungen (gratis durch Radix)
- Korrekte ARIA-Roles (`dialog`, `alertdialog`, `menu`, `menuitem`)
- Focus-Trap deutlich robuster (Radix `react-focus-scope`)
- Focus-Restore beim Schliessen (auf Trigger zurueck)
- Screen-Reader-Announcements via `aria-labelledby` (DialogTitle Pflicht)
- `aria-describedby` via DialogDescription (optional aber recommended)
- ESC-handling Konsistenz
- Pointer-events-Lock waehrend Modal offen (kein Click auf Hintergrund-Buttons via Tab-then-Enter)

## Migration-Risiken

| Risiko | Mitigation |
|--------|-----------|
| BuyConfirmModal/Sell-Flows brechen mid-mutation | preventClose-Pattern via `onOpenChange` callback gating + `onPointerDownOutside.preventDefault` + `onEscapeKeyDown.preventDefault` wenn `confirming=true` |
| Mobile-Bottom-Sheet nicht 1:1 visual | CSS auf `[data-state="open"]` mit gleichen Anim-Klassen wie alter Modal — Visual-Baseline VOR Migration nimmt Diff-Truth fest |
| Tests in Mock-Cascade brechen | radix-mocks.ts shared helper, analog Slice 164 useSafeMutation |
| z-Index Stack zerreisst (Toast/Tooltip nested) | Portal-Stacking via React-Tree pruefen, ggf. `forceMount` + custom z-Index |
| Radix-Title Pflicht (a11y warning bei fehlend) | Alle 48 Modal-Sites haben bereits `title` Prop → Wrapper nimmt direkt → kein Change |

## Migration-Plan (Schritte fuer Folge-Slices)

- **181** (dieser Slice): Wrapper + 3 Pilots + Test-Helper + Bundle-Budget + 181b-Plan-Doku
- **181b**: Modal → Dialog Migration Batch 1 — Admin-Pages (11 Files, low risk)
- **181c**: Modal → Dialog Migration Batch 2 — Community + Help + Sonstige (11 Files)
- **181d**: Modal → Dialog Migration Batch 3 — Fantasy + Gamification (12 Files)
- **181e**: Modal → Dialog Migration Batch 4 — Trading/Money (8 Files, **HIGH** — eigener Slice mit voller Smoke-Suite)
- **181f**: ConfirmDialog → AlertDialog Migration (2 Files: EventDetailModal kombiniert + AufstellenTab) — falls nicht in Pilot komplett
- **181g**: JoinConfirmDialog Refactor auf AlertDialog (separater Custom-Component-Refactor)
- **181h**: alte `Modal` + `ConfirmDialog` aus `src/components/ui/index.tsx` + `ConfirmDialog.tsx` entfernen (Cleanup)

## Side-Effect-Liste fuer reviewer-Agent

- [ ] CSP unchanged (Radix nutzt keine externen URLs)
- [ ] No new env vars
- [ ] No DB/RPC changes
- [ ] No service-layer changes
- [ ] No i18n string changes (nur Wrapper, keine User-facing-Text-Changes)
- [ ] Test-Setup `vitest.setup.ts` ggf. erweitert um Radix-Polyfills
- [ ] Bundle-Budget gate nach Update gruen

## Approval-Gate

L-Slice + technisch-architektonisch (kein Money/Security/Wording) → User-Approval erteilt 2026-04-24 ("alles was einen professionellen Stand gewährleistet").
