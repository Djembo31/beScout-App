# 011 — Locked-Balance Test Coverage Gap (INV-07, MF-WAL-04, MF-ESC-04)

## Ziel

3 bestehende Money-Flow-Tests (INV-07, MF-WAL-04, MF-ESC-04) ueberpruefen die Invariante "locked_balance > 0 ⟹ aktive Lock-Quelle existiert", aber ihre Lock-Quellen-Liste ist unvollstaendig: sie pruefen nur `orders` + `offers`, nicht aber `bounties` (user-bounties mit `is_user_bounty=true` nutzen `locked_balance` per Escrow-Pattern — siehe `create_user_bounty` RPC + `auto_close_expired_bounties`).

Konsequenz: jarvisqa hat `locked_balance=50000` + 1 legitime open user-bounty → alle 3 Tests failen fälschlich. Fix: Lock-Source-Enumeration erweitern um `bounties`-Check.

## Klassifizierung

- **Slice-Groesse:** S (3 Test-Files, ~15 LOC per file)
- **Scope:** **CTO-autonom** (Test-Bugfix, keine Business-Logic-Aenderung, kein DB-Change)
- **Referenz:** `.claude/rules/trading.md` Escrow Pattern (Offers + Bounties); `src/lib/services/bounties.ts:246` `create_user_bounty` (FOR UPDATE + locked_balance)

## Betroffene Files

| File | Aenderung |
|------|-----------|
| `src/lib/__tests__/db-invariants.test.ts` (INV-07) | Dritten Lock-Source-Check `open user-bounty` hinzufuegen |
| `src/lib/__tests__/money/wallet-guards.test.ts` (MF-WAL-04) | Bounty-Check in Aggregat hinzufuegen |
| `src/lib/__tests__/money/escrow.test.ts` (MF-ESC-04) | Filter `noActiveLocks` erweitern um Bounty-Check |

## Acceptance Criteria

1. Alle 3 Tests pruefen jetzt auch `bounties WHERE is_user_bounty=true AND status='open' AND created_by=<user>` als Lock-Quelle.
2. jarvisqa (user 535bbcaf... mit 50K escrow + 1 bounty) failed nicht mehr.
3. tsc clean.
4. Die 3 Tests gruen.
5. Die anderen 22 Tests in db-invariants + 3 in wallet-guards + 4 in escrow bleiben unveraendert gruen.

## Edge Cases

1. **Non-user-bounty** (Club-Bounty, `is_user_bounty=false`): nicht im Escrow-Scope, Creator ist Club-Wallet — wird nicht von `locked_balance` ausgeschlossen per Design.
2. **Expired bounty**: `auto_close_expired_bounties` released Escrow. Test sollte also nur `status='open'` zaehlen.
3. **Bounty mit `deadline_at < now()`** aber `status='open'`: theoretisch cron-Luecke. Test nimmt `status='open'` als Wahrheit; cron-Lag zaehlt NICHT als Violation.
4. **User mit mehreren Bounties**: Summe der locked_balance ist kombinierte Escrow + orders + offers. Test prueft nur "aktive Lock-Quelle existiert", nicht exakte Summe — ausreichend fuer Invariante.

## Proof-Plan

- `worklog/proofs/011-diff.txt` — git diff der 3 Files
- `worklog/proofs/011-tests.txt` — vitest run aller 3 affected tests

## Scope-Out

- **Exakt-Summe-Check** (locked_balance == order_escrow + offer_escrow + bounty_escrow): separater Slice. Hier nur "existiert irgendeine Lock-Quelle".
- **Holding-Locks fuer Fantasy-Lineups**: separater Escrow-Typ (`holding_locks` Tabelle, nicht `wallets.locked_balance`). Ausser Scope.

## Stages

- SPEC — dieses File
- IMPACT — inline (Test-Only, kein Runtime-Impact)
- BUILD — 3 File-Edits
- PROVE — vitest run + diff
- LOG — commit + log.md
