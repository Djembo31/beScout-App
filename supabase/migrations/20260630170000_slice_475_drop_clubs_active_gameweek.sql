-- Slice 475 (= 428b): DROP clubs.active_gameweek — Expand/Contract Contract-Phase.
--
-- clubs.active_gameweek ist seit Slice 428 / D115 FROZEN: die Single-Source-of-Truth
-- für den aktiven Gameweek ist leagues.active_gameweek (Cron `gameweek-sync` + RPC
-- `set_active_gameweek` schreiben leagues-only; die per-Club-Spalte war ein Legacy-
-- Dual-Write und wird seit 428 nicht mehr aktualisiert). Alle Runtime-Reader lesen
-- leagues.active_gameweek (getLeagueActiveGameweek / useGameweek / FantasyContent /
-- cron route). § 0 Schnitt-Regel: der getrackte zweite Weg wird hier geschlossen.
--
-- DROP-Safety-Audit (live, 2026-06-30, vor Apply): 0 Dependents (Views/Generated/
-- Constraints), 0 SQL-Funktionen lesen/schreiben die Spalte, 0 Trigger; die Werte
-- waren frozen/stale (34, 38 — der echte GW lebt in leagues). DROP verliert nichts.
--
-- Reihenfolge: dieser DROP wird ERST appliziert, NACHDEM der Code-Deploy (der die
-- 3 by-name-Selects in club.ts entfernt) live ist — sonst würde PostgREST bei den
-- alten by-name-Selects einen Fehler werfen.

ALTER TABLE public.clubs DROP COLUMN IF EXISTS active_gameweek;
