# Current Sprint — Fantasy Event Stability

## Stand (2026-03-26, Session 255)
- **Tests:** 2050+ (161 Files), tsc 0 Errors
- **Migrations:** 305 (4 neue heute)
- **Routes:** 25
- **Pilot Readiness:** BLOCKED — Fantasy Event Flow instabil

## PRIORITAET 1: Fantasy Event Refactoring (Session 256)
Der gesamte Join → Lineup → Leave Flow muss sauber neu gebaut werden.
Details → `session-handoff.md` Refactoring-Plan

### Kern-Anforderungen
1. Join: Beitreten → Entry Fee → "Nimmt teil" sofort → Counter +1
2. Lineup: Spieler setzen → Save → RPC → DB Write → beim Reopenen sichtbar
3. Leave: Abmelden → Refund → "Nimmt teil" weg → Counter -1 → Lineup + Locks geloescht
4. Counter: IMMER = Anzahl event_entries (kein Legacy-Drift)
5. SC Blocking: Spieler in Lineups nicht verkaufbar

### Was schon steht (DB-seitig)
- `save_lineup` RPC (SECURITY DEFINER) — Insert/Update + Holding Locks atomar
- `lock_event_entry` / `unlock_event_entry` RPCs — Entry + Refund atomar
- Legacy Triggers entfernt — kein Doppel-Zaehlen mehr

### Was fehlt (Client-seitig)
- Stabiler Client-Flow ohne RLS-Abhaengigkeit
- Sauberes State-Management nach Join/Leave
- Legacy-Daten Cleanup (Bot-Lineups ohne Entries)
- E2E Playwright Tests

## Offen (nach Refactoring)
1. Earn-Hooks: Wild Cards in Gamification einhaengen
2. DNS verifizieren + echten Signup testen
3. 50 Einladungen raus
4. Email-Templates + OAuth Redirects

## Blocker
- Fantasy Event Flow instabil — MUSS zuerst gefixt werden
