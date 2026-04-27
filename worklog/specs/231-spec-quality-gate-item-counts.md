# Slice 231 — Spec-Quality-Gate Item-Count-Validation

**Status:** SPEC · **Größe:** XS · **Scope:** CTO · **Datum:** 2026-04-27

> Refinement an `ship-spec-quality-gate.sh` (Slice 212). Reviewer-Lücke aus Slice 212: Hook prüft aktuell nur Sektion-EXISTENZ via Header-grep, NICHT die Mindest-Item-Counts. Workflow.md (Slice 211 D50) definiert konkrete Counts pro Slice-Größe. Slice 231 holt das nach.

---

## 1. Problem Statement

`ship-spec-quality-gate.sh` (Slice 212 Wave 2) WARN-Hook prüft Spec-Dateien auf Pflicht-Sektionen-Existenz (Header-grep `^##.*Code-Reading`). Hook ist tolerant gegen Sektion-Drift, aber blind für **leere Sektionen**: eine Spec mit `## 4. Code-Reading-Liste` Header + 0 Items unterschreitet das D50-Minimum (XS = 3, S/M = 6, L = 10), Hook ist silent → False-Negative.

**Reviewer-Lücke (Slice 212 Reviewer-Find):** "Hook prüft Sektion-EXISTENZ nicht Item-Counts → Slice 213". Tatsächlich nicht in Slice 213 gemacht (Slice 213 war QuickActionPills frontend-only). Backlog-Drift bis Slice 230.

**Wer ist betroffen, wie oft?** CTO (mich) bei jeder Spec, die ich für Slice 231+ schreibe. Aktuell bin ich der einzige Spec-Autor — eine schwache Spec mit leeren Sektionen passiert silent. Risiko: Agent läuft blind in bekannte Fallen (D50-Begründung: "Spec ist Kompass für den Agent").

## 2. Lösungs-Design (Architektur)

Hook erweitern um **per-Sektion Item-Count-Funktion**, die zwischen Sektion-Header und nächstem Header die Bullets/Tabellen-Rows zählt.

**Daten-Fluss:**
```
1. Hook detektiert Sektion-Header-Linie via grep.
2. Section-Body ist Lines zwischen Header-N und Header-(N+1) ODER EOF.
3. Item-Count = Lines die mit `- `, `* `, `+ `, `[0-9]+. ` oder `| ` (Tabellen-Row) beginnen.
4. Filter: skip Tabellen-Header (`|---|`) und Tabellen-Trenner.
5. Vergleich mit Mindest je Größe.
```

**Detection-Strategie (pragmatisch):**
- `awk` state-machine: zählt Items in benannter Sektion.
- Item-Pattern: `^[[:space:]]*[-*+] ` ODER `^[[:space:]]*[0-9]+\. ` ODER `^\| .* \|` (Tabellen-Row, NICHT `|---|` Separator).

**Mindest-Counts (workflow.md D50):**
| Größe | Code-Reading | Edge-Cases | ACs |
|-------|--------------|------------|-----|
| XS | ≥ 3 | ≥ 3 | ≥ 3 |
| S | ≥ 6 | ≥ 6 | ≥ 6 |
| M | ≥ 6 | ≥ 8 | ≥ 8 |
| L | ≥ 10 | ≥ 10 | (alle 11 Cat) |

**Wirkung:** WARN-only (analog Existenz-Check). Kein BLOCK.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `.claude/hooks/ship-spec-quality-gate.sh` | EDIT | Hook-Erweiterung: count_items()-Funktion + Item-Count-Vergleich pro Pflicht-Sektion |
| `worklog/specs/231-spec-quality-gate-item-counts.md` | NEU | Diese Spec |
| `worklog/active.md` | EDIT | Slice 231 SPEC → BUILD → REVIEW → PROVE → LOG |
| `worklog/log.md` | EDIT | Slice-Eintrag |

