# 005 — Auth-Guard Hardening (A-02)

## Ziel
4 SECURITY DEFINER RPCs, die aktuell `authenticated`-Grant haben ohne `auth.uid() = p_user_id` Guard, werden gehaertet:
- `authenticated`-Grant wird revoked (Wrapper-Pattern etabliert oder nicht Client-callable)
- Defense-in-depth Body-Guard `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE` (skipped fuer service_role, enforced fuer authenticated)

INV-21: Meta-Test, dass jede SECURITY DEFINER RPC mit `p_user_id uuid` und `authenticated`-Grant auth.uid() im Body hat (Whitelist fuer explizit dokumentierte Ausnahmen).

## Klassifizierung
- **Slice-Groesse:** M (1 Migration, 1 Test, 4 RPCs)
- **Scope:** **CEO-approved** 2026-04-17 (Security-sensitive, authenticated-to-other-user exploit class, Wallet+Ticket-Deduction moeglich)
- **Referenz:** Walkthrough 04-blocker-a.md A-02; common-errors.md `SECURITY DEFINER RPC ohne REVOKE` (J4); P3-22 in phase3-db-audit.md

## Betroffene RPCs + Fix

| RPC | Aktuelle Grants | Fix | Begruendung |
|-----|-----------------|-----|-------------|
| `rpc_lock_event_entry(p_event_id, p_user_id)` | authenticated+service_role+postgres | REVOKE auth + add guard | Wrapper `lock_event_entry` rufts mit auth.uid() intern. REVOKE war in 20260321 vorgesehen aber drifted. |
| `refresh_airdrop_score(p_user_id)` | authenticated+service_role+postgres | REVOKE auth + add guard | Wrapper `refresh_my_airdrop_score()` ist das Interface laut `airdropScore.ts:97` |
| `check_analyst_decay(p_user_id)` | authenticated+service_role+postgres | REVOKE auth + add guard | Kein Client-Caller, nur Cron (service_role) |
| `renew_club_subscription(p_user_id, p_subscription_id)` | authenticated+service_role+postgres | REVOKE auth + add guard (gegen `v_sub.user_id` — p_user_id wird im Body ignoriert) | Auto-Renewal = Cron; Body nutzt `v_sub.user_id` |

## Acceptance Criteria
1. Migration `20260417000000_auth_guard_hardening.sql` angewandt.
2. Alle 4 RPCs: `authenticated`-Grant REVOKED, nur `service_role` + `postgres` behalten EXECUTE.
3. Alle 4 Bodies starten mit defensive Guard (NULL-skip + DISTINCT-reject).
4. Client-Wrapper funktionieren weiterhin: `lock_event_entry` und `refresh_my_airdrop_score` werden re-verifiziert durch Test-Calls bzw. Grep.
5. INV-21 grün: kein SECURITY DEFINER mit p_user_id + authenticated-Grant ohne auth.uid()-Referenz (Whitelist leer oder begruendet).
6. INV-19 + INV-20 bleiben gruen (RLS-Coverage nicht veraendert).
7. tsc clean.
8. Proofs:
   - `worklog/proofs/005-before-grants.txt` — snapshot von grants + rpc-bodies vor migration
   - `worklog/proofs/005-after-grants.txt` — snapshot nach migration
   - `worklog/proofs/005-inv21.txt` — Test-Output

## Edge Cases
1. **Cron-Job ruft RPCs direkt mit service_role** — auth.uid() = NULL → Guard skipped (`IS NOT NULL` check). OK.
2. **Wrapper ruft inner RPC mit `auth.uid()`** — auth.uid() = p_user_id per Definition → Guard passes. OK.
3. **Anon ruft RPCs direkt** — bereits REVOKED durch 20260416120000, bleibt.
4. **Authenticated ruft REVOKED RPCs direkt** — PostgREST gibt Permission-Denied 42501. Dann Client nutzt Wrapper.
5. **Body-Guard crashes während Bestandsdaten** — Guard ist einzelnes IF, kein DML. Wenn durch Cron gecalled: auth.uid()=NULL, Guard skipped. Kein Laufzeit-Risk.
6. **Test-User der einen REVOKED RPC direkt aufruft** — bekommt 42501 statt sub-silent-run. Bug sichtbar, nicht schlimmer als vorher.

## Proof-Plan
- Vor Migration: `SELECT grantee, privilege_type FROM information_schema.routine_privileges WHERE specific_name LIKE 'rpc_lock_event_entry%' OR ...` → dokumentiert aktuelle Lücke.
- Nach Migration: gleicher Query → authenticated weg.
- `pg_get_functiondef` nach Apply: Body enthält Guard-Pattern.
- INV-21 vitest run.

## Scope-Out
- **KEINE Body-Aenderung ausser Guard-Einfuegen.** Business-Logic bleibt identisch.
- **KEINE Wrapper-Aenderung.** `lock_event_entry` + `refresh_my_airdrop_score` unberuehrt.
- **KEINE neuen Wrapper fuer `check_analyst_decay` oder `renew_club_subscription`.** Beide sind Cron-Targets. Bei Bedarf spaeter wrappen.
- **KEINE weiteren RPCs.** Die anderen 16 der 20 "ohne auth.uid()" sind nur service_role — kein Exploit moeglich. Dokumentiert in log.md.

## Stages
- SPEC — dieses File
- IMPACT — inline in Spec (4 RPCs + Wrapper-Check)
- BUILD — Migration + INV-21
- PROVE — before/after grants + INV-21-Test
- LOG — Eintrag + Commit + common-errors.md Update
