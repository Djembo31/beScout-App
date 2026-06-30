# Slice 468 — W0: search_path-Härtung (62 SECDEF-Fns) + update_club_assets anon-REVOKE

**Status:** SPEC · **Größe:** M · **Slice-Type:** Migration (Security, §3) · **Scope:** CEO autonom-Go (Anil „P2-Security-Hygiene durcharbeiten") · **Datum:** 2026-06-30

> SECDEF-Hijack-Härtung (P1-nah) + anon-Grant-Hygiene. §3 (touched Money-RPCs body-erhaltend) → Spec + Money-force-rollback + db-invariants + Reviewer + CEO-Apply.

---

## 1. Problem Statement

**Supabase-Advisor `function_search_path_mutable`:** **62 SECURITY-DEFINER-Funktionen** (non-trigger, public) haben **kein gepinntes `search_path`** → laufen als Owner mit dem search_path des Aufrufers = **Hijack-Vektor** (Angreifer legt malicious Objekt in früher-durchsuchtem Schema an → SECDEF führt es als Owner aus = Privilege-Escalation). Betrifft auch Money-RPCs (`grant_founding_pass` etc. seit jeher ohne search_path).

Zusätzlich: **`update_club_assets`** (SECDEF-Mutation) ist vestigial an **anon** granted (Guard schützt: `auth.uid() != p_admin_id → RAISE`; app-Caller `club.ts:790` = authenticated Club-Admins) → anon-Grant unnötig.

**Evidence (D87, read-only):** 62 SECDEF-non-trigger ohne `proconfig search_path`. **Risk-Check leer** — keine nutzt unqualifizierte Nicht-public-Refs (Extensions/vault/net/graphql/http/pgcrypto); alle referenzieren nur public + pg_catalog-Builtins + qualifizierte `auth.*`. → `SET search_path='public'` body-erhaltend.

## 2. Lösungs-Design

**`ALTER FUNCTION … SET search_path TO 'public'`** (kein Body-Rewrite, kein CREATE OR REPLACE) auf alle 62 SECDEF-non-trigger-Fns ohne search_path. Body-erhaltend: unqualifizierte public-Refs resolven via gepinntem 'public', pg_catalog implizit, `auth.*` qualifiziert. Idempotent. DO-Block-Loop (deterministisch über die Selektions-Bedingung).
+ `REVOKE EXECUTE ON FUNCTION update_club_assets(...) FROM anon` (Mutation, authenticated behält).

**Was NICHT:** `search_path=''` (bräche unqualifizierte Bodies — body-rewrite nötig); Trigger (AR-44: kein search_path-Hijack-Eskalations-Risiko im selben Maß + separate Klasse); INVOKER-Fns (kein Escalation, niedriger) — beide Scope-Out.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260630150000_slice_468_search_path_hardening.sql` | NEU | DO-Loop ALTER 62 + REVOKE update_club_assets, via apply_migration |

Kein TS/Test-Change (reine Funktions-Config, Bodies + Return-Shapes unverändert).

## 4. Code-Reading-Liste

| Quelle | Status |
|--------|--------|
| Advisor `function_search_path_mutable` Zählung (D87) | **ERLEDIGT** — 62 SECDEF-non-trigger |
| Risk-Ref-Scan (Extensions/vault/etc.) | **ERLEDIGT** — leer (alle body-erhaltend pinbar) |
| `update_club_assets` Body + Guard + Caller | **ERLEDIGT** — guard-geschützt, app-Caller authenticated (club.ts:790) |
| `database.md` „function_search_path_mutable" + etablierter `SET search_path TO 'public'` (get_club_balance etc.) | 'public'-Pin = BeScout-Standard, body-erhaltend |
| Money-RPCs im Set (grant_founding_pass etc.) | referenzieren nur public + auth.uid() qualifiziert → safe |

## 5. Pattern-References

- `database.md` AR-44 (Trigger brauchen kein REVOKE) + S368c (ALTER ≠ Body-Change, ACL/Body erhalten).
- errors-db S156 (kein Body-Rewrite → kein PATCH-AUDIT-Risiko; ALTER-only).
- Supabase-Advisor `function_search_path_mutable`.
- Disease-Register §2-Triage (DB-Security-Schicht).

## 6. Acceptance Criteria

```
AC-01: [SECURITY] search_path-mutable SECDEF-non-trigger nach Apply = 0
  VERIFY: count(*) pg_proc SECDEF non-trigger public OHNE proconfig search_path
  EXPECTED: 0 (war 62)
  FAIL IF: > 0

AC-02: [REGRESSION] Money-RPC funktional unverändert (grant_founding_pass force-rollback)
  VERIFY: BEGIN-impersonate platform_admin; grant_founding_pass(test-user,'fan',999); verify ok+mint; ROLLBACK
  EXPECTED: ok=true, bcredits=250000 (search_path-Pin bricht Money-Body nicht)
  FAIL IF: Fehler/Body-Bruch

AC-03: [REGRESSION] db-invariants unverändert (Live-DB-Funktionen laufen)
  VERIFY: npx vitest run db-invariants.test.ts
  EXPECTED: Failure-Menge unverändert 3 (INV-19/32/33); INV-31 läuft (ruft search_path-gepinnte Audit-RPC)
  FAIL IF: neue Failure (= eine gepinnte Fn bricht)

AC-04: [SECURITY] update_club_assets anon REVOKEd, authenticated behält
  VERIFY: has_function_privilege('anon'/'authenticated', update_club_assets, EXECUTE)
  EXPECTED: anon=false, authenticated=true
  FAIL IF: anon=true

AC-05: [REGRESSION] Stichprobe: 3 search_path-gepinnte Fns rufbar (1 calc, 1 money, 1 admin)
  VERIFY: live-call (force-rollback wo mutierend) is_club_admin / grant_founding_pass(invalid) / get_treasury_stats
  EXPECTED: laufen (kein search_path-Resolution-Fehler)
  FAIL IF: undefined function / object not found
```

## 7. Edge Cases

| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | Fn mit unqualifizierter Extension-Ref | wäre Bruch | Risk-Scan leer → keine |
| 2 | Money-RPC search_path-gepinnt | läuft (public + auth.uid()) | AC-02 force-rollback |
| 3 | Idempotenz 2× | re-set, no-op | ALTER SET idempotent |
| 4 | qualifizierte auth.users-Ref | safe (qualifiziert) | unverändert |
| 5 | greenfield-replay DO-Loop | hardet was nötig | deterministische WHERE |

## 8. Self-Verification

```bash
npx vitest run src/lib/__tests__/db-invariants.test.ts
# Live: advisor-count vorher/nachher; has_function_privilege update_club_assets; money-force-rollback
```

## 9. Open-Questions
Keine (autonom; Risk-Scan leer = safe). Autonom: DO-Loop vs named ALTERs (DO-Loop = deterministisch + wartungsarm).

## 10. Proof-Plan
search_path-mutable-Count vorher 62 → nachher 0 + Money-force-rollback (grant_founding_pass mint ok, rolled back) + db-invariants unverändert + update_club_assets-grants + 3er-Stichprobe live-call → `worklog/proofs/468-search-path.txt`

## 11. Scope-Out
- INVOKER-Fns (11) + Trigger (15) ohne search_path = niedriger (kein Escalation) → eigener kleiner Slice/optional.
- anon-Hygiene-Rest (Trigger-REVOKEs AR-44-unnötig, Kalkulator-REVOKEs RLS-Risiko-bei-P2-Wert, Leaderboard-anon behalten) = geparkt (Report).

## 12. Stage-Chain
```
SPEC → IMPACT (skipped: reine Fn-Config + 1 REVOKE, Bodies unverändert) → BUILD (1 Migration) → PROVE (count + money-rollback + db-invariants) → REVIEW (reviewer §3, touched Money) → CEO-Apply → LOG
```

## 13. Pre-Mortem

| # | Failure | Prob | Mitigation | Detection |
|---|---------|------|------------|-----------|
| 1 | eine gepinnte Fn bricht (unqualifizierte non-public-Ref übersehen) | LOW | Risk-Scan leer; pg_catalog implizit | AC-03 db-invariants + AC-05 Stichprobe |
| 2 | Money-RPC search_path-Pin ändert Verhalten | LOW | body-erhaltend (nur Resolution-Kontext); refs public+auth qualifiziert | AC-02 force-rollback mint |
| 3 | update_club_assets-REVOKE bricht Caller | LOW | app-Caller authenticated (club.ts:790), guard ohnehin | AC-04 |

---

## Open Risiko
ALTER-only (kein Body-Rewrite) auf 62 verifiziert-safe SECDEF-Fns + 1 REVOKE. Body-erhaltend. Restrisiko: eine übersehene unqualifizierte non-public-Ref → db-invariants (Live-DB) + Money-force-rollback + Stichprobe fangen es; bei Bruch einzeln zurücknehmen.
