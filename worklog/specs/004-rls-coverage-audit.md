# 004 — RLS Policy Coverage Audit (A-03)

## Ziel
INV-19: Keine Tabelle mit RLS-enabled hat 0 Policies (ausser dokumentierter Whitelist fuer service-role-only Tabellen).
INV-20: Kritische Money-/Trading-Tabellen haben erwartete CRUD-Coverage.

Ziel ist ein Regression-Guard gegen die "RLS enabled aber keine Policy" Silent-Fail-Klasse (siehe `.claude/rules/common-errors.md` Session 255: holding_locks war komplett kaputt, weil RLS ohne Policies = Client kann nicht schreiben).

## Klassifizierung
- **Slice-Groesse:** S (1 Migration + Test-Addition)
- **Scope:** CTO-autonom (read-only Audit-Helper, keine Policy-Aenderung, keine Access-Logik)
- **Referenz:** Walkthrough 04-blocker-a.md A-03

## Betroffene Files
| Pfad | Aktion | Begruendung |
|------|--------|-------------|
| `supabase/migrations/20260416250000_audit_helper_rls_coverage.sql` | NEW (applied) | Helper-RPC `get_rls_policy_coverage()` |
| `src/lib/__tests__/db-invariants.test.ts` | EDIT — INV-19 + INV-20 | Bestehendes Harness |

## Acceptance Criteria
1. RPC `public.get_rls_policy_coverage()` returns rows mit (table_name, cmds, policy_count) fuer jede RLS-enabled public-Tabelle.
2. INV-19 gruen: Jede RLS-enabled Tabelle hat ≥1 Policy, ausser Whitelist:
   - `_rpc_body_snapshots` (interne Debug, nur server-role)
   - `club_external_ids`, `player_external_ids` (API-Football-Sync, nur server-role + API routes)
   - `mystery_box_config` (server-only, Client ruft RPC)
3. INV-20 gruen: Critical Money-/Trading-Tabellen haben erwartete CRUD-Coverage:
   - wallets: INSERT,SELECT
   - transactions: SELECT
   - orders: SELECT
   - trades: SELECT
   - holdings: SELECT
   - offers: INSERT,SELECT,UPDATE
   - ipos: SELECT
   - pbt_transactions, pbt_treasury: SELECT
4. Proof: `worklog/proofs/004-rls-coverage.txt` — INV-19 + INV-20 gruen.
5. tsc clean.

## Edge Cases
1. **Neue Tabelle mit RLS aber ohne Policy hinzugefuegt** — INV-19 fail sofort (ausser Whitelist erweitert). Gewollt.
2. **Whitelist-Tabelle bekommt neue Policy** — INV-19 bleibt gruen (Whitelist = "0 policies erlaubt", nicht "0 policies Pflicht").
3. **Critical-Table-Coverage erweitert** — z.B. wallets bekommt DELETE-Policy. INV-20 fail, Test updaten.
4. **Critical-Table-Coverage reduziert** — z.B. offers verliert UPDATE. INV-20 fail, meist Bug.
5. **Policies mit cmd=ALL** — wird als einzelner Wert `ALL` getrackt, nicht als S+I+U+D expanded.

## Proof-Plan
- Vitest-Run `-t "INV-19|INV-20"` Output nach `worklog/proofs/004-rls-coverage.txt`.

## Scope-Out
- **KEINE Policy-Aenderungen** — nur Snapshot/Invariant. Fehlt Policy auf nicht-Whitelist Tabelle → separater Slice (CEO-Scope).
- **KEIN Policy-Body-Audit** — Test prueft nur cmd-coverage, nicht USING/WITH CHECK expressions. Body-Audit ist eigener groesserer Slice.
- **KEINE automatische Policy-Generierung** — reines Read-Only-Audit.
- **KEIN Audit der `footballData.ts` Client-Zugriffe** auf `club_external_ids`/`player_external_ids` — beide sind in Whitelist weil SERVER-Side-Usage. Verdacht: Client-side-Read wuerde 0 Rows liefern. Separater Slice falls noetig (Visual-QA erforderlich).

## Stages
- SPEC — dieses File
- IMPACT — skipped (Test-Only + 1 Helper-RPC, keine Consumer)
- BUILD — Helper RPC (already applied) + INV-19 + INV-20
- PROVE — vitest run
- LOG — Eintrag + Commit
