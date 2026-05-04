# Pre-Review: Slice 269 — Markt-Puls 3-Tab Discovery (D63 Phase 4)

**File:** `worklog/specs/269-markt-puls-3-tab.md`
**Reviewer:** Cold-Context-Reviewer (D62 Pre-Review-Pattern, BEFORE BUILD)
**Datum:** 2026-05-04
**Time-spent:** ~25 min

---

## Verdict: **REWORK**

Eine kritische Finding (F-01) blockiert BUILD ohne Spec-Patch. Architektur sound, Wording compliance-konform, Test-Strategie realistic. **Aber:** i18n-Sub-Key-Erweiterung von `home.marketPulse` (heute String, soll Object werden) ist exakt die JSON Object/String-Duplicate-Key-Drift-Klasse aus Slice 263 Pre-Review F-01 — latentes React-Crash-Risiko. Plus 3 weitere CONCERNS und 5 NITs.

---

## Spec-Quality-Grade: **B+**

13 Sektionen vorhanden, M-Slice-Mindest-Anforderungen erfüllt (Code-Reading 11 Items, ACs 10, Edge-Cases 11, Pre-Mortem 7), D54-Header korrekt. Self-Verification PowerShell-kompatibel. TR-Wording-Vorab vorbildlich.

Abzug: i18n-Drift-Risiko nicht detektiert (F-01), Pre-Mortem-Lücke Doppel-Hook-Call (F-02), AC-04 ohne konkretes Permutations-Mapping (F-03).

---

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| **F-01** | **CRITICAL** | Spec §3 + §6 AC-06/07 + i18n | JSON Object/String-Duplicate-Key-Drift (Slice 263 Pattern). Heute `home.marketPulse: "Markt-Puls"` (String). Spec erweitert um Sub-Object — Top-Level-String wird **unreachable**, KEIN Linter-Error. Wenn künftiger Code `t('home.marketPulse')` als String liest → React-Crash. Spec adressiert das nicht. | Spec-Patch §3 + §11. Variante A: Top-Level-String löschen + `marketPulseTitle`-Key neu. Variante B: Sub-Namespace `marketPulseSection.tabX/...`. Variante C (empfohlen): Sub-Namespace `marketPulseTabs.tabX/...` — Top-Level-String bleibt für Section-Title. |
| **F-02** | CONCERNS | Spec §9 + §13 #2 | `useMostWatchedPlayers` Doppel-Hook-Call als „akzeptabel via TanStack-dedupe" abgewunken — aber dedupe ist nur Network-Layer, nicht React-Subscription-Overhead. Plus Race: Markt-Puls-Visibility liest stale-Cache während Strip fresh-Cache. | Hook-Hoist auf `page.tsx` — page.tsx ruft Hook 1×, übergibt `watchedPlayers` als Prop an MarktPuls + Strip. Single-Source-Visibility-Decision. Spec §2 Datenfluss + §3 Files patchen. |
| **F-03** | CONCERNS | Spec §6 AC-04 + §13 #1 | „Test mit 8 Permutationen" nicht konkretisiert — handgewedelt. M-Slice "≥ 8 ACs" wird so nicht erfüllt. | Spec §6 AC-04 mit konkreter 8-Zeilen-Tabelle: `{movers, trending, watched} ∈ {true,false}` × 8 Kombis → expected default. |
| **F-04** | CONCERNS | Spec §7 #5 + page.tsx Z.297 | Edge-Case-Mitigation #5 mehrdeutig formuliert („Either... ODER..."). Plus: page.tsx hat `!playersLoading`-Gate vor TopMoversStrip — Markt-Puls movers-Tab braucht analoges Gate sonst Mount-Flicker. | Edge-Case #5 ein-eindeutig auflösen (kohärent mit F-02). Plus: `!playersLoading && (holdings.length > 0 \|\| hasGlobalMovers)` als movers-Tab-Visibility pflicht. AC-01 ergänzen. |
| F-05 | NIT | §3 + §11 | i18n-File-Counts nach F-01-Decision unklar | §3 nach F-01 fixen |
| F-06 | NIT | §13 | Doppel-Spotlight-Trending-Cache-Drift nicht in Pre-Mortem | Pre-Mortem #8 ergänzen (Cache-Drift LOW, Beta-Day-3-Telemetrie) |
| F-07 | NIT | §3 page.tsx | `globalMovers`-i18n-Key wird orphan post-Slice — Scope-Out-Klärung fehlt | §3 + §11: `globalMovers` orphan-OK, `topMoversWeek` weiter in OwnTopMoversStrip |
| F-08 | NIT | §6 AC-02 | Verify-Strategie für „2 inactive Tabs nicht-rendered" fehlt | AC-02 explicit `queryByRole('region')` für inactive panels |
| F-09 | NIT | §10 Proof-Plan | Visual-Render listet nur Tab-Counts, nicht Persona-Setups (`feedback_polish_multi_account.md`) | Proof: 4 Konfigurationen × 2 Accounts (Power+New) |

