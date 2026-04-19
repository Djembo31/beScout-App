# Next Session Briefing — 2026-04-22

## TL;DR (3 Sätze)

Heute (2026-04-21) wurde das Claude-Arbeitssystem auf 2026-Best-Practices upgegradet (Slice 085: 6 Skills + 3 Hooks + Notion Slice-DB + Obsidian + Memory-MCP) und 2 echte Money-Critical Silent-Fail-Bugs gefixt (Slice 086 mit Parallel-Dispatch). Drei Commits live (`c6d5fca2`, `a9dc0bcb`, `cb03488b`), saubere idle-State, alle MCPs verifiziert.

**Erste Aktion morgen:** `git log --oneline -3` lesen, dann zwischen 3 Optionen wählen.

---

## Drei Optionen für Start

### Option A: Slice 087 — Folge-P0s (empfohlen)
Reviewer-Scope-Outs aus Slice 086 abarbeiten:
- `gameweek-sync/route.ts:1247` upstream `.in('club_id', allLeagueClubIds)` chunken
- `footballData.ts:428-432` player_external_ids + players paginieren (4500+ Rows = bereits über 1000-Cap!)
- Pattern: gleiches Vorgehen wie 086 — Parallel-Dispatch (backend-agent + reviewer)
- Aufwand: ~30 min

### Option B: 14 Kanban-Items abarbeiten
Backlog priorisiert via Notion. Empfohlene Sequenz:
1. P0 Vercel Deploy-Check (15 min — verify 3 heutige Commits live)
2. P1 useMarketData referencePrice Fallback (CI-Blocker)
3. P1 1000-row-cap restliche cron-routes (overlap mit Slice 087!)
4. P0 Gold-Standard 95% via CSV-Workflow (3-4h Anil-Aufwand)

### Option C: Silent-Fail-Audit Backlog systematisch
- 109 weitere HIGH-Findings in worklog/audits/silent-fail-2026-04-19.md
- Priorisierung: HIGH in src/app/api/ + src/lib/services/ zuerst
- Pattern: Parallel-Dispatch mit 2-3 Agents pro Sweep

---

## Was du heute schon nutzen kannst (neue Tools)

### Skills (alle im Skill-Tool registry)
- `/parallel-dispatch` — Bei 3+ Files cross-domain → backend + frontend + reviewer parallel
- `/optimize` — Wenn messbare Metric existiert (Gold-%, Match-Rate, Bundle-Size)
- `/plan-ceo-review` — Business-Hat nach Spec
- `/plan-qa-review` — 12 Edge-Case-Kategorien
- `/plan-legal-review` — Wording + Phase + Disclaimer
- `/silent-fail-audit` — Skill + Script

### MCPs (live, getestet)
- **Sentry:** `mcp__sentry__search_issues` für Production-Bugs
- **Memory:** `mcp__memory__search_nodes("X")` — 15 Entities im Graph (Anil, BeScout, SHIP-Loop, Slices, Patterns, Constraints)

### Notion
- **Slice-DB:** Bei Slice-Start → Eintrag erstellen (Stage: BUILD), bei Slice-DONE → Status: Erledigt + Commit-Hash
- **Kanban:** Items haben Priority + Slice + Commit Properties — voll strukturiert

### Obsidian
- `memory/` als Vault offen → Graph-View (Ctrl+G)
- Tags color-coded (rot=user/bug, orange=feedback, gelb=project, blau=reference, grün=pattern)
- _HOME.md als Landing-Page

### Scripts
- `npx tsx scripts/silent-fail-audit.ts` → wöchentlicher Scan, Output in worklog/audits/

---

## Sentry-Workflow (neu, ungeübt)

Falls morgen Bug-Report kommt:
```
1. mcp__sentry__search_issues("user XYZ getting 500 on /trade")
2. mcp__sentry__analyze_issue_with_seer (AI-Analyse)
3. /spec → /impact → Slice mit Fix
4. Knowledge-Flywheel: Pattern in common-errors.md
```

## Memory-MCP-Workflow (neu, ungeübt)

Bei Frage "Was hat Slice 086 gemacht?":
```
mcp__memory__search_nodes("Slice 086")
→ Entity + Relations + alle Observations
```

Bei Frage "Welche Constraints betreffen Money?":
```
mcp__memory__search_nodes("Money")
→ Money-Invariant Entity + Slices die bound_by sind
```

---

## Anti-Patterns vermeiden (Lehren von heute)

1. **Worktree-Cleanup in eigene Bash-Call** — eine gefailte `git worktree remove` cancelled 3 parallele Tool-Calls in Slice 086 Wrap. Single-call.
2. **Bei Money-adjacent: Solo-Claude** — Slice 086 hat das richtig gemacht (gameweek-sync solo, footballData via Agent).
3. **/optimize: Strikte Disziplin** — REVERT bei <0.5pp Gain, sonst Drift. Iter 2 in 085 wurde reverted obwohl architectural sauber.

## Risiko-Watch

- **MEMORY.md** ist im User-Home (`C:\Users\Anil\.claude\projects\...`), NICHT in BeScout-Repo. Das auto-memory-System verwaltet das, nicht git.
- **memory/.obsidian/workspace.json** wird von Obsidian normalisiert bei jedem Open — Diff ist normal.
- **settings.local.json** ist local-only, nicht committen (Auth-Tokens möglich).

## Technische Schuld (Slice 087+ Backlog)

| Item | Severity | Origin |
|------|----------|--------|
| gameweek-sync:1247 upstream chunking | P0 | Slice 086 Reviewer |
| footballData:428-432 unpaginated 4500+ Rows | P0 | Slice 086 Reviewer |
| Promise.allSettled silent-rejected | P1 | Slice 086 Reviewer |
| 109 HIGH silent-fail Findings | P1 | Slice 085 audit |
| Memory-MCP Entity-Coverage erweitern | P3 | Slice 085 MCP-Bootstrap |
| Sentry-Issues→Pattern-Pipeline | P3 | Slice 085 MCP-Bootstrap |

---

## Confidence-Level der Übergabe

- ✅ All Files committed (3 Commits)
- ✅ active.md auf idle
- ✅ Notion Slice-DB synced (085 + 086 als Erledigt)
- ✅ Memory-MCP Graph bootstrapped + dokumentiert
- ✅ session-handoff.md aktuell
- ✅ next-session-briefing geschrieben
- ⚠ Push noch nicht gemacht (User hat nur "commit" gesagt) — `git push origin main` bleibt explicit-action

Saubere idle-State, Stop-Hook wird auto-handoff weiter aktualisieren.
