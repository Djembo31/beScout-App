# Slice 325 Review — create_club_by_platform_admin league_id (Drift-Stop)

**Verdict: PASS (self-review)** · 2026-06-15 · XS, kein Money (SECURITY DEFINER RPC-Härtung).

Self-review begründet: additive 1-Spalten-RPC-Patch, PATCH-AUDIT live verifiziert (alle Branches erhalten), kein src-Diff. SECURITY-DEFINER-Checkliste + PATCH-AUDIT unten.

## PATCH-AUDIT (Slice-156) + AR-44
- Baseline = live pg_get_functiondef (nicht erster Create). Alle Pre-existing-Branches post-apply verifiziert erhalten: admin-check ✓, 3× input-validation ✓, slug-unique ✓, fee_config-Insert ✓, return-shape ✓.
- Neu: league_id = (SELECT id FROM leagues WHERE name=trim(p_league) LIMIT 1). String bleibt (Slice 326 droppt).
- AR-44: REVOKE PUBLIC+anon + GRANT authenticated, exakte Signatur (uuid,text×7). ACL live = postgres|service_role|authenticated (kein anon/PUBLIC) ✓.

## Coverage
- AC1 INSERT league_id ✓ · AC2 Branches erhalten ✓ · AC3 AR-44 ✓ · AC4 Live-Smoke (league_id=Bundesliga, rollback) ✓ · AC5 kein src-Diff ✓

## Scope-Disziplin
- Premature Foundation (getLeagueById + dbToPlayer.leagueId) REVERTED → kein Orphan (D54). Volle Filter-Migration + Cache-Decouple + DROP = Slice 326 (kohärente Einheit, eigener Kontext).

## Findings
Keine. Edge „unbekannter league-Name → NULL" out-of-scope (Namen valide 134/134; loud-Variante 326-Backlog).
