# Current Sprint — CLS E2E Validated

## Stand (2026-04-02, Session 280)
- **Tests:** tsc 0 Errors, 145+ vitest green (7 Tests migriert)
- **Branch:** main
- **Migrations:** 299
- **Agent Team:** v3 + CLS v1.3 (Constitution 36, Insight Pool 14 active)

## Erledigt (Session 280)

### Legacy Cleanup (Task 2)
- src/components/market/ + manager/ geloescht (alle Imports auf features/ umgeleitet)
- 7 Tests migriert, OffersTab supabase mock fix
- Rule-Path trading.md aktualisiert
- tsc 0, 145/145 tests green

### CLS E2E Validation (Tasks 1, 3, 4)
- CEO Auto-Close: PASS (BES-100 korrekt geschlossen)
- Proactive Scan: PASS (BES-105 autonom gefunden, delegiert, gefixt)
- CodexReviewer: FAIL (OPENAI_API_KEY fehlt, Adapter crashed)

### Proactive Fix (BES-105) — SE autonom
- 6 leere .catch() in Admin-Components → console.error ergaenzt
- Commit: e8e5def (5 Files, 6 LOC)

## Board Status
- 100 issues total, 97 done, 2 cancelled, 1 in_progress (BES-105 done by SE)
- CLS v1.3: 36 Constitution, 14 active insights
- Pre-commit hook active (compliance scanner)

## Naechste Prioritaet
1. OPENAI_API_KEY setzen → CodexReviewer retesten
2. Insight Pool Domain-Tags fixen (FE hat keine matchenden Insights)
3. Proactive Scan Rate-Limit verifizieren (max 3/Tag)
4. Naechstes Feature / Sprint-Planung

## Bekannte Issues
- CodexReviewer: codex_local braucht OPENAI_API_KEY
- FE Proactive Scan: domain filter "ui|frontend" matcht keine Insights (alle sind "architecture"/"patterns")
- Proactive Issue createdByAgentId zeigt "user" statt Agent-ID (auth token fehlt im curl)

## Blocker
- OPENAI_API_KEY fuer CodexReviewer
