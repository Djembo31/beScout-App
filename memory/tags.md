---
name: Memory Tag Glossary
description: Systematische Tags für memory/ — Obsidian-kompatibel, grep-freundlich.
type: reference
tags: [reference, workflow, index]
---

# Memory Tag Glossary

Hashtags für Obsidian-Tag-Panel + grep-Filtering. Platziere am Datei-Anfang oder inline.

## Typ-Tags (was ist das Dokument?)

- `#user` — User-Kontext, Rolle, Präferenzen (Anil persönlich)
- `#project` — Projekt-Status, Initiativen, laufende Arbeit
- `#reference` — Externe Systeme, URLs, Setup-Doku (Tools, MCPs, Services)
- `#feedback` — Korrekturen + validierte Ansätze (aus Arbeit entstanden)
- `#decision` — Architektur-Entscheidungen (ADRs)

## Domain-Tags (worum geht es?)

- `#pattern` — wiederverwendbares Code/Arbeits-Pattern
- `#bug` — historischer Bug mit Analyse
- `#compliance` — Legal/Business/Licensing
- `#money` — Trading, Fees, Wallet, Revenue
- `#security` — RLS, RPCs, Auth, AR-44
- `#data-quality` — Gold-Standard, Contamination, Stale-Flags
- `#workflow` — SHIP-Loop, Skills, Hooks, Agents
- `#infrastructure` — CI, Deploys, MCP, Tools

## Lebenszyklus-Tags

- `#active` — in aktuellem Fokus
- `#archive` — historisch, nicht mehr aktiv
- `#stale` — braucht Review ob noch aktuell
- `#draft` — work-in-progress

## Priorität-Tags

- `#p0-critical` — Blocker
- `#p1-high`
- `#p2-medium`
- `#p3-low`

## Anwendungs-Regeln

1. Jede memory/-Datei MUSS min 1 Typ-Tag haben
2. Domain-Tags kombinierbar (`#pattern #money #security`)
3. Lebenszyklus-Tag optional — default `#active`
4. Bei Tag-Change auch frontmatter `type:` updaten

## Obsidian-Query-Beispiele

Dataview-Plugin (wenn installiert):

```
TABLE file.mtime as "Modified"
FROM #pattern AND #money
WHERE file.mtime > date(today) - dur(30 days)
SORT file.mtime DESC
```

```
LIST
FROM #bug AND #security
```

## Grep-Pattern (shell-compatible)

```bash
# alle #pattern-files
grep -l "#pattern" memory/*.md

# #money + #security Intersection
grep -l "#money" memory/*.md | xargs grep -l "#security"

# alle #stale (review-Queue)
grep -rn "#stale" memory/ --include="*.md"
```
