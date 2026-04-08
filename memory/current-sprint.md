# Current Sprint — Pilot Feature Complete

## Stand (2026-04-09, Session-Ende)

- **Branch:** main (clean, alles gepusht)
- **Commits heute:** 7 Stueck (Equipment Inventar v2 + Realtime Following Feed + Migration-Workflow-Regel)
- **Letzter Commit:** `60ff354` docs(memory): session-handoff for 2026-04-08 evening → 2026-04-09 night
- **Migrations:** 50 lokal / 31 in remote Registry (drift bewusst dokumentiert, NIE `supabase db push` nutzen)
- **Tests:** tsc clean, vitest grün (inkl. ipo.test.ts + EventDetailModal.test.tsx die früher rot waren)
- **Live auf bescout.net:** alles verifiziert als jarvis-qa (mobile + desktop)

## Alle Hauptthemen DONE

| Feature | Status | Kommentar |
|---|---|---|
| Manager Team-Center | ✅ Waves 0-5 | 2026-04-07/08 |
| B1 Scout Missions E2E | ✅ DONE | |
| B2 Following Feed E2E | ✅ DONE | 2026-04-08 Vormittag |
| B2 Following Feed **Realtime** | ✅ DONE | 2026-04-09 Nacht (Pill + Throttle) |
| B3 Transactions History E2E | ✅ DONE | 2026-04-08 Abend |
| Onboarding Multi-Club | ✅ DONE | 2026-04-08 Abend |
| Equipment System | ✅ LIVE | Drop-Raten bestätigt, Inventar Screen v2 mit Pokédex-Matrix |
| Mystery Box Premium | ✅ LIVE | Drop-Raten v1 als final bestätigt |
| Kill-Switch Founding Passes 900K | ✅ IMPLEMENTIERT | `AdminFoundingPassesTab.tsx:15` |
| Migration Registry Drift | ✅ DOKUMENTIERT | `.claude/rules/database.md` + `reference_migration_workflow.md` |

## Keine offenen Code-Punkte

**Was noch existiert (alles ohne Code-Arbeit):**

1. **Produkt-Entscheidungen** (warten auf Anils Kopf)
   - Beta-Tester-Gruppe formalisieren (Anzahl / Zeitrahmen / Onboarding-Call)
   - Revenue Stream Prio aus `memory/project_missing_revenue_streams.md` (Sponsor Flat Fee / Event Boost / Chip Economy)

2. **Externe Abhängigkeit**
   - Equipment Lineup Visual QA braucht ein offenes Fantasy Event (alle 100 waren "ended")

## Naechste Session

Start mit `memory/session-handoff.md` lesen. Der Handoff enthaelt die komplette Session-Story und alle Next-Steps. Keine Krümel zurückgelassen.

## Neue Patterns dieser Session

- `memory/patterns.md` #21 — Realtime + React Query Live Feed (throttle + invalidate + keepPreviousData)
- `.claude/rules/database.md` "Migration Workflow" — NIE `supabase db push`, nur `mcp__supabase__apply_migration`
