# Slice 213 — QuickActionPills Component-Extract (Brand 1 P3)

**Status:** SPEC · **Größe:** S · **Scope:** CTO (P3 Polish-Refactor) · **Datum:** 2026-04-26

## 1. Problem Statement

`src/app/(app)/page.tsx:170-193` definiert 5 Quick-Action-Pills inline als `[...].map(...)`-Block direkt in der Home-Page. Audit-Brand-1 markiert dies als "Component-Library-Drift: Quick-Action-Pills sollten gemeinsamer Sub-Komponente extrahiert werden" (worklog/audits/2026-04-25/brand.md:19). 

**Evidence:** Page-File ist groß (~250+ Zeilen), Inline-Map-Block ist 23 Zeilen + 5 Tailwind-Tokens pro Item. Standard-React-Pattern: bei 5+ Items + 6 Props-pro-Item lohnt Component-Extract.

**Ehrliche Einordnung (CLAUDE.md Disziplin):** "Three similar lines is better than a premature abstraction" — Quick-Action-Pills sind 5 inline-Items mit konsistentem Schema. Extraction ist NICHT premature weil:
1. 5 Items ≥ Schwelle-für-Map-zu-Component
2. Inline-Block macht page.tsx schwerer lesbar
3. Component lässt sich isoliert testen
4. Token-Drift-Inventory wird bei Component-Extract sichtbar

**Einordnung als P3 low-prio:** Audit selbst markiert P3 — kein User-Impact, kein Bug. Pure Code-Quality-Refactor.

## 2. Lösungs-Design (Architektur)

**Extract-Pattern:**
- NEU `src/components/home/QuickActionPills.tsx` — Sub-Component die das Inline-Map-Block kapselt.
- Items-Liste bleibt in der Component (kein Props-Pass von Page) — Items sind Home-Page-spezifisch, nicht parametrisiert benötigt.
- Component akzeptiert nur 1 Prop: `tHomepage` (next-intl `useTranslations('home')`-Instance ist NICHT serialisierbar — also Component selbst aufrufen, kein Translation-Pass-Down).
- Better: Component nutzt eigenes `useTranslations('home')` hook intern. Pure self-contained, kein Prop nötig.

**Behavior:** identisch zu inline (kein Logic-Change, kein Props-Diff). Pure structural refactor.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/components/home/QuickActionPills.tsx` | NEU | Extracted Sub-Component, 5 Pills mit Tailwind-Tokens |
| `src/app/(app)/page.tsx` | EDIT | Inline-Map-Block ersetzt durch `<QuickActionPills />` Import + Render |

**Imports zu prüfen:** Page Z. 169-193 nutzt `Link`, `ShoppingCart`, `Swords`, `Target`, `Package`, `MessageSquare`, `cn`. Diese müssen entweder im neuen Component imported oder in page.tsx weiter gebraucht werden (Kontrolle: bleiben andere Verwendungen in page.tsx?).

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/app/(app)/page.tsx` | Existing Inline-Definition | Welche Imports sind nur für Quick-Actions? Welche werden auch anderweitig in page.tsx genutzt? |
| `src/components/home/HomeSpotlight.tsx` (oder ähnlich) | Existing Home-Component-Pattern | Naming-Convention, Props-Style, useTranslations-Pattern |
| `src/components/ui/index.ts` | Component-Barrel | Wird der neue Component dort exportiert? Konvention? |
| `messages/de.json` + `messages/tr.json` | i18n-Keys (qaBuy, qaFantasy, qaMissions, qaInventory, qaCommunity) | Existieren die Keys? Müssen sie verschoben werden? |
| `.claude/rules/ui-components.md` | UI-Standard | Mobile-First, Accessibility, Dark UI Opacity — ist Quick-Action-Pill konform? |

## 5. Pattern-References

- **CLAUDE.md** "Don't add features, refactor, or introduce abstractions beyond what the task requires" — gilt hier: Component-Extract ja, aber kein zusätzliches Props-System, keine generic-Pill-Library.
- **patterns.md #36** "Polish-Audit Pre-Existing-Code-Grep" (Slice 200a/200b) — vor Implementation greppen ob Pattern bereits irgendwo extracted wurde (Audit-Stale-Catcher).
- **errors-frontend.md** "Hardcoded German addToast/Error-Strings" (Slice 196 D32) — kein Risiko hier weil Strings via `t()` bezogen.
- **ui-components.md** Mobile-First / Accessibility — Pills haben aria-label (`<nav>` mit aria-label="quickActions"), Touch-Target-Size durchs Padding.

## 6. Acceptance Criteria

**AC-01:** [STRUCTURE] Component-File existiert
- VERIFY: `ls src/components/home/QuickActionPills.tsx`
- EXPECTED: File existiert
- FAIL IF: File fehlt

