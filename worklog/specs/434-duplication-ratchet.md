# Slice 434 — Duplikations-Ratchet (Detektor für ungetrackte Zwei)

**Status:** SPEC · **Größe:** M · **Slice-Type:** Tool · **Scope:** CTO (Scope + Härte CEO-vorab entschieden, AskUserQuestion 2026-06-28) · **Datum:** 2026-06-28

> Werkzeug-auf-Elite-Stand, Option A (Keystone-Detektor zuerst, WARN-first→BLOCK). Schließt die §0-„Detektor"-Lücke und macht die Schnitt-Regel maschinell erzwingbar.

---

## 1. Problem Statement

Die Master-Krankheit (R1 disease-register) ist *„immer anhängen, nie konsolidieren"* = **ungetrackte Duplikation** („von allem zwei": 2 RPCs/Services/Tabellen/Formatter/Spalten für einen Job). Über 431 Slices ist sie 34× neu + 32× bekannt entstanden.

**Evidence (faktenverifiziert 2026-06-28):**
- Alle **14 `audit:*`-Checks** in `package.json` gelesen — **keiner** detektiert aktive Duplikation. Die zwei Orphan-Detektoren (`wiring-check.ts` D54, `orphan-component-detector.ts` D46) finden nur **Null-Caller-Waisen** → sie feuern erst, wenn ein Zwilling schon *tot* ist (so wurde der 2. Lineup-Builder erst nach seinem Tod gefangen, S426). Die Krankheit in *aktiver* Form — zwei *lebende* Pfade — ist tool-unsichtbar.
- `workflow.md §0` (Slice 432) behauptet **zweimal** „Detektor im wiring-check" / „Detektor: wiring-check (erweitert)". `wiring-check.ts` ganz gelesen (312 Z.) → dieser Detektor **existiert nicht**. = Realität-vor-Zeremonie-Verstoß (§0.2): die schärfste Regel zeigt auf ein nie gebautes Werkzeug, ist also zahnlos.

**Wer betroffen:** Jeder künftige Slice (Anil + Agents) — ohne maschinelle Bremse rezidiviert die Krankheit strukturell (Append ist lokal billiger als Konsolidieren, gewinnt jedes Mal).

## 2. Lösungs-Design (Architektur)

Ein **Register-Ratchet** nach dem im Repo erprobten Muster (`boundary:check` S4, `test-confidence:check` S5, `silent-fail` Baseline): Baseline + Check, der fired sobald eine *getrackte Zahl/Fläche* unerlaubt wächst.

