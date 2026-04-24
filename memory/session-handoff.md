<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-04-24 15:58)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 4 Files
```
 M .claude/rules/business.md
 M docs/VISION.md
 M memory/session-handoff.md
?? docs/strategy-2026-04-24.md
```

## Session Commits: 10
- e81a6410 docs(hygiene): Slice 181d Eintrag in log.md + active.md idle (post-commit nachgezogen)
- 5eb4d30d refactor(ui): Slice 181d — Modal→Dialog migration Batch 3 (Fantasy/Gamification, 12 Files)
- 9e2d5b47 refactor(ui): Slice 181c — Modal→Dialog migration Batch 2 (Community/Help/Sonstige, 13 Files)
- 6a6c7f9c refactor(ui): Slice 181b — Modal→Dialog migration Batch 1 (Admin Pages, 11 Files)
- 3ea70fe1 feat(ui): Slice 181 — Radix UI-Primitives Foundation (Dialog + AlertDialog + DropdownMenu)
- a7ee3f27 docs(hygiene): Session 2026-04-24 close — active.md idle
- a005619f docs(rules): Slice 186 — common-errors.md split + DISTILL D30-D33 + session handoff
- 8a3ec599 docs(hygiene): Slice 185b abschluss — active.md idle
- 484768c8 feat(build): Slice 185b — Bundle-Budget-Gate (Tier D5)
- 5878f221 docs(hygiene): Call-Site-Sweep abschluss — active.md idle

## Pending Agent Work: 1 Worktrees
- **agent-a0ad4a83** (worktree-agent-a0ad4a83):  15 files changed, 2168 insertions(+), 26 deletions(-)

<!-- auto:handoff-end -->

---

# Rich Handoff — 2026-04-24 Session 2 (Radix-Migration-Marathon)

## Was diese Session brachte (5 Slices, 38 Modal-Sites migriert)

| Slice | Commit | Scope | Verdict |
|-------|--------|-------|---------|
| **181** | `3ea70fe1` | Radix Foundation: Dialog + AlertDialog + DropdownMenu Wrappers + 2 Pilots + Test-Helper + 181b plan | REWORK→PASS (Cold-Context-Reviewer + Self-Healer) |
| **181b** | `6a6c7f9c` | Modal→Dialog Admin (11 Files) | PASS (Self-Review) |
| **181c** | `9e2d5b47` | Modal→Dialog Community/Help (13 Files) | PASS (Self-Review) |
| **181d** | `5eb4d30d` | Modal→Dialog Fantasy/Gamification (12 Files) | PASS (Self-Review) |
| Hygiene | `e81a6410` | Slice 181d log/active nachgezogen | — |

**Kumulativ:** 38 von 47 Modal-Sites migriert. 5 Test-Cascade-Updates (Modal-Mock → Dialog-Mock) per Slice. Alle Slices: tsc clean, vitest gruen, Bundle alle 51 Routes within budget.

## Decisions dokumentiert (memory/decisions.md)

- **D34** Radix UI als Headless-Foundation (Dialog/AlertDialog/DropdownMenu), Drop-in API + Compound API + Mobile-Bottom-Sheet-Fallback
- **D35** Mechanical-Pattern-Slices duerfen Self-Review nutzen nach 2+ erfolgreichen Pattern-Iterations (verhindert Reviewer-Overhead bei Drop-in-Migrations)

## LEARNINGS (errors-frontend.md)

- **Tailwind data-* Variants nur auf Tailwind-Utilities**: `anim-*` muessen in `@layer utilities` sein, sonst kein Variant-Output. Verifiziert via `grep "data-state=open" .next/static/css/*.css`.

## Nahtloser Start fuer naechste Session

**Aktive Arbeit:** active.md idle. **Nächster Slice: 181e Trading/Money (HIGH risk).**

Vollstaendige Spec liegt vor: `worklog/specs/181e-trading-modal-migration.md`

**Erste Action naechste Session:**

1. Read `worklog/specs/181e-trading-modal-migration.md` (komplett, 60 Zeilen — Site-Liste + Pflicht-Pattern + Risiken)
2. Set active.md auf 181e1 BUILD (4 Files: BuyConfirmModal, BuyOrderModal, ClubVerkaufSection, OffersTab)
3. **Pre-Migration qa-visual Baseline** gegen bescout.net:
   - Login `jarvis-qa@bescout.net` (PW in `e2e/mystery-box-qa.spec.ts:5`)
   - 4 Modals oeffnen + Screenshot 393px + 1280px → `worklog/proofs/181e1-baseline-*.png`
