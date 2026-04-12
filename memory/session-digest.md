# Session Digest

> Auto-updated at session end. Read by morning-briefing at session start.
> Captures what the NEXT session needs to know.

## Letzte Session: 2026-04-12

### Neue Patterns (in common-errors.md)
- NULL-in-scalar PL/pgSQL (CRITICAL money bug)
- Service error-swallowing (tickets pop-in)
- RPC camelCase/snake_case mismatch (mystery box)

### Offene Warnungen
- Silent-Null Services Audit: ~10 Services schlucken noch Errors (grep: `if (error).*return null`)
- Live-DB Integration Tests: 6 Files mit pre-existing Failures (trading-fees, escrow, db-invariants)
- Bestand-Nav nach Buy: optimistic update + force-refetch deployed, braucht Verify

### Anil Feedback
- "Wir hinterlassen zu viele Kruempel" — Quality First, kein schnell-schnell
- "Tickets nicht immer sichtbar" — Root Cause war Service-Swallowing, nicht nur UI
- "Ich will nicht immer am Workflow bestellen muessen" — System muss selbst enforcen

### Naechste Prioritaet
- Market Polish: Watchlist-Move + Marktplatz-Tabs (Club Verkauf / Von Usern / Trending)
