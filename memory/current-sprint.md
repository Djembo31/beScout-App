# Current Sprint — Pilot Feature Complete + Live QA

## Stand (2026-04-09, nachmittag sales-readiness sweep)

- **Branch:** main (mit neuen Fixes)
- **Letzter Commit:** `66b8935` fix(fantasy): lineup quick-add + fantasy_league_members RLS recursion
- **Migrations:** 51 lokal (neu: `20260409150000_fix_fantasy_league_members_rls_recursion.sql`)
- **Tests:** tsc clean
- **Live auf bescout.net:** verifiziert als jarvis-qa (Mobile 390px + Desktop 1280px). Fantasy Join Flow end-to-end bestätigt (Lineup → Beitreten → Counter +1)
- **GW35 gestartet:** 10 Fixtures + 13 Events manuell in DB (SQL direct) — Cron war stuck wegen 3 verschobener GW34-Spiele (Boluspor/Sivasspor, Esenler/Amedspor, İstanbulspor/Erzurumspor verschoben auf Mi 9.4.). GW34 bleibt ungescored (3 Test-Entries verloren — acceptable)

## QA-Durchgang 2026-04-09 — 4 Bugs durch

| ID | Status | Fix |
|---|---|---|
| B1 Community Desktop layout | ✅ False positive | Playwright-Timing-Artefakt, kein Code-Bug |
| B2 Mobile Fantasy stale GW | ✅ False positive | Transient state, nicht reproducible |
| B3 EventDetailModal "Deine Spieler" Click → neuer Tab | ✅ Fixed + live | `LineupPanel.tsx:790` — window.open raus, Quick-Add in ersten freien Slot rein |
| B4 `fantasy_league_members` HTTP 500 | ✅ Fixed + live | RLS Self-Recursion, SECURITY DEFINER helper `fantasy_get_my_league_ids()` |

## Follow-up Items (tracked 2026-04-09) — nicht Sales-blocking

1. **Vercel Auto-Deploy reagiert nicht auf git push** — Commit `66b8935` wurde nicht automatisch gebaut. Letzter Auto-Deploy war 2h alt. Musste manuell via `npx vercel --prod --archive=tgz` deployen. → GitHub↔Vercel Integration im Vercel Dashboard checken
2. **CI rot seit mehreren Commits** (pre-existing) — `bounties.test.ts`: `No "trackMissionProgress" export is defined on the "@/lib/services/missions" mock`. → Mock um `trackMissionProgress` Stub ergaenzen (~10 min)
3. **Dev-Server (`npm run dev`) AuthProvider/Wallet Timeouts lokal** — nur auf localhost, live OK. Vermutlich env-specific (Supabase connection timeout). → niedrig-prio debugging

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
| Equipment Lineup Live QA | ✅ DONE | 2026-04-09 Nachmittag (GW35 Event BeScout Classic, full Join Flow + Synergy +15% verifiziert) |
| Mystery Box Premium | ✅ LIVE | Drop-Raten v1 als final bestätigt |
| Kill-Switch Founding Passes 900K | ✅ IMPLEMENTIERT | `AdminFoundingPassesTab.tsx:15` |
| Migration Registry Drift | ✅ DOKUMENTIERT | `.claude/rules/database.md` + `reference_migration_workflow.md` |

## Produkt-Entscheidungen (warten auf Anils Kopf)

1. Beta-Tester-Gruppe formalisieren (Anzahl / Zeitrahmen / Onboarding-Call)
2. Revenue Stream Prio aus `memory/project_missing_revenue_streams.md` (Sponsor Flat Fee / Event Boost / Chip Economy)

## Naechste Session

Start mit `memory/session-handoff.md` lesen. Der Handoff enthaelt die komplette Session-Story und alle Next-Steps. Keine Krümel zurückgelassen.

## Neue Patterns dieser Session

- `memory/patterns.md` #21 — Realtime + React Query Live Feed (throttle + invalidate + keepPreviousData)
- `.claude/rules/database.md` "Migration Workflow" — NIE `supabase db push`, nur `mcp__supabase__apply_migration`