4. Code-Migration Drop-in (gleicher Mechanismus wie 181b/c/d, etabliert)
5. tsc + vitest + bundle gruen
6. Commit + Push + Vercel-Deploy
7. Post-Deploy Smoke gegen bescout.net (Buy + Sell + Cancel + Network-Throttle ESC-Test)
8. Visual-Diff Pre/Post → bei keinem Drift: PASS, sonst REWORK
9. Repeat fuer 181e2 (4 Files: SellModalCore, BuyModal, OfferModal, LimitOrderModal)

**Trading-Pflicht (CLAUDE.md `Geld/Trading/Security | SELBST machen`):**
- KEIN Agent-Dispatch fuer 181e (Money-Path)
- qa-visual Pre/Post-Screenshots Pflicht
- preventClose-mid-Mutation mit Network-Throttle Pflicht
- bescout.net Smoke (Buy + Sell + Place-Order + Cancel) Pflicht

## Open Follow-ups nach 181e

| Prio | Scope |
|------|-------|
| HIGH | **181e1 + 181e2** Trading/Money Migration (8 Files, Money-Path) |
| MED | **181f** EventDetailModal kombinierter Modal+ConfirmDialog → Dialog+AlertDialog (1 File) |
| MED | **181g** JoinConfirmDialog Custom-Dialog Refactor → AlertDialog (1 File) |
| MED | **181h** Cleanup — alte Modal+ConfirmDialog Components entfernen aus `src/components/ui/index.tsx` + `ConfirmDialog.tsx` |
| LOW | buyFromIpo Idempotency-Integration (falls gewuenscht) |
| LOW | 185c per-chunk size-limit fuer grosse Libs |
| LOW | 180b Service-Shape votes/adminDeletePost/adminTogglePin |
| LOW | Error-Boundary 2-Scopes Pattern (176d) |
| LOW | pattern_observability_stack.md Addendum (176d) |
| LOW | Notion-Action: Slice 181/181b/c/d → "Erledigt" markieren in Kanban |

## Bekannte vorher-bestehende Failures (NICHT Slice-181x-related)

- `db-invariants.test.ts`: 4 Failures (INV-35/38/39/40) — Live-DB-Data-Integrity-Issues:
  - INV-35: Club-Logos sind aus einer Single-Source (api-sports canonical)
  - INV-38: kein unflagged Player mit contract_end > 12 Monate in der Vergangenheit
  - INV-39: keine Cross-Club-Contamination Ghost-Rows
  - INV-40: keine Same-Club Player-Duplicates
- Eigener Tier-A Slice empfohlen (Daten-Issues, nicht Code-Issues). Nicht-blocker fuer 181e.

## CI / Pipeline-Status

- Branch-Protection: 3 required status checks bypassed bei push (Owner-Berechtigung)
- Build-Job: `next build` + `pnpm run size` Gate — beide gruen lokal
- Pre-commit: commitlint + lint-staged aktiv
- ship-cto-review-gate: aktiv, prueft File-Existence in worklog/reviews/
- ship-proof-gate: aktiv, prueft Proof-Artifact bei feat(/fix(-Commits

## Wrapper-API-Reminder (fuer 181e Migrations)

```tsx
// Drop-in Migration: import-rename + JSX-rename
import { Modal, Button } from '@/components/ui'  →  import { Dialog, Button } from '@/components/ui'
<Modal open={...} title={...} preventClose={...} onClose={...} ...>  →  <Dialog ... />

// Test-Mock-Update (vi.mock @/components/ui):
Modal: ({ open, children, title, onClose }) => ...  →  Dialog: ({ open, children, title, onClose }) => ...
```

Wrapper-Source: `src/components/ui/Dialog.tsx`. preventClose-Pattern intakt.

## Worktree-Status

- main = einziger Worktree (e81a6410)
- agent-a0ad4a83 entfernt nach Merge

## CEO-Scope-Reminder

- 181e Trading betrifft Money-Path-UI aber kein RPC/Wording-Change → kein CEO-Approval noetig
- Visual-Regression-Risk = CEO-Scope-naehe → qa-visual + bescout.net-Smoke Pflicht (siehe 181e Spec AC-5+6+7)

## Time-Budget-Annahme naechste Session

- 181e1 (4 Files + Pre/Post-QA): ~30-45 min
- 181e2 (4 Files + Pre/Post-QA): ~30-45 min
- 181f + 181g + 181h Cleanup: ~30 min
- **Total Radix-Migration komplett**: ~90-120 min in einer fokussierten Session

