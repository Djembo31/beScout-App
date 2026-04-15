# Wiki Log (append-only)

> Chronologisches Aenderungslog. Jeder AutoDream-Run und jede manuelle Aenderung wird hier protokolliert.
> Parseable mit: `grep "^## \[" memory/wiki-log.md`

## [2026-04-15] AutoDream Run #13 (Post-Multi-League Phase 1 — Session-Start, Worktree-Edit blocked)
- Verdichtet: 5 Retros gesichtet (alle 2026-04-15, same commit set — kein neuer Content seit Run #12)
- Neue semantische Promotion: `missions-architecture.md` (96 Zeilen) war als Run #12-Nachzuegler bereits vorhanden → jetzt cortex-indexiert
- In-Progress Journals NICHT promoviert: `cron-multi-league-journal.md` (AR-26+34 unvollstaendig), `backfill-scoring-historical-journal.md` (Task 13 Script noch nicht ausgefuehrt)
- Cortex-Index: +1 Eintrag (Missions System Routing)
- Archiviert: 0 Sessions (alle Retros <1 Tag alt)
- Drafts pending review: 3 (unveraendert — cdn-head-quirk, fixtures-import-schema-drift, ar42-third-occurrence)
- Worktree-Edit-Permission: Subagent konnte nicht selbst editieren → Main-Claude hat Updates manuell appliziert
- Aenderungen: memory/cortex-index.md (+1 Zeile), memory/wiki-log.md (dieser Eintrag), .claude/session-counter reset

## [2026-04-15] AutoDream Run #12 (Multi-League Phase 1 — 21 Commits, Session-Ende)
- Verdichtet: 5 Retros (retro-20260415-222415..231002) + 6 Journals + 3 Learnings-Drafts → 1 neues semantisches File
  - Journals decken: TFF-Logo, TFF-Player-Backfill, Fixtures-Import, Fantasy-Events-Seed, Historical-Scoring-Backfill, XC-15
  - Key: Multi-League Phase 1 komplett (Fixtures, TFF Re-Import, Slug-Typos, XC-15, 18 seeded Events)
- Index: 1 neue Datei erstellt (semantisch/projekt/multi-league-phase-1.md, ~100 Zeilen)
- Cortex-Index: 6 neue Routing-Eintraege (+Multi-League Phase 1 Retro, +Backend Scripts-Inventar, +CDN HEAD Quirk, +Preflight Schema-Introspection, +XC-15 AR-42 SELECT-Variante)
- Promoted Rules: EMPFEHLUNG fuer common-errors.md (kein Edit-Zugriff auf .claude/rules/): AR-42 Sektion um XC-15 SELECT-Variante + Dry-Run-Regel + OpenAPI-Schnellcheck erweitern
- Archiviert: 0 Sessions (<7 Tage alt, alle 2026-04-15)
- Drafts pending review: 3 (cdn-head-quirk, fixtures-import-schema-drift, ar42-third-occurrence — alle 2026-04-15)
- Debug-File: memory/debug-backfill-payload-BL1-gw4.json (220KB) — einmaliges Debug-Artefakt, Empfehlung: archivieren nach memory/archive/ oder loeschen wenn kein Rollback mehr noetig
- Session-Counter: war 104, reset zu 0
- Aenderungen:
  - memory/semantisch/projekt/multi-league-phase-1.md (NEU, ~100 Zeilen)
  - memory/cortex-index.md (+6 Routing-Eintraege, 71→79 Zeilen)
  - memory/wiki-log.md (dieser Eintrag)
  - .claude/autodream-last-run (Timestamp)
  - .claude/session-counter (reset zu 0)

## [2026-04-14] AutoDream Run #10 (Operation Beta Ready Phase 0+1 — Session 187, Counter N/A)
- Verdichtet: 5 Retros (retro-20260414-142940..151818) + Session-Handoff → 1 neues semantisches File
  - Alle 5 Retros decken gleiche 2 Commits ab (c788135 + 9471b2d) — Haupt-Content war untracked Files
  - Key: Operation Beta Ready Phase 0+1 komplett (Feature-Map, Service-Map, 1.1 Phantom-SC, 1.3 A+B Migrations)
- Index: 1 neue Datei katalogisiert (semantisch/projekt/operation-beta-ready-phase0-1.md, 59 Zeilen)
- Cortex-Index: 9 neue Routing-Eintraege (+Operation Beta Ready, +Feature-Map SSOT, +Service-Map SSOT, +RPC-Rename, +Bulk-Sanitize, +Phase 1.3 Impact, +Fantasy Tests)
- Neue Code-Patterns (2): Pattern #22 RPC-Rename Alias-Pattern, Pattern #23 Bulk-Sanitize regex_replace
- Neue Error-Patterns (3): Fantasy Services Swallow-Architektur, v2 Mock API canonical, Count-Query Shape
- Archiviert: 0 Sessions (alle Retros 2026-04-14, <1 Tag alt; archive/ hat 5 Retros vom 2026-04-02)
- Crash-Backups: 4 Crash-Diffs vom 2026-04-13 in .claude/backups/ — stale aber <7 Tage, Cleanup nach 7 Tagen
- Drafts pending review: 1 (2026-04-13-test-writer-fantasy-services.md — Kernaussagen promotet zu errors.md)
- Session-Counter reset: 0
- Aenderungen:
  - memory/semantisch/projekt/operation-beta-ready-phase0-1.md (NEU, 59 Zeilen)
  - memory/patterns.md (+Pattern #22 RPC-Rename Alias, +Pattern #23 Bulk-Sanitize, 274→319 Zeilen)
  - memory/errors.md (+3 Patterns: Fantasy Swallow, v2 Mock canonical, Count-Query, 116→122 Zeilen)
  - memory/cortex-index.md (+9 Routing-Eintraege, 51→58 Zeilen)
  - memory/wiki-index.md (neu generiert: Run #10, neue Dateien, aktualisierte Zeilenzahlen)
  - memory/wiki-log.md (dieser Eintrag)
  - .claude/autodream-last-run (Timestamp)
  - .claude/session-counter (reset zu 0)

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

## [2026-04-09] AutoDream Run #7 (Fantasy QA Stabilisation + Navigation-Abort + CI fixes — 9 Commits)
- Verdichtet: 5 Retros (retro-20260409-200738, -215318, -215411, -215429, -215730) → 1 neues semantisches File
  - 200738: CI follow-ups (trackMissionProgress stub, FLOW-11 timeout, AuthProvider warn demotion, 3 follow-ups resolved)
  - 215318/215411/215429/215730: 4 Duplikate des gleichen Commits ef13d85 (Navigation-Abort error classification)
- Index: 1 neue Datei katalogisiert (semantisch/projekt/fantasy-qa-stabilisation.md ~77 Zeilen)
- Neue Error-Patterns: 2 (Navigation-Abort/Fetch-Abort Noise, RLS Self-Recursion / SECURITY DEFINER Pattern)
- Archiviert: 0 Sessions (alle 2026-04-09 Retros < 1 Tag alt; die 5 deleted-staged Retros waren bereits aus dem FS entfernt)
- Cortex-Index: aktuell, keine verwaisten Eintraege
- Drafts pending review: 0 (drafts/ hat nur .gitkeep; 2026-04-07 draft wurde in Run #4 promoted/deleted)
- Session-Counter reset: 0
- Aenderungen:
  - memory/semantisch/projekt/fantasy-qa-stabilisation.md (NEU, ~77 Zeilen)
  - memory/errors.md (+2 Patterns: Navigation-Abort, RLS Self-Recursion/SECURITY DEFINER)
  - memory/wiki-index.md (Run #7: neue Datei, errors.md 108→116, cortex-index 33→36, sprint current.md summary aktualisiert)
  - memory/wiki-log.md (dieser Eintrag)
  - .claude/autodream-last-run (Timestamp)
  - .claude/session-counter (reset zu 0)

## [2026-04-10] AutoDream Run #9 (BeScout Liga DONE — /rankings + scoring + economy decisions — 4 Commits)
- Verdichtet: 5 Retros → 1 neues semantisches File
  - retro-162647 + retro-163004: Duplikate (gleiche 3 Commits — 8ea2400 Liga Page, 314ece6 Admin, c94a7c1 Scoring)
  - retro-163539 + retro-164702 + retro-165446: Duplikate (gleiche 4 Commits + efcb3f5 Scope-Creep Fixes)
- Index: 1 neue Datei katalogisiert (semantisch/projekt/bescout-liga.md, 103 Zeilen)
- Cortex-Index: 4 neue Routing-Eintraege (Liga DONE, /rankings, Mystery Box Cap, 7d Price Changes)
- Archiviert: 0 Sessions (alle Retros 2026-04-10, <1 Tag alt; archive/ hat 5 Retros vom 2026-04-02)
- Neue Error-Patterns: 0 (keine neuen Fehler in dieser Session)
- Neue semantische Erkenntnisse: BeScout Liga DONE (alle Economy-Entscheidungen final: Fussball-Saison, 80% Soft-Reset, $SCOUT Rewards, keine Fee-Discounts, kein PBT-Pool, kein Community-Fee-Boost, kein Club-Stacking, CardMastery aus Scope entfernt), is_liga_event Scoring-Pattern (1.0x Liga / 0.25x non-Liga / 10% cap), Scope-Creep-Fix Pattern (server-side enforcement > client-side)
- Drafts pending review: 0
- Session-Counter reset: 0
- Aenderungen:
  - memory/semantisch/projekt/bescout-liga.md (NEU, 103 Zeilen)
  - memory/cortex-index.md (+4 Routing-Eintraege, 39→42 Zeilen)
  - memory/wiki-index.md (neue Datei, Run #9 Footer, project_bescout_liga.md Update)
  - memory/wiki-log.md (dieser Eintrag)
  - .claude/autodream-last-run (Timestamp)
  - .claude/session-counter (reset zu 0)

## [2026-04-10] AutoDream Run #8 (Home Polish Pass 1+2 — Track A+B1+C done, BeScout Liga Spec — 2 Commits)
- Verdichtet: 5 Retros → 1 neues semantisches File
  - retro-225856 + retro-233703: Duplikate (gleiche Commits wie Run #7 — ef13d85 + e04bd76)
  - retro-235753: Home Polish Pass 1 (d995738 — Track A+C committed)
  - retro-002547 + retro-005856: Duplikate (gleiche Commits — aa4cea7 + d995738, Home Pass 2 B1)
- Index: 3 neue Dateien katalogisiert (semantisch/projekt/home-polish-sweep.md + polish-sweep.md + project_bescout_liga.md)
- Cortex-Index: 3 neue Routing-Eintraege (Polish Sweep, Home Page/LastGameweekWidget, BeScout Liga)
- Archiviert: 0 Sessions (alle Retros 2026-04-09/10, <1 Tag alt; archive/ hat 5 Retros vom 2026-04-02)
- Neue Error-Patterns: 0 (keine neuen Fehler in diesen Sessions)
- Neue semantische Erkenntnisse: Polish Sweep Pattern (commit-per-page), LastGameweekWidget (self-contained queries + home-scoped cache keys), Mystery Box compliance (daily-only), BeScout Liga als Spec-Projekt
- Drafts pending review: 0 (drafts/ leer ausser .gitkeep)
- Session-Counter reset: 0
- Aenderungen:
  - memory/semantisch/projekt/home-polish-sweep.md (NEU, ~80 Zeilen)
  - memory/cortex-index.md (+3 Routing-Eintraege: Polish Sweep, Home, Liga)
  - memory/wiki-index.md (neue Datei, polish-sweep.md + project_bescout_liga.md katalogisiert, Datum aktualisiert)
  - memory/wiki-log.md (dieser Eintrag)
  - .claude/autodream-last-run (Timestamp)
  - .claude/session-counter (reset zu 0)

## [2026-04-09] AutoDream Run #6 (Equipment v2 + Realtime Feed + Migration-Doku — 7 Commits)
- Verdichtet: 5 Retros (retro-20260409-004110..153419) → 1 neues semantisches File
- Index: 1 neue Datei katalogisiert (semantisch/projekt/equipment-realtime.md ~83 Zeilen)
- Archiviert: 0 Sessions (alle 2026-04-09 Retros < 1 Tag alt; retro-153419 ist leer/no-commits)
- Neue Error-Patterns: 0 (alle Patterns aus dieser Session bereits in Run #5 eingetragen: SW Re-Registration, Lazy Init, Type Drift, Feed RLS #2)
- Cortex-Index: 2 neue Routing-Eintraege (Realtime/Live-Feed, Equipment/Inventory)
- Drafts pending review: 1 (2026-04-07-qa-visual-3hub-refactor.md — unveraendert, Anil muss reviewen)
- Session-Counter reset: 0
- Notiz: 4 von 5 neuen Retros decken identischen Session-Content ab (gleiche Commits, gleiche Files) — Merge bei naechstem Run wenn >30 Tage alt
- Aenderungen:
  - memory/semantisch/projekt/equipment-realtime.md (NEU, ~83 Zeilen)
  - memory/wiki-index.md (Run #6: neue Datei, Zeilenzahlen, database.md 65→82, patterns 231→274, errors 115→108, session-handoff 140→118)
  - memory/cortex-index.md (+2 Routing-Eintraege: Realtime, Equipment)
  - memory/wiki-log.md (dieser Eintrag)
  - .claude/autodream-last-run (Timestamp)
  - .claude/session-counter (reset zu 0)
