# Slice 284d — Wave 4: Fantasy-UI-Fixes (FANT-05, 08, 09, 13)

**Größe:** M · **Slice-Type:** Migration + Service + UI · **Datum:** 2026-06-13 · **CEO-Scope:** Nein
**Spec-Basis:** Punch-List `worklog/audits/2026-06-12/stab-284-punchlist.md` (fantasy-scoring-Audit). Token-bewusste Schlank-Spec. Key-unabhängig.

| Fix | Sev | Was |
|-----|-----|-----|
| FANT-05 | P1 | Ergebnisse-Tab (Top-Scorer/Best-XI/GW-Summary) mischt ALLE 7 Ligen — `getGameweekTopScorers` + `getGameweekStatsForPlayers` `.eq('gameweek')` ohne league. Fix: `leagueId`-Param (Filter fixtures-Subquery via league_id), thread `leagueScopeId` aus FantasyContent→ErgebnisseTab |
| FANT-09 | P2 | `getRecentPlayerMinutes` globales Top-5-GW-Window über alle Ligen → 34-GW-Ligen sehen leere Slots. Fix: neue RPC `rpc_get_recent_player_minutes` (Absolute-Liga-Window analog Slice 274, COALESCE(minutes,0)) |
| FANT-13 | P2 | TopspielCard hat keinen Live-Branch (zeigt „?-?" statt Live-Score). Fix: isLive-Branch via `isFixtureLive` (284a-Helper) |
| FANT-08 | P2 | Lineup-Lock UI≠Server: `isLocked` nutzt `status !== 'scheduled'` → bei Cron-Lag editierbar trotz Kickoff. Fix: `isLocked = played_at <= now` (Status-bedingungsfrei) |

## Files
- `supabase/migrations/20260613*_slice_284d_recent_player_minutes_league_window.sql` (FANT-09 RPC)
- `src/features/fantasy/services/fixtures.ts` (FANT-05 2 Services + FANT-09 RPC-Consumer + FANT-08 isLocked)
- `src/components/fantasy/ErgebnisseTab.tsx` (FANT-05 leagueId-Prop + 2 Calls)
- `src/app/(app)/fantasy/FantasyContent.tsx` (FANT-05 leagueId={leagueScopeId})
- `src/components/fantasy/spieltag/TopspielCard.tsx` (FANT-13 Live-Branch)

## Impact
- FANT-05: leagueId optional (default = global, backward-compat). Konsument ErgebnisseTab einziger; threadet leagueScopeId. Realtime n/a (read-path).
- FANT-09: neue RPC, Return JSONB (1000-cap-sicher, Slice-270d-Pattern), Service-Map-Reconstruction; Konsument useRecentMinutes unverändert (gleiche Map-Shape). AR-44 REVOKE/GRANT.
- FANT-08: isLocked strenger (mehr locked) — Server-Gate (rpc_save_lineup) war eh strenger, also UI nähert sich Server an, kein Exploit-Risiko.

## ACs
- AC-01 FANT-05: leagueId-gescopte Query liefert nur Liga-Fixtures. VERIFY: DB-Smoke same-GW 2 Ligen → disjunkte Spieler.
- AC-02 FANT-09: RPC 5 Slots/Spieler im Liga-Window, COALESCE(minutes,0). VERIFY: rpc + Row-Count.
- AC-03 FANT-13: live-Branch zeigt Score+Minute. VERIFY: Code + (kein Live-Spiel aktuell, Saisonende → Code-Read).
- AC-04 FANT-08: isLocked status-frei. VERIFY: Code.
- AC-05: tsc 0 + Suiten grün.

## Edge
- FANT-05 leagueId=null (User ohne Liga-Scope) → global wie bisher ✓
- FANT-09 Saisonende: Liga-Window = letzte 5 finished GWs der Liga (nicht 35-38-Geister, weil status-finished-gefiltert) ✓
- FANT-13 stale-live → isFixtureLive=false → fällt auf pending-Branch (kein Pulse) ✓

Stage-Chain: SPEC→IMPACT(inline)→BUILD→REVIEW(Cold-Context, Migration+Service)→PROVE→LOG. Scope-Out: FANT-11/12/16 (Backlog/CEO). Pre-Mortem: (1) RPC-Migration-First vor Service-Push. (2) leagueId-Thread: ErgebnisseTab-Props-Type erweitern, tsc fängt vergessene Call-Sites. (3) Minutes-Map-Shape unverändert halten (Konsument-Sort mittelt number[]).
