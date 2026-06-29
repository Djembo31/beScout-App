# Slice 463 — D-36: Stats-Siblings Platform-Admin-Guard auf platform_admins

**Status:** SPEC · **Größe:** XS · **Slice-Type:** Migration (Security/Konsistenz, §3) · **Scope:** CEO-approved (Anil 2026-06-29 „mach d36") · **Datum:** 2026-06-29

> Security §3 (SECDEF Body-Change, 2 RPCs) → volle Spur: Spec + force-rollback-Smoke (Platform-Admin-Branch) + Reviewer + CEO-Apply. Schließt die in S462 sichtbar gewordene v2/Sibling-Inkonsistenz.

---

## 1. Problem Statement

`rpc_get_club_trading_fees(uuid)` + `rpc_get_club_fan_stats(uuid)` (beide SECDEF, admin-tab-only) prüfen Platform-Admin per `profiles.top_role='Admin'` — **0 Match in DB** (kanonische Quelle = `platform_admins`-Tabelle, 3 Rows). → ihr Platform-Admin-Override ist **tot**: ein Platform-Admin ohne `club_admins`-Row sieht Trading-Fees/Fan-Stats fremder Clubs NICHT (fail-closed, **kein Leak**). Seit S462 (v2 korrekt auf `platform_admins`) **sichtbar inkonsistent**: im AdminRevenueTab liefert `get_club_dashboard_stats_v2` (Platform-Admin) Daten, der Sibling `getClubTradingFees` RAISEt.

**Evidence (D87 Live):** beide `uses_top_role=true`/`uses_platform_admins=false`; `anon_exec=false`. Reviewer S462 Finding #2 („priorisieren"). Kanon = `get_club_balance` + 21 weitere RPCs nutzen `platform_admins`. UI leitet Platform-Admin ebenfalls aus `platform_admins` ab (`isPlatformAdmin`, `supabaseMiddleware`).

## 2. Lösungs-Design (Architektur)

In **beiden** Funktionen genau **eine Zeile** tauschen (Rest byte-identisch, PATCH-AUDIT S156):
```sql
-- VORHER:
SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_caller AND top_role = 'Admin') INTO v_is_platform_admin;
-- NACHHER:
SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id = v_caller) INTO v_is_platform_admin;
```
Der `club_admins`-Branch bleibt unverändert → der Fix ist rein **permissiver für Platform-Admins** (repariert toten Override), kann keinen bestehenden Club-Admin-Caller brechen. Kein Grant-Change nötig (anon schon revoked).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260629240000_slice_463_sibling_platform_admin_guard.sql` | NEU | CREATE OR REPLACE beide RPCs (1-Zeilen-Guard-Swap), via `apply_migration` |

Kein TS/Service/UI-Change (Return-Shape unverändert; `getClubTradingFees`/`getClubFanAnalytics` unberührt).

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File / Quelle | Zweck | Zu prüfen |
|------|-------|-----------|
| Live `pg_get_functiondef` beider RPCs (D87) | byte-true Baseline | **ERLEDIGT** — frisch gezogen, nur Guard-Zeile divergiert von Kanon |
| Live `get_club_balance` (462-Referenz) | kanonisches platform_admins-Muster | **ERLEDIGT** — `EXISTS(platform_admins WHERE user_id=v_caller)` |
| `club.ts:443` (`getClubTradingFees`) + `club.ts:805/813` (`getClubFanAnalytics`) | Konsumenten | **ERLEDIGT** — AdminRevenueTab + Fans/Analytics-Tab, admin-gated |
| `errors-db.md` S462 / S347 / S156 | Pattern + PATCH-AUDIT | platform_admins kanonisch; nur Guard-Zeile additiv; voller functiondef-Diff im Proof |

## 5. Pattern-References

- `errors-db` **S462** (platform_admins kanonisch vs dead top_role; gegen UI-Quelle diffen) — Kern, direkt fortgesetzt.
- `errors-db` **S347** (Platform-Admin-Override im RPC = UI-Quelle spiegeln).
- `errors-db` **S156** (PATCH-AUDIT byte-true, nur Guard-Zeile geändert).
- Disease-Register **D-36** (+ D-35-Geschwister-Smell).

## 6. Acceptance Criteria

```
AC-01: [HAPPY] beide RPCs nutzen nach Apply platform_admins, nicht top_role
  VERIFY: SELECT proname, pg_get_functiondef(oid) ILIKE '%platform_admins WHERE user_id = v_caller%' AS ok,
                 pg_get_functiondef(oid) ILIKE '%top_role%' AS still_toprole
          FROM pg_proc WHERE proname IN ('rpc_get_club_trading_fees','rpc_get_club_fan_stats');
  EXPECTED: ok=true, still_toprole=false (beide)
  FAIL IF: ein ok=false ODER still_toprole=true

AC-02: [SECURITY] non-admin → RAISE (force-rollback, JWT-sub)
  VERIFY: impersonate non-admin → SELECT beide RPCs
  EXPECTED: ERROR not_club_admin_or_platform_admin (beide)
  FAIL IF: gibt Daten

AC-03: [HAPPY] platform-admin OHNE club_admins-Row → jetzt erlaubt (war vorher RAISE)
  VERIFY: impersonate platform_admin (nicht club_admin des Ziels) → SELECT beide
  EXPECTED: jsonb-Daten (kein Error) — der reparierte Branch
  FAIL IF: RAISE not_club_admin_or_platform_admin

AC-04: [HAPPY] club-admin → weiter erlaubt (Regression club_admins-Branch)
  VERIFY: impersonate club_admin → SELECT beide für seinen Club
  EXPECTED: jsonb-Daten
  FAIL IF: RAISE

AC-05: [REGRESSION] Body byte-identisch außer Guard-Zeile + tsc + club.test
  VERIFY: functiondef-Body-Anker (trades-SUM / activeFans / topFans unverändert); npx tsc --noEmit; npx vitest run club.test.ts
  EXPECTED: Body-Logik unverändert; tsc 0; club.test 79/79
  FAIL IF: Body gedriftet ODER Test rot
```

## 7. Edge Cases Table

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | Guard | non-admin | RAISE | both-false (unverändert) |
| 2 | Guard | platform-admin ohne club_admin | erlaubt (repariert) | platform_admins-EXISTS |
| 3 | Guard | club-admin | erlaubt | club_admins-Branch byte-treu |
| 4 | Guard | v_caller NULL (anon/service) | both-false → RAISE | unverändert; anon ohnehin revoked; kein Cron-Caller |
| 5 | Idempotenz | Migration 2× | CREATE OR REPLACE idempotent | — |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
npx vitest run src/lib/services/__tests__/club.test.ts
# Live: uses_platform_admins/uses_top_role pro RPC; 3-Rollen-force-rollback (S369 JWT-sub)
```

## 9. Open-Questions

**Pflicht-Klärung:** keine (CEO-Go „mach d36"; Muster = verifizierte 462-Kopie auf 2 weitere RPCs).
**Autonom-Zone:** Migration-Filename, Reihenfolge der 2 CREATE OR REPLACE.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Security (Guard-Swap 2 RPCs) | pre-apply force-rollback-Smoke (3 Rollen × 2 RPCs, Platform-Admin jetzt erlaubt) + post-apply uses_platform_admins=true/uses_top_role=false + Body-Anker + tsc + club.test → `worklog/proofs/463-d36-sibling-guard.txt` |

## 11. Scope-Out

- v2 selbst = bereits geheilt (462).
- Andere RPCs mit dead top_role (falls weitere) = separater Sweep (Grep-Audit `top_role='Admin'` in pg_proc → nur diese 2 erwartet).
- Weitere W0-Reste (Recon-RPCs admin-only, anon-Hygiene-Batch, Policy/Index).

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: 0 TS-Consumer-Change, RPC-intern) → BUILD (1 Migration, 2 RPCs) → PROVE (force-rollback 3 Rollen × 2 + post-apply) → REVIEW (reviewer-Agent, §3) → CEO-Apply → LOG
```

## 13. Pre-Mortem (kurz)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Body-Drift beim CREATE OR REPLACE (mehr als Guard-Zeile geändert) | LOW | mittel | byte-true aus live functiondef, nur 1 Zeile getauscht; AC-05 Body-Anker | post-apply functiondef-Diff |
| 2 | Guard bricht club-admin (Regression) | LOW | mittel | club_admins-Branch unangetastet; AC-04 | Live AdminRevenueTab-Render |
| 3 | weitere top_role-RPC übersehen | LOW | niedrig | Grep-Audit `top_role='Admin'` in pg_proc (nur diese 2) | Scope-Out-Audit |

---

## Open Risiko (kurz, ehrlich)
1-Zeilen-Guard-Swap in 2 read-only Stats-RPCs, rein permissiver (repariert toten Platform-Admin-Override). Byte-true aus live functiondef. Restrisiko minimal: CREATE-OR-REPLACE-Body-Drift — durch byte-treue Baseline + AC-05-Body-Anker + force-rollback-Smoke ausgeschlossen.
