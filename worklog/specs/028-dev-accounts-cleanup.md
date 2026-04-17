# Slice 028 — Dev-Accounts Cleanup (k_demirtas + kemal)

**Groesse:** XS · **CEO-Scope:** ja (destructive Money/Auth) · **Approval:** "einfach löschen, bei bedarf lege ich die neu an" — 2026-04-17

## Ziel

2 Legacy-Dev-Accounts komplett entfernen: `k_demirtas` (uid `eebba1ae-...`) + `kemal` (uid `1c02ad43-...`). Handles frei fuer Neu-Registrierung. Kein Soft-Delete, kein Anonymize.

## Vorher-Pruefung (live-DB)

**Row-Counts fuer beide Users, 23 NO-ACTION-FK-Tabellen gepruft:**

| Tabelle | Rows | FK on_delete |
|---------|------|--------------|
| `user_tickets` | **2** | NO ACTION (Blocker) |
| alle anderen 22 NO-ACTION-Tables | 0 | - |
| `wallets` | 2 | CASCADE (auto-clean) |
| `profiles` | 2 | CASCADE (auto-clean) |
| 30+ andere CASCADE-Tabellen | 0 | auto-clean |

Nur `user_tickets` blockte `DELETE FROM auth.users` (NO ACTION FK). 2 Rows waren welcome-ticket-grants.

## Ausgefuehrtes Cleanup

```sql
DELETE FROM user_tickets
WHERE user_id IN ('eebba1ae-...', '1c02ad43-...');

DELETE FROM auth.users
WHERE id IN ('eebba1ae-...', '1c02ad43-...');
-- CASCADE zu: profiles, wallets, + 30+ auto-clean Tabellen
```

## After-State (verified)

```json
{
  "auth_users": 0,
  "profiles": 0,
  "wallets": 0,
  "user_tickets": 0,
  "handles_free": true
}
```

**Handles `k_demirtas` + `kemal` wieder frei fuer Neu-Registrierung.**

## Keine DB-Migration

Einmaliger Cleanup — kein Migration-File committed. Der DELETE ist ephemeral, historisch dokumentiert via Proof-Files + Log.

## Proof-Plan

| Artefakt | Inhalt |
|----------|--------|
| `worklog/proofs/028-fk-audit.txt` | FK-Map auf auth.users — CASCADE vs NO ACTION Klassifikation |
| `worklog/proofs/028-before-counts.txt` | Row-Counts aller 23 NO-ACTION-Tables + CASCADE-Kontrolle |
| `worklog/proofs/028-delete-sql.txt` | Ausgefuehrte DELETE-Statements |
| `worklog/proofs/028-after-state.txt` | Post-Delete Verify: 0 rows in allen betroffenen Tables, handles_free=true |

## Scope-Out

- **Welcome-Bonus-Audit** — warum auth.users ohne transactions? Kein Follow-up noetig (dev-accounts waren lokaler Legacy-Drift).
- **Neu-Anlegen der Accounts** — Anil's Aufgabe "bei bedarf" via Supabase Auth Register.