**Kern-Semantik (was „getrackt" bedeutet):** Eine Duplikation ist erlaubt, wenn sie **im Register steht** (egal ob `bewusste-zwei` wie D112 oder `ungetrackt`=noch-zu-heilen — Hauptsache *acknowledged*). Sie ist verboten, wenn ein Duplikations-**Fingerabdruck im Code** existiert, den das Register **nicht kennt**. Das setzt §0 1:1 um: *„kein **ungetrackter** zweiter Weg"*.

**Drei Prüfungen** (`scripts/duplication-check.ts`, npm `audit:dup` / `audit:dup:check`):

1. **Geheilt-Regressions-Guard** (höchstes Signal, billigste Robustheit): Für jeden `geheilt`-Eintrag (`kind=code` ODER `db`) grep nach seinen Symbolen über **`src/` (non-test)**. Migrationen/`worklog/` werden NICHT gescannt (append-only Historie = permanente legitime Nennung → FP). Taucht ein geheiltes Symbol in `src/` **wieder auf** → Finding. (Verhindert Re-Referenz von `treasury_balance_cents` [db, live verifiziert], `GameweekSelector` [code] etc.)
2. **Discovery / Twin-Scanner** (WARN, speist das Register): Statischer Scan auf den robustesten Fingerabdruck — **Service/Util-Funktions-Namens-Stamm-Kollision** in `src/lib/**`. Normalisierung strippt **nur Synonym-Gruppen** (`format`≈`fmt`, `calc`≈`calculate`≈`compute`) und clustert nur bei **≤1 beteiligter Gruppe** → fängt `formatScout`/`fmtScout` (D-23) + `timeAgo`/`formatTimeAgo` (D-33, Tool-Fund), ohne komplementäre `calcFee`/`formatFee`-FP. `get/fetch/use/my` werden NICHT gestrippt (Accessor/Hook-FP). Subset-Twins wie `getMyAdPayouts`/`getMyPayouts` (D-15) fängt diese Axis **nicht** (nur getrackt) — breitere Axes = v2. Gemeldet werden nur Verdächtige **noch nicht im Register**.
3. **Ratchet-Gate**: Findings aus (1) **immer** = Fail-Kandidat. Findings aus (2), die nicht im Register sind = der „ungetrackte zweite Weg". **WARN-first**: zuerst Report + `:check` non-blocking; sobald gegen die bekannten Register-Fälle **False-Positive = 0** verifiziert → Flip auf pre-commit-BLOCK (eigener Trivial-Folge-Schritt, 1 Zeile `.husky/pre-commit`).

**Baseline = EINE Quelle, kein zweites File:** Ein gefencter Block ` ```dup-registry ``` ` **im bestehenden** `worklog/notes/disease-register.md`. Format pro Zeile: `STATUS<TAB>ID<TAB>SYMBOLS(comma)<TAB>NOTE`, `STATUS ∈ {ungetrackt, bewusste-zwei, geheilt}`. Die Prosa-Tabellen bleiben menschliches Narrativ; der gefencte Block ist die Maschinen-Wahrheit (Header-Kommentar sagt das explizit). **Bewusste, protokollierte Zwei** (Narrativ ↔ Maschinen-Block in EINEM File, ein Konsument) — kein „von allem zwei", weil acknowledged + einseitig autoritativ.

**Exit-Codes** (wie wiring-check): 0 clean · 1 Findings (Mensch reviewt/heilt) · 2 Script-Fehler. `--check` = CI/Gate-Modus.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `scripts/duplication-check.ts` | NEU | Der Detektor (Report + `--check`). |
| `worklog/notes/disease-register.md` | EDIT | Gefencter ` ```dup-registry ``` `-Block (Maschinen-Baseline) + Header-Pointer. |
| `package.json` | EDIT | `audit:dup` + `audit:dup:check` Scripts. |
| `.husky/pre-commit` | EDIT | Step 9 `audit:dup:check` **non-blocking** (`|| true`, WARN-first). |
| `scripts/wiring-check.ts` | EDIT | `KNOWN_ORPHANS`-Einträge für die 2 neuen npm-Scripts (`.husky/`-only → sonst meldet wiring-check sie als Orphan-Drift → blockt JEDEN Commit; errors-infra E0-W2gov-Falle). |
| `.claude/rules/workflow.md` | EDIT | §0 „Detektor: wiring-check (erweitert)" → korrekt auf `audit:dup` zeigen (Zeremonie-Lücke schließen). |
| `scripts/__tests__/duplication-check.test.ts` | NEU | Unit-Tests (Parser + 3 Prüfungen + Ratchet-Semantik). |

**Vor diesem Slice greppt man:** `grep -rn "formatScout\|fmtScout" src/` (Discovery-Axis-Validierung) · `grep -rn "audit:wiring\|audit:boundary" package.json .husky/` (Wiring-Vorbild).

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `scripts/boundary-check.ts` | Ratchet-Vorbild (S4) | Wie ist Baseline + `--check` + exit-codes strukturiert? Übernehmbares Gerüst? |
| `scripts/test-confidence-check.ts` | Ratchet-Vorbild (S5) | Baseline-Storage-Pattern (Datei? Inline-Count?). |
| `scripts/wiring-check.ts` | Detektor-Vorbild (D54) | listFiles/readFileSafe-Helper · KNOWN_ORPHANS · Report-Format · `.husky/`-Scan-Gap (Z.81-87). |
| `scripts/silent-fail-audit.ts` | `.audit-baseline.json`-Muster | Wie wird „darf nur sinken" technisch erzwungen? |
| `worklog/notes/disease-register.md` | Baseline-Inhalt | §3-Tabellen (34 Einträge): welche Symbole/Pfade sind je Eintrag greppbar? Welche `geheilt` (§4)? |
| `.husky/pre-commit` | Wiring-Ziel | Reihenfolge der 8 Steps · `|| true`-Muster (tracker-drift Z.41) für non-blocking. |
| `package.json` (scripts 23-49) | npm-Wiring | Exakte `audit:*` / `audit:*:check`-Konvention. |
| `.claude/rules/errors-infra.md` | Bekannte Falle | „Neue `audit:*:check`-Scripts nur in `.husky/` → KNOWN_ORPHANS-Pflicht" (E0-W2gov) — exakt diese Falle hier. |

## 5. Pattern-References

- `workflow.md §0` (Slice 432) — Schnitt-Regel „kein ungetrackter zweiter Weg"; dieser Slice ist ihr Enforcement. Plus §0.2 Realität-vor-Zeremonie (die Lücke, die wir schließen).
- `disease-register.md` R1/R4 + §6.1 — R1 = Master-Ursache; §6.1 „Subtraktions-Ritual in DoD verankern = höchster Hebel". Baseline-Quelle.
- `decisions.md` D54 (wiring-check) + D46 (orphan-detector) — Detektor-Pattern-Familie, in die `audit:dup` sich einreiht.
- `errors-infra.md` „E0-W2gov KNOWN_ORPHANS-Pflicht" — der konkrete Wiring-Footgun für `.husky/`-only Scripts.
- `errors-infra.md` S350 „audit-Baseline driftet → CI rot" — warum WARN-first vor BLOCK (FP-Risiko).

## 6. Acceptance Criteria

```
AC-01: [HAPPY] audit:dup Report-Modus läuft clean auf sauberem Stand
  VERIFY: pnpm run audit:dup
  EXPECTED: Exit 0, Report nach worklog/audits/dup-<date>.md, "No untracked duplication"
  FAIL IF: Crash, oder Findings für bereits-registrierte Einträge (FP)

AC-02: [REGRESSION-GUARD] geheilter Zwilling wird gefangen
  VERIFY: Temp-Test: füge in einer Test-Fixture ein geheiltes Symbol (z.B. treasury_balance_cents) wieder ein → audit:dup
  EXPECTED: Finding "geheilt-Regression: treasury_balance_cents reappeared"
  FAIL IF: Kein Finding (Guard blind)

AC-03: [DISCOVERY] bekannter Twin formatScout/fmtScout wird als Stamm-Kollision erkannt
  VERIFY: pnpm run audit:dup (formatScout + fmtScout existieren live)
  EXPECTED: Discovery listet die Kollision — ABER als KNOWN (D-23 im Register), nicht als untracked
  FAIL IF: als untracked gemeldet (→ FP) ODER gar nicht erkannt (→ FN)

AC-04: [RATCHET] neuer ungetrackter Twin → Fail; nach Register-Eintrag → Pass
  VERIFY: Fixture mit neuem Stamm-Kollisions-Paar NICHT im Register → :check; dann Register-Zeile ergänzen → :check
  EXPECTED: 1. Lauf exit 1 (untracked), 2. Lauf exit 0 (jetzt getrackt)
  FAIL IF: 1. Lauf exit 0 (Gate blind) oder 2. Lauf exit 1 (Tracking wirkungslos)

AC-05: [WIRING] :check ist non-blocking in pre-commit (WARN-first) + wiring-check bleibt grün
  VERIFY: pnpm run audit:wiring:check  UND  Inspektion .husky/pre-commit
  EXPECTED: wiring exit 0 (kein Orphan-Drift durch die 2 neuen npm-Scripts); pre-commit-Step nutzt `|| true`
  FAIL IF: wiring meldet audit:dup-Scripts als Drift, ODER pre-commit-Step blockt hart

AC-06: [SELF-TEST] Unit-Tests grün
  VERIFY: CI=true pnpm exec vitest run scripts/__tests__/duplication-check.test.ts
  EXPECTED: alle grün (Parser, 3 Prüfungen, Ratchet-Semantik, Edge-Cases)
  FAIL IF: rot

AC-07: [ZEREMONIE-FIX] §0 zeigt nicht mehr auf nicht-existenten Detektor
  VERIFY: grep -n "wiring-check (erweitert)\|Detektor im wiring-check" .claude/rules/workflow.md
  EXPECTED: 0 Treffer (ersetzt durch audit:dup-Verweis)
  FAIL IF: alte Behauptung steht noch
```

## 7. Edge Cases Table

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | Parser | `dup-registry`-Block fehlt/leer | exit 2 mit klarer Meldung „kein dup-registry-Block" | existsSync + Block-Regex-Guard |
| 2 | Parser | Zeile mit falscher Spaltenzahl/Status | überspringen + WARN, nicht crashen | Zeilen-Validierung, `continue` |
| 3 | Geheilt-Guard | Symbol kommt legitim in Migration/Doc vor | nur `src/` (non-test) scannen — Migrationen/`worklog/` NIE (append-only Nennung ≠ Re-Auftauchen) | SRC_DIR-only + `.test.`-Ausschluss |
| 4 | Discovery | Komplementäre Stamm-Kollision die KEIN Twin ist (`calcFee`/`formatFee`) | ≤1-Synonym-Gruppe-Regel verwirft sie + Mindest-Stammlänge (≥3) | Synonym-Gruppen + Unit-Test (FP-Fix #2) |
| 5 | Discovery | Symbol in `__tests__`/`*.test.ts` | Test-Files ausschließen (wie orphan-detector) | Pfad-Filter |
| 6 | Ratchet | Register-Eintrag referenziert Symbol das nicht mehr existiert | INFO „stale registry entry" (kein Fail) → speist Hygiene | Soft-Hinweis im Report |
| 7 | Windows | CRLF / Backslash-Pfade | `.replace(/\\/g,'/')` + `\r?` in Regex (wie wiring-check) | Plattform-Normalisierung |

## 8. Self-Verification Commands

```bash
# Pflicht:
npx tsc --noEmit
CI=true pnpm exec vitest run scripts/__tests__/duplication-check.test.ts

# Slice-spezifisch:
pnpm run audit:dup                       # Report-Modus, clean
pnpm run audit:dup:check; echo "exit=$?" # Gate-Modus
pnpm run audit:wiring:check              # AC-05: keine neue Orphan-Drift
grep -n "wiring-check (erweitert)" .claude/rules/workflow.md  # AC-07: muss 0 sein
grep -rn "formatScout\|fmtScout" src/    # Discovery-Axis-Realität
```

## 9. Open-Questions

**Pflicht-Klärung:** keine offen — Scope (Keystone) + Härte (WARN-first→BLOCK) sind CEO-entschieden (AskUserQuestion 2026-06-28).

**Autonom-Zone (CTO):** Parser-Implementierung · Normalisierungs-Regeln der Discovery-Axis · Report-Format · Test-Struktur · exakte Stelle in `.husky/pre-commit`.

**Bewusst Scope-Out (nicht autonom „dazu"):** weitere Discovery-Axes (DB-Overloads, Component-Role-Twins, Column-Concept-Twins) = v2-Folge-Slices; der Flip WARN→BLOCK = eigener Trivial-Schritt nach FP=0-Verifikation.

## 10. Proof-Plan

| Artefakt | Beweist |
|----------|---------|
| `worklog/proofs/434-vitest.txt` | AC-06 Unit-Tests grün (Parser + 3 Prüfungen + Ratchet) |
| `worklog/proofs/434-ac-audit.txt` | AC-01..05/07 Command-Outputs (Report clean · Regression-Guard fängt · wiring grün · §0-grep=0) |

Proof-Typ = Tool → AC-Audit-Block-Output (workflow.md PROVE-Tabelle „Workflow/Skill/Hook"). Kein UI/DB/Money-Proof nötig (money-neutral).

## 11. Scope-Out

- **Flip WARN→BLOCK** → Folge-Schritt nach FP=0-Bake (1 Zeile `.husky/pre-commit`, `|| true` entfernen). Bewusst getrennt (S350: neue Baseline erst beweisen).
- **Discovery-Axes v2** (DB-Funktions-Overloads aus Migrations · Component-Role-Name-Cluster · Column-Concept-Twins `clubs/leagues.active_gameweek`) → eigene Slices. v1 = robusteste Einzel-Axis (Service-Stamm-Kollision) + Register-Guard.
- **Tooling-Hygiene** (22 `add-i18n`-Wegwerf · `_investigate`-Halde · 5 K5-Hooks · Auditor 4→1-2) → der vom Scope-Schnitt getrennte Folge-Slice.
- **disease-register → docs/knowledge verschieben** → MASTERPLAN K2 (eigener Slice). Tool liest Pfad konfigurierbar, damit K2 ein 1-Zeilen-Change ist.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: money-neutral Tool, kein Service/RPC/Schema/Cross-Domain — DoD 3a Tool-Pfad)
     → BUILD → REVIEW (reviewer-Agent — trotz Ops-Lane, weil Enforcement-Logik FN/FP-kritisch)
     → PROVE → LOG
```

IMPACT skipped: berührt keine DB/RPC/Service/Query-Keys/cross-domain Types; reines Audit-Tool + Wiring. REVIEW NICHT skipped (Ops-Lane erlaubt self-review, aber Detektor-Logik hat echte FN/FP-Fallen → Cold-Context-Reviewer lohnt).

## 13. Pre-Mortem (Tool-Enforcement → kurz)

| # | Failure | P | Impact | Mitigation | Detection |
|---|---------|---|--------|------------|-----------|
| 1 | FP blockt legit Commits | MED | hoch (Frust, `--no-verify`-Gewöhnung) | **WARN-first** bis FP=0; nur `|| true` in v1 | pre-commit-Output, AC-04 |
| 2 | wiring-check meldet die 2 neuen Scripts als Drift → JEDER Commit blockt | HOCH (bekannte Falle!) | hoch | KNOWN_ORPHANS-Eintrag **im selben Slice** + frischer `audit:wiring:check` | errors-infra E0-W2gov, AC-05 |
| 3 | Discovery zu naiv → FN (echte Twins durchrutschen) | MED | mittel | v1 ehrlich als „robusteste Einzel-Axis + Register-Guard" framen; Axes-Erweiterung = getrackte v2 | AC-03, Scope-Out dokumentiert |
| 4 | Baseline-Block ↔ Prosa driften | LOW | niedrig | Stale-Entry-INFO (Edge 6) + ein-File-ein-Konsument | Report INFO-Sektion |
| 5 | Tool selbst wird Orphan (nie aufgerufen) | LOW | mittel | pre-commit-Wiring im selben Slice (DoD-3a Tool-Pfad) | wiring-check |
