# Session Handoff
## Letzte Session: 2026-03-26 (Session 255)
## Was wurde gemacht

### KRITISCH: Fantasy Event Flow ist instabil — Refactoring noetig

Session 255 war ein Debugging-Marathon (7 Commits, 6h). Mehrere Bugs gefunden
und gefixt, aber der Gesamt-Flow ist noch nicht stabil. Anil ist sehr unzufrieden.

### Bugs gefunden + gefixt
1. **RLS auf holding_locks** — fehlte INSERT/DELETE Policy → SC Blocking war Dead Code
2. **Lineup Save silent failure** — PostgREST `.upsert()` + RLS = `{data:null, error:null}`
3. **Loesung: `save_lineup` RPC** (SECURITY DEFINER) — bypassed RLS komplett
4. **Client-Side Guards entfernt** — 298 Zeilen geloescht, nur noch RPC-Call
5. **Legacy Triggers** — `trg_lineup_entries_insert/delete` zaehlen current_entries doppelt → entfernt
6. **Counter synced** — current_entries auf echte event_entries Anzahl resetted
7. **Cache Invalidation** — `invalidateFantasyQueries` ist jetzt async/await
8. **UPDATE Policy** — `NOT locked` Bedingung aus lineups UPDATE Policy entfernt

### Was noch KAPUTT ist (Refactoring in Session 256)
1. **Lineup Save via UI** — RPC funktioniert (SQL-Test bewiesen), aber Client-Flow erreicht ihn moeglicherweise nicht zuverlaessig
2. **Join/Leave UI** — Optimistic Updates + Cache-Invalidation unzuverlaessig
3. **Legacy Lineups** — 47+ Bot-Lineups ohne event_entries verschmutzen Daten
4. **localEvents State** — Flickenteppich aus Optimistic Updates, wird stale

### Refactoring-Plan (Session 256)
| Schritt | Was |
|---------|-----|
| 1. Daten-Cleanup | Legacy-Lineups ohne Entry loeschen. Counter resetten. |
| 2. RPC erweitern | SC-Check, Wildcards, Duplikat-Guard IN den RPC |
| 3. Client simplifizieren | submitLineup = nur RPC. Join/Leave = nur RPC + await invalidate. |
| 4. State neu | localEvents Pattern sauber oder komplett entfernen |
| 5. E2E Test | Playwright: Join → Save → Reopen → Leave → Verify |

### DB-Aenderungen (live, kein Deploy noetig)
- `holding_locks`: INSERT + DELETE RLS Policies hinzugefuegt
- `lineups`: UPDATE Policy vereinfacht (kein `NOT locked`)
- `lineups`: Legacy Trigger `trg_lineup_entries_insert/delete` entfernt
- `save_lineup` + `rpc_save_lineup`: SECURITY DEFINER RPCs erstellt
- `current_entries`: Auf echte event_entries Count synchronisiert

### Code-Aenderungen (deployed auf Vercel)
- `src/lib/services/lineups.ts` — submitLineup: nur noch RPC-Call (~50 Zeilen statt ~350)
- `src/lib/queries/invalidation.ts` — invalidateFantasyQueries ist jetzt async
- `src/app/(app)/fantasy/FantasyContent.tsx` — await invalidation, error handling
- `src/components/fantasy/EventDetailModal.tsx` — participantCount optimistic update

### Commits auf main (7 Stueck)
```
e3e611b fix(lineups): strip all client-side guards — RPC only
5364dc4 fix(lineups): use SECURITY DEFINER RPC for lineup saves
662a200 fix(lineups): replace upsert with insert/update to bypass RLS
214a7d8 fix(lineups): detect and throw on silent RLS upsert failure
ce1cb33 fix(events): await critical cache invalidation on join/leave/submit
057c03c fix(events): optimistic update flicker on join/leave + modal participant count
e39ec7f fix(events): add missing RLS policies on holding_locks
```

## Blocker
- Fantasy Event Flow instabil — Refactoring hat hoechste Prioritaet

## Workflow-Learnings (in Memory gespeichert)
- Supabase RLS: IMMER alle Client-Ops pruefen, nicht nur SELECT
- PostgREST `.upsert()` kann `{data:null, error:null}` returnen — NIEMALS nur `error` pruefen
- Nach DB-Fix: SOFORT `SELECT` die Tabelle, nicht UI debuggen
- Max 2 Fix-Versuche alleine, dann Expert Agent
- Kritische Writes IMMER als SECURITY DEFINER RPC (wie lock_event_entry)
