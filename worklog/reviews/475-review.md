# Review — Slice 475 (= 428b) DROP clubs.active_gameweek (self-review)

**Typ:** self-review (S, Migration; kein Money/Security/User-facing-Verhalten — Spalte frozen/unread seit Slice 428/D115) · **Datum:** 2026-06-30

## Selbst-Check
- **§0 Schnitt-Regel:** schließt den getrackten zweiten Weg (clubs.active_gameweek vs leagues.active_gameweek). Genau der TODO-„428b"-Schritt; D78-Alternative (d) war zur damaligen Zeit Scope-Out (Cron+Admin lasen noch clubs), seit Slice 428 entblockt.
- **DROP-Safety (live-Audit):** 0 Dependents · 0 SQL-Fns · 0 Trigger · Werte frozen/stale. Kein Runtime-Reader (alle auf leagues migriert; `set_active_gameweek`-RPC schreibt leagues-only). DROP verliert nichts.
- **Vollständigkeit (Reader/Writer-Audit, repo-weit):** by-name-Selects (club.ts ×3) + DbClub-Type + 2 Seed-INSERTs + schema-contracts.test — alle erfasst. `DbLeague.active_gameweek` (SSOT) bewusst unberührt. Kein verbleibender Code-Ref auf clubs.active_gameweek (Rest-Grep = nur leagues/docs/archive).
- **Zero-downtime-Reihenfolge:** Code (Selects raus) deployt VOR DROP — sonst PostgREST-`column does not exist`-Error bei live-altem by-name-Select. Migration-File committed in Phase 1, applied in Phase 2 nach Deploy-Verify.
- **Contract-Test:** `expectColumns` ist Subset-Check (6 von ~19) → Entfernen von active_gameweek aus der Erwartungsliste vor UND nach DROP konsistent (kein CI-Bruch in beiden Phasen).
- **Money/Security:** nicht berührt. Reine Schema-/Type-/Seed-Bereinigung einer toten Spalte.

## Verdict (self): PASS für Merge. Build: tsc 0 · club.test 79/79. **Gate = Post-DROP-Live-Verify** (Spalte weg via pg_attribute + club-Page lädt ohne PostgREST-Error).
