# Slice 464 — D-37: SOLE-gate top_role-RPCs reparieren (platform_admins)

**Status:** SPEC · **Größe:** S · **Slice-Type:** Migration (Security/Money, §3) · **Scope:** CEO-approved (Anil 2026-06-30 „mach autonom weiter" — W0-Thread, D-37 empfohlen+freigegeben) · **Datum:** 2026-06-30

> §3 Money/Minting (grant_founding_pass + admin_grant_wildcards) → volle Spur: Spec + force-rollback-Smoke (3 RPCs, Guard-only, kein Money-Side-Effect) + Reviewer + CEO-Apply.

---

## 1. Problem Statement

3 **live-verdrahtete** Admin-RPCs gaten auf `profiles.top_role='Admin'`, das **0 Profile global** haben (Plattform migrierte auf `platform_admins`) → **always-reject = effektiv TOT** (SOLE-gate, kein club_admins-Fallback). Fail-closed (kein Leak), aber kaputte Capabilities:
- **`grant_founding_pass`** (`foundingPasses.ts:40`) — **MONEY** (mintet bcredits + Kill-Switch). Founding-Pass-Vergabe unmöglich.
- **`admin_grant_wildcards`** (`wildcards.ts:72`) — **MINTING** (user_wildcards). Admin-Wildcard-Grant unmöglich.
- **`cancel_event_entries`** (`events.mutations.ts:624`) — Event-Entry-Cancel unmöglich.

**Evidence (2026-06-30, read-only verifiziert):** alle 3 `auth_exec=true`, gaten auf `top_role='Admin'` (0 Match), kein service_role-Bypass auf dem Role-Check, live-wired (App-Services). Reviewer S463 Finding #1. D-36-Schwester, aber SOLE-gate (Total-Lockout statt Override-Verlust).

## 2. Lösungs-Design

In jeder RPC den top_role-Check auf die kanonische `platform_admins`-Quelle swappen (identisch D-36/v2/get_club_balance), Rest byte-treu (PATCH-AUDIT S156), unbenutzte DECLARE-Vars raus:
- `grant_founding_pass`: `SELECT top_role INTO v_admin_role …; IF v_admin_role IS DISTINCT FROM 'Admin' THEN RAISE` → `IF NOT EXISTS(SELECT 1 FROM platform_admins WHERE user_id=auth.uid()) THEN RAISE …`; `v_admin_role` DECLARE raus.
- `admin_grant_wildcards`: `auth_uid_mismatch`-Spoof-Guard BLEIBT; danach `SELECT top_role INTO v_role …; IF v_role IS DISTINCT FROM 'Admin' THEN RAISE 'admin_role_required'` → `IF NOT EXISTS(platform_admins WHERE user_id=auth.uid()) THEN RAISE 'admin_role_required' …`; `v_role` DECLARE raus.
- `cancel_event_entries`: `IF NOT EXISTS(profiles WHERE id=auth.uid() AND top_role='Admin') THEN RETURN unauthorized` → `IF NOT EXISTS(platform_admins WHERE user_id=auth.uid()) THEN RETURN unauthorized`.

Money/Minting-Bodies (CASE-Tiers, Kill-Switch, wallet/transactions-INSERT; wildcard-UPSERT) **unangetastet**. AR-44 REVOKE/GRANT-Block (anon schon revoked).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260630120000_slice_464_soletop_role_platform_admins.sql` | NEU | 3× CREATE OR REPLACE (Guard-Swap), via apply_migration |

## 4. Code-Reading-Liste (Pflicht VOR Impl)

| Quelle | Zweck | Status |
|--------|-------|--------|
| Live functiondef alle 3 (D87) | byte-true Baseline | **ERLEDIGT** (frisch gezogen) |
| `platform_admins`-Muster (get_club_balance, S462) | kanonisch | **ERLEDIGT** |
| Caller (foundingPasses.ts:40, wildcards.ts:72, events.mutations.ts:624) | live-wired bestätigen | **ERLEDIGT** |
| errors-db S463/S462/S156 | Gate-Topologie + PATCH-AUDIT | platform_admins kanonisch; nur Guard-Zeilen + DECLARE |
| `foundingPasses-tiers.invariant.test.ts` | Tier-Werte (CASE) Wahrheit | CASE-Block byte-treu lassen (Tier-Invariant grün halten) |

## 5. Pattern-References

- errors-db **S463** (SOLE-gate = Total-Lockout) + **S462** (platform_admins kanonisch) — Kern.
- errors-db **S156** (PATCH-AUDIT byte-true; nur Guard-Zeilen + unused DECLAREs).
- database.md AR-44 (REVOKE/GRANT-Block bei CREATE OR REPLACE-Migration).
- Disease-Register **D-37**.

## 6. Acceptance Criteria

```
AC-01: [SECURITY] non-admin → weiter rejected (alle 3, force-rollback JWT-sub)
  VERIFY: impersonate non-admin → call alle 3
  EXPECTED: grant_founding_pass RAISE 'Nicht berechtigt'; admin_grant_wildcards RAISE 'admin_role_required'; cancel_event_entries {ok:false,error:'unauthorized'}
  FAIL IF: einer kommt durch

AC-02: [HAPPY] platform-admin → kommt PAST den Admin-Guard (alle 3), Guard-only (kein Money-Mint)
  VERIFY: impersonate platform_admin (ff152a24): grant_founding_pass(invalid tier 'xxx') / admin_grant_wildcards(p_amount=0) / cancel_event_entries(non-existent event)
  EXPECTED: grant_founding_pass RAISE 'Ungueltiger Tier' (NICHT 'Nicht berechtigt'); admin_grant_wildcards {success:false,error:'invalid_amount'}; cancel_event_entries kommt past (kein 'unauthorized')
  FAIL IF: einer gibt 'Nicht berechtigt'/'admin_role_required'/'unauthorized' (= Guard rejected weiter)

AC-03: [HAPPY-MONEY] platform-admin grant_founding_pass valider Tier → mintet (force-rollback, dann ROLLBACK)
  VERIFY: BEGIN; impersonate platform_admin; grant_founding_pass(test-user, 'fan', 999); verify wallet+pass+tx; ROLLBACK
  EXPECTED: ok:true, bcredits_granted=250000, founding-pass-Row + wallet-credit + transaction (alles in Tx, rolled back)
  FAIL IF: RAISE 'Nicht berechtigt' ODER Money-Logik-Fehler

AC-04: [REGRESSION] Guard-Swap nur (Body-Anker intakt) + 0 top_role-Rest + tsc + tests
  VERIFY: functiondef ILIKE platform_admins (alle 3) + NOT ILIKE top_role; CASE-Tiers/Kill-Switch/wildcard-UPSERT intakt; tsc; vitest foundingPasses + wildcards + event-entries + db-invariants
  EXPECTED: alle 3 platform_admins, 0 top_role; Bodies intakt; tsc 0; Tests grün; db-invariants unverändert
  FAIL IF: Body-Drift ODER neue Test-Failure
```

## 7. Edge Cases

| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | non-admin | reject (unverändert) | platform_admins-EXISTS false |
| 2 | platform-admin | erlaubt (repariert) | platform_admins-EXISTS true |
| 3 | admin_grant_wildcards Spoof (auth.uid != p_admin_id) | auth_uid_mismatch | Spoof-Guard BLEIBT vor platform_admins-Check |
| 4 | grant_founding_pass Kill-Switch | unverändert | Body byte-treu |
| 5 | service_role (auth.uid NULL) | reject (platform_admins(NULL)=false) | sole-platform-admin; kein Cron-Caller |

## 8. Self-Verification

```bash
npx tsc --noEmit
npx vitest run src/lib/services/__tests__/foundingPasses.test.ts src/features/fantasy/services/__tests__/wildcards.test.ts src/lib/services/__tests__/event-entries.test.ts src/lib/__tests__/foundingPasses-tiers.invariant.test.ts
# Live: functiondef ILIKE platform_admins/top_role pro RPC; 3-Rollen-force-rollback (S369)
```

## 9. Open-Questions
Keine (CEO autonom-Go; Muster = verifizierte D-36-Kopie auf SOLE-gate-RPCs). Autonom: Migration-Filename.

## 10. Proof-Plan
force-rollback-Smoke (non-admin reject + platform-admin past-guard, alle 3; + 1 voller Money-Mint grant_founding_pass in Tx rolled back) + post-apply functiondef-Anker (platform_admins/0 top_role) + tsc + 4 Test-Files → `worklog/proofs/464-d37-soletop-role.txt`

## 11. Scope-Out
- Weitere top_role-RPCs: `set_club_fan_rank_thresholds` = Sekundär-Branch (club-admins funktionieren) → eigener kleiner Slice ODER mit-fixen falls trivial (separat tracken). NICHT in dieser SOLE-gate-Slice.
- W0-Rest (Recon-RPCs admin-only, anon-Hygiene, Policy/Index).

## 12. Stage-Chain
```
SPEC → IMPACT (skipped: 0 TS-Change, RPC-intern) → BUILD (1 Migration, 3 RPCs) → PROVE (force-rollback 3 RPCs × Rollen + Money-Mint-rollback) → REVIEW (reviewer §3 Money) → CEO-Apply → LOG
```

## 13. Pre-Mortem

| # | Failure | Prob | Mitigation | Detection |
|---|---------|------|------------|-----------|
| 1 | Money-Body-Drift bei grant_founding_pass CREATE OR REPLACE | LOW | byte-true, nur Guard+DECLARE; AC-04 Body-Anker (CASE/Kill-Switch) | post-apply functiondef + tier-invariant-Test |
| 2 | platform_admins-Swap bricht legit Caller | LOW | RPCs lehnen aktuell eh ALLE ab → Fix kann nur restaurieren; AC-02/03 | force-rollback |
| 3 | admin_grant_wildcards Spoof-Guard versehentlich entfernt | LOW | Spoof-Guard explizit behalten (Edge #3) | AC functiondef-Anker auth_uid_mismatch |

---

## Compliance-Check
Kein user-facing Wording. RAISE-Strings intern. Fix RESTAURIERT Admin-Capability (kein neuer Money-Flow, gleiche Mint-Logik wie vorher — nur jetzt erreichbar für Platform-Admins). Kill-Switch unangetastet.

## Open Risiko
3 Guard-Swaps in §3-RPCs (2 Money/Minting), byte-true aus live functiondef. Money-Bodies unangetastet. Da die RPCs aktuell jeden ablehnen, kann der Fix nur restaurieren, nichts verschlechtern. force-rollback-Smoke (inkl. voller Money-Mint in Tx) + tier-invariant-Test fangen Body-Drift.
