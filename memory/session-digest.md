# Session Digest

> Auto-updated at session end. Read by morning-briefing at session start.
> Captures what the NEXT session needs to know.

## Letzte Session: 2026-04-12 (Ferrari Knowledge System + Research)

### Was passiert ist
- Deep Research: Karpathy LLM Wiki Pattern analysiert, IST-Analyse unseres Systems, 8 Gaps identifiziert
- Ferrari Knowledge System designed (9 Teile) und KOMPLETT installiert (Commit 679eb54)
- CLAUDE.md v2 live (Pre-Edit Checklisten, Work Rhythm, Knowledge Compilation, Agent Delegation)
- 2 neue Hooks: test-reminder.sh (PostToolUse), pattern-check.sh (Stop)
- Morning-Briefing injiziert jetzt Session-Digest + AutoDream-Check bei 20 Sessions

### Neue Patterns (in common-errors.md)
- NULL-in-scalar PL/pgSQL (CRITICAL money bug — accept_offer/create_offer)
- Service error-swallowing (tickets pop-in — return null defeats React Query retry)
- RPC camelCase/snake_case mismatch (mystery box — unchecked `as` assertion)

### Offene Warnungen
- **Silent-Null Services Audit**: ~10 Services schlucken noch Errors (grep: `if (error).*return null` in src/lib/services/). Tickets gefixt, Rest pending.
- **Live-DB Integration Tests**: 6 Files mit pre-existing Failures (trading-fees, escrow, db-invariants, bug-regression, order-lifecycle, boundaries)
- **Bestand-Nav nach Buy**: optimistic update + force-refetch deployed, Verify pending (letzter Test zeigte stale quantity beim Nav ohne Reload)
- **Pre-Launch-Checklist**: Fan-Seed-Accounts loeschen + Supply-Invariant CI-Test (memory/pre-launch-checklist.md)

### Anil Feedback (PRIORITAET HOCH)
- "Wir hinterlassen zu viele Kruempel" — Quality First, kein schnell-schnell
- "Zusammenhaenge nicht erkannt" — Impact-Check VOR Aenderungen, nicht danach
- "Ich will nicht immer am Workflow bestellen muessen" — Ferrari-System muss selbst enforcen
- "Ich erwarte einen boost von 1000x" — Compound Interest durch Pattern-Extraction + Session-Digest
- "Kein halb fertiges, was ich permanent wieder verbessern muss" — Ferrari muss ab Tag 1 stabil laufen

### Naechste Prioritaet
1. **ERSTER TEST des Ferrari-Systems**: Market Polish als Proof-of-Concept
2. **Market Polish weiter**: Watchlist von "Mein Kader" → "Marktplatz" verschieben
3. **Marktplatz-Tab im Detail**: Club Verkauf / Von Usern / Trending
4. Danach Phase 1 Critical Path: Fantasy (#3), Player Detail (#4), Profile (#5), Inventory (#6)
