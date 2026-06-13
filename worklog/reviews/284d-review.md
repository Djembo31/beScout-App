# Review Slice 284d — Cold-Context (aec83df81d93eb350)

**Verdict:** CONCERNS → **alle Findings adressiert** → merge-ready · time-spent ~18 min · 2026-06-13

| # | Sev | Issue | Status |
|---|-----|-------|--------|
| F-1 | MAJOR | Migration-File fehlte im Repo (RPC nur in DB applied) | ✅ `20260613120000_slice_284d_recent_player_minutes_league_window.sql` committet (Body = pg-applied, AR-44 REVOKE/GRANT + COMMENT) |
| F-2 | MINOR (verify-pending) | Doppel-Spieltag-MAX | ✅ bestätigt: Body hat `COALESCE(MAX(fps.minutes_played),0)` + `GROUP BY pw.player_id, pw.gameweek` in CTE player_minutes. DB-Verify 22360/4472=5.00 exakt → keine Doppel-Slots |
| F-3 | NIT | TopspielCard `now` memoized (frozen) | ✅ auf inline `new Date()` (konsistent mit FixtureCard) |

**Reviewer-bestätigt OK (kein Bug):** Map-Persist (QueryProvider Layer-4 `instanceof Map`-Filter greift) · FANT-05 Caller-Vollständigkeit (nur ErgebnisseTab) · FANT-08 Server-Parität + postponed-Reschedule korrekt (lock folgt played_at) · FANT-13 stale-live→pending · i18n DE+TR komplett.

**Positive:** Sauberer 274-Pattern-Mirror (JSONB gegen 1000-cap, Liga-Window, COALESCE), Consumer 100% unverändert verträglich. FANT-13 nutzt 284a-Staleness-Helper statt blindem status==='live'.

**Knowledge (→ LOG):** „DB-Migration applied aber File nicht committet" = neue D54-Achse (Build-without-Wire). Detection: Service-Edit ruft `supabase.rpc('x')` aber kein `*.sql` mit `CREATE...x`. Wiring-Check-Kandidat.
