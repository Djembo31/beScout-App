# CTO Review: Slice 202 — Wave 5 Polish-Sweep

**Reviewer:** Cold-Context Opus reviewer-Agent
**Date:** 2026-04-26
**Time-spent:** 14 minutes
**Verdict:** **PASS** (with 2 MINOR findings, optional fixes)

---

## Spec-Coverage

- [x] **Brand 12** (PitchView text-yellow → text-status-doubtful): Z73 korrekt ersetzt durch `'text-status-doubtful'`. Grep `text-yellow` in PitchView.tsx leer. Grep `text-yellow-*` in `src/features/fantasy/` komplett leer.
- [x] **Brand 2** (Gold-Pulse-Gradient als CSS-Utility): `.gold-pulse-bg` in `globals.css` Z123-126 in `@layer utilities` definiert (Slice 181 D-Pattern erfuellt). page.tsx:334 nutzt Klasse + `motion-safe:animate-pulse`. Grep `bg-gradient-to-r from-gold/[0.04]` returnt nur Comment in globals.css — Migration vollstaendig.
- [x] **FM 9.3** (Per-Tier-Vergleichstabelle): Neue Component `TierComparisonMatrix.tsx` korrekt isoliert + integriert in `founding/page.tsx:23 + 232`. Position zwischen TierCards und Disclaimer wie spec'd.
- [~] **Punch-Liste-Status-Sync (Hygiene)**: Doku-File-Edit, separat verifizierbar via `git diff -- worklog/punch-list-2026-04-25.md`. Kein BLOCKER.

---

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | MINOR | `TierComparisonMatrix.tsx:47-48` | Zwei identische `useTranslations('founding')`-Calls in derselben Component. `t` wird auf Z185 fuer extras genutzt, `tCompare` fuer alle uebrigen — funktional aequivalent. | Vereinheitlichen auf eine Variable `t = useTranslations('founding')`. |
| 2 | MINOR | `TierComparisonMatrix.tsx:185` | `t(extraKey.replace('founding.', '') as 'extraAccess')` — Type-Cast auf Single-Literal ist Lie. ExtraKey-Union enthaelt 8 Werte, Cast typt nur einen. Bei Tippfehler (neuer ExtraKey ohne i18n-key) bleibt das silent. Same Pattern bereits in `founding/page.tsx:371`. | Optional Helper-Fn mit exhaustive switch oder `as Parameters<typeof t>[0]`. Pattern-Konsistenz mit pre-existing → kein REWORK. |
| 3 | INFO | `TierComparisonMatrix.tsx:51` | Card `surface="base"` rendert `bg-surface-base`. Sticky-left rendert `bg-bg-main`. Bei Scroll moeglich heller-Streifen-Effekt. | Falls Visual-QA Streifen zeigt: `bg-surface-base` auf sticky-left-cells. Post-Deploy verifizieren. |

---

## D48-Check (Pre-Existing-Code-Grep fuer FM 9.3)

**Search-Patterns:** `TierComparison`, `comparison.*tier`, `Per-Tier`, `stripe.*matrix`, `TierMatrix`, `FeatureMatrix` (case-insensitive) ueber `src/`.

**Result:** Nur die neuen Slice-202-Files. ✅ **NO duplicate** — Audit-Stale-Trap sauber vermieden. D48 funktioniert im 1. produktiven Einsatz ohne false-positive.

**Bonus-Check:** Identisches `tierDef.extras.includes(extraKey)`-Lookup-Pattern in `page.tsx:371` → konsistent.

---

## i18n-Audit

11 neue `compare*` keys + 8 pre-existing `extra*` keys (re-used) — alle 19 Keys vorhanden, symmetrisch DE+TR.

**Compliance-Check:**
- `extraIpoEarly` → DE: "Erstverkauf Early Access" / TR: "Kulüp Satışı erken erişim" — **AR-7 IPO-Begriffsregel eingehalten**.
- Keine raw-Strings. Kein hardcoded `addToast`-Pattern.

**Verdict:** ✅ PASS

---

## Token-Konsistenz

- `text-status-doubtful` ist in `tailwind.config.ts:18` (`#F59E0B`, Slice 196 Token).
- `.gold-pulse-bg` in `@layer utilities` — Tailwind data-state Variants funktionieren (Slice 181 Pattern).
- Gradient-Wert `linear-gradient(to right, rgba(255,215,0,0.04), rgba(255,215,0,0.10), rgba(255,215,0,0.04))` ist exakter Mirror der Tailwind-Klasse — Visual-Identitaet garantiert.