**AC-02:** [REGRESSION] page.tsx hat keine inline-Quick-Action-Map mehr
- VERIFY: `grep -c "qaBuy\|qaFantasy\|qaMissions\|qaInventory\|qaCommunity" src/app/\(app\)/page.tsx`
- EXPECTED: 0 (alle nur in QuickActionPills.tsx)
- FAIL IF: Treffer in page.tsx (Drift, doppelt definiert)

**AC-03:** [STRUCTURE] page.tsx importiert QuickActionPills
- VERIFY: `grep "QuickActionPills" src/app/\(app\)/page.tsx`
- EXPECTED: 2 Treffer (import + render)
- FAIL IF: kein Import

**AC-04:** [STRUCTURAL] tsc clean
- VERIFY: `npx tsc --noEmit`
- EXPECTED: keine Output-Zeilen
- FAIL IF: Type-Errors

**AC-05:** [REGRESSION] Vitest existing Tests bleiben grün
- VERIFY: `npx vitest run src/components/home 2>&1 | tail -3` (falls home/-Tests existieren) ODER vollständig `npx vitest run --reporter=basic` mit head-tail
- EXPECTED: Tests die existieren bleiben grün
- FAIL IF: neuer Failure

**AC-06:** [BEHAVIOR] Visual-Behavior unchanged
- VERIFY: Manual-Spot-Check der Component-File: 5 Pills mit identischen Items (href, icon, label, color, bg, glow) wie pre-Refactor inline-Definition
- EXPECTED: 1:1 Items-Match
- FAIL IF: Item geändert/weggelassen

**AC-07:** [I18N-PRESERVE] i18n-Keys werden weiter via t() gelesen
- VERIFY: `grep -c "t('qa" src/components/home/QuickActionPills.tsx`
- EXPECTED: 5 (qaBuy, qaFantasy, qaMissions, qaInventory, qaCommunity)
- FAIL IF: hardcoded German strings

**AC-08:** [HOOK-LIVE-TEST] ship-spec-quality-gate WARN/silent korrekt
- VERIFY: Während Slice 213 BUILD-Stage ist, Hook wird bei Edit auf `src/` triggern. Da Spec alle 13 Sektionen hat, soll Hook silent bleiben.
- EXPECTED: Kein WARN-Output bei legitimen Code-Edits (live-Test des Slice 212 Hook)
- FAIL IF: false-positive WARN bei konformer Spec

**AC-09:** [REVIEWER] Reviewer-Agent PASS oder PASS-with-Heal
- VERIFY: worklog/reviews/213-review.md verdict line
- EXPECTED: PASS (oder REWORK→PASS post-Heal)
- FAIL IF: FAIL

## 7. Edge Cases

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | showQuickActions=false | User mit `quick_actions_dismissed=true` | Section nicht gerendert | unchanged behavior | wrap `<QuickActionPills />` in `{showQuickActions && (<QuickActionPills />)}` |
| 2 | Mobile 360px | viewport zu schmal für 5 Pills | overflow-x-auto Scroll | unchanged | scrollbar-hide + flex gap-3 wie inline |
| 3 | TR-Locale | `qaBuy` → "Satın Al" | Locale-Switch | unchanged behavior | useTranslations('home') in QuickActionPills |
| 4 | Click-Navigation | User klickt /market?tab=kaufen | navigates correctly | unchanged | Link-Component identisch |
| 5 | next-intl SSR | Component rendert serverside | translations werden geladen | unchanged | 'use client' falls page.tsx auch client; falls nicht → testen |
| 6 | Component-Naming-Collision | `QuickActionPills` Name irgendwo schon belegt | unlikely | grep verifiziert | `grep -rn "QuickActionPills" src/` vor NEW |

## 8. Self-Verification Commands

```bash
# AC-01:
ls -la src/components/home/QuickActionPills.tsx

# AC-02 + AC-03:
grep -c "qaBuy\|qaFantasy\|qaMissions\|qaInventory\|qaCommunity" "src/app/(app)/page.tsx"
grep "QuickActionPills" "src/app/(app)/page.tsx"

# AC-04:
npx tsc --noEmit

# AC-05:
npx vitest run src/components/home 2>&1 | tail -5 || echo "no home tests"

# AC-06: Manual diff
git diff HEAD -- "src/app/(app)/page.tsx" src/components/home/QuickActionPills.tsx | head -100

# AC-07:
grep -c "t('qa" src/components/home/QuickActionPills.tsx

# AC-08: Hook-Live-Test (sollte silent sein während Slice 213 BUILD)
echo '{"file_path":"src/components/home/QuickActionPills.tsx"}' | bash .claude/hooks/ship-spec-quality-gate.sh 2>&1
echo "Exit: $?"

# Pre-Existing-Code-Grep (D48 catcher-Pattern aus patterns.md #36):
grep -rn "QuickActionPills\|QuickActionPill\b" src/  # verify keine pre-existing implementation
```

