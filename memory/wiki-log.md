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

## [2026-04-08] AutoDream Run #3 (Session 42, Counter 38)
- Verdichtet: 5 Retros (retro-20260408-125307..153200) -> 1 neues semantisches File
- Index: 1 neue Datei katalogisiert (semantisch/projekt/manager-team-center.md)
- Archiviert: 0 Sessions (alle root-level Retros von heute 2026-04-08; 5 Retros vom 2026-04-02 bereits korrekt in archive/)
- Neue Error-Patterns: Hardcoded null Anti-Pattern (Component Props Sektion) in errors.md
- Drafts pending review: 1 (2026-04-07-qa-visual-3hub-refactor.md)
- Session-Counter reset: 0
- Aenderungen:
  - memory/semantisch/projekt/manager-team-center.md (NEU)
  - memory/errors.md (+Component Props: hardcoded null anti-pattern)
  - memory/wiki-index.md (aktualisiert: neue Datei, Zeilenzahlen, Datum)
  - memory/wiki-log.md (dieser Eintrag)
  - .claude/autodream-last-run (Timestamp)
  - .claude/session-counter (reset zu 0)

## [2026-04-08] AutoDream Run #5 (B3 Transactions History E2E — 6 Commits, alle 3 E2E Features done)
- Verdichtet: 1 Retro (retro-20260408-182125.md) + Session-Handoff B3 → 1 neues semantisches File
- Index: 1 neue Datei katalogisiert (semantisch/projekt/transactions-history.md ~100 Zeilen)
- Archiviert: 0 Sessions (alle Retros von heute 2026-04-08 < 1 Tag alt)
- Neue Error-Patterns (5): SW Re-Registration during QA, Lazy useState Init fuer URL-derived State, DB/Code Type Drift, Feed/Social Cross-User Policy (2. Fall), React Query Hybrid Pattern
- Drafts pending review: 1 (2026-04-07-qa-visual-3hub-refactor.md — unveraendert)
- Session-Counter reset: 0
- Aenderungen:
  - memory/semantisch/projekt/transactions-history.md (NEU, ~100 Zeilen)
  - memory/errors.md (+5 Patterns: SW Re-Registration / Lazy Init / Type Drift / Feed RLS #2 / Cross-User Policy)
  - memory/wiki-index.md (neue Datei, Zeilenzahlen, Run #5 Footer)
  - memory/wiki-log.md (dieser Eintrag)
  - memory/session-handoff.md (B3 komplett, Naechste: Onboarding)
  - memory/senses/morning-briefing.md (B3 Status + neue Prioritaeten)

## [2026-04-08] AutoDream Run #4 (5 Retros, B2 Following Feed Abend-Session)
- Verdichtet: 5 Retros (retro-20260408-171724..181031) -> 1 neues semantisches File
- Index: 1 neue Datei katalogisiert (semantisch/projekt/following-feed.md)
- Archiviert: 0 Sessions (alle Retros von heute 2026-04-08 < 1 Tag alt; 5 Retros vom 2026-04-07 sind deleted/staged, kein Handlungsbedarf)
- Neue Error-Patterns (4): activity_log Feed RLS Policy Trap, Dead Code Exports Audit-Signal, Service Worker Cache stale in Dev, Dynamic Import fire-and-forget Promise
- Drafts pending review: 1 (2026-04-07-qa-visual-3hub-refactor.md — unveraendert, Anil muss reviewen)
- Session-Counter reset: 0
- Aenderungen:
  - memory/semantisch/projekt/following-feed.md (NEU)
  - memory/errors.md (+4 Patterns: Feed RLS / Dead Exports / SW Cache / Dynamic Import Promise)
  - memory/wiki-index.md (aktualisiert: neue Datei, Zeilenzahlen, session-handoff Lines, Run #4 Footer)
  - memory/wiki-log.md (dieser Eintrag)
  - .claude/autodream-last-run (Timestamp)
  - .claude/session-counter (reset zu 0)
