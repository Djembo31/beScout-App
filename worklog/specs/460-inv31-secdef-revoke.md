# Slice 460 — INV-31 Security-Fix: REVOKE no_guard SECDEF-RPCs

**Status:** SPEC · **Größe:** XS · **Slice-Type:** Migration · **Scope:** CEO-approved (Anil 2026-06-29, §3) · **Datum:** 2026-06-29

> Security-Slice (§3) → trotz XS volle Spur: Spec + force-rollback-Proof + Reviewer-Agent + CEO-Apply. CEO-Approval liegt vor (Anil-Wahl „INV-31 jetzt (REVOKE-only)").

---

## 1. Problem Statement

`db-invariants.test.ts` INV-31 (live rot) flaggt **2 SECURITY-DEFINER-RPCs**, die an `authenticated` granted sind, einen `p_user_id`-Parameter nehmen, aber **keinen `auth.uid()`-Guard** haben (`guard_type='no_guard'`, `grant_status='authenticated'`, `allowlist_reason=null` → `needs_fix=true`). Exploit-Klasse: ein eingeloggter User kann eine **fremde `p_user_id`** an die RPC übergeben.

**Live verifiziert (DB `skzjfhvgccaeplydsunz`, 2026-06-29 read-only):**
- **`refund_wildcards_on_leave(p_user_id, p_event_id)`** — **toter Orphan** (0 Caller in `src/`, `supabase/`, `scripts/`, 0 DB-Caller per `pg_proc.prosrc`-Scan). Granted `{authenticated, service_role}`. Ruft `earn_wildcards(p_user_id, count, 'event_refund', …)`. `earn_wildcards` mintet Wildcards (Wert-Item) und hat **keine Idempotenz** (`balance += amount` je Call). → ein authentifizierter User kann die RPC via PostgREST direkt + **wiederholt für die eigene ID** aufrufen → Wildcard-Self-Farming, solange das eigene Lineup `wildcard_slots` hat. Cross-User ist durch den **inneren** `earn_wildcards`-Guard (`auth.uid() IS DISTINCT FROM p_user_id → reject`) bereits blockiert.
- **`calculate_fan_rank(p_user_id, p_club_id)`** — live (Caller: Cron `gameweek-sync` als service_role; DB-Trigger `trg_recalc_fan_rank_on_follow`; DB-Batch `batch_recalculate_fan_ranks`). Der Client-Service `recalculateFanRank` ist **tot** (kein Production-Caller, nur Tests). Spoof einer fremden `p_user_id` → Info-Leak (gibt `dpc_score`/`abo_score`-Komponenten = Holdings-Count + Abo-Tier eines Fremd-Users zurück) + selbstkorrigierender `fan_rankings`-UPSERT (keine Korruption).

**Wer/wie oft:** Kein aktiver Drain, kein Cross-User-Schaden (blockiert), ein Surface tot. P1-Security (§3-Verletzung „SECDEF ohne Guard auf Geld-Plattform"), nicht P0.

## 2. Lösungs-Design (Architektur)

**Minimaler, body-freier Fix: REVOKE statt Body-Rewrite.** Beide Funktionen haben **keinen legitimen direkten `authenticated`-Caller** — daher schließt ein reiner Grant-Entzug beide Lecks, ohne den 5k-Zeichen-`calculate_fan_rank`-Body anzufassen (= null PATCH-AUDIT-Risiko, S156).

```sql
REVOKE EXECUTE ON FUNCTION public.calculate_fan_rank(uuid, uuid)        FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refund_wildcards_on_leave(uuid, uuid) FROM authenticated, anon, PUBLIC;
```

**Caller-Sicherheit (alle live verifiziert):**
| Caller | Kontext | nach REVOKE |
|---|---|---|
| Cron `gameweek-sync:1594` | `supabaseAdmin` = service_role | ✓ läuft (service_role behält EXECUTE) |
| `batch_recalculate_fan_ranks` | SECDEF, ACL `{service_role}` only, ruft `calculate_fan_rank` als Owner | ✓ läuft (Owner-Kontext, grant-unabhängig) |
| `trg_recalc_fan_rank_on_follow` | SECDEF-Trigger, ruft `calculate_fan_rank` als Owner | ✓ läuft (Owner-Kontext) |
| `recalculateFanRank` Client-Service | tot (0 Production-Caller) | — (kein Verlust) |
| `refund_wildcards_on_leave` | 0 Caller überall | — (kein Verlust) |
| Direkt-Client mit fremder `p_user_id` | authenticated PostgREST | ✓ **blockiert** (Leak/Farm geschlossen) |

Nach REVOKE: `get_security_definer_user_param_audit()` liefert für beide `grant_status != 'authenticated'` → `needs_fix=false` → **INV-31 grün** (ohne `allowlist_reason`-Eintrag, ohne Body-Change).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260629210000_slice_460_inv31_revoke.sql` | NEU | REVOKE-Statements, via `apply_migration` |

**Grep-verifiziert (kein Code-Consumer):** `grep -rn "refund_wildcards_on_leave" src/ supabase/ scripts/` = 0; `recalculateFanRank` = nur Tests; `calculate_fan_rank` Client-Pfad = toter Service.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File / Quelle | Zweck | Zu prüfen |
|------|-------|-----------|
| Live `pg_get_functiondef('public.calculate_fan_rank(uuid,uuid)')` (D87) | Body-Wahrheit + aktuelle ACL | **ERLEDIGT** — UPSERT `fan_rankings`, kein Guard, ACL `{postgres,service_role,authenticated}` |
| Live `pg_get_functiondef('public.refund_wildcards_on_leave(uuid,uuid)')` (D87) | Body + Idempotenz + ACL | **ERLEDIGT** — ruft `earn_wildcards`, kein Guard; `earn_wildcards` hat inneren auth.uid()-Guard, keine Idempotenz |
| `.claude/rules/database.md` „SECURITY DEFINER + auth.uid()-Guard" (S005, INV-21) | Kanonisches Guard/REVOKE-Pattern | REVOKE FROM anon,authenticated; service_role behält — exakt das hier |
| `.claude/rules/database.md` „Migration-Template-Pflichten" (AR-44, S368c) | REVOKE-Semantik + ACL-Erhalt bei CREATE-OR-REPLACE | Wir machen KEIN CREATE OR REPLACE → reines REVOKE, ACL-Verify per `proacl` post-apply |
| `src/lib/__tests__/db-invariants.test.ts` INV-31 (Z.1505) | Test-Regel | `needs_fix = no_guard AND grant_status='authenticated' AND reason IS NULL` → REVOKE kippt `grant_status` |

## 5. Pattern-References

- `database.md` S005 / INV-21 — kanonisches SECDEF-Guard/REVOKE-Pattern (`REVOKE FROM anon,authenticated; service_role behält`). Genau dieser Slice.
- `database.md` S368c (AR-44) — REVOKE entzieht Grant ohne ACL der service_role anzutasten; Verify per `proacl::text`.
- `reference_migration_workflow.md` — **NIE `db push`**, nur `mcp__supabase__apply_migration`.
- `testing.md` „force-rollback / BEGIN…ROLLBACK" — Smoke-Pattern für Live-Verify ohne Persistenz (hier zusätzlich: REVOKE ist Grant-Change, Verify via `has_function_privilege`).
- `decisions.md` D87 — Live-`functiondef` VOR Spec (erledigt).

## 6. Acceptance Criteria

```
AC-01: [SECURITY] authenticated hat nach REVOKE kein EXECUTE auf beide Funktionen
  VERIFY: SELECT has_function_privilege('authenticated','public.calculate_fan_rank(uuid,uuid)','EXECUTE') AS cfr,
                 has_function_privilege('authenticated','public.refund_wildcards_on_leave(uuid,uuid)','EXECUTE') AS rwl;
  EXPECTED: cfr=false, rwl=false
  FAIL IF: einer von beiden = true

AC-02: [REGRESSION] service_role behält EXECUTE auf beide (Cron/Batch/Trigger unberührt)
  VERIFY: SELECT has_function_privilege('service_role','public.calculate_fan_rank(uuid,uuid)','EXECUTE') AS cfr,
                 has_function_privilege('service_role','public.refund_wildcards_on_leave(uuid,uuid)','EXECUTE') AS rwl;
  EXPECTED: cfr=true, rwl=true
  FAIL IF: einer von beiden = false

AC-03: [HAPPY] INV-31 grün — get_security_definer_user_param_audit liefert 0 needs_fix
  VERIFY: SELECT count(*) FROM jsonb_array_elements(get_security_definer_user_param_audit()) e WHERE (e->>'needs_fix')::bool;
  EXPECTED: 0
  FAIL IF: > 0

AC-04: [REGRESSION] db-invariants.test.ts INV-31 PASS, übrige Failure-Menge unverändert (INV-19/32/33 bleiben pre-existing)
  VERIFY: npx vitest run src/lib/__tests__/db-invariants.test.ts
  EXPECTED: INV-31 grün; failed 4→3 (INV-19/32/33 unverändert, KEINE neue Failure)
  FAIL IF: neue Test-Failure ODER INV-31 weiter rot

AC-05: [REGRESSION] calculate_fan_rank funktional unverändert für legitimen Caller (Trigger-Pfad)
  VERIFY: BEGIN; SET LOCAL ROLE postgres; SELECT calculate_fan_rank('<seed-user>','<seed-club>'); ROLLBACK;
  EXPECTED: jsonb {ok:true, rank_tier, total_score, components} (Owner-Kontext ruft erfolgreich)
  FAIL IF: permission denied / Exception
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | REVOKE | Funktion existiert mehrfach (Overload) | nur eine Signatur `(uuid,uuid)` je Name (verifiziert) | exakte Signatur targeten | `IF EXISTS`-Guard + exakte arg-types im REVOKE |
| 2 | Trigger-Pfad | User folgt Club nach REVOKE | `trg_recalc_fan_rank_on_follow` (SECDEF) ruft calculate_fan_rank | läuft (Owner-Kontext) | SECDEF-Owner braucht kein authenticated-Grant; + Trigger hat `EXCEPTION WHEN OTHERS→NULL` |
| 3 | Cron-Pfad | nächster gameweek-sync nach REVOKE | service_role behält EXECUTE | läuft | AC-02 deckt es |
| 4 | Idempotenz | Migration 2× applied | reines REVOKE | no-op beim 2. Mal (REVOKE auf bereits-revoked = harmlos) | REVOKE ist idempotent |
| 5 | anon | ausgeloggter Besucher ruft RPC | war nie sinnvoll | blockiert | REVOKE FROM anon, PUBLIC mit drin |

## 8. Self-Verification Commands

```bash
# Pflicht:
npx tsc --noEmit
npx vitest run src/lib/__tests__/db-invariants.test.ts

# Grant-Verify (live, read-only):
# SELECT proname, proacl::text FROM pg_proc WHERE proname IN ('calculate_fan_rank','refund_wildcards_on_leave');
# SELECT has_function_privilege('authenticated', oid, 'EXECUTE') ...  (AC-01/02)

# Caller-Re-Verify (kein neuer Caller seit Recon):
grep -rn "refund_wildcards_on_leave\|recalculateFanRank" src/ | grep -v __tests__
```

## 9. Open-Questions

**Pflicht-Klärung:** — keine (CEO-Approval „REVOKE-only" liegt vor; Caller-Sicherheit live verifiziert).

**Autonom-Zone (CTO):** Migration-Filename/Timestamp, REVOKE-Statement-Form (mit/ohne `IF EXISTS`-Pre-Check), Proof-Query-Form.

**Nicht-Autonom (war CEO, erledigt):** REVOKE vs Guard vs DROP — Anil = REVOKE-only. DROP von `refund_wildcards_on_leave` (toter Orphan, §0-Schnitt-Regel-sauberer) = **bewusst Scope-Out** (REVOKE schließt das Leck; DROP = separater Dead-GC-Entscheid, behält Option für künftige Leave-Refund-Verdrahtung).

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Security (Grant-Change) | `proacl` + `has_function_privilege`-Listing vor/nach + `get_security_definer_user_param_audit`-needs_fix-Count + vitest-INV-31-Output → `worklog/proofs/460-inv31-revoke.txt` |

Plus: AC-05 force-rollback-Smoke (Owner-Call erfolgreich) als Regressions-Beleg.

## 11. Scope-Out

- **DROP `refund_wildcards_on_leave`** (toter Orphan) → eigener Dead-GC-Entscheid (CEO); REVOKE schließt das Leck jetzt, DROP behält Verdrahtungs-Option. Tracking: disease-register (kein neuer Eintrag nötig — Funktion bleibt, nur grant-dicht).
- **Übrige 27 anon-SECDEF + D-12 + audit-RPC-REVOKEs + Hygiene-Batch** → W0-Rest, separate Slices (disease-register §2).
- **INV-19 / INV-32 / INV-33** (pre-existing rot, P2 Test-Ehrlichkeit/Seed-Rauschen) → eigene XS-Slice, nicht dieser.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: reines Grant-REVOKE, 0 Consumer, kein Schema/Service/Type-Change) → BUILD (1 Migration) → REVIEW (reviewer-Agent, §3-Pflicht) → PROVE (Grant-Listing + vitest) → LOG
```

## 13. Pre-Mortem (optional, XS — kurz)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | REVOKE bricht einen übersehenen authenticated-Caller | LOW | mittel | repo-weiter Grep (0 Code-Caller), alle DB-Caller SECDEF/service_role verifiziert | AC-05 Smoke + Live-Render fan-rank nach Deploy |
| 2 | falsche Signatur → REVOKE no-op, INV-31 bleibt rot | LOW | niedrig | exakte arg-types `(uuid,uuid)` aus `pg_proc` | AC-01/03 fangen es sofort |
| 3 | service_role versehentlich mit-revoked → Cron bricht | LOW | hoch | REVOKE listet nur `authenticated, anon, PUBLIC` (service_role NICHT genannt) | AC-02 + nächster gameweek-sync |

---

## Open Risiko (kurz, ehrlich)

Reines Grant-REVOKE auf 2 Funktionen ohne legitimen direkten authenticated-Caller — minimal-invasiv, kein Body-Change, idempotent. Einziges Restrisiko: ein nicht-greppbar verdrahteter authenticated-Direktcaller (z.B. dynamischer RPC-Name) — durch repo-weiten Grep + verifizierte SECDEF/service_role-Caller-Kette praktisch ausgeschlossen; AC-05-Smoke + Post-Deploy-Render fangen Rest.
