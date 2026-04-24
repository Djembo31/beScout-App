# Review — Slice 181 Radix UI-Primitives Foundation

**Datum:** 2026-04-24
**Reviewer:** reviewer-Agent (Cold-Context, Read-Only)
**Verdict:** REWORK → resolved zu PASS nach Healer-Fixes

## Findings

### HIGH

**HIGH-1 (false-positive):** Reviewer monierte fehlende Spec/Impact-Files im Worktree. Die Files existieren bereits in main (`worklog/specs/181-radix-ui-primitives-foundation.md`, `worklog/impact/181-radix-foundation.md`) und werden beim Merge in den Hauptbranch sichtbar. Nicht-Issue.

**HIGH-2 (echter Bug):** `aria-describedby="bs-dialog-subtitle"` in `Dialog.tsx` ist hardcoded → ID-Collision bei nested Dialogs (z.B. `EventDetailModal` mit Sub-Dialog). Fix: `React.useId()` fuer subtitle-ID.
→ **GEFIXT** in Healer-Pass.

**HIGH-3 (Doku-Gap):** AlertDialog `<RadixAlert.Description asChild><p>` ist in `<div className="flex-1 overflow-y-auto">` eingewickelt. Funktioniert (a11y-Tools traversen), aber Doku-Comment fehlt warum Description nested in scrollable body ist.
→ **GEFIXT** in Healer-Pass (Comment ergaenzt).

### MEDIUM

**MED-1:** Animations gemappt via `data-[state=open]:anim-modal`. Tailwind muss Variant aus arbitrary-attribute-Selektor generieren. Visual-Regression wenn Variant nicht in CSS-Output.
→ **VERIFIZIERT** via `pnpm run build` + `grep` auf `.next/static/css/`. Variant generated korrekt.

**MED-2:** AlertDialog kein `onPointerDownOutside`-Handler (intentional Radix-Default fuer destructive flows). Comment fehlt.
→ **GEFIXT** (Comment ergaenzt).

**MED-3:** Swipe-handle bei AlertDialog `confirming=true` visuell sichtbar trotz preventClose. Misleading-Hinweis.
→ **BACKLOG** (Slice 181i UX-Polish).

**MED-4:** Dialog-Tests verifizieren preventClose-Pfad nicht direkt (nur via X-Button-disabled). Coverage-Gap.
→ **GEFIXT** (zusaetzlicher Test-Case).

**MED-5:** `ReportModal.test.tsx` mockt `Dialog` inline statt `createRadixDialogMock`. Akzeptabel fuer Pilot, wird Pattern in 181b doku.
→ **DOKUMENTIERT** in `worklog/specs/181b-radix-migration-plan.md` (Test-Pattern-Note).

### LOW

**LOW-1:** `useIsMobile` First-Render flash auf Mobile (Desktop → Bottom-Sheet snap). Akzeptabel weil DropdownMenu nur post-Click rendert. Comment ergaenzt.

**LOW-2:** AlertDialog Cancel `asChild` → potenzielle Double-onClick. Test bestaetigt 1x. Akzeptabel.

## Positive (vom Reviewer)

- API drop-in-treu zu Modal/ConfirmDialog (Migration in Folge-Slices = Import-Rename)
- preventClose defensiv mit doppeltem Gate (handleOpenChange + onPointerDownOutside/onEscapeKeyDown preventDefault)
- i18n: `useTranslations('common').closeLabel` statt hardcoded
- Body-Scroll-Lock NICHT zusaetzlich implementiert (Radix-default, korrekt)
- `radix-mocks.ts`: vi.hoisted-Trap dokumentiert + Factory-Pattern wiederverwendbar
- AlertDialog Action bewusst plain Button (nicht RadixAlert.Action) — verhindert vorzeitige Close-Race
- useIsMobile SSR-safe (default `false` server)
- DropdownMenu Compound-API Radix-konform
- AlertDialog.test mockt `@/lib/supabaseClient` (Test-Cascade-Trap addressiert)
- Bundle-Budget per-Route-Erhoehung gut begruendet (Radix in Pilot-Sites lokal bundle't)
- 181b Migration-Plan strukturiert nach Risk-Tier (Trading separat mit Smoke-Suite)

## Time-Spent

Review: 38 min
Healer-Fix: ~15 min

## Final Status

PASS nach Healer-Fixes. Commit-Ready.
