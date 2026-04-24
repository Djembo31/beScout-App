# Slice 181 — Radix UI-Primitives Foundation

**Datum:** 2026-04-24
**Groesse:** L (cross-domain, neue Foundation)
**CEO-Scope:** Nein (technical foundation, keine Money/Security/Wording)
**Status:** SPEC — wartet User-Approval

## Ziel

Radix UI als Headless-Foundation einfuehren. Drei Primitives (Dialog, AlertDialog, DropdownMenu) mit BeScout-Theming wrappen. Pilot-Migration zeigt Pattern, alte Components bleiben coexistent fuer gradual rollout in Folge-Slices.

**Was User merkt:** Bessere Tastatur-Navigation, Screen-Reader korrekt, Focus-Restore beim Schliessen, AlertDialog blockt nicht-confirm Dismissal sauber.

## Aktueller Stand

- **`Modal`** (`src/components/ui/index.tsx:114-200+`): 48 Consumer. Manuell implementiert: ESC, body-scroll-lock, focus-trap. Mobile-Bottom-Sheet + Desktop-Centered. Props: `open`, `title`, `subtitle?`, `footer?`, `onClose`, `preventClose?`, `size`, `mobileFullScreen?`.
- **`ConfirmDialog`** (`src/components/ui/ConfirmDialog.tsx`): 9 Consumer. Wrapper auf `Modal` mit Confirm/Cancel. Props: `open`, `title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`, `confirmVariant`, `confirming`.
- **DropdownMenu**: existiert nicht. Aktuell ad-hoc per Click-Outside-Handler in einzelnen Components.
- **Bundle-Baseline**: 162 kB shared (siehe `bundle-budget.json`). Headroom 10-15 kB pro tracked Route.

## Scope (in)

### 1. Dependencies installieren
- `@radix-ui/react-dialog` (~10 kB)
- `@radix-ui/react-alert-dialog` (~5 kB extends Dialog)
- `@radix-ui/react-dropdown-menu` (~15 kB)
- Erwartete Bundle-Increase: ~25-30 kB shared, tree-shaked pro Route ~10-15 kB.

### 2. Wrapper-Components bauen
- **`src/components/ui/Dialog.tsx`** — Radix-Dialog mit BeScout-Theming. API-Compat-Schicht zu altem `Modal` (gleiche Props `open`, `title`, `subtitle`, `footer`, `onClose`, `preventClose`, `size`, `mobileFullScreen`). Migration = Rename Import.
- **`src/components/ui/AlertDialog.tsx`** — Radix-AlertDialog fuer Confirm-Patterns. API-Compat zu `ConfirmDialog`. AlertDialog **blockt** ESC/Backdrop-Dismiss in destructive flows nativer als Modal+preventClose.
- **`src/components/ui/DropdownMenu.tsx`** — Compound API: `Root`, `Trigger`, `Content`, `Item`, `Separator`. Anim `anim-dropdown`. Mobile: positioned wie Bottom-Sheet ab <768px? **Design-Frage offen** (siehe ACs).

### 3. Pilot-Migrations (3 Files, beweist Pattern)
- **`src/components/community/ReportModal.tsx`** → Dialog (typischer Form-Modal)
- **`src/features/fantasy/components/event-detail/JoinConfirmDialog.tsx`** → AlertDialog (typischer Confirm)
- **`src/features/manager/components/aufstellen/EventSelector.tsx`** → DropdownMenu (oder behalten als Modal-Variante — prueft Picker-Pattern-Frage)

### 4. Bundle-Budget anpassen
- Baseline +25-30 kB dokumentieren in `bundle-budget.json`
- Pre-Migration vs Post-Migration pro tracked Route messen

### 5. Migration-Plan dokumentieren
- `worklog/specs/181b-radix-migration-plan.md` als Folge-Slice-Roadmap (Modal → Dialog 48 Sites in 4-6 batches, ConfirmDialog → AlertDialog 9 Sites in 1 batch)

## Scope (out)

