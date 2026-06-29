# Review — Slice 462 (D-35: get_club_dashboard_stats_v2 Admin-Guard + REVOKE anon)

**Reviewer:** Cold-Context-Agent · **Datum:** 2026-06-29 · **Scope:** Security §3 (CEO-approved Anil „Komplett") · **time-spent:** ~12 min

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW (non-blocking) | proof AC-06a | PATCH-AUDIT-Beweis presence-based (ILIKE-Anker), kein voller `pg_get_functiondef`-Byte-Diff. S156 verlangt strikt Byte-Baseline; hier durch Shape-Audit-Match + Type + 3-Rollen-Smoke kompensiert (Risiko LOW). | Künftige SECDEF-Body-Rewrites: vollen functiondef-Diff (vorher/nachher) ins Proof. → errors-db S462 (Reviewer-Heuristik) |
| 2 | INFO (Scope-Out, korrekt) | `rpc_get_club_trading_fees` / `rpc_get_club_fan_stats` | Dead `top_role='Admin'`-Branch sperrt Platform-Admins-ohne-club_admin für fremde Clubs aus (fail-closed, **kein Leak**). 462 macht v2 korrekt → neue **v2/Sibling-Inkonsistenz im Revenue-Tab** (Platform-Admin: v2 liefert Daten, Sibling RAISEt). Pre-existing. | **Priorisieren** (sichtbarer durch 462) → **D-36** getrackt. Kein Blocker für 462. |

## One-Line
Ja — ein Senior merged das: minimal-invasiver, sibling-byte-treuer Guard auf der kanonisch korrekten Admin-Quelle (`platform_admins`), anon-Surface zu, Return-Shape gegen Type + Audit verifiziert, 3-Rollen-force-rollback + post-apply-Live-Recheck als Proof.

## Belege (5 kritische Fragen)
1. **PATCH-AUDIT:** Body byte-treu (3 Korroborationen: Return-Shape = `007:133` + Type `ClubDashboardStats`; kein Consumer liest fehlendes Feld; reine Read-Stats-RPC ohne Money-Zwischen-Patches → S156/S356-Gefahrenklasse trifft strukturell nicht).
2. **Guard-Korrektheit:** `platform_admins` RICHTIG — UI leitet Platform-Admin ebenfalls daraus ab (`supabaseMiddleware.ts:98/121`, `platformAdmin.ts:14`, `isPlatformAdmin`) → **kein S347-Drift**. Guard byte-identisch zur kanonischen Familie (slice_330b/333/335). Bricht keinen legit Caller (club_admins-EXISTS erlaubt Editor; Platform via platform_admins). Pre+post-apply 3-Rollen-Smoke beweist (platadmin ok mit pa_is_clubadmin=false = platform_admins-Branch greift).
3. **REVOKE/Grants:** korrekt (anon+PUBLIC raus, authenticated GRANT, service_role unberührt; S368c-ACL-Erhalt richtig behandelt; AR-44 erfüllt).
4. **v_caller IS NULL → auth_required:** bricht keinen service_role/Cron (existiert nicht; nur 2 admin-gated Tabs). Sibling-konform (330b/333/335 RAISEn ebenso auf NULL).
5. **Sibling-Smell:** korrekt Scope-Out (fail-closed, kein Leak, eigene RPCs) → D-36, kein Blocker.

## Positive
- Recon-First: zwei konkurrierende Admin-Muster erkannt + kanonische gewählt mit Live-Beweis — verhinderte einen Regression-Bug (blinde Sibling-Kopie hätte echte Platform-Admins ausgesperrt).
- Kanonischer Guard byte-treu aus verifizierter Familie statt neu erfunden — null Drift-Risiko im Guard.
- Proof überdurchschnittlich: pre-apply force-rollback (in-tx, 3 Rollen, JWT-sub) UND post-apply Live-Recheck + Grants + tsc + club.test 79/79. Pre-existing INV-19/32/33 ehrlich als unverändert markiert.
- Ehrliche Scope-Disziplin (S461-Lehre angewendet): schließt genau die v2-Exposure, übertreibt Closure nicht, parkt Sibling-Smell statt Scope-Creep.

## Learning (Knowledge)
errors-db **S462** (S347-Erweiterung): bei mehreren konkurrierenden Platform-Admin-Quellen ist `platform_admins` (Tabelle) kanonisch; `profiles.top_role='Admin'` = 0 Match (dead branch, nur in 2 Stats-Siblings). Neue club-scoped Admin-Guards gegen `platform_admins` + UI-Quelle (`supabaseMiddleware`/`isPlatformAdmin`) diffen, nicht gegen ein beliebiges Sibling (Reverse-S347-Falle: UI permissiver als RPC). + SECDEF-Body-Rewrite-Proof = voller functiondef-Diff, nicht ILIKE-Presence.
