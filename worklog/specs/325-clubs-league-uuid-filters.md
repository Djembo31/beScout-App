# Slice 325 — create_club_by_platform_admin setzt league_id (S7 Phase-3 Paar B: Drift-Stop)

**Slice-Type:** Migration (RPC)
**Größe:** XS
**Datum:** 2026-06-15
**CEO-Scope:** Grenzwertig (SECURITY DEFINER, kein Money). Self-Review mit PATCH-AUDIT.

## 1. Problem-Statement (Landkarte Sektion B + live pg_get_functiondef)

`create_club_by_platform_admin` INSERTete nur `clubs.league` (String), NICHT `clubs.league_id` → jeder neue Admin-Club bekommt `league_id = NULL` = **latente Drift-Quelle** (player.league wird aus league_id abgeleitet → undefined; Liga-Filter/Anzeige brechen für dessen Spieler). Heute 0 NULL (alle 134 geseedet), aber der nächste Admin-Club startet die Drift neu.

## 2. Scope-Entscheidung (warum nur Drift-Stop)

Die volle clubs.league String→UUID-Migration (Filter-Consumer Name→ID, Cache-Decouple, DROP) ist **L-sized mit tiefen Tendrils**: Club-Cache liest clubs.league-Name (`clubs.ts:42`), LeagueBar baut die Liga-Liste namens-basiert (`LeagueBar.tsx:26-31`), PlayerRankings.filterLeague ist prop-gethreaded (`rankings/page.tsx:54`), KaderTab.smartLeague ist abgeleitet. Das ist EINE kohärente Einheit → **Slice 326** (eigener Kontext). Slice 325 macht nur den **vollständigen, standalone-wertvollen, sicheren** Drift-Stop (= der eigentliche latente Bug). Kein Orphan-Code (D54).

## 3. Betroffene Files
- `supabase/migrations/20260615130000_slice_325_create_club_league_id.sql` (NEU, appliziert).

## 4. Code-Reading-Liste (erledigt)
- live create_club-Body (PATCH-AUDIT-Baseline): nur league, kein league_id; admin-check + validation + slug-unique + fee_config + return-shape. ✓
- leagues.name eindeutig (134/134 Match, Landkarte). ✓
- Service-Caller `createClubByPlatformAdmin` (admin) — Signatur unverändert → unberührt. ✓

## 5. Pattern-References
- database.md AR-44 (REVOKE/GRANT), Slice-156 PATCH-AUDIT (live-def als Baseline, alle Branches erhalten).

## 6. Acceptance Criteria
- **AC1:** RPC INSERTet league_id = `(SELECT id FROM leagues WHERE name = trim(p_league) LIMIT 1)`; String bleibt.
- **AC2:** Alle Pre-existing-Branches erhalten (admin-check, 3× validation, slug-unique, fee_config, return-shape) — PATCH-AUDIT via pg_get_functiondef.
- **AC3:** AR-44 REVOKE PUBLIC+anon + GRANT authenticated, exakte Signatur (uuid,text×7).
- **AC4:** Live-Smoke (BEGIN…ROLLBACK): create_club legt Club mit league_id != NULL an.
- **AC5:** Keine src/-Änderung (reine RPC-Härtung); tsc unberührt.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Unbekannter p_league-Name | Subquery NULL → league_id NULL (wie heute; Namen sind valide; loud-Variante = 326-Backlog) |
| Nicht-Admin | bestehender Berechtigungs-RETURN greift VOR INSERT |
| Slug dupliziert | bestehender RETURN greift |

## 8. Self-Verification
- `pg_get_functiondef('create_club_by_platform_admin(uuid,text,text,text,text,text,text,text)')` → INSERT enthält league_id + alle Branches.
- ACL-Check (kein anon/PUBLIC).
- Smoke BEGIN…ROLLBACK.

## 9. Open-Questions — keine.

## 10. Proof-Plan
`worklog/proofs/325-clubs-league-filters.txt`: pg_get_functiondef-Auszug + ACL + Smoke (league_id gesetzt, rollback).

## 11. Scope-Out → Slice 326 (clubs.league Vollmigration)
getLeagueById + dbToPlayer.leagueId + Filter-Consumer Name→ID (Trending/TransferList/ClubVerkauf/KaderTab/PlayerRankings/BestandView/LeagueBar) + Club-Cache-Decouple (Name aus league_id) + localStorage + clubs.league DROP.

## 12. Stage-Chain
SPEC ✓ → IMPACT (inline) → BUILD (Migration) → REVIEW (self, PATCH-AUDIT-Checkliste) → PROVE → LOG.

## 13. Pre-Mortem
1. PATCH-AUDIT-Drift (alte Branches weggeschrieben) → live-def als Baseline reproduziert, post-apply verifiziert. 2. Signatur-Mismatch REVOKE → exakt (uuid,text×7). 3. Namens-Resolve NULL → Namen valide, loud-Variante 326.
