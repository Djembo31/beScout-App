# Slice 461 — D-12 Dead-RPC GC: DROP get_club_dashboard_stats(text) v1

**Status:** SPEC · **Größe:** XS · **Slice-Type:** Migration (Security/Dead-GC, §3) · **Scope:** CEO-approved (Anil 2026-06-29 „mach D-12") · **Datum:** 2026-06-29

> Security-DROP (§3) + §0-Subtraktion → trotz XS volle Spur: Spec + pre-drop force-rollback-Smoke + post-drop-Verify + Reviewer-Agent + CEO-Apply.

---

## 1. Problem Statement

`get_club_dashboard_stats(p_club_name text)` (v1, by name) ist eine **tote** SECURITY-DEFINER-RPC mit **anon-EXECUTE**, die RLS-umgehend pro Fan `user_id` + `holdings_count` (Finanz-Signal: wie viele Cards ein User hält) + `total_score` zurückgibt — **per `club_name` von jedem ausgeloggten Besucher enumerierbar.** Der live Pfad ist `get_club_dashboard_stats_v2(p_club_id uuid)` (`club.ts:503`).

**Evidence (live D87 + Grep, read-only):**
- 0 Caller: `prosrc`-Scan über alle DB-Funktionen leer, kein pg_cron, Grep `src/`/`supabase/`/`scripts/` = nur v2 + Docs (kein v1-Code-Caller). Unabhängige Vorab-Bestätigung: `worklog/audits/2026-06-14/string-to-uuid-map.md:45` („Dead-RPC, 0 Caller, Drop-Kandidat").
- v1-Body liest `players WHERE club = p_club_name` (toter Freitext-Pfad, D-26-Klasse) + `holdings`/`user_stats` direkt → SECDEF-RLS-Bypass.
- `dependents_blocking = 0` (pg_depend) → kein View/Rule/Trigger hängt dran → DROP ohne CASCADE.

**Wer/wie oft:** anon-erreichbarer Per-User-Finanz-Signal-Leak (kein aktiver Drain, aber Exposure). DROP schließt **Exposure + v1/v2-Duplikat in EINEM Schnitt** (Disease-Register D-12, §2-Triage Item 1).

## 2. Lösungs-Design (Architektur)

Reine Subtraktion (§0): `DROP FUNCTION IF EXISTS public.get_club_dashboard_stats(text);`. v2 (uuid) ist + bleibt der einzige Pfad. Kein Code-/Service-/i18n-Change (v1 hat 0 Caller).

```sql
DROP FUNCTION IF EXISTS public.get_club_dashboard_stats(text);
```

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260629220000_slice_461_drop_dashboard_stats_v1.sql` | NEU | DROP-Statement, via `apply_migration` |

**Grep-verifiziert (kein Code-Consumer von v1):** nur `get_club_dashboard_stats_v2` wird gerufen (`club.ts:503`, `club.test.ts`). Plain `get_club_dashboard_stats(text)` = 0 App-Caller.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File / Quelle | Zweck | Zu prüfen |
|------|-------|-----------|
| Live `pg_get_functiondef('public.get_club_dashboard_stats(text)')` (D87) | v1-Body + Exposure | **ERLEDIGT** — liest holdings/user_stats RLS-umgehend, gibt user_id/holdings_count zurück, anon-granted |
| Live pg_proc-Scan + Grep src/supabase/scripts | Caller-Enum (Completeness, S453) | **ERLEDIGT** — 0 DB-/App-/Cron-Caller für v1; v2 lebt (club.ts:503) |
| Live pg_depend (refobjid=v1) | Dependency vor DROP | **ERLEDIGT** — 0 dependents → kein CASCADE |
| `worklog/log.md` 457/458 (Dead-GC-Slices) | DROP-Smoke-Muster | force-rollback (DROP im Tx, Survivor-Gegenprobe, RAISE-Rollback) + post-apply-Verify |
| `.claude/rules/database.md` „Migration Workflow" | apply_migration-Pflicht | **NIE db push**; verify via pg_proc |

## 5. Pattern-References

- Disease-Register **D-12** (§2-Triage Item 1 + §3-Tabelle) — exakt dieser DROP.
- `worklog/log.md` 457/458 — Dead-Feature-GC-Muster (Caller-Enum + force-rollback-Smoke + Survivor-Gegenprobe).
- errors-db **S453** (Writer/Caller-Enum statt File-Grep) + **S400** (Enum/Wert ENTFERNEN: CHECK-Flächen) — hier nur Caller-Enum relevant, kein CHECK betroffen.
- `reference_migration_workflow.md` — `apply_migration`, kein `db push`.
- §0 Schnitt-Regel / Slice-Type „Konsolidierung" (workflow.md §0) — Subtraktion als erstklassiger Zug.

## 6. Acceptance Criteria

```
AC-01: [HAPPY] v1 (text) ist nach DROP weg
  VERIFY: SELECT count(*) FROM pg_proc WHERE proname='get_club_dashboard_stats'
          AND pg_get_function_identity_arguments(oid)='p_club_name text';
  EXPECTED: 0
  FAIL IF: > 0

AC-02: [REGRESSION] v2 (uuid) lebt unverändert
  VERIFY: SELECT count(*) AS n, has_function_privilege('authenticated',
            'public.get_club_dashboard_stats_v2(uuid)','EXECUTE') AS auth_exec
          FROM pg_proc WHERE proname='get_club_dashboard_stats_v2';
  EXPECTED: n=1, auth_exec=true
  FAIL IF: n!=1 ODER v2 fehlt

AC-03: [REGRESSION] App-Pfad funktional unberührt (v2-Call live)
  VERIFY: BEGIN; SELECT get_club_dashboard_stats_v2('<seed-club-uuid>'); ROLLBACK;
  EXPECTED: jsonb mit total_fans/top_fans (kein Error)
  FAIL IF: permission denied / function does not exist

AC-04: [REGRESSION] tsc + db-invariants keine neue Failure
  VERIFY: npx tsc --noEmit; npx vitest run src/lib/__tests__/db-invariants.test.ts
  EXPECTED: tsc 0; db-invariants Failure-Menge UNVERÄNDERT (3 pre-existing INV-19/32/33, keine neue)
  FAIL IF: neue Failure ODER tsc-Fehler

AC-05: [REGRESSION] club-Service-Tests grün (v2-Pfad)
  VERIFY: npx vitest run src/lib/services/__tests__/club.test.ts
  EXPECTED: grün
  FAIL IF: rot
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | DROP | v1 hat Dependent (View/Rule) | pg_depend=0 (verifiziert) | clean DROP | `IF EXISTS` + Dependency-Check vorab |
| 2 | DROP | falsche Signatur (uuid statt text getroffen) | 2 distinkte Namen (v1=text, v2=uuid) | nur `(text)` fällt | exakte arg-type `text` im DROP; v2 heißt anders (`_v2`) |
| 3 | Idempotenz | Migration 2× | `IF EXISTS` | no-op 2. Mal | DROP IF EXISTS |
| 4 | Greenfield | Replay create→drop | v1 wird erst angelegt, dann gedroppt | harmlos (kurz existent, dann weg) | Standard Dead-GC-Muster (457/458) |
| 5 | Caller übersehen | versteckter v1-Aufruf | 0 (Enum + Grep) | n/a | Caller-Enum (pg_proc+cron+grep) = Completeness |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
npx vitest run src/lib/__tests__/db-invariants.test.ts src/lib/services/__tests__/club.test.ts
grep -rn "get_club_dashboard_stats\b" src/ supabase/ scripts/ | grep -v "_v2"   # nur v1-Refs (erwartet: 0 Code)
# Live: SELECT proname, args FROM pg_proc WHERE proname LIKE 'get_club_dashboard_stats%';  (erwartet: nur _v2)
```

## 9. Open-Questions

**Pflicht-Klärung:** — keine (CEO-Go „mach D-12" liegt vor; Caller/Dependency live verifiziert).
**Autonom-Zone (CTO):** Migration-Filename/Timestamp, DROP-Statement-Form.
**Nicht-Autonom (war CEO, erledigt):** DROP vs REVOKE-only — D-12 ist explizit der DROP-Item (Exposure + Duplikat in einem Schnitt). Anil = DROP.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Security/Dead-GC (DROP) | pre-drop force-rollback-Smoke (DROP im Tx erfolgreich, v2-Survivor-Gegenprobe, RAISE-Rollback) + post-apply pg_proc-Listing (v1 weg, v2 da) + has_function_privilege v2 + AC-03/04/05-Outputs → `worklog/proofs/461-d12-drop.txt` |

## 11. Scope-Out

- **v2 anon-Grant-Frage** (öffentliches Leaderboard gewollt? → behalten/REVOKE) = separater W0-Hygiene-Item (disease-register §2 ⚠️), NICHT dieser Slice (v2 unberührt).
- **D-26** (toter `players.club`-Freitext-Pfad, den v1 nutzte) = eigener Konsistenz-Slice (W5).
- **27 anon-SECDEF Hygiene-Batch + audit-RPC-REVOKEs** = W0-Rest.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: 0 Consumer, reiner DROP einer toten RPC) → BUILD (1 Migration) → PROVE (force-rollback + post-apply) → REVIEW (reviewer-Agent, §3) → CEO-Apply → LOG
```

## 13. Pre-Mortem (optional, XS — kurz)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | übersehener v1-Caller bricht nach DROP | LOW | mittel | Caller-Enum (pg_proc+cron+grep src/supabase/scripts) = 0; Audit 2026-06-14 bestätigt | AC-03/05 + Post-Deploy-Render Club-Dashboard |
| 2 | DROP trifft v2 versehentlich | LOW | hoch | exakte Signatur `(text)`; v2 = distinkter Name `_v2(uuid)` | AC-02 |
| 3 | Dependent-Objekt blockt DROP | LOW | niedrig | pg_depend=0 verifiziert; `IF EXISTS` | apply_migration-Fehler = harter Rollback |

---

## Open Risiko (kurz, ehrlich)

Reiner DROP einer toten, 0-Caller-, 0-Dependent-RPC — minimal-invasiv, idempotent. Einziges Restrisiko: ein nicht-greppbarer versteckter v1-Caller — durch 3-Wege-Enum (pg_proc + pg_cron + repo-Grep) + unabhängigen Vorab-Audit praktisch ausgeschlossen; force-rollback-Smoke + Post-Deploy-Club-Dashboard-Render fangen Rest.
