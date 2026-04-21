---
name: Notion Integration Strategie
description: Source-of-Truth Split und Sync-Regeln zwischen worklog/, memory/, Notion Kanban, Status-Pages. Aktiv seit 2026-04-21.
type: reference
---

# Notion-Integration (aktiv seit 2026-04-21)

## Source-of-Truth Split

| Wo | Was | Primary Author | Lebensdauer |
|----|-----|---------------|-------------|
| `worklog/active.md` | EIN aktiver Slice | Claude (SHIP-Loop) | bis Slice DONE |
| `worklog/log.md` | Slice-Historie chronologisch | Claude | permanent (git) |
| `worklog/specs/NNN-*.md` | Slice-Spec | Claude | permanent (git) |
| `worklog/proofs/NNN-*` | Beweis (Screenshot/Query/Test) | Claude | permanent (git) |
| `memory/` | Persistent Context (User, Patterns, Decisions) | Claude (autodream) | lange |
| `.claude/rules/` | Hard Rules (Compliance, DB, Workflow) | Claude sofort bei Bug | permanent |
| **Notion Kanban** | Backlog + Roadmap (strategisch) | Anil + Claude | bis Item Erledigt |
| **Notion Status-Pages** | Executive-View (Gold-%, Phase, Milestones) | Claude wöchentlich | laufend |

## Kanban-Schema (seit 2026-04-21)

Properties:
- `Name` (title)
- `Status` (Nicht begonnen / In Bearbeitung / Erledigt)
- `Priority` (CRITICAL / P0 / P1 / P2 / P3)
- `Slice` (rich text — Slice-Nr wie "085" bei Bearbeitung)
- `Commit` (rich text — Commit-Hash nach DONE)
- `Zuweisen` (person)

## Sync-Regeln

1. **Neuer Backlog-Item** → Notion Kanban mit Priority
2. **Slice startet** → Kanban-Item auf "In Bearbeitung" + Slice-Nr eintragen
3. **Slice DONE** → Kanban auf "Erledigt" + Commit-Hash eintragen
4. **Keine Duplikation:** Slice-Inhalt bleibt in `worklog/`, Notion verlinkt nur per Slice-Nr
5. **Quick-Fixes (<2h)** → direkt Slice ohne Kanban-Eintrag
6. **>90 Tage inaktive Items** → Erledigt oder archiviert

## Was NICHT in Notion

- Slice-Details (Spec, Proof, Edge Cases) → nur `worklog/`
- Code-Historie → git + `worklog/log.md`
- User-Feedback + Patterns → `memory/`
- Compliance-Rules → `.claude/rules/`

## Strategic-Decisions-Sync (seit 2026-04-21, siehe `memory/decisions.md` D5)

**Primärer Store:** `memory/decisions.md` (git-tracked, Claude liest automatisch).

**Optionaler Notion-Spiegel:** Status-Page bekommt eine „Strategic Decisions"-Section — Executive-Share für Stakeholder die keinen git-Zugriff haben.

### Sync-Modell

- **Trigger:** Commit mit Prefix `docs(decision): D<n> — ...` pusht neuen/updated Entry.
- **Claude-Action (im DISTILL):** Nach Commit manuell via MCP spiegeln:
  ```
  mcp__notion__notion-update-page(
    id: "<status-page-id>",
    body: "### D<n> — <title>\n**Status:** <status>\n**Datum:** YYYY-MM-DD\n<Entscheidung>"
  )
  ```
- **Alternative — Script:** `node scripts/sync-decisions-to-notion.mjs` liest `memory/decisions.md`, spiegelt jeden Entry als Block in Status-Page. Läuft manuell oder via weekly cron.

### Was gespiegelt wird (minimal)

Pro Decision nur:
- ID + Titel + Category (PRODUCT/ARCHITECTURE/PROCESS)
- Status (Aktiv/Verworfen/Superseded)
- Entscheidung (1 Absatz)
- Link zum Git-Commit

**Nicht gespiegelt:** Alternativen, Re-Visit-Trigger — die sind für Claude + Entwickler, nicht Exec.

### Was NICHT getan werden soll

- **Notion als Source-of-Truth nutzen** → Claude kann dann nicht ohne expliziten MCP-Call lesen.
- **Bidirektionalen Sync bauen** → git ist append-only, Notion wird manuell bearbeitet → Konflikte unvermeidlich.

## Links

- Kanban: https://www.notion.so/20273b4a80e98050b014f37d659bed5c
- Slice-DB: https://www.notion.so/57670082f03a4ac4a305f68186c981a0
- Status-Page: https://www.notion.so/34773b4a80e9814e97fac38763659dc0