**Vor diesem Slice greppt man:**
```bash
grep -n "count_section" .claude/hooks/ship-spec-quality-gate.sh   # Pattern wiederverwenden
grep -n "MISSING" .claude/hooks/ship-spec-quality-gate.sh          # WARN-Block erweitern
```

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.claude/hooks/ship-spec-quality-gate.sh` | Existing Hook-Pattern + Skip-Cases verstehen | Wie wird `count_section()` definiert? Wo Sektion-Map (S_PROBLEM, S_FILES…)? |
| `worklog/specs/_TEMPLATE.md` | Master-Spec-Format kennen | Wie sehen Bullet-vs-Tabellen-Pattern in Code-Reading-Liste, Edge-Cases, ACs aus? |
| `.claude/rules/workflow.md` SPEC-Stage | D50 Mindest-Item-Counts pro Größe | Welche Counts sind kanonisch (XS=3, S=6, M=6/8, L=10)? |
| `worklog/specs/212-spec-quality-gate-hook.md` | Vorgänger-Spec lesen | Wie wurde Hook-Tolerance damals begründet (Stil-Drift)? |
| `worklog/specs/213-quickactionpills.md` (falls existiert) | Live-Verify-Beispiel | Welche Item-Counts hat eine konforme S-Spec wirklich? |

## 5. Pattern-References (relevant für DIESEN Slice)

- `decisions.md` D50 — Spec-Foundation-Uplift definiert Mindest-Item-Counts. Slice 231 operationalisiert. **Pflicht-Lesen.**
- `decisions.md` D52 — Wave-3-Tooling Standard-API: WARN-only + Negative-Test-Pflicht. Slice 231 ist konform.
- `errors-infra.md` "Shell case-statement wildcard promiskuoes" (Slice 145+146) — Bei awk/grep keine wildcard-pattern bauen. Hier nicht direkt anwendbar (kein Shell-Pattern auf User-Input), aber Erinnerung.
- `errors-infra.md` "grep `\b` Word-Boundary broken bei JSON-escaped Heredoc" — Hook bekommt nicht JSON, sondern liest Spec-File direkt. Nicht relevant.

## 6. Acceptance Criteria (Executable)

```
AC-01: [HAPPY] Konforme XS-Spec → Hook silent (Item-Count >= 3 in Code-Reading + Edge-Cases + ACs)
  VERIFY: bash .claude/hooks/ship-spec-quality-gate.sh < <(echo '{"file_path":"src/dummy.ts"}')
          wenn active.md auf Slice 231 zeigt mit XS-Spec
  EXPECTED: exit 0, kein WARN-Output
  FAIL IF: WARN angezeigt obwohl Spec konform

AC-02: [REGRESSION] Spec mit Header-Sektion aber 0 Items → Hook WARN
  VERIFY: Mock-Spec erstellen mit `## 4. Code-Reading-Liste\n\n## 5.` (leere Sektion),
          Hook auf Mock laufen
  EXPECTED: WARN-Output mentioniert "Code-Reading-Liste hat 0/3 Items (XS)"
  FAIL IF: Hook silent oder WARN ohne Item-Count-Detail

AC-03: [HAPPY] Workflow.md-Counts ehren (XS=3, S=6, M=6/8, L=10)
  VERIFY: Mock-Spec XS mit 2 Code-Reading-Items + 3 ACs + 3 Edge-Cases
  EXPECTED: WARN nur Code-Reading-Liste (2/3), Rest silent
  FAIL IF: WARN auch ACs/Edge-Cases obwohl Mindest erreicht
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Item-Zähl | Tabellen-Header `\|---\|` | Spec-Sektion mit Tabelle | Header+Separator NICHT als Items zählen | Filter `^\|---\|` ODER `^[[:space:]]*[-=]+[[:space:]]*$` |
| 2 | Item-Zähl | Verschachtelte Bullets | `- top\n  - sub\n` | beide oder nur top? | KISS: alle indentierten `- ` zählen (sub hat Wert) |
| 3 | Sektion-Boundary | Sektion am Datei-Ende ohne next `##` | Letzte Sektion vor EOF | Bis EOF zählen | awk: bei EOF stop |
| 4 | Spec mit Spaltierung Größe | Header `**Größe:** XS` vs `Size: S` | Tolerant gegen Bold-Drift | grep `(Größe\|Groesse\|Size)[[:space:]]*:` | bestehender Hook-Code reused |

## 8. Self-Verification Commands

