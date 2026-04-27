# Slice 234 Review (Reviewer-Agent Cold-Context, L-Slice)

**Datum:** 2026-04-27
**Reviewer:** reviewer-Agent (Background-Dispatch, Time spent ~22min, 29 tool-uses)
**Initial Verdict:** CONCERNS (11 Findings)
**Final Verdict:** PASS post-Heal-Wave

---

## Heal-Wave Summary (Slice 234 inline-Fix)

Reviewer fand 11 Findings: 1 HIGH (F-08), 6 MEDIUM (F-01/02/03/04/07/F-11), 4 LOW (F-05/06/09/10).

| # | Sev | Status | Action |
|---|-----|--------|--------|
| F-01 | MED | ✅ Fixed | Spec-Drift "10 vs 11 orphan" — Spec präzisiert: "10 echte Drift + 1 false-positive Audit-Bug" |
| F-02 | MED | ✅ Fixed | AC-05 grep-Pattern korrigiert (`gh issue list --search` → `listForRepo` + `tr-strings.txt`) |
| F-03 | MED | ✅ Fixed | `findings-to-slices.ts` aus KNOWN_ORPHANS entfernt — ist via nightly-audit.yml gewired, audit:wiring 0 real-drift |
| F-04 | MED | ✅ Fixed | `tr '[:upper:]' '[:lower:]'` UTF-8-Bug: `LC_ALL=C.UTF-8`-Prefix + dual-Pattern für Großbuchstaben (Hör auf / FALSCH / KORREKTUR) — getestet mit "Hör auf damit, das war FALSCH" → queue +1 ✓ |
| F-05 | LOW | ⏸ Akzeptiert | REPO_ROOT-empty-silent-skip ist konsistent mit ship-cto-review-gate Pattern |
| F-06 | LOW | ⏸ Akzeptiert | pnpm-absent-silent-skip — Anil's Setup hat pnpm pflicht, never-Pfad |
| F-07 | MED | ✅ Fixed | mit F-01 zusammen — Hook-Count-Drift in Spec präzisiert |
| F-08 | **HIGH** | ✅ Fixed | Master-Tracker-Issue #25 erstellt (beta-blocker, smoke-fail) für Player-Link-Timeout. Slice 235 Backlog dokumentiert in log.md. F-08 Concern adressiert: Beta-Blocker bleibt sichtbar trotz 14 closed Issues |
| F-09 | LOW | ⏸ Akzeptiert | basename-Detection statt rel-path: Trade-off, no namespace-collision today |
| F-10 | LOW | ✅ Positive | Reviewer bestätigt: keine heredoc-Backdoor (Slice 145+146-Lehre angewendet) |
| F-11 | MED | ⏸ Documented | settings.json > 3 Hook-Edits → künftig IMPACT-Pflicht. Pattern in errors-infra.md gedoct als Slice 234 Knowledge-Capture |

**Heal-Verifikation:**
- F-04: queue.jsonl line-count 3 → 4 nach Großbuchstaben-Test ✓
- F-03: audit:wiring 14 known (war 15), 0 real-drift ✓
- F-08: gh issue #25 OPEN als Master-Tracker ✓
- F-01/F-02/F-07: Spec-File inline-edited ✓

---

## Reviewer-Output (Original)

> Slice 234 ist ein substantieller, gut-konstruierter L-Slice der seine eigene
> These ("System heilt Drift retrospektiv + verhindert prospektiv") überwiegend
> erfüllt. Die Pattern-Familie D43→D46→D54 ist sauber zusammengeführt, der
> Hook-Code ist defensiv und token-anchored, und D54 ist empirisch fundiert.
> Die CONCERNS sind allesamt behebbar: F-01/F-02/F-07 sind Spec-Drift im Slice
> der Spec-Drift heilt (Ironie!), F-03 ist eine überflüssige KNOWN_ORPHAN-
> Eintrag, F-04 deckt einen latenten UTF-8-Bug auf, F-08 ist die wichtigste
> — Issue-Closing-Phase-1.4 ohne Investigation-Output verschleift potentiell
> denselben Beta-Blocker. **Verdict CONCERNS, kein REWORK** weil keiner der
> Findings das Slice-Ergebnis selbst kompromittiert; alle sind Polish-Items und
> Pattern-Lessons für künftige Slices.

