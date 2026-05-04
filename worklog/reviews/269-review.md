# CTO Review: Slice 269 — Markt-Puls 3-Tab Discovery (D63 Phase 4)

**Reviewer:** Cold-Context-Reviewer (Post-BUILD) · **Datum:** 2026-05-04 · **Time-spent:** ~35 min

---

## Verdict: **PASS** (mit minor CONCERNS)

Spec-Patches v2 haben alle 4 PFLICHT-Findings (F-01 bis F-04) sauber resolved. Architektur sound, Test-Coverage exzellent (16/16 grün, alle 8 AC-04-Permutationen + Tab-Switch + F-04-Gate). 2 neue minor Findings die Slice 269 nicht blockieren — Cleanup in 269b oder Polish-Sweep.

---

## Pre-Review-Findings-Status

| # | Severity | Status | Verifikation |
|---|----------|--------|--------------|
| **F-01** | CRITICAL | **RESOLVED** | de.json:412 `marketPulse: "Markt-Puls"` String + Z.413 `marketPulseTabs: {…}` Object — verschiedene Keys, KEIN Slice-263-Drift. Variante C korrekt umgesetzt. |
| **F-02** | CONCERNS | **RESOLVED** | `useMostWatchedPlayers(uid, 10)` in page.tsx:101, `watchedPlayers` als Prop an MarktPuls (page.tsx:264). Single-Source-Visibility erreicht. |
| **F-03** | CONCERNS | **RESOLVED** | MarktPuls.test.tsx:108-157 — alle 8 Permutationen explicit getestet (#1-#8). |
| **F-04** | CONCERNS | **RESOLVED** | MarktPuls.tsx:60 `!playersLoading && (holdings.length > 0 \|\| hasGlobalMovers)`. Test Z.177-184 explicit. Edge-Case #5 ein-eindeutig in Spec v2. |
| F-05 | NIT | RESOLVED | i18n-Counts in §3 v2 korrekt. |
| F-06 | NIT | RESOLVED | Pre-Mortem #8 vorhanden. |
| F-07 | NIT | RESOLVED | `globalMovers`-Orphan in Scope-Out dokumentiert. |
| F-08 | NIT | RESOLVED | AC-02 Test verifiziert TabPanel-conditional-mount. |
| F-09 | NIT | DEFERRED-OK | Visual-Proof deferred bis Anil Weekend-Verify. |

---

## Neue Findings (Post-BUILD)

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| **F-NEW-01** | CONCERNS | `MostWatchedStrip.tsx:27` | **Doppel-SectionHeader im watched-Tab.** MarktPuls rendert SectionHeader `t('marketPulse')`, embeddete MostWatchedStrip rendert eigene SectionHeader `t('mostWatched')`. Visual-Slop. OwnTopMoversStrip + TopMoversStrip + TrendingPlayersStrip haben KEINE eigene SectionHeader (korrekt) — MostWatchedStrip ist die Ausnahme. | Option B (Slice-269-konservativ): `showHeader?: boolean = true` Prop, MarktPuls passt `showHeader={false}`. |
| **F-NEW-02** | NIT | `TrendingPlayersStrip.tsx:48` | Hardcoded German `"${tp.tradeCount} Trades"` aria-label. TR-Locale-User Screenreader hört DE-Wort. errors-frontend.md "Hardcoded German addToast-Strings" (Slice 196). | i18n-Key reuse. |

---

## Architektur-Soundness

- **3-Tab-Konsolidierung:** sauber. Tab-Visibility-Filter + Default-Cascade + Single-Tab-Render-Branch klar getrennt.
- **`effectiveActiveTab`-Fallback:** elegant — wenn `activeTab` invalid wird, fällt auf `defaultTabId` zurück. Robust gegen Re-Render-Race.
- **Hook-Hoist:** korrekt. `useMostWatchedPlayers` 1× via TanStack-Cache geteilt.
- **`memo(MarktPulsInner)`:** sinnvoll für Re-Render-Reduktion.
- **Static-import MostWatchedStrip:** akzeptabel — ~70 LOC, kein Modal.

---

## Compliance-Check

- ✓ Glücksspiel-Vokabel: Tab-Labels neutral.
- ✓ Asset-Klasse: keine "Investment|Rendite|yatırım".
- ✓ Compliance-grep `marketPulseTabs` 0 Hits.
- ✓ Defensive null-strict-equality (Slice 265): strict comparisons throughout.
- ⚠ TR `tabMoversShort: "Hareket"` (7 chars) — outer-limit, Anil-WE-Verify entscheidet.

---

## Bekannte BeScout-Fallen — Status

- ✓ JSON Object/String-Drift (Slice 263): Avoided via Variante C.
- ✓ Defensive null-strict-equality (Slice 265): Strict throughout.
- ⚠ Hardcoded German Strings (Slice 196): F-NEW-02 ein hardcoded "Trades" in aria-label.
- ✓ Mobile Tab-Bars: `flex-shrink-0` + `overflow-x-auto` etabliert.

---

## Test-Strategie

- **16/16 grün:** 10 MarktPuls + 3 OwnTopMoversStrip + 3 TrendingPlayersStrip.
- **AC-04 vollständig:** alle 8 Permutationen.
- **AC-02 inactive-panel-conditional-mount:** explicit verifiziert.
- **F-04 playersLoading-Gate:** explicit Test.
- **Regression-Suite:** 3192/3194 grün, 1 pre-existing flaky (LeagueScopeHeader).

---

## Side-Effects

- ✓ `LastGameweekWidget` UNVERÄNDERT.
- ✓ Sidebar UNVERÄNDERT.
- ✓ `globalMovers`-Key orphan post-Slice — Scope-Out-konform.
- ✓ MostWatchedStrip Static-Import: Bundle-Impact negligible.

---

## Done-of-Definition (UI-Slice-Type)

- ✓ in 1+ Page-Render-Tree importiert.
- ✓ tsc + eslint clean.
- ✓ vitest grün (16/16).
- ✓ Mobile 393px-DOM-Test implicit via TabBar.
- ⚠ Visual-Proof Playwright deferred (Anil-WE-Verify).

---

## Code-Quality-Grade: **A-**

Sauberer 3-Component-Split, klare Visibility-Logic, `effectiveActiveTab`-Fallback elegant, comprehensive Test-Coverage. Abzug für F-NEW-01 (Doppel-SectionHeader) und F-NEW-02 (i18n-Leak).

---

## Regression-Risk: **LOW**

3-Sektionen-Replacement contained, page.tsx-Diff klar, keine Service/Hook/RPC-Touches, alle Pre-Review-Findings resolved.

---

## Summary

Slice 269 ist BUILD-complete und production-ready. Pre-Review-Drift-Mitigation v2 vorbildlich umgesetzt — F-01 i18n-Drift sauber via Variante C avoided, F-02 Hook-Hoist + F-04 playersLoading-Gate korrekt, AC-04 8-Permutations-Tabelle 100% getestet. F-NEW-01 sollte vor Commit gefixt werden (inline-Heal Option B), F-NEW-02 NIT.

**Signed:** Cold-Context-Reviewer · Slice 269 Post-BUILD · 2026-05-04
