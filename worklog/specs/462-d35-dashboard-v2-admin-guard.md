# Slice 462 — D-35: get_club_dashboard_stats_v2 Admin-Guard + REVOKE anon

**Status:** SPEC · **Größe:** XS · **Slice-Type:** Migration (Security, §3) · **Scope:** CEO-approved (Anil 2026-06-29 „Komplett: REVOKE anon + Admin-Guard") · **Datum:** 2026-06-29

> Security §3 (SECDEF Body-Change + Grant) → volle Spur: Spec + force-rollback-Smoke (Guard rejects/allows) + Reviewer + CEO-Apply.

---

## 1. Problem Statement

`get_club_dashboard_stats_v2(p_club_id uuid)` (SECURITY DEFINER) ist **ohne Guard** an `anon` + `authenticated` granted und gibt zurück: **Club-IPO-Umsatz** (`ipo_revenue_cents`, sensible Geschäftszahl) + Top-10-Fans mit `user_id` + `holdings_count` (Per-User-Finanz-Signal). → **jeder anon ODER authenticated User kann für JEDEN Club** diese Daten via PostgREST abrufen.

**Evidence (live D87 + Grep):**
- v2-Body hat **keinen** auth/admin-Guard; Konsumenten = NUR `AdminOverviewTab.tsx:49` + `AdminRevenueTab.tsx:28` (Club-Admin-Panel, rollen-gated). **0 öffentliche/logged-out Seite.**
- Carry-forward aus D-12/S461 (Reviewer-Catch): der v1-DROP schloss nur Name-Enumeration; die Kern-Exposure lebt auf v2.
- **Sibling-Inkonsistenz (S460-Klasse):** `rpc_get_club_trading_fees` + `rpc_get_club_fan_stats` (gleiche Admin-Tabs) haben **bereits** den club-/platform-admin-Guard + `anon_exec=false`. v2 wurde beim Härten dieser Familie übersehen.

**Wer/wie oft:** anon + jeder authenticated kann Club-Finanzdaten + Fan-PII fremder Clubs lesen. §3-/business.md-Verletzung (Finanz-Signal-Leak), S095 („PII/user_ids → admin-Guard pflicht").

## 2. Lösungs-Design (Architektur)

**Korrektur nach Recon (wichtig):** Zwei konkurrierende Platform-Admin-Muster im Code. Die **kanonische** Quelle (22 RPCs, inkl. `get_club_balance`/`get_club_treasury_ledger` — club-scoped Geld-RPCs, exakt v2s Datenklasse) = die **`platform_admins`-Tabelle** (3 Rows, real). Die 2 Stats-Siblings (`rpc_get_club_trading_fees`/`fan_stats`) nutzen `profiles.top_role='Admin'` — das matcht **niemanden** (0 Profile mit top_role='Admin', dead branch). → v2 spiegelt **`get_club_balance`** (kanonisch + korrekt), NICHT die Siblings; sonst würden echte Platform-Admins (alle via `platform_admins`) für fremde Clubs ausgesperrt (Regression vs. heute ohne Guard).

Guard byte-exakt aus `get_club_balance` (DECLARE: `v_caller uuid := auth.uid(); v_is_club_admin/v_is_platform_admin boolean`):
```sql
IF v_caller IS NULL THEN RAISE EXCEPTION 'auth_required: Nicht authentifiziert'; END IF;
SELECT EXISTS(SELECT 1 FROM club_admins    WHERE club_id = p_club_id AND user_id = v_caller) INTO v_is_club_admin;
SELECT EXISTS(SELECT 1 FROM platform_admins WHERE user_id = v_caller)                        INTO v_is_platform_admin;
IF NOT (v_is_club_admin OR v_is_platform_admin) THEN
  RAISE EXCEPTION 'not_authorized: Kein Club-Admin oder Platform-Admin';
END IF;
-- [Rest des v2-Bodies byte-identisch]
```
+ `REVOKE EXECUTE ON FUNCTION public.get_club_dashboard_stats_v2(uuid) FROM anon, PUBLIC;` (authenticated + service_role behalten; CREATE OR REPLACE erhält ACL → REVOKE explizit, S368c).

**Caller-Sicherheit:** beide Konsumenten (AdminOverviewTab/RevenueTab) rufen RIGHT NEXT TO v2 schon kanonisch-guarded club-scoped RPCs (`getClubTradingFees`, + Treasury/Balance im Revenue-Bereich) erfolgreich → derselbe Admin-Kontext passt v2s Guard. `v_caller IS NULL` → auth_required (service_role/Cron hätte NULL — aber **kein** Cron/service_role-Caller existiert, verifiziert; v2 ist rein client-admin → NULL-Reject korrekt + Sibling-konform zu get_club_balance).

**🚩 Smell (Scope-Out, getrackt):** `rpc_get_club_trading_fees` + `rpc_get_club_fan_stats` nutzen den dead `top_role='Admin'`-Branch → ihre Platform-Admin-Override ist effektiv tot (Platform-Admins ohne club_admin-Row sehen Trading-Fees/Fan-Stats fremder Clubs nicht). Eigenes W0-Konsistenz-Item (Platform-Admin-Quelle vereinheitlichen auf `platform_admins`), NICHT dieser Slice.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260629230000_slice_462_dashboard_v2_admin_guard.sql` | NEU | CREATE OR REPLACE v2 (+ Guard) + REVOKE anon, via `apply_migration` |

Kein TS/Service/UI-Change: Service `getClubDashboardStats` wirft schon bei RPC-error (`if (error) throw`) → ein Nicht-Admin-Direktcall (Angreifer) bekommt error; legit Admin-Tabs unberührt.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File / Quelle | Zweck | Zu prüfen |
|------|-------|-----------|
| Live `pg_get_functiondef('get_club_dashboard_stats_v2(uuid)')` (D87) | PATCH-AUDIT-Baseline | **ERLEDIGT** — Body, search_path 'public', kein Guard |
| Live `rpc_get_club_trading_fees` + `rpc_get_club_fan_stats` | Kanonisches Guard-Muster (Siblings) | **ERLEDIGT** — `v_caller=auth.uid()` + club_admins-EXISTS OR profiles.top_role='Admin' → RAISE 'not_club_admin_or_platform_admin'; anon_exec=false |
| `is_club_admin` Body | Override-Frage | **ERLEDIGT** — prüft nur club_admins (kein Platform-Override) → eigener top_role-Check nötig (wie Siblings) |
| `AdminOverviewTab.tsx:49` + `AdminRevenueTab.tsx:28` | Caller-Kontext | **ERLEDIGT** — admin-gated, rufen guarded Siblings daneben → Guard safe |
| `errors-db.md` S095 / S347 / S005 | Guard-Pattern + UI-vs-RPC-Drift | PII→admin-Guard; Platform-Admin-Override im RPC spiegeln; RAISE-Pattern |

## 5. Pattern-References

- `errors-db` **S095** (PII-RPC → admin-Guard pflicht, „wo wird RPC aufgerufen?") — Kern.
- `errors-db` **S347** (UI-Gate vs RPC-Gate-Drift bei Platform-Admin-Override → top_role-Bypass im RPC spiegeln).
- `errors-db` **S005** (SECDEF-Guard-Pattern + RAISE).
- `errors-db` **S156** (PATCH-AUDIT: Body byte-treu aus live functiondef, nur Guard additiv).
- `errors-db` **S460** (Batch-Härtung ließ ein Familien-Geschwister aus → genau dieser Fall, v2 vs Siblings).
- `database.md` AR-44 / S368c (CREATE OR REPLACE erhält ACL → REVOKE explizit).
- Disease-Register **D-35** (+ D-12-Carry-forward).

## 6. Acceptance Criteria

```
AC-01: [SECURITY] anon hat nach REVOKE kein EXECUTE
  VERIFY: SELECT has_function_privilege('anon','public.get_club_dashboard_stats_v2(uuid)','EXECUTE');
  EXPECTED: false
  FAIL IF: true

AC-02: [REGRESSION] authenticated + service_role behalten EXECUTE
  VERIFY: has_function_privilege('authenticated',...) , has_function_privilege('service_role',...)
  EXPECTED: beide true
  FAIL IF: einer false

AC-03: [SECURITY] non-admin authenticated → RAISE not_club_admin_or_platform_admin (force-rollback, JWT-sub-Impersonation)
  VERIFY: BEGIN; set_config('request.jwt.claim.sub', <non-admin-uid>, true); SELECT get_club_dashboard_stats_v2(<club>); ROLLBACK;
  EXPECTED: ERROR not_club_admin_or_platform_admin
  FAIL IF: gibt Daten zurück

AC-04: [HAPPY] club-admin des Clubs → Stats zurück (force-rollback)
  VERIFY: BEGIN; set_config('request.jwt.claim.sub', <club_admin-uid>, true); SELECT ...(<sein-club>); ROLLBACK;
  EXPECTED: jsonb mit ipo_revenue_cents/total_fans/top_fans (kein Error)
  FAIL IF: RAISE

AC-05: [HAPPY] platform-admin (top_role='Admin') → Stats für fremden Club (force-rollback)
  VERIFY: BEGIN; set_config('request.jwt.claim.sub', <platform-admin-uid>, true); SELECT ...(<beliebiger-club>); ROLLBACK;
  EXPECTED: jsonb-Stats (kein Error)
  FAIL IF: RAISE

AC-06: [REGRESSION] Body byte-identisch außer Guard (PATCH-AUDIT) + tsc + club.test
  VERIFY: pg_get_functiondef ILIKE Body-Anker (IPO-revenue/total_fans/top_fans-SELECTs unverändert); npx tsc --noEmit; npx vitest run club.test.ts db-invariants.test.ts
  EXPECTED: Body-Logik unverändert; tsc 0; club.test 79/79; db-invariants unverändert 3
  FAIL IF: Body-Logik gedriftet ODER neue Test-Failure
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Guard | anon (uid NULL) | REVOKE | kein EXECUTE (PostgREST 401/403) | REVOKE anon |
| 2 | Guard | authenticated non-admin | uid gesetzt, kein club_admin/Admin | RAISE | Guard EXISTS-Checks |
| 3 | Guard | platform-admin fremder Club | top_role='Admin' | erlaubt | top_role-OR-Branch (S347) |
| 4 | Guard | club-admin eigener Club | club_admins-Row | erlaubt | club_admins-EXISTS |
| 5 | Body | Club ohne Fans/IPO | 0 rows | `{ipo_revenue_cents:0,total_fans:0,top_fans:[]}` | COALESCE im Body (unverändert) |
| 6 | service_role | Cron (uid NULL) | kein Caller existiert | RAISE (kein NULL-Bypass) | Sibling-konform; kein Cron-Caller verifiziert |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
npx vitest run src/lib/services/__tests__/club.test.ts src/lib/__tests__/db-invariants.test.ts
# Live: pg_get_functiondef + has_function_privilege(anon/authenticated/service_role)
# Guard-Smoke: BEGIN; SET LOCAL + set_config('request.jwt.claim.sub',...); SELECT v2(...); ROLLBACK  (S369)
```

## 9. Open-Questions

**Pflicht-Klärung:** keine (CEO-Go „Komplett" liegt vor; Guard-Muster = verifizierte Sibling-Kopie).
**Autonom-Zone (CTO):** Migration-Filename/Timestamp, exakte Guard-Platzierung.
**Nicht-Autonom (war CEO, erledigt):** Scope = REVOKE anon + Admin-Guard (Anil „Komplett").

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Security (Body-Guard + Grant) | pre-apply force-rollback-Smoke (3 Rollen: non-admin RAISE / club-admin ok / platform-admin ok) + post-apply grants (anon=false, auth/service=true) + PATCH-AUDIT Body-Anker + tsc + club.test → `worklog/proofs/462-d35-admin-guard.txt` |

## 11. Scope-Out

- Andere admin-RPCs ohne Guard (falls weitere Sibling-Ausreißer) = separater W0-Sweep (nicht dieser Slice; v2 war der von D-35 benannte).
- v2 `STABLE`/`pg_catalog`-search_path-Angleichung an Siblings = kosmetisch, Scope-Out (Body byte-minimal halten).
- D-26 Freitext-club-Pfad = eigener Slice.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: 0 TS-Consumer-Change, RPC-intern) → BUILD (1 Migration) → PROVE (force-rollback 3 Rollen + post-apply) → REVIEW (reviewer-Agent, §3) → CEO-Apply → LOG
```

## 13. Pre-Mortem (kurz)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Guard bricht legit Admin-Tab | LOW | mittel | Siblings mit identischem Guard laufen schon in denselben Tabs; AC-04/05 | Post-Deploy AdminOverview/RevenueTab-Render |
| 2 | PATCH-AUDIT-Drift (Body still verändert) | LOW | mittel | Body byte-treu aus live functiondef, nur Guard additiv; AC-06 Body-Anker | force-rollback Daten-Vergleich |
| 3 | service_role-Pfad gebrochen | LOW | niedrig | kein Cron/service_role-Caller verifiziert; service_role behält EXECUTE | AC-02 |
| 4 | RAISE-Error leakt i18n-Key roh an User | LOW | niedrig | nur Angreifer-Direktcall trifft RAISE; Admin-Tabs nie | n/a (kein legit UI-Pfad) |

---

## Compliance-Check
- Kein user-facing Wording-Change (RPC-intern). RAISE-String `not_club_admin_or_platform_admin` = interner Key, kein UI-Leak (Admin-Tabs treffen ihn nie). business.md: Fix REDUZIERT Finanz-Signal-Leak (compliance-positiv).

## Open Risiko (kurz, ehrlich)
Byte-treuer Guard-Insert aus verifiziertem Sibling-Muster + REVOKE anon. Restrisiko: ein übersehener legit non-admin-Caller — durch Konsumenten-Grep (nur 2 admin-gated Tabs) + Sibling-Präzedenz ausgeschlossen; force-rollback 3-Rollen-Smoke + Post-Deploy-Render fangen Rest.
