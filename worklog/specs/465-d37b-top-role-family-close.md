# Slice 465 — D-37b: top_role='Admin'-Familie vollständig schließen (platform_admins)

**Status:** SPEC · **Größe:** S · **Slice-Type:** Migration (Security/Konsistenz, §3) · **Scope:** CEO autonom-Go (Anil „mach autonom weiter") · **Datum:** 2026-06-30

> Letzte 2 `top_role='Admin'`-RPCs (post-464-Audit). Kein Money (read/config). Security §3 → Spec + force-rollback-Smoke + Reviewer + CEO-Apply.

---

## 1. Problem Statement

Post-464-Vollständigkeits-Audit (`pg_proc WHERE prosrc ~* top_role='Admin'`) fand die letzten 2 RPCs der toten Familie:
- **`get_sponsor_stats_summary`** (RETURNS TABLE, read-only Sponsor-Stats) — **SOLE-gate** `IF NOT EXISTS(profiles ... top_role='Admin') THEN RAISE 'Not authorized'` = **tot** (0 Match). Zudem **anon-granted** (vestigial, sollte nie anon sein).
- **`set_club_fan_rank_thresholds`** (config-write + fan_rankings-recompute) — **Sekundär-Branch** `IF NOT EXISTS(profiles top_role='Admin') AND NOT EXISTS(club_admins owner/admin) THEN RETURN not_club_admin` → club_admins funktioniert, Platform-Override tot.

**Evidence (2026-06-30, read-only verifiziert):** beide live (D87). `get_sponsor_stats_summary` anon_exec=true/SOLE-gate-tot; `set_club_fan_rank_thresholds` Sekundär (errors-db S347 = genau dieser, UI-vs-RPC-Drift). Reviewer S463/S464 Scope-Out.

## 2. Lösungs-Design

Beide top_role-Check auf kanonische `platform_admins` swappen (Rest byte-treu, S156):
- **`get_sponsor_stats_summary`**: `IF NOT EXISTS(public.profiles WHERE id=auth.uid() AND top_role='Admin')` → `IF NOT EXISTS(public.platform_admins WHERE user_id=auth.uid())` (qualifiziert `public.` — Fn hat `SET search_path TO ''`). **+ REVOKE anon** (vestigial). RETURN QUERY-Body unverändert.
- **`set_club_fan_rank_thresholds`**: `NOT EXISTS(public.profiles ... top_role='Admin')` → `NOT EXISTS(public.platform_admins WHERE user_id=v_uid)`; **club_admins-Branch unverändert**. Threshold-Validierung + UPSERT + recompute-Loop byte-treu. (`calculate_fan_rank`-PERFORM läuft im SECDEF-Owner-Kontext → von 460-REVOKE unberührt.)

Permissiv-only für Platform-Admins (get_sponsor: war für ALLE tot; set_thresholds: club_admins unverändert). AR-44 REVOKE/GRANT-Block.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260630130000_slice_465_top_role_family_close.sql` | NEU | 2× CREATE OR REPLACE (Guard-Swap) + REVOKE anon get_sponsor, via apply_migration |

## 4. Code-Reading-Liste

| Quelle | Status |
|--------|--------|
| Live functiondef beide (D87) | **ERLEDIGT** (byte-true Baseline) |
| `platform_admins`-Muster (464/get_club_balance) | **ERLEDIGT** |
| errors-db S463 (Gate-Topologie) / S462 / S347 (UI-vs-RPC-Drift) / S156 | platform_admins kanonisch; nur Guard-Zeile; Body byte-true |
| `set_club_fan_rank_thresholds`-Consumer | AdminLigaTab/Fan-Rank-Config (admin-gated) |
| 460-REVOKE calculate_fan_rank | SECDEF-Owner-PERFORM → unberührt |

## 5. Pattern-References

- errors-db **S463** (Familie nach Gate-Topologie; Vollständigkeits-Audit) + **S464** (SOLE-gate permissive-only) + **S462** (platform_admins kanonisch) + **S347** (Platform-Admin-Override = UI-Quelle spiegeln; set_club_fan_rank_thresholds ist DER S347-Fall) + **S156** (PATCH-AUDIT).
- Disease-Register **D-37b**.

## 6. Acceptance Criteria

```
AC-01: [HAPPY] beide nutzen platform_admins, 0 top_role
  VERIFY: functiondef ILIKE platform_admins (beide) + NOT ILIKE top_role
  EXPECTED: beide platform_admins=true, top_role=false
  FAIL IF: ein top_role bleibt

AC-02: [SECURITY] get_sponsor_stats_summary: anon REVOKEd
  VERIFY: has_function_privilege('anon','...get_sponsor_stats_summary...','EXECUTE')
  EXPECTED: false
  FAIL IF: true

AC-03: [SECURITY] non-admin → reject beide (force-rollback JWT-sub)
  VERIFY: impersonate non-admin → get_sponsor_stats_summary() / set_club_fan_rank_thresholds(invalid)
  EXPECTED: get_sponsor RAISE 'Not authorized'; set_thresholds {success:false,error:'not_club_admin'}
  FAIL IF: einer kommt durch

AC-04: [HAPPY] platform-admin → past guard beide (set_thresholds guard-only via invalid thresholds, kein Write)
  VERIFY: impersonate platform_admin (ff152a24, NICHT club_admin): get_sponsor_stats_summary() / set_club_fan_rank_thresholds(p_stammgast>=p_ultra)
  EXPECTED: get_sponsor liefert rows/empty (kein 'Not authorized'); set_thresholds {success:false,error:'invalid_thresholds'} (past guard, NICHT not_club_admin)
  FAIL IF: 'Not authorized' / 'not_club_admin' (= Guard rejected weiter)

AC-05: [REGRESSION] club-admin → set_club_fan_rank_thresholds weiter past guard (Sekundär-Branch intakt)
  VERIFY: impersonate club_admin (dcb5af5e) für seinen Club, invalid thresholds
  EXPECTED: {success:false,error:'invalid_thresholds'} (past guard via club_admins)
  FAIL IF: 'not_club_admin'

AC-06: [REGRESSION] Body byte-treu + tsc + tests
  VERIFY: functiondef Body-Anker (get_sponsor: SUM(impressions)/ctr; set_thresholds: UPSERT/recompute-Loop); tsc; vitest betroffene
  EXPECTED: Bodies intakt; tsc 0; Tests grün
  FAIL IF: Drift ODER Test-Failure
```

## 7. Edge Cases

| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | non-admin | reject (beide) | platform_admins-EXISTS false (+ club_admins false) |
| 2 | platform-admin | past (beide, repariert) | platform_admins-EXISTS true |
| 3 | club-admin (set_thresholds) | past (unverändert) | club_admins-Branch byte-treu |
| 4 | anon get_sponsor | kein EXECUTE | REVOKE anon |
| 5 | set_thresholds recompute calculate_fan_rank | läuft (SECDEF-Owner) | 460-REVOKE irrelevant im Owner-Kontext |
| 6 | get_sponsor search_path='' | platform_admins qualifiziert `public.` | explizit qualifiziert |

## 8. Self-Verification

```bash
npx tsc --noEmit
npx vitest run src/lib/__tests__/db-invariants.test.ts
# Live: functiondef ILIKE platform_admins/top_role; has_function_privilege anon get_sponsor; 3-Rollen-force-rollback (S369)
```

## 9. Open-Questions
Keine (autonom-Go; Muster = 464-Kopie). Autonom: Migration-Filename.

## 10. Proof-Plan
force-rollback-Smoke (non-admin reject / platform-admin past / club-admin past beide; set_thresholds guard-only via invalid = kein Write) + post-apply anchors (platform_admins/0 top_role/anon REVOKEd) + tsc + db-invariants → `worklog/proofs/465-d37b-family-close.txt`

## 11. Scope-Out
- top_role-Familie danach KOMPLETT (Post-Audit = 0 Rest).
- search_path_mutable (87 Fns), anon-Hygiene-Batch (weitere), Policy/Index = eigene W0-Slices.

## 12. Stage-Chain
```
SPEC → IMPACT (skipped: 0 TS-Change) → BUILD (1 Migration, 2 RPCs) → PROVE (force-rollback 3 Rollen) → REVIEW (reviewer §3) → CEO-Apply → LOG
```

## 13. Pre-Mortem

| # | Failure | Prob | Mitigation | Detection |
|---|---------|------|------------|-----------|
| 1 | set_thresholds Body-Drift (recompute-Loop) | LOW | byte-true, nur Guard-Zeile; AC-06 | post-apply functiondef + recalc-Test |
| 2 | get_sponsor RETURNS TABLE-Signatur-Drift | LOW | exakte Signatur aus live def | apply_migration-Fehler = Rollback |
| 3 | search_path='' → platform_admins unqualifiziert bricht | LOW | explizit `public.platform_admins` | AC-04 (platform-admin past) |

---

## Open Risiko
2 Guard-Swaps in read/config-RPCs (kein Money), byte-true. get_sponsor war für ALLE tot (permissiv-only); set_thresholds club_admins-Branch unverändert. force-rollback-Smoke (inkl. club-admin-Regression) + Body-Anker decken Drift.
