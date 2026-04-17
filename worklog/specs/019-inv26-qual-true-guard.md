# Slice 019 — INV-26: qual='true' Regression-Guard auf sensiblen Tabellen

## Ziel

Verhindert die AUTH-08-Klasse (Slice 014): RLS-Policy mit `qual='true'` auf einer sensiblen Tabelle erlaubt jedem authenticated User alle Rows zu lesen. Ein neuer invariant-Test (INV-26) feuert, wenn jemand qual=true auf einer Whitelist-Tabelle re-aktiviert.

## Hintergrund

Slice 014 fand `holdings_select_all_authenticated (qual='true')` als Portfolio-Leak. Fix war ein explizites `USING (auth.uid() = user_id OR admin-check)`. `common-errors.md` hat das Pattern dokumentiert, aber KEIN Regression-Guard existierte — INV-19 prueft nur "≥1 Policy", INV-20 prueft cmd-coverage, aber keiner prueft `qual`-Inhalt.

Die CTO-Residual-Liste (Session 2 Briefing) listet das als: "INV-neu: 'qual != true auf sensiblen Tabellen' — Regression-Guard dass AUTH-08-Klasse nicht wiederkehrt. Whitelist-based."

## Betroffene Files

| File | Aenderung |
|------|-----------|
| `supabase/migrations/20260417060000_audit_helper_rls_qual.sql` | **NEW** — `get_rls_policy_quals(p_tables text[])` Audit-RPC |
| `src/lib/__tests__/db-invariants.test.ts` | Neuer `INV-26`-Test mit sensibler Tabellen-Whitelist |

## Konkret

### 1. Neue Audit-RPC

```sql
CREATE OR REPLACE FUNCTION public.get_rls_policy_quals(p_tables text[])
RETURNS TABLE(
  table_name text,
  policy_name text,
  cmd text,
  qual text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    c.relname::text AS table_name,
    p.polname::text AS policy_name,
    CASE p.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
    END::text AS cmd,
    pg_get_expr(p.polqual, p.polrelid)::text AS qual
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY(p_tables);
$$;

REVOKE EXECUTE ON FUNCTION public.get_rls_policy_quals(text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rls_policy_quals(text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_rls_policy_quals(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rls_policy_quals(text[]) TO service_role;
```

Analog zu `get_rls_policy_coverage` (Slice 004) und `get_auth_guard_audit` (Slice 005). AR-44 REVOKE/GRANT-Template angewendet.

### 2. INV-26 Test

```ts
it('INV-26: sensitive tables do not have RLS policies with qual=true (portfolio-leak regression)', async () => {
  const SENSITIVE_TABLES = [
    'holdings',             // portfolio-privacy
    'transactions',         // financial-history-privacy
    'ticket_transactions',  // ticket-history-privacy
    'activity_log',         // social-graph-privacy
    'user_stats',           // performance-privacy
    'wallets',              // balance-privacy
    'orders',               // trading-strategy-privacy
    'offers',               // trading-strategy-privacy
  ];

  const { data, error } = await sb.rpc('get_rls_policy_quals', { p_tables: SENSITIVE_TABLES });
  expect(error, `RPC failed: ${error?.message}`).toBeNull();

  const rows = (data ?? []) as Array<{ table_name: string; policy_name: string; cmd: string; qual: string | null }>;

  // qual='true' ist permissive fuer jeden authenticated User. Admin-branches gehen ueber
  // 'auth.uid() = user_id OR EXISTS(admin-check)' — qual != 'true'.
  const violations = rows
    .filter((r) => r.qual === 'true')
    .map((r) => `${r.table_name}.${r.policy_name} (${r.cmd}) has qual='true' — permissive for all authenticated users`);

  if (violations.length === 0) {
    console.log(
      `[INV-26] checked ${SENSITIVE_TABLES.length} sensitive tables, ${rows.length} policies, 0 qual=true violations`
    );
  }

  expect(violations, violations.join('\n')).toHaveLength(0);
}, 30_000);
```

