# Session Handoff (2026-04-17 00:40)

## Zusammenfassung letzter Session

Erste autonome SHIP-Session mit Opus 4.7. **6 Slices durchgezogen, alle Blocker-A-Items aus Walkthrough jetzt gruen.** 2 echte Security-Exploits gefixt (authenticated-to-other-user wallet/ticket drain).

## Repo-Stand

- Branch: `main` (clean)
- Letzter Commit: `244e72a`
- Uncommitted: nur `memory/session-handoff.md`
- tsc: clean, alle Invariant-Tests gruen

## SHIP-Slices in dieser Session (worklog/log.md)

| # | Slice | Ergebnis |
|---|-------|----------|
| 001 | Wallet-Ledger-Konsistenz (A-04) | INV-16: 127 wallets, 0 violations |
| 002 | Wallet Profile FK + Orphan-Cleanup (A-04) | INV-17 + FK CASCADE, 2 orphans resolved |
| 003 | CHECK Constraint Snapshot (A-05) | INV-18: 14 enum-checks gelockt |
| 004 | RLS Policy Coverage (A-03) | INV-19 + INV-20: 120 RLS-tables + 14 critical gelockt |
| 005 | **Auth-Guard Hardening (A-02)** | INV-21 + 4 HIGH/MED/LOW Exploits gefixt |
| 006 | ALL_CREDIT_TX_TYPES ⊇ DB (A-05 FU) | INV-22: 28 DB types, alle in TS |

**Neu: Invariant-Test-Suite hat INV-16 bis INV-22** (war vorher INV-01 bis INV-15).
**Neu: 5 Migrationen live + 3 Audit-Helper-RPCs** (get_check_enum_values, get_rls_policy_coverage, get_auth_guard_audit).

## Walkthrough Blocker-Status

| ID | Status | Wo |
|----|--------|-----|
| A-01 RPC Grants | GRUEN | commit 9abc761 (vorher) |
| A-02 auth.uid Guards | **GRUEN** | Slice 005, INV-21 |
| A-03 RLS Matrix | **GRUEN** | Slice 004, INV-19+20 |
| A-04 Wallet/Ledger | **GRUEN** | Slices 001+002, INV-16+17 |
| A-05 Transaction Types | **GRUEN** | Slices 003+006, INV-18+22 |
| A-06 Constraint Drift | GRUEN | vorher |
| A-07 Schema Drift | GELB | **offen** — RPC response shape audit fehlt |

**Blocker A komplett gruen ausser A-07.** Blocker B ist noch GELB (4 Items).

## Naechste Session — Prioritaeten

### Option A: A-07 RPC Response Shape Audit (CTO-autonom, manuell)
- Ziel: systematischer Abgleich RPC-Response vs Service-Cast
- Risk-Pattern: `jsonb_build_object('rewardType', ...)` (camelCase) vs `as { reward_type: ... }` (snake_case)
- Tool: `pg_get_functiondef` + Service-Datei grep
- Groesse: M-L (viele RPCs)

### Option B: B-01 Floor-Price-Drift eliminieren (CTO mit CEO-Borderline)
- `useMarketData.ts:50-53` berechnet Floor client-seitig als MIN(sell orders) + DB-Fallback
- Walkthrough-Diagnose: "akzeptabel fuer Beta, kein Preis-Taeuscher" (Slice 5)
- Aber: 2min staleTime kann UI-Drift erzeugen
- Groesse: S (1 Hook)

### Option C: B-06 Error-States Community/Fantasy (CTO-autonom)
- Pattern aus J2/J3: `throw new Error(i18nKey)` → Consumer muss `te(key)` resolven
- Trading ist verifiziert, Community/Fantasy offen
- Groesse: M (grep + review + fix)

### Option D: CEO-Scope Follow-Ups (fragen)
1. **`activityHelpers.ts` Labels + TR-i18n fuer neue DB-Transaction-Types** (admin_adjustment → "Admin-Anpassung" etc.). Aktuell: raw-string fallback. Akzeptabel fuer Beta, aber sichtbar fuer User.
2. **Dev-Accounts `k_demirtas` + `kemal`** — Wallets mit balance > 0 OHNE Transactions. INV-16 skippt sie legitim. Soll Anil legacy-backfill-Transactions erzeugen (fuer saubere Demo) oder lassen?
3. **`footballData.ts` Client-Access auf `club_external_ids` + `player_external_ids`** — diese Tabellen sind in INV-19 Whitelist (server-only RLS). Visual QA erforderlich um zu bestaetigen dass KEIN Browser-Path sie liest. Falls doch: Policy hinzufuegen oder Service in API-Route umziehen.

### Context-Flywheel

- `.claude/rules/common-errors.md` hat neuen Pattern: "SECURITY DEFINER + authenticated-Grant ohne auth.uid()-Guard" (Slice 005)
- Invariant-Tests sind der Canary — bei future Schema-Drift failed ein INV sofort
- Helper-RPCs sind extraction-friendly: `get_check_enum_values`, `get_rls_policy_coverage`, `get_auth_guard_audit` — als SQL-Primitives fuer weitere Audits

## Wichtige Observations

1. **SHIP-Loop funktioniert.** 6× sauber durch. CEO-Check mid-flight greift (Slice 002 bei 2nd Orphan, 005 bei 4 Exploits).
2. **autonomous + Opus 4.7 + 1M context** war stabil bis ~175K Tokens Context, danach wurde es riskanter.
3. **Audit-Helper-Pattern** (RPCs die pg_catalog wrappen) ist wiederverwertbar fuer weitere Meta-Tests.
4. **Drift-Detection** via INV-Snapshot ist maechtig — fixed in diesem Session die transactionTypes-TS-Drift (10 DB-Values waren nicht in TS).

## Commits (chronologisch, neueste oben)

```
244e72a fix(types): ALL_CREDIT_TX_TYPES DB alignment (A-05 FU)
16422cd docs(errors): A-02 exploit pattern
cd7ef94 security(rpc): auth.uid() guard + REVOKE (A-02) — 4 RPCs gehaertet
6b0c8eb test(db-invariants): INV-19 + INV-20 RLS coverage (A-03)
f303dda test(db-invariants): INV-18 CHECK snapshot (A-05)
7b956ea feat(db): wallets FK → profiles CASCADE (A-04)
689bc85 test(db-invariants): INV-16 wallet ledger (A-04)
a10f8aa chore(workflow): SHIP master-loop (vorheriger commit)
```

## DB-Migrations (live, applied via mcp__supabase__apply_migration)

```
20260416230000_wallets_profile_fk_cascade
20260416240000_audit_helper_check_enum_values
20260416250000_audit_helper_rls_coverage
20260417000000_auth_guard_hardening
20260417010000_audit_helper_auth_guard
```

## Einstieg naechste Session

1. `git log --oneline -10` + Migrations-Liste in Supabase pruefen → Stand bestaetigen
2. `memory/session-handoff.md` lesen (dieses File)
3. Entscheidung: Option A (A-07), B (B-01), C (B-06), oder D (CEO-Folge-Ups)
4. `/ship new "<Titel>"`
