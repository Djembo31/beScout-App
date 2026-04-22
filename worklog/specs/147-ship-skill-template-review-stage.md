# Slice 147 — /ship Skill-Template + README mit REVIEW-Stage (XS)

**Datum:** 2026-04-22
**Groesse:** XS (2 Files, doc-only, trivial)
**CEO-Scope:** nein (interne Workflow-Doku)

## Ziel

`/ship new`-Skill-Template und `worklog/README.md` konsistent mit Slice 145's 6-Stufen-Workflow machen — aktuell stehen beide noch auf 5 Stages und erwähnen weder `review:` Key noch `reviews/` Directory.

## Betroffene Files

- `.claude/skills/ship/SKILL.md` — Frontmatter `description`, Command-Abschnitte, explizites active.md-Template
- `worklog/README.md` — Directory-Tabelle (`reviews/`), Gates-Tabelle (`ship-cto-review-gate.sh`), Step 4 (REVIEW)

## Acceptance Criteria

1. SKILL.md frontmatter `description` sagt "6-Stufen-Loop" mit REVIEW genannt (nicht mehr "5-Stufen")
2. SKILL.md hat einen expliziten active.md-Template-Block (code fence), der `review:` Key enthaelt
3. SKILL.md hat `/ship review` Kommando beschrieben (analog `/ship build`, `/ship prove`)
4. README.md Directory-Tabelle enthaelt `reviews/` Zeile
5. README.md Gates-Tabelle enthaelt `ship-cto-review-gate.sh`
6. README.md "Wie benutzen"-Steps erwaehnen REVIEW-Stage

## Edge Cases

- SKILL.md description-Limit: bleibt unter 500 chars (Claude Code Skill-Loader-Regel)
- Kein Break bestehender `/ship new`-Calls — Template-Erweiterung ist additiv (review: key mit `—` als default)

## Proof-Plan

`worklog/proofs/147-doc-verify.txt`: grep-Output der neuen Template-Keys und Directory-Tabelle zur Bestaetigung dass alle 6 ACs greifen.

## Scope-Out

- keine Änderung an `workflow.md` (hat Slice 145 bereits korrekt)
- keine Migration bestehender `active.md` files (ist nur 1, wird beim nächsten `/ship new` per Template neu geschrieben)