## Acceptance Criteria

1. Migration `20260417060000_audit_helper_rls_qual.sql` erfolgreich appliziert.
2. RPC `public.get_rls_policy_quals(p_tables text[])` existiert, REVOKE anon + GRANT authenticated.
3. INV-26 Test vorhanden im db-invariants.test.ts.
4. INV-26 gruen gegen aktuelle DB (AUTH-08 bereits gefixt in Slice 014 — keine qual=true auf sensiblen Tabellen erwartet).
5. `npx tsc --noEmit` clean.
6. `npx vitest run src/lib/__tests__/db-invariants.test.ts` gruen (alle INV-01 bis INV-26).

## Edge Cases

1. **Tabelle existiert nicht** — RPC returned 0 Rows, Test gruen (keine Violations). Sinnvoll: Whitelist kann Tabellen enthalten die spaeter kommen.
2. **Policy qual ist NULL** (permissive=true ohne explizite USING) — `pg_get_expr` returned NULL. Filter `r.qual === 'true'` matched nicht — technisch OK weil NULL != 'true'. Allerdings: Policy ohne USING = permissive fuer alle. Das ist der gleiche Exploit. Erweiter Filter auf `r.qual === 'true' || r.qual === null`. **Entscheide: ja, zweiten Check adden.**
3. **INSERT-only Policy mit qual=true** — INSERT-qual bezieht sich auf zu-insertierende Row, nicht SELECT. Trotzdem flag ich alle cmds, weil: INSERT mit qual=true erlaubt zu-inserieren-als-beliebiger-User-ID (wenn nicht via WITH CHECK zusaetzlich getestet). Same-Klasse-Bug. **Violations auf allen cmds (SELECT/INSERT/UPDATE/DELETE).**
4. **qual='(true)'** mit Klammern — `pg_get_expr` normalisiert meist auf 'true'. Falls nicht, muesste ich Parser nutzen. Scope-Out: Test auf exakten String-Match startet, wenn Drift kommt sehe ich im Fehler.
5. **ALL-cmd Policy qual=true** — cmd='ALL' ebenfalls gefangen.

Erweitere Test-Filter auf `(r.qual === 'true' || r.qual === null)` fuer Edge Case 2.

## Proof-Plan

- `worklog/proofs/019-migration.sql` — Migration Content
- `worklog/proofs/019-rpc-sanity.txt` — `SELECT * FROM public.get_rls_policy_quals(ARRAY['holdings','transactions',...])` Output
- `worklog/proofs/019-tsc.txt` — clean
- `worklog/proofs/019-tests.txt` — db-invariants Run inkl. INV-26 gruen
- `worklog/proofs/019-diff.txt` — git diff db-invariants.test.ts

## Scope-Out

- Anpassung der Whitelist ueber Zeit — weitere sensitive tables (z.B. `user_follows`, `notifications`) koennen im Follow-up adden werden.
- qual-Parsing fuer komplexere Bypasses (z.B. `true OR user_id IS NOT NULL`) — Heuristic-only. Scope: offensichtlich `'true'`/`NULL` abfangen.
- INSERT-WITH-CHECK-true-Pattern — INSERT WITH CHECK `true` ist ebenfalls Exploit. `with_check` waere weiteres Feld. Scope-out (andere RPC-Signature, mehr Logik).

## Slice-Klassifikation

- **Groesse:** S-M (1 Migration + 1 RPC + 1 Test, ~60 Zeilen SQL + ~35 Zeilen TS)
- **CEO-Scope:** CTO-autonom — Pattern etabliert via Slice 004 (`get_rls_policy_coverage`) und Slice 005 (`get_auth_guard_audit`). Neue RPC ist SECURITY INVOKER read-only auf pg_policy, keine Grants auf existierende Tabellen.
- **Risiko:** Niedrig — Test validiert aktuellen gruen-Zustand, Regression-Guard.
