# Slice 046 — A-04 Live-Ledger-Health Query + INV-Test

**Groesse:** S-M (abhaengig von Finding)
**CEO-Scope:** JA (Money-Integritaet Audit)
**Variante-2-Position:** #3/10

## Ziel

Verifiziere fuer JEDEN User: `SUM(transactions.amount WHERE user_id=X) == wallets.balance`. Wenn 0 drift: INV-33 Test als Regression-Guard. Wenn N drift: pro-User-Investigation + Korrektur-Slice 046b.

## Hintergrund

INV-16 existiert und prueft `wallets.balance == (latest transactions.balance_after)` — fängt fehlende Transaction-Writes nach Wallet-Update. INV-16 faengt ABER NICHT: "Transaction geschrieben aber Wallet nicht updated" oder "Wallet manuell aktualisiert ohne Transaction-Log". Das ist die Luecke fuer A-04.

Welcome-Bonus ist über `welcome_bonus_claims` + explicit `transactions` row (type='welcome_bonus') getrackt (Slice 022 Pattern). Alle Money-Ops erzeugen transactions-row → SUM sollte matchen.

## Acceptance Criteria

1. **Live-Query ausgefuehrt:** `SELECT user_id, balance, SUM(amount) AS tx_sum, balance - SUM(amount) AS drift FROM wallets LEFT JOIN transactions GROUP BY user_id WHERE drift <> 0` — Output dokumentiert in Proof.
2. **Szenario A (0 drift):** INV-33 Test deployed mit gleicher Query-Logic. Test-Fail wenn spaeter drift entsteht.
3. **Szenario B (N drift):** Pro-User Diagnose, Ursache identifiziert (z.B. manueller admin_adjust ohne tx-row, racy update ohne transaction-log), Korrektur via Migration (ledger fix + fehlende rows inserten).
4. **Kein Regression:** 30/30 INV-Tests bleiben gruen.

## Edge Cases

1. **User ohne transactions** (neu registrierte Accounts mit 0 balance) — SUM = NULL, `COALESCE(SUM, 0)` noetig.
2. **Signed amounts:** Trading-Ops sind negative fuer seller, positive fuer buyer. SUM muss integers-gesamt ergeben die mit balance matchen.
3. **Locked-balance separat:** wallets.locked_balance ist NICHT in transactions.amount getrackt. Nur `balance` muss zur Sum matchen.
4. **Timestamp-Drift:** transactions.balance_after ist ein Snapshot. Wallet-Update kann wenige ms spaeter passieren. Query muss cross-sektional konsistent sein (snapshot-isolation).
5. **Soft-deleted Users (auth.users DELETE CASCADE):** wallet weg → tx-rows CASCADE → drift=0 auch hier.
6. **bot-Users (scoringsystem):** brauchen explizit auch wallet+transactions. Wenn bot-wallet vorab gefuellt wurde ohne tx-row: drift.

## Proof-Plan

1. `worklog/proofs/046-ledger-query.txt` — Live-Query-Output mit drift-Counter + pro-User-Drift (falls vorhanden)
2. `worklog/proofs/046-inv33-vitest.txt` — INV-33 Test-Output (gruen)
3. **Falls Szenario B:** `worklog/proofs/046-investigation.txt` — pro-drifted-user root cause + Fix-Plan

## Scope-Out

- **locked_balance-Tracking:** Separate Invariant (INV-15 existiert schon fuer negative locked_balance). A-04 prueft nur balance.
- **Historische Rekonstruktion:** Falls drift gefunden, werden NEUE transactions als compensating-entry inserted, NICHT historische wallets retroactiv korrigiert.

---

**Ready fuer BUILD:** JA
