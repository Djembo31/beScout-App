# Slice 341 — auto_close_expired_bounties als getrackte Migration (AR-43)

**Slice-Type:** Migration (Tracking-Hygiene)
**Größe:** XS
**CEO-Scope:** Nein — kein Behavior-Change (Body byte-identisch zur Live-Funktion), nur Greenfield-Tracking. CTO-autonom.

---

## 1. Problem-Statement (Evidence)

`auto_close_expired_bounties()` (SECURITY DEFINER, returns void, plpgsql) existiert **live**, wird aktiv vom Cron `src/app/api/cron/close-expired-bounties/route.ts` aufgerufen — steht aber in **KEINER** `supabase/migrations/*.sql` (grep verifiziert: 0 Treffer in migrations/). → `supabase db reset` / Greenfield-CI würde die Funktion verlieren = Cron bricht. AR-43 (Stub-Migration-Verbot / Tracking-Pflicht), Handoff-Stolperfalle #3.

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|-----------|
| `supabase/migrations/20260618220000_slice_341_track_auto_close_bounties.sql` | NEU | Live-Body 1:1 + AR-44 |

Kein Code/Service/Type/UI-Change.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. **`pg_get_functiondef('public.auto_close_expired_bounties()')` LIVE** — exakter Body als Baseline. ✅ gemacht.
2. grep `auto_close_expired_bounties` in `supabase/migrations/` — bestätigt 0 Treffer (Funktion ungetrackt). ✅ gemacht.
3. `src/app/api/cron/close-expired-bounties/route.ts` — Aufrufer (Cron); bestätigt Funktion ist aktiv genutzt, kein Dead-Code. ✅ (grep-Treffer).

## 6. Acceptance Criteria

- **AC-01** [HAPPY] Migration-Datei existiert mit vollständigem CREATE OR REPLACE-Body (kein Stub, ≥10 Zeilen). VERIFY: `wc -l` + grep Body-Marker.
- **AC-02** [HAPPY] Nach apply: Live-`pg_get_functiondef` byte-identisch zur Pre-Apply-Baseline (kein Behavior-Change). VERIFY: functiondef-Vergleich (locked_balance-Release-Loop + Close-UPDATE unverändert).
- **AC-03** [HAPPY] AR-44: anon=false, authenticated=true (wie vor Apply). VERIFY: has_function_privilege.

## 8. Self-Verification Commands

```bash
grep -c "auto_close_expired_bounties" supabase/migrations/20260618220000_*.sql   # > 0
# nach apply:
# pg_get_functiondef = Baseline; has_function_privilege anon=false/auth=true
```

## 10. Proof-Plan

- `pg_get_functiondef`-Dump nach Apply (= Baseline) + AR-44-Grant-Audit → `worklog/proofs/341-rpc.txt`.

## 11. Scope-Out
- Kein Behavior-/Logik-Change an der Funktion. Kein Cron-Schedule-Change.

## 12. Stage-Chain (geplant)
SPEC → IMPACT (skipped: 1 Funktion, kein Consumer-Change) → BUILD (Migration apply) → REVIEW (self-review, XS Tracking byte-identisch) → PROVE (functiondef + AR-44) → LOG.
