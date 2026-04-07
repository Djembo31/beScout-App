# Wiki Log (append-only)

> Chronologisches Aenderungslog. Jeder AutoDream-Run und jede manuelle Aenderung wird hier protokolliert.
> Parseable mit: `grep "^## \[" memory/wiki-log.md`

## [2026-04-07] AutoDream Run #2 (Session 98, Counter 79)
- Verdichtet: 5 Retros (retro-20260407-135831..183450) -> 1 semantisches Update
- Index: 1 neue Datei katalogisiert (semantisch/projekt/architecture-3hub.md)
- Archiviert: 0 Sessions (alle <30 Tage, 5 unarchived retros sind von heute)
- Neue Error-Patterns: .single() vs .maybeSingle() in errors.md + common-errors.md
- Drafts pending review: 1 (2026-04-07-qa-visual-3hub-refactor.md)
- Session-Counter reset: 0
- Aenderungen:
  - memory/semantisch/projekt/architecture-3hub.md (NEU)
  - memory/errors.md (+.single()/.maybeSingle() pattern)
  - .claude/rules/common-errors.md (+Supabase Client Sektion)
  - memory/wiki-index.md (aktualisiert: neue Datei, Zeilenzahlen)
  - memory/wiki-log.md (dieser Eintrag)
  - .claude/autodream-last-run (Timestamp)
  - .claude/session-counter (reset zu 0)

## [2026-04-07] Initial Migration (Karpathy Wiki Pattern)
- **Redundanz eliminiert:** 5 Duplikat-Dateien geloescht, 3 Sektionen → Pointer
  - memory/semantisch/projekt/patterns.md → geloescht (Source: memory/patterns.md)
  - memory/semantisch/projekt/cross-domain-map.md → geloescht (Source: memory/deps/)
  - memory/semantisch/projekt/revenue-streams.md → geloescht (Source: memory/root)
  - memory/episodisch/fehler/errors.md → geloescht (Source: memory/errors.md)
  - memory/journals/ (8 files) → geloescht (Source: memory/episodisch/journals/)
  - CLAUDE.md Business: Fee-Details → Pointer auf business.md
  - common-errors.md: DB Columns → Pointer auf database.md
  - ui-components.md: Spieler-Darstellung → Pointer auf CLAUDE.md
- **Workflow konsolidiert:** workflow.md merged in workflow-reference.md, dann geloescht
- **Hooks verdrahtet:** 4 fehlende Hooks in settings.json aktiviert
  - UserPromptSubmit → capture-correction.sh
  - Stop → session-retro.sh + quality-gate-v2.sh
  - SessionStart → inject-learnings.sh
- **AutoDream v3:** Rewrite als Wiki Compiler (5 Phasen)
- **Wiki-Index:** memory/wiki-index.md erstellt (vollstaendiger Katalog)
- **Wiki-Log:** memory/wiki-log.md erstellt (dieses File)
- **Referenzen gefixt:** 10 Agent-Referenzen auf geloeschte Dateien aktualisiert
