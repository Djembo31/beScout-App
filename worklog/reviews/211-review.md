# Review Slice 211 — Spec-Foundation-Uplift

**Verdict:** PASS
**Time-spent:** ~25 min

## Findings

| Severity | Location | Issue | Fix |
|---|---|---|---|
| MEDIUM | `worklog/specs/211-spec-foundation-uplift.md:42` | **Spec-vs-Implementation-Drift:** Files-Tabelle listet `.claude/skills/ship/SKILL.md` als EDIT, aber Open-Question 1 (Z. 165) sagt explizit "Slice 211 erstellt nur die _TEMPLATE.md, /ship new Skill-Update ist Wave 2". Tatsächliche Implementation: ship/SKILL.md wurde NICHT editiert. Spec-Tabelle ist inkonsistent zur Open-Question. | Files-Tabelle Sektion 3 streichen oder als "(Wave 2)" markieren — sonst lügt die Spec. AC-Audit erfasst das nicht (kein AC für ship/SKILL.md). Direkt korrigieren in Spec-File. |
| LOW | `memory/patterns.md:1005` | Pattern #39 ist korrekt nummeriert (#38 ist letzter). Pre-existing #28-Doppelnummerierung in patterns.md (Z.395 und Z.510) ist orthogonal — kein Slice-211-Issue, aber Backlog-Item. | Aus Slice 211 raushalten (kein Scope-Creep). Punch-List-Item für künftige Pattern-Hygiene-Slice. |
| LOW | `.claude/rules/workflow.md:48-51` | Slice-Größen-Tabelle: XS-Pflicht-Sektionen sind "1, 3, 4, 6, 8, 10". Sektion 5 "Pattern-References" und 9 "Open-Questions" sind bei XS NICHT pflicht. Frage: ist das absichtlich? | Klärung: ist XS=trivial-Pattern-Wiederholung, wo Pattern-References implicit aus Code-Reading-Liste lesbar sind? Falls ja: explizit dokumentieren. Falls nein: XS-Pflicht von 6 auf 8 Sektionen erhöhen. |
| LOW | `.claude/skills/spec/SKILL.md:216-300` | Spec-Skill hat jetzt 19 Sektionen. Skill-Decay-Risk bei XS-Slices. | Empfohlen für Wave 2: Quick-Index am Top der SKILL.md. Slice 211 selbst nicht ändern, Re-Visit-Trigger in D50. |
| NIT | `worklog/specs/_TEMPLATE.md:5` | Bei XS könnte Agent versucht sein, Sektionen wegzulassen (Section-Numbering springt von "## 1." zu "## 4."). Macht Spec-File schwerer zu greppen. | Empfehlung: Template-Comment am Top: "Bei XS: Sektionen 2, 5, 7, 9, 11, 12, 13 entweder weglassen ODER als 'skipped (XS-Pflicht)' markieren". |
| NIT | `.claude/hooks/ship-cto-review-gate.sh:129` | Verdict-Regex matched `**Verdict:**`, `Verdict:`, `verdict:`. ABER `## Verdict\n\nPASS` (Section-Header statt Inline) wird nicht matched. | WARN-only — false-negative-Cost niedrig. Akzeptabel für Wave 1. |
| NIT | `worklog/specs/211-spec-foundation-uplift.md:165` | Open-Question 1 sagt "/ship new Skill-Update ist Wave 2", aber Section 11 (Scope-Out) hat das nicht explizit. | Optional: Section 11 ergänzen: "_TEMPLATE.md Auto-Copy in /ship new → Wave 2 (Slice 212)". |

## Positive