- **Kein Big-Bang**: Alte `Modal` + `ConfirmDialog` bleiben funktional und koexistieren. Migration der 48+9 verbleibenden Sites = **separate Slices** (181b, 181c, ...).
- **Andere Radix-Primitives** (Tooltip, Popover, Tabs, Select, etc.) — kein Scope. Bei Bedarf eigener Slice.
- **Visual-Redesign**: Keine Aenderung an Look. Nur Mechanik (Keyboard, Focus, A11y).
- **Tests fuer alte `Modal`**: bleiben unveraendert — alte Component noch live.

## Acceptance Criteria

1. `pnpm add @radix-ui/react-dialog @radix-ui/react-alert-dialog @radix-ui/react-dropdown-menu` clean — keine Peer-Conflicts.
2. `Dialog`, `AlertDialog`, `DropdownMenu` Components in `src/components/ui/` mit gleicher Props-Signatur wie Modal/ConfirmDialog (drop-in replacement) ODER explizit dokumentierte Breaking-API mit Begruendung.
3. ESC-Key + Backdrop-Click + preventClose-Verhalten 1:1 wie alte Modal (verifiziert via Playwright auf Pilot-Migration).
4. Focus-Restore: Nach Schliessen erhaelt Trigger-Element Focus zurueck (Radix-default — visual proof via DevTools-Screenshot).
5. Body-scroll-lock aktiv (vergleichbar zu altem Modal).
6. Mobile-Bottom-Sheet visual identisch (Pilot-Screenshot 393px).
7. Bundle-Impact gemessen + `bundle-budget.json` upgedatet, CI-Gate `pnpm run size` gruen.
8. 3 Pilot-Migrations live: ReportModal + JoinConfirmDialog + EventSelector. tsc clean, vitest gruen, Visual QA gegen bescout.net (nach Deploy).
9. Migration-Plan-Dokument `worklog/specs/181b-radix-migration-plan.md` erstellt mit Site-Liste + Batch-Vorschlag.
10. Keine Regression in 5 Smoke-Critical Modals (BuyConfirmModal, KaderSellModal, MysteryBoxModal, BuyOrderModal, EventDetailModal) — Visual-Diff Pre/Post-Deploy.

## Edge Cases

1. **preventClose mid-Mutation** — Radix-Dialog hat `onOpenChange` callback; muss ignoriert werden wenn `preventClose=true`. Test: Form-Submit waehrend isPending → ESC tut nichts.
2. **Stacked Modals** — z.B. ConfirmDialog innerhalb eines Modals (nested). Radix unterstuetzt das, aber z-Index-Layering pruefen.
3. **AlertDialog destructive flow** — z.B. "Verein verlassen", "Konto loeschen". Backdrop-Dismiss MUSS standard-blockiert sein (Radix-default fuer AlertDialog), kein versehentliches Schliessen.
4. **DropdownMenu Mobile** — auf <768px sollten Dropdowns NICHT als kleines Floating-Panel angezeigt werden (Touch-Target zu klein). Entscheidung: Bottom-Sheet-Variant ueber Media-Query? Oder Compound-API erlaubt Caller, `<DropdownMenu.Content>` durch `<Modal>` zu ersetzen?
5. **mobileFullScreen** — alter Modal hat `mobileFullScreen` Prop fuer datareiche Modals (z.B. EventDetailModal). Radix-Dialog unterstuetzt das via Custom Content-Styling — muss in Wrapper exposed werden.
6. **Focus-Trap mit dynamic content** — wenn Modal-Content async laedt und Focus-targets erst nach Mount existieren. Radix handled das automatisch — Pilot muss verifizieren.
7. **i18n** — `<DropdownMenu.Item>` Text muss aus `useTranslations()` kommen, nicht hard-coded.
8. **Test-Mocks** — bestehende Vitest-Tests fuer migrierte Components muessen Radix-Primitives mocken oder echte rendern. Ferrari-Test-Pattern nutzen (Slice 164 Mock-Expansion).

## Proof-Plan

