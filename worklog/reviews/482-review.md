# Slice 482 Review — D-26c Teil 2 (self-review)

**Self-review** (Pattern-Wiederholung der D-26-Familie, read-only RPCs, kein Money — analog 478/481). DB-Smoke statt Cold-Reviewer; adversarielle Checks gefahren.

## Verdikt: PASS

## Geprüft
1. **Server-Resolve korrekt:** `COALESCE(c.name, p.club)` mit `LEFT JOIN clubs c ON c.id=p.club_id` — divergente Spieler (Zaniolo Udinese→Galatasaray etc.) live resolved, club_id-NULL/Orphan-FK → Freitext-Fallback (LEFT JOIN + COALESCE). Live-Smoke bewiesen. ✓
2. **Signatur/Shape unverändert (§0 / kein Breaking-Contract):** RETURNS TABLE beider RPCs byte-identisch (nur der `club`-Ausdruck im Body geändert) → Wrapper `get_most_watched_players` (SELECT *) hat unveränderte Spalten (functiondef: has_join=false = nicht angefasst), Service-Mapper (`row.club`) liest dieselbe Spalte → kein Client-/Type-/Test-Change nötig. ✓
3. **ACL erhalten (S368c):** proacl pre==post für alle 3 Funktionen (Wrapper + 2 inner), kein anon-Grant neu. CREATE OR REPLACE auf bestehende Fn erhält ACL — empirisch bestätigt. ✓
4. **SECDEF/search_path erhalten:** rpc_get_most_watched_players bleibt SECURITY DEFINER + search_path='public' (functiondef secdef=true). ✓
5. **Row-Count-Neutralität:** GROUP BY um `c.name` erweitert — player_id determiniert die Gruppe, c.name ist konstant je Spieler → keine zusätzliche Gruppierung. Probe-Call: most_watched 1 Row/1 distinct player (≤ limit). ✓
6. **§0 Surface-Typ-Split bewusst dokumentiert:** Raw-Row-Surfaces (481) → Client-getClub; Aggregat-RPCs (482) → Server-Resolve. KEIN zweiter Wahrheits-Begriff — beide lesen `clubs.name` (getClub = Client-Cache von clubs). Resolve am Aggregat ist in-place korrekter als club_id durch die SECDEF-Wrapper-Signatur zu schleusen (geringeres Risiko, kein Signatur-/Spalten-Sync). Im Slice + disease-register dokumentiert. ✓
7. **Migration-Workflow:** apply_migration (nicht db push), File committet für greenfield. Kein REVOKE-Block nötig (Body-Rewrite bestehender Fn, ACL erhalten — AR-44 gilt für NEUE Fn). ✓

## Findings
| Sev | Issue | Status |
|-----|-------|--------|
| — | Keine. Read-only RPC-Resolve, Shape/ACL/SECDEF erhalten, Live-Smoke grün. | — |

## DoD
Migration applied + functiondef-verifiziert + ACL pre==post + Resolve-Smoke (divergente Spieler) + Probe-Call. **D-26c Display-Teil KOMPLETT** (481 no-DB + 482 RPC). Cache-Race S286/D-03 geparkt.
