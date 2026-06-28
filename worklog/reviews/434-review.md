# Slice 434 — Review (Duplikations-Ratchet)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-28 · **Time-spent:** ~30 min

## Verdict: CONCERNS → alle Findings adressiert (REWORK durchgeführt, Re-Verifikation grün)

Tool intern sound, korrekt verkabelt, import-safe, Windows-robust, **besteht den Anti-Akkretions-Selbsttest** (eine Baseline im bestehenden Register, kein neues File, keine Überlappung mit boundary/test-confidence, *subtrahiert* eine falsche §0-Behauptung). Haupt-Kritik: die Spec **über-claimte**, was das Tool real garantiert — exakt die D-30/31/32-Krankheit (Beweis ≠ Behauptung), die dieser Slice killen soll. Keine Merge-Blocker (WARN-first, money-neutral), aber Finding #1 = hochwertig, vor LOG behoben.

## Findings + Resolution

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | MAJOR (within tool) | Geheilt-Guard filterte `kind==='code'` → `kind=db` komplett übersprungen. `treasury_balance_cents`/`initial_listing_price` (Money-Path, in Spec §2 als Motivation genannt) **ungeschützt**. AC-02-Proof nutzte heimlich ein `code`-Symbol (`timeAgo`) statt des in der AC genannten `treasury_balance_cents` → Garantie unverifiziert. „append-only Migration-FP"-Rationale moot, da Scan `src/`-only ist. | **FIXED:** Filter → `code \|\| db` (`checkHealedRegression`). **Live-bewiesen** mit `kind=db`-Fixture `locked_balance` → an 3 src-Stellen gefangen (Proof 434-ac-audit AC-02b). Spec §2 + Edge#3 korrigiert (src/-only, db inkl.). JSDoc aktualisiert. |
| 2 | MEDIUM | PREFIXES flachte 2 nicht-synonyme Gruppen zusammen: `{format,fmt}` + `{calc,calculate,compute}` → `calcFee`/`formatFee` (beide Stamm `fee`) als Twin = latente FP. Muss vor WARN→BLOCK-Flip raus. | **FIXED:** `SYNONYM_GROUPS` + `synonymGroup()`; Cluster nur bei **≤1 beteiligter Gruppe**. `calcFee`/`formatFee` clustern NICHT mehr, `formatScout`/`fmtScout` + `timeAgo`/`formatTimeAgo` schon. Unit-Test deckt beide Fälle. |
| 3 | LOW | `MIN_STEM_LEN=3` ≠ Spec Edge#4 (sagte ≥4). | **FIXED:** Spec Edge#4 auf ≥3 + Rationale (calc/format-Stämme wie `fee`). |
| 4 | LOW | Stale-Registry-INFO (Spec Edge#6 + Pre-Mortem#4) versprochen, nicht implementiert. | **FIXED:** `checkStaleRegistry` implementiert (report-only, `ungetrackt`+`code`, Symbole aus src/ verschwunden → INFO). Summary + Report-Sektion + console. |
| 5 | LOW | workflow.md §0 impliziert breite Abdeckung. | **FIXED:** Qualifier „(v1 Teilabdeckung: src/lib-Twins format/calc + geheilt-Code/DB-Regression, breiter in v2)". |
| 6 | LOW (test-gap) | `clusterIsTracked`/Cluster-Logik nicht exportiert → nicht unit-getestet (nur Live-Smoke). | **FIXED:** `clusterFromExports` + `clusterIsTracked` + `synonymGroup` exportiert + unit-getestet. Tests 14 → **24**. |

## One-Line (Reviewer)
> Ein Senior merged es als v1 WARN-first Ratchet — verkabelt, dogfood-validiert, korrekt architektiert — verlangt aber Finding #1 zuerst (unverifizierte Money-Path-Garantie = exakt D-30/31/32).

## Positive (Reviewer)
- Das Schwerste richtig gemacht: **kein zweiter Weg beim Bau des zweiter-Weg-Detektors** — eine Baseline (gefencter Block im kanonischen Register), pre-commit-verkabelt mit Failure-Handling (`|| true`), keine Dopplung zu boundary/test-confidence. Slice *subtrahiert* sogar (killt die zahnlose §0-Behauptung).
- Parser defensiv (skip+warn, nie crash; Pipe-in-note erhalten; CRLF/Kommentar/Leerzeile). WARN-first→BLOCK wendet S350-Lehre korrekt an.
- **Dogfooding wirkte:** Tool fand im ersten Lauf einen echten neuen Twin (`timeAgo`/`formatTimeAgo`, i18n-Leak) → D-33 registriert.
- wiring-check-Änderung (`__tests__`/`*.test.*`-Skip) korrekt + komplett, KNOWN_ORPHANS folgt der `.husky/`-only-Konvention (E0-W2gov).

## Learnings (→ Knowledge)
- **Review-Heuristik (generalisiert D-30/31/32):** Wenn der *Proof* einer AC ein anderes Symbol/Wert nutzt als die AC *benennt*, ist die benannte Garantie unverifiziert = Finding, kein Pass. → `errors-infra.md` (Spec-Drift-Klasse) wird im LOG erweitert.
- **Ratchet-Design:** Synonym-Prefix-Stripping muss Synonym-Gruppen **getrennt** halten — Flachklopfen erzeugt komplementäre-Paar-FPs.

## Verdict nach Rework: PASS (alle Findings resolved, Re-Verifikation tsc+24 Tests+Detektor+wiring grün — siehe 434-ac-audit.txt)