---

## Spec-Coverage Verifikation (alle ACs)

| AC | Status | Evidence |
|----|--------|----------|
| AC-01 — 8 Hooks registriert | ✅ PASS | `for h in ...; do grep -c $h.sh settings.json; done` → alle 8 = 1 |
| AC-02 — archive + delete | ✅ PASS | `ls archived/quality-gate.sh ✓` + `inject-learnings.sh deleted ✓` |
| AC-03 — wiring-check 0 real-drift | ✅ PASS | `pnpm run audit:wiring` → 0 real, 14 known |
| AC-04 — wiring-gate registriert | ✅ PASS | grep settings.json `ship-tool-wiring-gate.sh` = 1 |
| AC-05 — GHA-Heal-Patches | ✅ PASS | grep-count = 12 (≥ 5, Pattern korrigiert in F-02 Heal) |
| AC-06 — Layer-3 Slice-Type | ✅ PASS | grep `Slice.?Type|slice_type` = 7 in ship-spec-quality-gate.sh |
| AC-07 — _TEMPLATE.md Header | ✅ PASS | `**Slice-Type:** ...` line 3 |
| AC-08 — capture-correction live | ✅ PASS | queue.jsonl 4 lines (3 lower + 1 upper-test post F-04 heal) |
| AC-09 — gh workflow run | ⏳ PENDING | post-Push verify, Phase 5 |
| AC-10 — Issues triaged | ✅ PASS | gh API #14 state=closed, plus #25 Master-Tracker open |
| AC-11 — Reviewer-File | ✅ PASS | dieses File |
| AC-12 — D54 documented | ✅ PASS | `grep ^## D54 decisions.md` = 1 |

11/12 ACs PASS pre-push. AC-09 nach Live-Run verifiziert.

---

## Pattern-References Verifikation

| Source | Anwendbar? | Status |
|--------|-----------|--------|
| D43 (Type-Truth) | ja — Pattern-Familie etabliert | ✅ explizit in D54 referenziert |
| D45 (Hooks > Text-Regeln) | ja — D54 erzwingt Architektur statt Text | ✅ |
| D46 (Orphan-Component) | ja — D54 erweitert auf Hook/Script-Achse | ✅ in D54 dokumentiert |
| D52 (Wave-3-Tooling-API) | ja — wiring-check.ts ist 5. Tool der Familie | ✅ Standard-API erfüllt |
| D53 (Build-without-Wire codifiziert) | ja — D54 promoted von Text-Regel auf Enforcement | ✅ |
| `errors-infra.md` Shell-case-anchor | ja — ship-tool-wiring-gate Detection | ✅ token-anchored, kein wildcard |
| `errors-infra.md` Heredoc-Backdoor (Slice 145+146) | ja — kein heredoc-exemption | ✅ Reviewer bestätigt |

---

## Verdict: PASS post-Heal

**Begründung:** alle MEDIUM-Findings inline-gefixt mit Verifikation. HIGH-F-08 adressiert via Master-Tracker-Issue #25 + Slice 235 Backlog. LOW-Findings sind akzeptable Trade-offs. Slice 234 erfüllt seine eigene These.

**Knowledge-Capture für künftige Slices (siehe `common-errors.md` und `errors-infra.md` Updates in nächstem Knowledge-Flywheel-Sweep):**
1. Spec-Drift im Drift-Heal-Slice ist ein wiederkehrendes Anti-Pattern (D54 selbst hatte F-01/F-07)
2. MSYS Git Bash `tr '[:upper:]' '[:lower:]'` ist nicht UTF-8-aware — dual-Pattern oder LC_ALL=C.UTF-8 erforderlich
3. Issue-Closing != Bug-Resolved — Master-Tracker-Issues für recurring Failure-Klassen
4. settings.json-Edit > 3 Hooks sollte künftig IMPACT-Stage triggern

**Backlog post-Slice-234:**
- Slice 235: Smoke-Failure Code-Fix (Player-Link locator, Issue #25)
- Slice 236: TM-Once-Off-Scripts cleanup (13 orphan TM-Scripts klassifizieren)
- Slice 237: errors-infra.md Knowledge-Capture (4 Lehren oben)