| AC | Proof-Artefakt |
|----|----------------|
| 1, 7 | `pnpm install` + `pnpm run size` Output → `worklog/proofs/181-bundle-size.txt` |
| 2 | `git diff` der drei Wrapper-Files → `worklog/proofs/181-wrappers-diff.txt` |
| 3, 4, 5 | Playwright Script gegen bescout.net Pilot-Pages → `worklog/proofs/181-pilot-keyboard.png` (Tab-Focus-Cycle Screenshot) + `worklog/proofs/181-pilot-escape.png` |
| 6 | Mobile 393px Screenshots der 3 Pilots → `worklog/proofs/181-pilot-mobile.png` |
| 8 | `npx tsc --noEmit` + `npx vitest run src/components/community/__tests__/ReportModal.test.tsx` → `worklog/proofs/181-tests.txt` |
| 9 | File-Existence `worklog/specs/181b-radix-migration-plan.md` |
| 10 | Visual-Diff der 5 Smoke-Modals via qa-visual Agent → `worklog/proofs/181-smoke-modals.png` |

## Locked Decisions (User-Approval 2026-04-24)

> "alles was einen professionellen Stand gewährleistet"

1. **Primitives:** Dialog + AlertDialog + DropdownMenu — alle 3.
2. **API-Strategie:**
   - **Dialog + AlertDialog**: Drop-in-Replacement (1:1 Modal/ConfirmDialog Props). Migration = Import-Rename + Prop-Adapt wo noetig.
   - **DropdownMenu**: Compound-API (Radix-idiomatisch `<Root>/<Trigger>/<Content>/<Item>`). Kein Vorgaenger, kein Migration-Aufwand.
3. **DropdownMenu Mobile (<768px):** Bottom-Sheet-Fallback (Mobile-First-Pflicht). Implementiert via `useMediaQuery`/CSS-Breakpoint im Wrapper, NICHT vom Caller verlangt.
4. **Bundle:** +25-30 kB shared akzeptiert. `bundle-budget.json` shared baseline 162 → 192 kB. A11y/Code-Reduktion-Wert > Bundle-Cost. Kein 185c-Optimization davor.

## Pro-Standard Add-Ons (ergaenzend zur Min-Spec)

- **Visual-Baseline VOR Migration**: 5 Smoke-Modals (BuyConfirmModal, KaderSellModal, MysteryBoxModal, BuyOrderModal, EventDetailModal) auf bescout.net Pre-Pilot screenshotten. Diff Pre/Post.
- **Keyboard-Nav-Pflicht-Proof**: Playwright-Script Tab → Tab → ESC durch Pilot-Modals, Focus-Position pro Step screenshotten.
- **ARIA-Verifikation**: `getByRole('dialog', { name: ... })` + `getByRole('alertdialog')` Test-Assertions in Pilot-Tests.
- **Test-Helper**: `src/test-utils/radix-mocks.ts` mit shared Radix-Mocks (analog Slice 164 useSafeMutation-Pattern). Wird in 48 Folge-Migrationen wiederverwendet.

## Risiken

- **Hoher Surface-Impact** wenn Drop-in-Migration nicht 1:1 klappt (48 Sites). Pilot-Migrations werden das zeigen — Falls Mismatches: Wrapper anpassen, nicht Sites.
- **Bundle-Regression** bei suboptimalem Tree-Shaking. Mitigated durch Bundle-Gate.
- **Regression in Trading-Modals** (Money-Path) — deshalb Smoke-Modals AC-10.

## Dispatch-Plan (nach Approval)

1. **context7** Radix v1.x Docs fuer Dialog/AlertDialog/DropdownMenu (Pflicht laut CLAUDE.md)
2. **frontend-Agent** in Worktree: Wrapper bauen + Pilot-Migrations
3. **reviewer-Agent** Cold-Context: Pruefen gegen common-errors + ui-components
4. **qa-visual-Agent**: Pilot-Screenshots gegen bescout.net (nach Deploy)
5. **Bundle-Check**: `pnpm run size` lokal vor Commit
6. **Migration-Plan-Dokument** schreiben

## Verweise

- `.claude/rules/ui-components.md` — Mobile-First, States, A11y, Animations
- `bundle-budget.json` — aktuelle Thresholds
- Slice 185b — Bundle-Budget-Gate
- `src/components/ui/index.tsx:114` — Modal source
- `src/components/ui/ConfirmDialog.tsx` — ConfirmDialog source