---

## Mobile-Friendly

- `overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0`: edge-to-edge auf Mobile.
- `min-w-[480px]`: garantiert horizontal-scrolls auf 393px.
- `sticky left-0 z-10 bg-bg-main`: standard-Pattern fuer sticky-first-column.
- Tabelle ist read-only (keine Touch-Targets, 44px-Regel relaxed).
- `font-mono tabular-nums` auf Numbers konsistent.

---

## Accessibility

- `scope="col"` auf Header-th's: ✅
- `scope="row"` auf Feature-th's: ✅
- `scope="colgroup"` auf Group-Header: ✅
- `aria-label` auf Check-Icon und em-dash-Span: ✅
- Tabelle-Struktur: `<table>` + `<thead>` + `<tbody>` korrekt.

**Verdict:** ✅ accessibility-clean

---

## Schema-Drift (FOUNDING_PASS_TIERS)

- `extras` enthaelt 8 distinct Strings im Format `'founding.extraXyz'`.
- `ALL_EXTRAS_ORDERED` listet exakt diese 8 keys explizit. Wenn neuer Extra-Key in `foundingPasses.ts` dazu kommt, MUSS er auch in `ALL_EXTRAS_ORDERED` + `ExtraKey`-Type ergaenzt werden.
- Acceptable Pattern (explicit-ordering noetig fuer UX), sollte als Konvention dokumentiert sein.

---

## Positive

1. **D48-Pflicht eingehalten:** Pre-Existing-Code-Grep ergibt zero duplicates. Implementer hat Audit-Stale-Catcher-Workflow ausgefuehrt — exakt das Verhalten, das D48 durchsetzen soll.
2. **i18n-Symmetrie perfekt:** 11 neue keys in beiden Locales, kein raw-key-leak-Risiko.
3. **Token-Konsistenz:** Beide Brand-Findings nutzen etabliertes Token-System (Slice 181 + Slice 196). Kein Drift.
4. **Accessibility-First:** scope-attributes + aria-labels + dash-Fallback — Tabelle ist screen-reader-tauglich.
5. **Pattern-Wiederverwendung:** `extras.includes(extraKey)`-Lookup identisch zu pre-existing `page.tsx:371`-Lookup.
6. **Compliance:** "Tier-Vergleich" / "Tier Karşılaştırması" — keine Securities-Sprache.

---

## Learnings fuer Knowledge Capture

1. **Pattern fuer `memory/patterns.md`:** "Per-Tier Comparison Matrix mit ExtraKey-Union + ALL_EXTRAS_ORDERED-Whitelist" als wiederverwendbares Vergleichs-Component-Pattern. Schema-Drift-Caveat dokumentieren.
2. **Doku-Hinweis fuer `foundingPasses.ts`:** Inline-Comment ergaenzen: "Bei neuem extra-key: auch `TierComparisonMatrix.tsx ALL_EXTRAS_ORDERED + ExtraKey-Type` ergaenzen + DE+TR i18n-key."
3. **Optional fuer `errors-frontend.md`:** "Type-Cast `as 'singleLiteral'` auf Union-Type ist Type-Lie fuer t()-Calls" — Sub-Klasse von "Missing i18n-Key bei neuer CTA-Component".
4. **D48-Workflow-Bestaetigung:** Slice 202 ist 1. Slice nach D48-Codification mit Audit-Stale-Risk-Setup. Pre-existing-Grep ergab clean → D48 funktioniert.

---

## Summary

Slice 202 ist ein **sauberer, scope-treuer Polish-Sweep** mit drei spec-faithful Items: zwei Token-Migrations (text-status-doubtful, gold-pulse-bg) und einer neuen Tier-Comparison-Matrix-Component. Alle drei sind technisch korrekt implementiert, i18n-symmetrisch in DE+TR, accessibility-konform und nutzen etablierte Patterns ohne Drift. **D48-Pre-Existing-Code-Grep fand keine Duplicates** — der Audit-Stale-Catcher-Workflow funktioniert im 1. produktiven Einsatz. Zwei kosmetische Findings (doppelter `useTranslations`-Hook + Type-Lie auf t-Cast) sind beide MINOR und Konsistenz mit pre-existing Pattern (page.tsx:371) — kein REWORK noetig.

**Verdict: PASS.** Commit-ready.