## 9. Open-Questions

**Pflicht-Klärung (vor Implementation):**
1. **`'use client'` directive nötig?** page.tsx ist Server-Component-Default in App Router. QuickActionPills nutzt next-intl `useTranslations` — das ist Server-Component-fähig in next-intl 3+. → **Antwort:** Component MUST mit `'use client'` markiert werden falls page.tsx das auch ist (greppen). Sonst Server-Component (besser für Bundle-Size).
2. **Items-Definition: in Component oder als Const-Export?** → **Antwort:** Inline in Component. Kein Caller-Customization nötig (Audit-Vorschlag implizit Self-Contained-Component).

**Autonom-Zone:**
- Component-Naming (QuickActionPills, QuickActionsBar, QuickActions) — pragmatic
- Component-File-Location (`components/home/` oder `components/navigation/`) — pragmatic, `home/` weil home-spezifisch
- Internal Helper / Sub-Type für Item

**Nicht-Autonom-Zone:**
- Visual-Behavior-Change (Items, Reihenfolge, Colors) — strikt 1:1
- i18n-Keys-Rename — strikt unchanged

## 10. Proof-Plan

1. `npx tsc --noEmit` — clean
2. AC-Audit-Block aus Sektion 8 → alle 9 ACs grün
3. **Hook-Live-Test:** während stage=BUILD beim Edit auf `src/components/home/QuickActionPills.tsx` muss Hook silent sein (Spec hat 13 Sektionen). Wenn Hook WARN gibt → Hook-Bug oder Spec-Lücke
4. Manual-Diff-Check: 5 Items 1:1 erhalten
5. Output speichern als `worklog/proofs/213-extract-audit.txt`
6. Reviewer-Agent dispatcht: prüft Self-Contained-Pattern + i18n-Preserve + visual-Behavior-1:1

## 11. Scope-Out

Folgendes ist explizit NICHT in Slice 213 (geht in Slice 214+):
- Generic `<Pill>` / `<NavLink>` library-component (premature, nur 1 Caller)
- Token-Drift-Cleanup (`bg-purple-500/10` → CSS-vars) — semantisch korrekte Tailwind-Tokens, kein Drift
- Refactor anderer inline-Map-Blöcke in page.tsx (Hero, FoundingUpsell etc.) — eigener Slice wenn nötig
- Test für QuickActionPills — pure-render-Component, snapshot-Tests fragil und low-Wert
- Animation-Improvements (active:scale, transition-all) — bestehend OK

## 12. Stage-Chain (geplant)

SPEC (diese Datei) → IMPACT (skipped: pure-frontend, single-Component-Extract) → BUILD → REVIEW (reviewer-Agent — niedrige Severity möglich, aber Slice 211 D50 verlangt Reviewer ab S-Größe) → PROVE → LOG.

## 13. Pre-Mortem

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | `'use client'` directive missing → SSR-Bug | LOW | hoch (Build-Fail oder Hydration-Error) | greppen ob page.tsx hat `'use client'` und mirroren | `npx next build` lokal nach Edit |
| 2 | i18n-Keys werden nicht gefunden → "qaBuy"-String erscheint statt "Kaufen" | LOW | mittel (UI-Drift) | useTranslations('home') namespace identisch zu page.tsx | Manual-Spot-Check oder grep `t('qa` count |
| 3 | Quick-Action-Item missing nach Refactor (z.B. Community vergessen) | LOW | mittel (5→4 Items) | AC-06 manuell verifiziert via diff | git diff Item-Count |
| 4 | Component-Naming-Collision | VERY LOW | niedrig | pre-grep | AC pre-grep |
| 5 | page.tsx größer statt kleiner (paradox) | LOW | niedrig | git diff --stat zählt | post-implementation |
| 6 | Hook-False-Positive WARN bei Slice 213 (Spec konform aber Hook regt sich auf) | MED | niedrig (nur Warn-Output) | Spec Self-Verify-Block hat AC-08 für genau diesen Test | grep Output |

---

## Compliance-Check

- Kein Money-Path
- Kein i18n-Risk (Strings unverändert)
- Pure structural refactor, kein Behavior-Change

## TR-Wording

Nicht relevant — Component nutzt existing i18n-Keys (qaBuy, qaFantasy, etc.) die bereits in DE+TR existieren.

## Open Risiko

`'use client'` directive — wenn page.tsx Server-Component ist, muss QuickActionPills auch SC sein (next-intl unterstützt das in v3+). Falls page.tsx `'use client'` hat, brauche ich den directive auch. Ich greppe vorab.