---

## Architektur-Soundness

- **3-Tab-Konsolidierung:** ✓ Vertikales Real-Estate-Lift ~480→~180px realistisch
- **Tab-Default-Cascade movers > trending > watched:** ✓ konsistent mit D63 Hero-Mode + D59 FM-Mental-Model
- **Tab-Visibility-Filter:** ⚠ nach F-02-Fix sauber (Hook-Hoist)
- **3 NEUE Component-Files vs inline:** ✓ DRY-Win
- **Tab-State lokal (useState):** ✓ D63 Identity-in-5-Sekunden konform
- **Doppel-Hook-Call:** ⚠ siehe F-02 — Hook-Hoist sauberer

---

## Compliance-Check

- ✓ Glücksspiel-Vokabel: „Bewegung"/„Hareket"/„Trends"/„Beobachtet"/„İzlenen" — neutral
- ✓ Asset-Klasse: kein Investment/Rendite/yatırım
- ⚠ TR `tabMoversShort: "Hareket"` (7 chars) — outer-limit per ui-components.md "Mobile Tab-Bars Max ~5 chars". Anil sollte ggf. Symbol erwägen (`↑↓`)
- ✓ alle Strings via `t()`
- ✓ kein data-state-Drift (TabBar nutzt `aria-selected`)

---

## D63 Phase 4 Alignment

- ✓ Discovery-Konsolidierung erreicht durch 3→1 Section
- ✓ Vertical-Real-Estate-Lift realistisch
- ✓ konsistent mit D63 Hero-Cascade-Mental-Model

---

## Estimated-Build-Effort: **M = 2.0–2.5h** (oberes Ende)

Aufschlüsselung:
- OwnTopMoversStrip-Extract: 20 min
- TrendingPlayersStrip-Neu: 30 min
- MarktPuls-Container: 40 min
- page.tsx-Migration: 15 min
- i18n DE+TR (inkl. F-01 Drift-Mitigation): 25 min
- 3 Tests (14 Test-Cases): 50 min
- F-01 Drift-Patch: 10 min

---

## Action-Items vor BUILD

1. **PFLICHT (F-01):** Spec-Patch zur i18n-Drift-Mitigation (Variante A/B/C wählen)
2. **PFLICHT (F-02):** Spec §2 + §3 — Hook-Hoist auf page.tsx, MarktPuls bekommt watchedPlayers als Prop
3. **PFLICHT (F-03):** Spec §6 AC-04 explicit 8-Permutations-Tabelle
4. **PFLICHT (F-04):** Edge-Case #5 ein-eindeutig + `playersLoading`-Gate für movers-Tab
5. **EMPFEHLUNG (F-05–F-09):** NIT-Cleanup im selben Spec-Update
6. **Anil:** TR-Wording-Tabelle reviewen + entscheiden ob `tabMoversShort` Symbol oder „Hareket"

---

**Verdict:** REWORK wegen F-01 (Critical) + F-02/03/04 (Concerns). Spec-Patch ~15 min, dann GO für BUILD.

**Signed:** Cold-Context-Reviewer · Slice 269 Pre-Review · 2026-05-04