```bash
# Pflicht jeder Slice:
bash -n .claude/hooks/ship-spec-quality-gate.sh   # Bash syntax-check (kein TypeScript)

# Slice-spezifisch:
# Smoke 1: konforme Spec → silent
echo '{"file_path":"src/dummy.ts"}' | bash .claude/hooks/ship-spec-quality-gate.sh; echo "EXIT=$?"

# Smoke 2: Mock-Spec mit leerer Code-Reading-Liste
mkdir -p /tmp/spec-test && cat > /tmp/spec-test/leer.md <<EOF
**Größe:** XS
## 1. Problem
text
## 4. Code-Reading-Liste
## 6. Acceptance Criteria
- AC-01
- AC-02
- AC-03
## 7. Edge Cases
- A
- B
- C
## 8. Self-Verification
text
## 10. Proof
text
EOF
# Hook lesen die nicht direkt — wir testen die Funktion isoliert via Sub-Shell-Source

# Smoke 3: AC-Coverage via grep-count auf Hook-Code
grep -c "count_items" .claude/hooks/ship-spec-quality-gate.sh   # ≥ 3 (def + 3 calls)
grep -c "Mindest-Items" .claude/hooks/ship-spec-quality-gate.sh # ≥ 1 (WARN-Output)
```

## 9. Open-Questions (klären VOR Code)

**Pflicht-Klärung:**
- Keine — Item-Count-Logik ist deterministisch via workflow.md D50.

**Autonom-Zone:**
- Awk-vs-grep-Ansatz (KISS: grep + sed-Sektion-Boundary).
- Item-Pattern-Regex (Bullet `- *+` + `[0-9]+. ` + Tabellen-Row).
- Verschachtelte Bullets als 1 oder N? **Default: alle indentierten zählen** (sub-bullet hat Wert).
- WARN-Message-Format: 1-Zeile pro fehlende Sektion.

**Nicht-Autonom-Zone:** Keine Money-Path. Reine Hook-Refinement.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Workflow / Hook | AC-Audit-Block: Smoke 1 (konform → exit 0 silent) + Smoke 2 (mock-leer → WARN mit Item-Count) → `worklog/proofs/231-hook-smoke.txt` |

**Pflicht:** Negative-Test (mock-Spec mit fehlenden Items) muss gezeigt werden, sonst nicht beweisbar.

## 11. Scope-Out

- **`spec: inline` Hard-BLOCK** → Slice 232 (separater Slice, andere Detection-Logik).
- **Workflow.md-Update** der Item-Counts: nicht nötig, Counts sind bereits in workflow.md SPEC-Stage definiert.
- **Hook auf andere Pflicht-Sektionen ausweiten** (z.B. Pre-Mortem-Szenario-Count bei L) → optional Backlog Slice 233+.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: Hook-only, kein Cross-Cutting)
     → BUILD (Hook-Erweiterung)
     → REVIEW (self-review D35: XS-Pattern-Wiederholung Slice 212 + Slice 223)
     → PROVE (Smoke-Test mock-Spec)
     → LOG
```

**IMPACT-Skip-Begründung:** Hook ist isoliert in `.claude/hooks/`, kein Code-Path zu src/, keine RPC/DB-Aenderung, keine Service-Aenderung. Kein Cross-Cutting.

**REVIEW-Self-Review-Begründung (D35):** Trivial-Pattern-Wiederholung. Slice 212 hat Hook-Erstellung, Slice 223 hat audit-stale-check.ts (gleiches Pattern: Detection-Tool mit Negative-Test-Pflicht). Slice 231 ist Refinement im selben File. Reviewer-Agent würde gleiche Pattern-Liste durchlaufen wie ich.

## 13. Pre-Mortem (optional bei XS, hier kurz)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Item-Count-Regex fängt False-Positive (z.B. `- ` in Code-Block) | MED | niedrig | Skip Code-Blöcke (` ``` ` Boundary) | Smoke 1 mit Spec mit Code-Block |
| 2 | Tabellen-Header als Item gezählt → Inflation | MED | niedrig | Filter `\|---\|` und Trenner | Smoke 2 mit Tabellen-Sektion |
| 3 | Sektion-Boundary versagt bei Sektion-am-Datei-Ende | LOW | niedrig | awk: stop-at-EOF | Smoke 3 Spec ohne next `##` |

---

## Compliance-Check

Nicht relevant — Hook-Refinement, kein User-facing Text, kein Money-Path.

## Open Risiko

**Risk:** False-Positive bei Item-Count-Regex (z.B. Code-Block mit `- foo`). Mitigation: Code-Block-Skip via ` ``` `-Toggle in awk. Wenn das versagt: Hook ist WARN-only, kein BLOCK — Schaden begrenzt auf Noise.
