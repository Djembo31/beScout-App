# Slice 217 — Sign-Off-Trial-Run trotz P1=3

**Status:** SPEC · **Größe:** S · **Scope:** CTO (Verifikations-Trial, kein Code, kein Money-Path) · **Datum:** 2026-04-26

## 1. Problem Statement

Slice 214 baute Auto-Beta-Ready Master-Skill mit Sub-Command `/auto-beta-ready signoff` der `/sign-off` Skill ruft. **NIE getestet end-to-end.** Anil's Direktive "3" (= "Sign-Off jetzt") ist Trial-Run-Anfrage: hilft das System wirklich, oder ist es nur Theater?

**Aktueller Stand (Phase-Tracker):**
- Phase=C, last_signoff=never
- findings_open: P0=0, P1=3, P2=4, P3=3
- /sign-off Skill-Schwelle: P0=0 ✓, P1≤3 ✓ (genau auf der Kante)

**Test-Hypothese:** Trial-Run sollte SOFT-NO-GO oder HARD-NO-GO produzieren (nicht GO), weil:
- 50 Test-Accounts existieren NICHT
- Tester-Onboarding-Doc existiert NICHT
- Phase-B-Sweep-Status pro Page nicht systematisch dokumentiert
- Persona-T-Score nicht numerisch quantifiziert (nur Notification-Snippet)

**Wenn Trial fälschlicherweise GO produziert:** System lügt. Slice 218 = Sign-Off-Schärfung.
**Wenn Trial korrekt SOFT/HARD-NO-GO produziert:** System funktioniert. Anil weiß was zu tun ist.

## 2. Lösungs-Design

Manueller Sign-Off-Trial nach `/sign-off` Skill-Workflow:
1. Pre-Check: Read alle relevant SoT-Files (beta-phase.md, beta-exit-criteria.md, audits/2026-04-26/aggregate.md)
2. Score-Aggregation: durch alle Kriterien gehen
3. Decision-Matrix erstellen mit IST-Werten
4. Verdict bestimmen: GO | SOFT-NO-GO | HARD-NO-GO
5. Output: `worklog/sign-off/2026-04-26-readiness.md`
6. Phase-Tracker-Update: last_signoff + last_signoff_verdict

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `worklog/sign-off/2026-04-26-readiness.md` | NEU | Sign-Off-Output gemäß Skill-Schema |
| `worklog/beta-phase.md` | EDIT | last_signoff = FAIL (erwartet) + verdict-Begründung |

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.claude/skills/sign-off/SKILL.md` | Skill-Definition + Schwellen | Was sind die exakten Pre-Conditions? |
| `memory/beta-exit-criteria.md` | Beta-Exit-Kriterien (P0-P1 + A-G) | A-G durchgehen |
| `worklog/beta-phase.md` | Phase-Tracker SoT | aktuelle Werte |
| `worklog/audits/2026-04-26/aggregate.md` | Findings-Liste | P0+P1-Counts |

## 5. Pattern-References

- `decisions.md` D50 (Slice 211 Spec-Standard)
- `auto-beta-ready/SKILL.md` Sub-Command `signoff`-Block
- `sign-off/SKILL.md` Pre-Conditions + Anti-Patterns

## 6. Acceptance Criteria

**AC-01:** [STRUCTURE] sign-off/2026-04-26-readiness.md existiert + folgt Skill-Output-Schema
- VERIFY: `ls -la worklog/sign-off/2026-04-26-readiness.md`
- EXPECTED: File existiert mit Sektionen "Verdict", "Decision-Matrix", "Phase-Summaries"
- FAIL IF: File fehlt oder Schema unvollständig

**AC-02:** [LOGIC] Verdict ist NICHT GO (Test-Hypothese)
- VERIFY: `grep "Verdict:" worklog/sign-off/2026-04-26-readiness.md`
- EXPECTED: SOFT-NO-GO oder HARD-NO-GO
- FAIL IF: GO (System würde lügen)

**AC-03:** [DECISION-MATRIX] alle 8 Kriterien aus Skill bewertet
- VERIFY: Tabelle in readiness.md hat 8 Zeilen
- EXPECTED: 8 Kriterien mit IST + Pass/Fail
- FAIL IF: weniger als 8 Kriterien

**AC-04:** [TRACKER] beta-phase.md updated mit last_signoff = FAIL (oder TRIAL)
- VERIFY: `grep "last_signoff:" worklog/beta-phase.md`
- EXPECTED: NICHT "never" mehr
- FAIL IF: Tracker unverändert

**AC-05:** [REGRESSION] Hook ship-phase-gate weiter funktional
- VERIFY: `echo '{"prompt":"sind wir beta ready?"}' | bash .claude/hooks/ship-phase-gate.sh 2>&1 | head -3`
- EXPECTED: WARN-Output (last_signoff != PASS)
- FAIL IF: Hook silent (würde fälschlicherweise PASS implizieren)

## 7. Edge Cases

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | sign-off/-Folder fehlt | first-Trial | mkdir + Write | mkdir-pflicht |
| 2 | Tracker-Update mit "FAIL" — Hook | post-Trial-Prompt | WARN bleibt | last_signoff=FAIL ist NICHT PASS, also Hook warnt richtig |
| 3 | Trial-Run findet doch GO | unexpected | Hook-Test (AC-05) zeigt Logic-Drift | manuelle Audit |
| 4 | Verdict ist sehr-NEGATIV (>1 ❌) | HARD-NO-GO | dokumentiert, Slice 216 nötig | Realität |

## 8. Self-Verification

```bash
ls worklog/sign-off/2026-04-26-readiness.md
grep "Verdict:" worklog/sign-off/2026-04-26-readiness.md
grep "last_signoff:" worklog/beta-phase.md
echo '{"prompt":"sind wir beta ready für die 50 tester?"}' | bash .claude/hooks/ship-phase-gate.sh 2>&1 | head -10
```

## 9. Open-Questions

**Pflicht-Klärung:**
1. last_signoff: "FAIL" oder "TRIAL-NO-GO"? → **Antwort:** "FAIL" (Skill-Doku verlangt PASS|FAIL|never; Trial = formaler FAIL).
2. Wer setzt das in Production-Mode? → **Antwort:** Nicht heute. Slice 217 ist Trial. PASS-Modus erst wenn Anil 50-Tester-Mails raus + Phase-B-Sweep wirklich 21/21.

## 10. Proof-Plan

1. AC-Audit-Block 5/5 grün
2. readiness.md ist plausibel (Verdict + Begründung)
3. Hook test post-Tracker-Update zeigt korrektes WARN
4. Output: `worklog/proofs/217-signoff-trial.txt`

## 11. Scope-Out

- ECHTES PASS — erst wenn Anil entscheidet (50 Tester, Onboarding-Doc, Phase-B-Status klar)
- Auto-Sign-Off-Cron — Wave 3
- Tester-Onboarding-Doc-Generator — separate Slice

## 12. Stage-Chain

SPEC → IMPACT (skipped) → BUILD (Trial-Run + readiness.md schreiben) → REVIEW (self-review D35 — Verifikations-Slice analog Slice 209) → PROVE → LOG

## 13. Pre-Mortem

Bei S-Slice optional, hier weggelassen weil Slice 217 keinen Code ändert. Hauptrisiko abgedeckt in AC-02 (Verdict darf nicht falsch GO sein).
