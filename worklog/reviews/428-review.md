# Review — Slice 428 (active_gameweek leagues=SSOT, Expand-Phase)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-28 · **Time-spent:** 14 min · Money-NAH

## Verdict: PASS

Saubere, gut bewiesene Expand-Phase-Migration. SEC-DEFINER-RPC byte-treu gepatcht (Guards/ACL/SECURITY DEFINER/search_path erhalten, nur Write-Ziel clubs→leagues + Guard-Bound >38→>max geändert), Cron verhaltens-äquivalent bei verifiziert-uniformen Live-Daten, kein überlebender `clubs.active_gameweek`-Runtime-Reader, Tooling vollständig entdrahtet.

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | NIT | `advance-helpers.ts:13` | Stale JSDoc `(clubs.active_gameweek)` — Quelle ist seit 428 leagues. Reiner Doc-String, kein DB-Reader. | **gefixt** → `(leagues.active_gameweek, SSOT seit Slice 428)` |
| 2 | NIT | `memory/decisions.md:3445` | D-Entry beschreibt gameweek-drift.js noch als aktiv (gelöscht). Historisches Log, kein Runtime-Ref. | im DISTILL/Folge-D adressiert |

Keine CRITICAL/REWORK/CONCERNS. Beide NITs Doku-Drift, runtime-neutral.

## Prüfpunkte (faktenbasiert bestätigt)

1. **RPC-PATCH-AUDIT (S156):** ✅ auth.uid()+club_admins-Guards + SECURITY DEFINER + search_path erhalten; UPDATE clubs entfernt; Guard >COALESCE(max,38); kein still-revertierter Guard.
2. **ACL (AR-44/S368c):** ✅ REVOKE PUBLIC/anon + GRANT authenticated/service_role; proacl kein anon/PUBLIC.
3. **Cron-Äquivalenz:** ✅ leagues.active_gameweek statt MIN(clubs); clubsToProcess=alle Liga-Clubs (uniform=identisch); type {id} bricht keinen Consumer (alle lesen .id/.length); allLeagueClubIds-Ableitung korrekt.
4. **Expand/Contract:** ✅ kein überlebender clubs.active_gameweek-Runtime-Reader (getActiveGameweek+cron+scoring.admin→RPC alle migriert); club.ts-Selects tragen Feld im String aber 0 Logic/Render-Konsumenten → frozen-kohärent bis 428b.
5. **getActiveGameweek non-throw:** ✅ "returns 1 on error" exakt erhalten, 5 Test-Pfade.
6. **Drift-Audit-Removal:** ✅ vollständig (Script+package.json+GHA-Step+Aggregation), 0 wiring-Orphan.
7. **league-less Club:** ✅ no_league-RAISE fail-closed (0 live).

## Learnings (Knowledge-Kandidat)
- errors-db.md: „SSOT-Konvergenz Dual-Write-Spalte via Expand/Contract — Reader/Writer migrieren + Spalte frozen, DROP separater Slice nach Deploy-Verify; Select-Strings dürfen Spalte behalten solange `grep <feld>` 0 Logic-Konsumenten." Schwester zu S406 (proaktiv statt reaktiv).
- Stale-Comment = N+1-Removal-Achse nach Code/DB/i18n/Tooling.

## One-Line
PATCH-AUDIT byte-sauber, Cron verhaltens-äquivalent, Expand/Contract sauber, Tooling vollständig entdrahtet — ein Senior mergt das.
