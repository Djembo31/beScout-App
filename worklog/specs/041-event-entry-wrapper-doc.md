# Slice 041 — event-entry RPCs Wrapper-Pattern Doku

**Groesse:** XS · **CEO-Scope:** nein (Doku) · **Typ:** P2 Doc-Fix

## Ziel

Slice 032b Flow 10 Test versuchte direkten Aufruf `rpc_lock_event_entry` von
authenticated client → 403 permission denied. Es gibt aber ein Wrapper
`lock_event_entry(p_event_id)` der `auth.uid()` injiziert und an `rpc_*` delegiert.
Doku fehlt — naechste Person stolpert wieder. Fix: COMMENTs auf alle 5 RPCs.

## Pattern (vorhanden, OK)

```
lock_event_entry(p_event_id)        ← public, GRANT authenticated
  └─ rpc_lock_event_entry(...)      ← service_role only (REVOKE authenticated)
unlock_event_entry(p_event_id)      ← public, GRANT authenticated
  └─ rpc_unlock_event_entry(...)
rpc_cancel_event_entries(...)       ← admin-only (kein wrapper)
```

Wrapper-Body:
```sql
CREATE OR REPLACE FUNCTION lock_event_entry(p_event_id uuid)
... SECURITY DEFINER ...
BEGIN
  RETURN public.rpc_lock_event_entry(p_event_id, auth.uid());
END;
```

Inner-RPC: kein direct-client-access, weil `p_user_id` als Param wuerde sonst
auth-to-other-user-Exploit ermoeglichen (analog AR-44 hardening).

## Aenderungen

1. Migration mit 5 COMMENT-Statements:
   - `rpc_lock_event_entry`: explain "service_role only, use lock_event_entry wrapper from clients"
   - `rpc_unlock_event_entry`: gleiche
   - `rpc_cancel_event_entries`: explain "admin/cron only — no public wrapper"
   - `lock_event_entry`: explain "client-facing wrapper, injects auth.uid()"
   - `unlock_event_entry`: gleich

2. common-errors.md ergaenzen mit Pattern-Snippet (Slice 035 hat bereits AR-44
   internal-helper-pattern dokumentiert — hier die wrapper-variante).

## Acceptance Criteria

1. `obj_description()` zeigt Doku-String fuer alle 5 RPCs
2. Migration apply success
3. Tests gruen (db-invariants weiter gruen)

## Proof-Plan

- `worklog/proofs/041-comments-applied.txt` — SELECT pg_proc verify

## Scope-Out

- Functional changes (kein bug, nur doku)
- Pattern auf andere RPCs (Slice 035 hat bereits andere variante dokumentiert)
