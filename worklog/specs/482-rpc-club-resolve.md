# Slice 482 — D-26c Teil 2: players.club Render-SSOT in Aggregat-RPCs

**Slice-Type:** Migration · **Größe:** S · **Welle:** Mock→Pro Konsistenz-Batch (D-26c Teil 2, schließt D-26c) · **Scope:** CTO autonom (read-only RPCs, kein Money)

## 1. Problem-Statement
D-26c-Rest = die 2 Aggregat-RPCs, die `players.club`-Freitext (live 294/4556 = 6,45% stale vs FK) zurückgeben:
- `rpc_get_trending_players(int)` (SQL STABLE) → `getTrendingPlayers` (Trending/Movers-Widget).
- `rpc_get_most_watched_players(int)` (SQL SECDEF) → via Wrapper `get_most_watched_players` (SECDEF, auth-gated) → `getMostWatchedPlayers` (Most-Watched-Widget).
Beide `JOIN players p` + return `p.club` + GROUP BY `p.club`. Anders als 481-Surfaces tragen die Service-Rows kein `club_id` → RPC-Change nötig (Daten-Contract).

## 2. Lösungs-Design (Server-Resolve)
Beide RPC-Bodies: `LEFT JOIN clubs c ON c.id = p.club_id` + SELECT `COALESCE(c.name, p.club) AS club` + GROUP BY `p.club, c.name`. **Signatur unverändert** (`club text` bleibt) → ACL erhalten (S368c CREATE-OR-REPLACE), Shape/Spaltenzahl identisch → Wrapper `get_most_watched_players` (SELECT *) unverändert, Service-Mapper (`row.club`) unverändert. Resolve am Aggregat statt `club_id` durch die SECDEF-Wrapper-Signatur zu schleusen (geringeres Risiko, kein Client-Change).
**Fallback:** club_id NULL ODER Orphan-FK (c.name NULL) → COALESCE → Freitext `p.club` (= 481-Semantik, kein Backfill S303).

## 3. Betroffene Files
- `supabase/migrations/20260630180000_slice_482_d26c_rpc_club_resolve.sql` (2× CREATE OR REPLACE).
- Kein Service-/Type-/Test-Change (Shape identisch; verifiziert via DB-Smoke).

## 4. Code-Reading-Liste (erledigt, D87 Live-functiondef)
1. Live `rpc_get_trending_players` — JOIN players, `p.club`, GROUP BY p.club. ✓ (Body-Baseline für Patch)
2. Live `get_most_watched_players` (Wrapper) — SECDEF, `RETURN QUERY SELECT * FROM rpc_get_most_watched_players`. ✓ (bleibt unverändert)
3. Live `rpc_get_most_watched_players` — SQL SECDEF search_path='public', JOIN players, `p.club`. ✓
4. `trading.ts:389-416` getTrendingPlayers — mappt `row.club` (kein club_id im Row-Type). ✓ (unverändert)
5. `watchlist.ts:104-127` getMostWatchedPlayers — mappt `r.club`. ✓ (unverändert)
6. ACL pre: trending {auth,service_role}; most_watched_inner {service_role}; wrapper {auth,service_role} — alle ohne anon. ✓ (post-apply prüfen = erhalten)

## 5. Pattern-References
- errors-db S368c (CREATE OR REPLACE erhält ACL bei Body-Rewrite; via proacl verifizieren).
- D-26/477 + D-26b/478 + D-26c-Teil-1/481 (gleiche Heilung, Surface-Typ-spezifisch).
- §0 SSOT: clubs.name = kanonischer Club-Name; getClub = Client-Cache davon. Server-Resolve liest dieselbe Quelle.

## 6. Acceptance Criteria
- AC1: `pg_get_functiondef(rpc_get_trending_players)` enthält `LEFT JOIN clubs` + `COALESCE(c.name, p.club)`. VERIFY: SQL.
- AC2: `pg_get_functiondef(rpc_get_most_watched_players)` analog. VERIFY: SQL.
- AC3: Resolve-Smoke — für divergente Spieler (p.club ≠ clubs.name) liefert `COALESCE(c.name,p.club)` = clubs.name (nicht Freitext). VERIFY: SQL.
- AC4: ACL unverändert (proacl pre==post, kein anon-Grant neu). VERIFY: SQL.
- AC5: Shape unverändert (Spaltenzahl/-namen/-typen RETURNS TABLE identisch) → Wrapper + Service unberührt. VERIFY: functiondef-Diff.
- AC6: Row-Count-Neutralität — GROUP BY-Erweiterung (c.name) ändert die Gruppierung nicht (player_id determiniert Gruppe). VERIFY: Smoke (RPC liefert ≤ p_limit Rows, 1 pro Spieler).

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| club_id NULL | LEFT JOIN → c.name NULL → COALESCE → p.club (Freitext) |
| Orphan-FK (club_id zeigt auf gelöschten Club) | c.name NULL → p.club |
| club_id gesetzt + clubs.name vorhanden | c.name (resolved, der Fix) |
| trending: 0 Trades 24h | leeres Result (unverändert) |
| most-watched: auth.uid() NULL | Wrapper RAISE 'Not authenticated' (unverändert) |

## 8. Self-Verification
- `mcp__supabase__apply_migration` + `pg_get_functiondef` beide
- Resolve-Smoke + proacl pre/post + Probe-Call beider RPCs (≤ limit Rows)

## 9. Open-Questions
- Keine. Schließt D-26c-Display. Cache-Race S286/D-03 geparkt (Architektur).

## 10. Proof-Plan
`worklog/proofs/482-rpc-club-resolve.txt`: functiondef beide + Resolve-Smoke (divergente Spieler) + proacl pre==post + Probe-Call.

## 11. Scope-Out
- Kein Client-/Service-/Type-Change (Shape identisch). Kein Backfill players.club. Kein Wrapper-Change. Cache-Race geparkt.

## 12. Stage-Chain
SPEC → IMPACT (skipped: read-only RPC-Body, kein Consumer-Contract-Change — Shape identisch) → BUILD (Migration) → REVIEW (self-review, Pattern-Wiederholung; DB-Smoke statt Reviewer wie 478, kein Money) → PROVE (functiondef+smoke+proacl) → LOG.

## 13. Pre-Mortem (kurz)
1. GROUP BY-Fehler (c.name nicht gruppiert) → Migration-Apply schlägt hart fehl (Verify-Gate) — fange ich beim Apply.
2. ACL versehentlich geändert → proacl-Diff fängt's; CREATE OR REPLACE erhält ACL (S368c).
3. Wrapper-Shape-Drift (falls ich versehentlich Spalte ändere) → functiondef-Diff; ich ändere NUR den club-Ausdruck + JOIN + GROUP BY, keine Spalte.
