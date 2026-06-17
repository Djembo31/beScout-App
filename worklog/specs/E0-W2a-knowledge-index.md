# E0-W2a — Wissens-Index (INDEX-first) + Skelett + Auto-Inject

**Slice-Type:** Doc + Hook
**Größe:** S
**Parent:** `worklog/specs/E0-operating-system-knowledge-base.md` (Epic E0, Welle 2)
**Entscheidung:** Anil 2026-06-17 — Option B (frisches `docs/knowledge/`, memory/-Baum stilllegen). INDEX-first: erst die Karte, dann physische Migration (W2b/c).

## 1. Problem-Statement
Durable Wissen liegt an ~6 Orten (`.claude/rules/`, `memory/decisions.md`, `worklog/concepts/`, `wiki/`, `memory/semantisch+episodisch/`, `memory/*.md`). Es gibt keine einzige lebende Routing-Tabelle: `cortex-index.md` ist inhaltlich gedriftet (routet zu April-Operationen, kennt keinen Juni-Anker). Evidence: `worklog/notes/E0-welle2-wissens-inventur.md` + `worklog/notes/E0-welle2-memory-quality-assessment.md`.

## 2. Lösungs-Design
`docs/knowledge/INDEX.md` als **vollständige consult_when-Routing-Tabelle**, die SOFORT auf alles durable Wissen zeigt — auch das, was noch an alter Stelle liegt (Pfade werden bei W2b/c aktualisiert, wenn Files physisch migrieren). 4 Bucket-Ordner mit README (Grenze klar). Session-Start zeigt einen **kompakten Pointer** (kein 30-Zeilen-Dump — Anti-Marathon). Regel in `workflow.md`: neues durable Wissen → INDEX-Eintrag + consult_when (Teil DISTILL).

## 3. Betroffene Files
- NEU `docs/knowledge/INDEX.md`, `docs/knowledge/README.md`, 4× `docs/knowledge/{domain,decisions,lessons,research}/README.md`
- EDIT `.claude/hooks/ship-session-start.sh` (Pointer-Block, wie Cockpit)
- EDIT `.claude/rules/workflow.md` (DISTILL-Regel: INDEX-Pflicht)

## 4. Code-Reading-Liste
1. `worklog/notes/E0-welle2-wissens-inventur.md` — Bucket-Triage (was wohin)
2. `worklog/notes/E0-welle2-memory-quality-assessment.md` — Gold-Files + Empfehlung B
3. `.claude/hooks/ship-session-start.sh` — Cockpit-Inject-Pattern (Z. 48-62) als Vorlage
4. `memory/cortex-index.md` — was die alte Routing-Tabelle abdeckte (nicht verlieren)
5. `.claude/rules/workflow.md` DISTILL-Sektion — wo die Regel andockt

## 5. Acceptance Criteria
- AC1: `docs/knowledge/INDEX.md` existiert, Format pro Zeile `[Titel](pfad) — consult_when: <Auslöser>`, gruppiert nach 4 Buckets. VERIFY: `grep -c 'consult_when:' docs/knowledge/INDEX.md` ≥ 20.
- AC2: 4 Bucket-Ordner existieren mit README (Grenz-Definition). VERIFY: `ls docs/knowledge/*/README.md | wc -l` == 4.
- AC3: Session-Start zeigt Wissens-Pointer. VERIFY: `bash .claude/hooks/ship-session-start.sh | grep -c 'docs/knowledge/INDEX.md'` ≥ 1.
- AC4: `workflow.md` DISTILL erzwingt INDEX-Eintrag. VERIFY: `grep -c 'INDEX.md' .claude/rules/workflow.md` ≥ 1.
- AC5: Jedes der 10 Gold-Files aus dem Assessment hat einen INDEX-Eintrag (an aktueller Stelle). VERIFY: manuell gegen Gold-Liste.

## 6. Edge Cases
| Fall | Erwartung |
|---|---|
| INDEX zeigt auf File das später migriert | Pfad-Update Teil von W2b/c (dokumentiert in INDEX-Kopf) |
| Session-Start-Hook auf Windows (bash) | Pointer ist statischer echo, kein grep auf großem File → kein Perf-Risiko |
| consult_when-Dump zu lang im Briefing | NUR Pointer + Bucket-Stichworte injizieren, nicht die Tabelle |
| cortex-index noch aktiv | bleibt in W2a unangetastet (Ablösung = W2c), INDEX-Kopf vermerkt Übergang |

## 7. Self-Verification Commands
```bash
grep -c 'consult_when:' docs/knowledge/INDEX.md
ls docs/knowledge/*/README.md | wc -l
bash .claude/hooks/ship-session-start.sh | grep 'docs/knowledge'
grep -n 'INDEX.md' .claude/rules/workflow.md
```

## 8. Scope-Out
- KEINE physische Migration der Gold-Files (W2b).
- KEINE Archivierung/Löschung der ~90 Files (W2c).
- cortex-index.md NICHT entfernen (W2c).
- Dup-/Kanon-Entscheidungen (⚠️-Liste) NICHT final lösen — INDEX zeigt vorerst auf bestehende Kanon-Quelle.

## 9. Proof-Plan
Self-Verification-Output (Text) + Session-Start-Hook-Output mit Pointer.