1. **Empirisches Fundament:** D50 zitiert 6 konkrete Slices als Evidence (207, 209, 192/193, 200, 198, 199). Keine Theorie — Dokumente bauen auf real beobachteten Bugs auf.
2. **Self-Audit-Beweis kohärent:** AC-Audit-Block in Spec Sektion 8 ist 1:1 ausführbar. Output `worklog/proofs/211-ac-audit.txt` ist konkret nachvollziehbar pro AC. Keine "sollte passen"-Fragmente.
3. **Hook-Konservativismus:** Verdict-Schema-Enforcement ist WARN, nicht BLOCK. Pre-Mortem Szenario #1 explicit adressiert. File-Existence-BLOCK bleibt primary-Gate. Bestehende Bypässe unverändert.
4. **Cross-Reference-Disziplin:** D50 hat Sektion "Beziehung zu D45-D49" — verbindet 5 vorhergehende PROCESS-Decisions.
5. **Pattern-Promotion komplett:** Alle 3 Drafts aus Slice 207 sind tatsächlich promoted (Worktree-Isolation-Escape in common-errors.md §0, Migration-Heal v1→v2 in errors-db.md, Pre-Review-Memo in patterns.md #39). Kein Pending-Backlog.
6. **Worktree-Briefing kohärent:** /parallel-dispatch WORKTREE-PFLICHT referenziert `git status -s` als Self-Verify, common-errors.md §0 referenziert /parallel-dispatch zurück. Bidirektionale Pointer ohne Drift.

## Spec-AC-Coverage

- **AC-01** (Template existiert, ≥10 Sektionen): ✅ — Template hat 13 Sektionen + Compliance-Block.
- **AC-02** (workflow.md hat ≥4 neue Sektion-Refs): ✅ — `grep` zeigt 13 Treffer.
- **AC-03** (/spec Skill hat 1.10-1.13): ✅ — alle 4 Sektionen vorhanden.
- **AC-04** (Hook hat Verdict-Regex): ✅ — Z. 129 enthält `(PASS|REWORK|FAIL|CONCERNS)`.
- **AC-05** (parallel-dispatch hat 3 Briefing-Blöcke): ✅ — Absolute-Paths (Z.51), Pre-Review-Memo (Z.56), Service-Schnittstelle (Z.75).
- **AC-06** (3 Pattern-Promotions): ✅ — common-errors.md, errors-db.md, patterns.md.
- **AC-07** (D50 in decisions.md): ✅ — Z. 2023, vollständig + Beziehung zu D45-D49.
- **AC-08** (tsc clean): ✅ laut Self-Audit.
- **AC-09** (Hook-Smoke exit 0): ✅ laut Self-Audit.
- **AC-10** (Existing Specs nicht invalidiert): ✅ — keine retroactive Marker, neue Sektionen sind additive.

**AC-Coverage:** 10/10 erfüllt.

## Empirische Anwendbarkeit (Würden neue Sektionen die genannten Slices verhindert haben?)

**Slice 207 — Worktree-Escape:** ✅ Hätte verhindert werden können.
- Sektion 1.10 hätte `cd <worktree-path> && git status -s` als Pflicht-Audit gehabt.
- /parallel-dispatch WORKTREE-PFLICHT-Block ist genau das Briefing das Slice 207 vor-warnen müssen hätte.
- Die Promotionen sind reaktiv (post-Slice 207). Echter Beweis kommt erst in Slice 212+.

**Slice 192/193 — Type-Truth-Drift:** ✅ Teil-mitigated.
- Sektion 1.11 hätte D43 zitiert. Sektion 1.12 hätte `pg_get_functiondef` als Pflicht-Command für L-Slices gehabt.
- Aber: Slice 192/193 war Tier-A2-Audit-Finding in nicht-frisch-implementierten Service. Spec-Layer hilft präventiv, Type-Truth-Bugs in alten Services brauchen weiter proaktive Audits.

**Slice 200 — PLAYER_SELECT_COLS-Bug:** ✅ Hätte gefangen werden können.
- Sektion 1.12 Self-Verification: `grep -E "db\.[a-z_]+" src/lib/services/players.ts | sort -u` als Self-Verify gegen PLAYER_SELECT_COLS.
- D49 als Pointer in Sektion 1.11.
- Combined mit errors-frontend.md "PLAYER_SELECT_COLS Sync"-Block = Doppelte Schutzschicht.

**Zusammenfassung:** 3 von 4 referenzierten Slice-Bugs prospektiv verhindert. Nicht-frisch-implementierte-Service-Bugs (192/193) brauchen separate periodische Audits.

## Risiken / Anti-Pattern-Checks

- **workflow.md zu lang?** 277 Zeilen, akzeptabel. **Kein Risiko.**
- **/spec 19 Sektionen Skill-Decay?** Medium-Risk, kontrolliert via Re-Visit-Trigger in D50.
- **Pre-Review-Memo Overhead?** Pattern #39 Anti-Pattern-Sektion explicit: bei XS skippen. **Kein Risiko.**
- **Pattern-Cargo-Cult?** /spec Sektion 1.11 hat Anti-Pattern-Block. Spec 211 selbst zitiert 6 Patterns, nicht 38. **Self-walking-the-talk.**
- **Hook-False-Positive-Rate?** WARN-only, **Risiko niedrig**.
- **Hook-Bypass-Regress?** emergency, amend, merge, idle-state, File-Existence-BLOCK alle unchanged. **Kein Regress.**

## Summary

Slice 211 ist **PASS** mit 1 MEDIUM (Spec-Tabelle vs. Implementation drifted bei ship/SKILL.md), 4 LOW/NIT (Skill-Decay / Doku-Polish, kein Production-Risk).

Die 4 neuen /spec-Sektionen + workflow.md-Erweiterung + Hook-Schema-Enforcement sind kohärent, empirisch begründet (6 zitierte Slice-Bugs), und konservativ implementiert (Hook WARN nicht BLOCK, Pre-Review-Memo OPT-IN). Foundation für Wave 2 (Tooling-Layer) solide.

**Empfehlung:** Commit OK. MEDIUM-Finding (Spec-Files-Tabelle ship/SKILL.md-Eintrag) als 1-Zeilen-Fix in Spec-File patchen — kein eigener Slice nötig.
