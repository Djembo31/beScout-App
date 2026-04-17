# Slice 035 — trg trade_refresh auth_uid_mismatch Investigation

**Groesse:** S · **CEO-Scope:** nein (Audit + ggf. trigger-fix) · **Typ:** P1 Investigation

## Ziel

Slice 032 Flow 5 zeigte in postgres-Logs:
```
WARNING  trg trade_refresh failed: auth_uid_mismatch: Nicht berechtigt
ERROR    new row for relation "transactions" violates check constraint
```

Beide Errors gleichzeitig. Slice 034 fixte den ERROR (transactions.type), Slice 038
fixte unrelated credit_tickets-Calls. **Aber: hat das die WARNING auch geloest, oder
ist trg trade_refresh weiterhin broken aber jetzt unsichtbar weil Buy nicht mehr
crasht?**

Investigation: Trigger-Body analysieren, postgres-Logs nach Slice 034/038 scannen,
entscheiden: Bug-Fix oder Auto-Resolved.

## Hypothesen

1. **Auto-Resolved:** Slice 032 Flow 5 buy crashte → trigger fired aber blockiert von
   AR-44 guard. Mit Slice 034 buy durch → trigger fired in AUTH-Context (auth.uid()
   gleich p_user_id) → guard bestanden → no warning.
2. **Trigger noch broken:** Trigger ruft RPC mit `p_user_id` aus NEW-Row, aber
   trigger laeuft als TABLE-OWNER (postgres role) → auth.uid() = NULL ≠ p_user_id.
   Slice 005 AR-44 fix `IS NOT NULL` skip wuerde greifen → guard skipped → no warning.
3. **Trigger laeuft nie:** Trigger ist deaktiviert oder fired auf andere Tabelle.

## Audit-Steps

1. Postgres-Logs der letzten 30 min scannen:
   ```sql
   SELECT event_message, timestamp FROM postgres_logs
   WHERE event_message ILIKE '%trade_refresh%' ORDER BY timestamp DESC LIMIT 20;
   ```
2. Trigger finden + Body extrahieren:
   ```sql
   SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname ILIKE '%trade_refresh%';
   ```
3. Trigger-Funktion-Body:
   ```sql
   SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname IN (..));
   ```
4. Live-Buy aus Slice 034/038/032b — Logs immernoch warnings? Oder weg?

## Acceptance Criteria

- Klare Diagnose: Auto-Resolved / Trigger-Bug / Pattern-Verstaendnis
- Falls Auto-Resolved: Doku in common-errors.md (warum AR-44 + DB-Trigger interact)
- Falls Bug: Migration-Fix mit `auth.uid() IS NULL`-Skip im Guard (analog Slice 005)

## Proof-Plan

- `worklog/proofs/035-postgres-logs.txt` — Log-Scan
- `worklog/proofs/035-trigger-body.txt` — Trigger-Body
- `worklog/proofs/035-verdict.md` — Diagnose + Aktion

## Scope-Out

- Andere Trigger (nur trade_refresh in Scope)
- Slice 036 (sync_event_statuses) separater Slice
