# CTO Review — Slice 310: active_gameweek single-truth + Drift-Guard (Fantasy-#1)

**Verdict: PASS** · time-spent 14 min · Cold-Context Reviewer-Agent (a01732251b6b7b06d)

## Spec-Coverage (AC-1…AC-8 alle ✅)
- AC-1 RPC league-wide body (UPDATE clubs WHERE league_id + UPDATE leagues) ✓
- AC-2 Invariante clubs-MIN===MAX===leagues (Rollback-Test invariant_holds=t) ✓
- AC-3 Auth-Guard (auth.uid + club_admins) + Validation 1–38 unverändert ✓
- AC-4 handleSimulated → getLeagueActiveGameweek(leagueScopeId) ✓
- AC-5 useActiveGameweek + qk.events.activeGw entfernt, 0 Prod-Refs ✓
- AC-6 Drift-Skript exit 0 (7 Ligen OK) ✓
- AC-7 nightly wired (Step + Aggregate-failure-detection) — D54 ✓
- AC-8 tsc clean + FantasyContent 10/10 ✓

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | NIT | migration source-of-truth comment | Verwies auf nicht-existenten lokalen Vorgänger-File; Vorgänger lebt nur in remote-Registry. PATCH-AUDIT lief korrekt gegen Live-pg_get_functiondef (Guards verified preserved). | **GEFIXT** — Kommentar zeigt jetzt auf Live-Body. |
| 2 | NIT | gameweek-drift.js:69 | `a.count` nur für no-clubs-Guard genutzt, nicht in ok-Check. Akzeptabel. | kein Change |
| 3 | OBSERVATION | cron gameweek-sync route.ts:413 | Cron advanced nur `clubsToProcess` (potenziell Subset) + leagues; neue RPC advanced ALLE Liga-Clubs. Pre-existing (Slice 277), NICHT hier eingeführt — der neue Drift-Guard fängt genau diese Lücke. | Follow-up-Notiz (kein Change) |

## Detail (Reviewer)
- **Wave A Security:** Auth-Guard verlangt weiter Admin von `p_club_id`; erweiterte Schreibreichweite nur über sibling-Clubs DERSELBEN Liga. `active_gameweek` = Scheduling-Feld (kein Money/Balance). „Ein Club-Owner bewegt Liga-GW" = von Anil gewählte korrekte Semantik. AR-44 Grants verifiziert (kein anon).
- **Wave B:** leagueGw-Prefix-Invalidate (`['events','leagueGw']`) deckt GW-Invalidation nach activeGw-Key-Removal vollständig ab (useLeagueActiveGameweek nutzt qk.events.leagueGw). Test-Mock-Cleanup sound (activeGw fließt jetzt durch mockUseLeagueActiveGameweek).
- **Wave C:** Süper-Lig-Stau (active=34/max=38) → KEIN False-Positive (Skript vergleicht nur die 2 active_gameweek-Spalten, nie max_gameweeks). CRLF-safe Cred-Parsing. Exit-Codes korrekt.

## Positive
- Root-Cause am DB-Layer (write-path liga-weit atomar), nicht Symptom.
- Orphan-Removal textbook (Slice-267 qk-Key-Pattern); D54-Wiring vollständig; D75-Ratchet korrekt.
- Süper-Lig-Edge sauber gehandhabt (kein False-Positive).

## Learnings
- **errors-db.md-Kandidat (low-prio):** „CREATE OR REPLACE — PATCH-AUDIT PFLICHT"-Note erweitern: wenn Vorgänger nur in remote-Registry (kein committed File), Migration-Header-Source-of-truth auf Live-pg_get_functiondef zeigen.
- **Follow-up:** `clubsToProcess`-Vollständigkeit im Cron auditieren falls je ein Drift-Alarm feuert (F-3).
