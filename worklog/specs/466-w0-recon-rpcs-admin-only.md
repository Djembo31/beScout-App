# Slice 466 — W0: Security-Map-Recon-RPCs admin-only (REVOKE anon+authenticated)

**Status:** SPEC · **Größe:** XS · **Slice-Type:** Migration (Security, §3) · **Scope:** CEO autonom-Go (Anil „mach autonom weiter") · **Datum:** 2026-06-30

> REVOKE-only Security-Hygiene (§3) → Spec + Grant-Proof + Reviewer + CEO-Apply.

---

## 1. Problem Statement

2 SECURITY-DEFINER-Audit-RPCs sind an **anon + authenticated** granted und liefern die **Security-Landkarte** der Plattform an jeden (eingeloggten/ausgeloggten) Aufrufer:
- **`get_security_definer_user_param_audit()`** — listet pro SECDEF-RPC `guard_type`/`grant_status`/`needs_fix` → ein Angreifer sieht, **welche Funktion ungeguarded** ist.
- **`get_rls_policy_matrix()`** — listet die komplette RLS-Policy-Matrix → Angreifer sieht, welche Tabellen wie geschützt sind.

Reiner Recon-Leak (kein Daten-Mutation), aber „gib dem Angreifer die Karte". Disease-Register §2-Triage Item 2.

**Evidence (D87, read-only verifiziert):** beide `anon_exec=true`, `auth_exec=true`, `secdef=true`. **Konsumenten = NUR** die db-invariants-Test-Suite (`db-invariants.test.ts:1506` + `:1696`), die als **service_role** läuft (`SUPABASE_SERVICE_ROLE_KEY`, test-Header Z.27). **0 App-/UI-Caller** (grep src/).

## 2. Lösungs-Design

`REVOKE EXECUTE FROM anon, authenticated, PUBLIC` auf beide → admin-only (service_role + postgres behalten). Test läuft als service_role → unberührt. Kein App-Caller → nichts bricht. Reine Subtraktion der Exposure.

```sql
REVOKE EXECUTE ON FUNCTION public.get_security_definer_user_param_audit() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rls_policy_matrix()                 FROM anon, authenticated, PUBLIC;
```

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260630140000_slice_466_recon_rpcs_admin_only.sql` | NEU | REVOKE-only, via apply_migration |

Kein TS/Test-Change: db-invariants-Test läuft service_role → behält EXECUTE.

## 4. Code-Reading-Liste

| Quelle | Status |
|--------|--------|
| Live grants beide (D87) | **ERLEDIGT** (anon+auth+secdef) |
| db-invariants.test.ts Client-Rolle (Z.27) | **ERLEDIGT** — service_role (SUPABASE_SERVICE_ROLE_KEY) → REVOKE anon+auth safe |
| grep src/ für beide RPC-Namen | **ERLEDIGT** — nur der Test, 0 App-Caller |
| errors-db S005 (REVOKE-Pattern) / database.md AR-44 | REVOKE FROM anon,authenticated,PUBLIC; service_role behält |

## 5. Pattern-References

- Disease-Register **§2-Triage Item 2** (genau dieser DROP-vs-REVOKE-Entscheid).
- errors-db **S005** (SECDEF-Grant-Beschränkung) + **S095** (Admin-only-RPC = wo wird's aufgerufen).
- Slice **460** (REVOKE-only-Pattern, has_function_privilege-Proof).

## 6. Acceptance Criteria

```
AC-01: [SECURITY] anon + authenticated haben nach REVOKE kein EXECUTE (beide)
  VERIFY: has_function_privilege('anon'/'authenticated', 'public.get_security_definer_user_param_audit()'/'public.get_rls_policy_matrix()', 'EXECUTE')
  EXPECTED: alle 4 = false
  FAIL IF: einer = true

AC-02: [REGRESSION] service_role behält EXECUTE (beide)
  VERIFY: has_function_privilege('service_role', beide, 'EXECUTE')
  EXPECTED: beide true
  FAIL IF: einer false

AC-03: [REGRESSION] db-invariants (läuft service_role) INV-31 + INV-32 unverändert
  VERIFY: npx vitest run src/lib/__tests__/db-invariants.test.ts
  EXPECTED: Failure-Menge unverändert 3 (INV-19/32/33); INV-31 läuft (ruft die Audit-RPC als service_role)
  FAIL IF: neue Failure ODER INV-31 bricht mit permission-Fehler
```

## 7. Edge Cases

| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | Test (service_role) ruft RPC | läuft | service_role behält EXECUTE |
| 2 | authenticated Angreifer | kein EXECUTE | REVOKE authenticated |
| 3 | anon | kein EXECUTE | REVOKE anon |
| 4 | Idempotenz 2× | no-op | REVOKE idempotent |
| 5 | versteckter Admin-UI-Caller | 0 (grep) | Caller-grep src/ |

## 8. Self-Verification

```bash
npx vitest run src/lib/__tests__/db-invariants.test.ts   # service_role → INV-31/32 laufen weiter
# Live: has_function_privilege(anon/authenticated/service_role, beide)
```

## 9. Open-Questions
Keine (autonom; service_role-Test-Rolle verifiziert).

## 10. Proof-Plan
vorher/nachher has_function_privilege (anon/auth→false, service_role→true beide) + db-invariants-Lauf (INV-31 grün, Failure-Menge unverändert) → `worklog/proofs/466-recon-rpcs.txt`

## 11. Scope-Out
- anon-REVOKE-Hygiene-Batch (Trigger + Kalkulatoren + Leaderboard-RPCs) = Slice 467 (eigene ⚠️ Leaderboard-anon-Prüfung).
- 87 search_path_mutable, 81 Policies, Index = eigene W0-Slices.

## 12. Stage-Chain
```
SPEC → IMPACT (skipped: reines Grant-REVOKE, 0 App-Consumer) → BUILD (1 Migration) → PROVE (grants + db-invariants) → REVIEW (reviewer §3) → CEO-Apply → LOG
```

## 13. Pre-Mortem

| # | Failure | Prob | Mitigation | Detection |
|---|---------|------|------------|-----------|
| 1 | db-invariants bricht (Test-Rolle nicht service_role) | LOW | Z.27 verifiziert SUPABASE_SERVICE_ROLE_KEY | AC-03 |
| 2 | versteckter Admin-UI-Caller | LOW | grep src/ = nur Test | Post-Deploy (kein Admin-UI nutzt sie) |

---

## Open Risiko
Reines REVOKE auf 2 Audit-RPCs ohne App-Caller (nur service_role-Test). Minimal. Restrisiko: ein nicht-greppbarer authenticated-Caller — durch src/-grep + service_role-Test ausgeschlossen.
