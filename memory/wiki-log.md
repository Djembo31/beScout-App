# Wiki Log (append-only)

> Chronologisches Aenderungslog. Jeder AutoDream-Run und jede manuelle Aenderung wird hier protokolliert.
> Parseable mit: `grep "^## \[" memory/wiki-log.md`

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
