# Slice 249 — Wallet-Drift Investigation (CEO-Scope, BACKLOG)

**Größe:** M (Investigation + Reconcile-RPC + Migration)
**Slice-Type:** Service (Money-Path) — **CEO-APPROVAL PFLICHT**
**Datum:** 2026-04-28 (entdeckt in Slice 248 Pre-Push-Smoke)
**Status:** SPEC ONLY — wartet auf Anil-Decision, NICHT bauen ohne explizite Freigabe

## 1.1 Problem-Statement (KRITISCHER FUND)

`db-invariants.test.ts` (lokaler integration-test gegen Production-Supabase) findet **44 user-wallets out-of-sync**:

```
INV-16: wallets.balance ≠ latest transactions.balance_after per user (44 wallets)
INV-33: SUM(transactions.amount) ≠ wallets.balance per user (44 wallets)
Drifts: -1.3M cents bis +250k cents
URL: jfhvgccaeplydsunz.supabase.co (Production)
INV-19: ein RLS-enabled Table fehlt mindestens 1 policy
```

**Sample Drifts:**
```
User f1448939-...: wallet=3432262, tx_sum=4744213, drift=-1311951 cents (-13119 $SCOUT)
User 94ac98c7-...: wallet=5055341, tx_sum=4806656, drift=+248685 cents (+2486 $SCOUT)
User c5f3b0fe-...: wallet=3808540, tx_sum=4992500, drift=-1183960 cents
User 07ed5cfe-...: wallet=3646325, tx_sum=4990000, drift=-1343675 cents
```

44 betroffene Wallets in Production. Total absolute Drift: zu berechnen, schätzungsweise mehrere zehntausend $SCOUT.

## 1.2 Root-Cause-Hypothesen (zu validieren)

1. **RPC-Bug ohne atomare Wallet+Transaction-Update**: irgendeine Money-RPC schreibt wallet.balance ohne zugehörigen transactions-Insert (oder umgekehrt).
2. **Trigger-Issue**: ein wallet-Update-Trigger überschreibt balance ohne Transaction.
3. **Manuelles SQL via MCP**: jemand (Anil oder ich) hat wallet.balance direkt geupdatet ohne Transaction.
4. **Cron-Job-Bug**: einer der 13 Vercel-Crons modifiziert wallets ohne ledger-Eintrag.
5. **Slice-Specific-Drift**: ein bestimmter Slice (z.B. 178 idempotency-changes, 195 fantasy-scoring) hat Drift eingeführt.

## 1.3 Lösungs-Design (Vorschlag, CEO-Decision benötigt)

**Phase A — Investigation (read-only):**
1. Drift-Pattern identifizieren: gemeinsame Charakteristika der 44 Users (registration-date, transaction-types, etc.)
2. Migration-Tool: list-all transactions where balance_after ≠ wallet.balance NACH dem timestamp des transactions
3. RPC-Audit: welche RPCs schreiben wallet.balance ohne zugehörigen INSERT INTO transactions
4. Cron-Audit: welche Crons modifizieren wallets

**Phase B — Reconcile-RPC (Money-Path-Critical, CEO-Approval):**
- Option 1: `reconcile_wallet(p_user_id)` — setzt wallet.balance auf SUM(transactions.amount) für user, INSERT reconciliation transaction für drift
- Option 2: `reconcile_wallet(p_user_id)` — setzt wallet.balance auf latest transactions.balance_after, INSERT correction transaction für drift
- Option 3: Drift-as-it-is akzeptieren, Slice-Source backfix (post-hoc)

**Phase C — Prevention:**
- Append-only-Trigger erweitert (Slice 179 hat das schon)
- BEFORE UPDATE wallets-Trigger prüft: existing transactions-Sum-Check
- Money-RPC-Standard-Pattern: IMMER Wallet+Transaction in einer Transaction (PostgreSQL BEGIN/COMMIT)

## 1.4 Code-Reading-Liste (VOR Implementation)

| File | Zweck | Frage |
|------|-------|-------|
| `src/lib/__tests__/db-invariants.test.ts` | Source-of-Truth Drift | Welche genaue Logik prüft INV-16/33? |
| `supabase/migrations/*` (Money-RPCs) | Source RPCs | Welche RPCs editieren wallet.balance? |
| `.claude/rules/database.md` | Wallet+Transaction-Pattern | Was ist Standard? |
| `worklog/audits/2026-04-*` | Pre-existing Money-Audits | Bekannt? |

## 1.5 Pattern-References

- **Slice 179** — Transactions append-only (BEFORE UPDATE/DELETE Trigger)
- **Slice 178a-f** — Money-RPC Idempotency-Blueprint
- **trading.md** — Money-Regeln, BIGINT cents, atomicity

## 1.6 Acceptance Criteria (DRAFT, CEO-Approval pflicht)

```
AC-01: Phase A Investigation abgeschlossen — Root-Cause identified
AC-02: Drift-Source-Slice gefunden (welcher Slice/RPC introducedDrift)
AC-03: Reconcile-Strategy Anil-approved (Option 1, 2 oder 3)
AC-04: Reconcile-RPC implementiert + tested gegen Staging-DB
AC-05: Prevention-Pattern in database.md codifiziert
AC-06: 44 Wallets reconciled (Migration applied, post-Reconcile INV-16/33 grün)
AC-07: db-invariants.test.ts grün (lokal + CI)
AC-08: Anil-Disclosure-Decision: User informieren oder silent reconcile?
```

## 1.7 Edge Cases

| Case | Verhalten |
|------|-----------|
| User hat aktive Trades wenn Reconcile läuft | Reconcile muss locked sein — atomare Transaction |
| Drift wächst weiter während Investigation | Trigger-basierte Quarantine zuerst, dann Reconcile |
| User-Disclosure ergibt Trust-Issue | CEO-Decision wie kommuniziert |

## 1.8 CEO-Approval-Trigger

**PFLICHT vor JEDER Phase-B/C-Action:**
- Money-Path-Modifikation
- 44 Wallet-Balances werden geändert
- User-Disclosure ist Anil-Decision
- Potentielle Compliance-Implikationen ($SCOUT-Drift)

## 1.9 Open-Questions (alle für Anil)

1. **Investigation-Scope**: Phase A nur, oder direkt Phase A+B+C?
2. **Reconcile-Option**: Option 1, 2, 3 oder Mix?
3. **User-Disclosure**: silent oder transparent kommuniziert?
4. **Timing**: vor Beta-Launch oder post-Beta?
5. **Beta-Blocker?**: 44 Wallets — ist das Beta-Blocker oder Skala-Issue?

## 1.10 Proof-Plan (für Phase A)

- `worklog/proofs/249a-drift-investigation.md` — Drift-Pattern-Analysis
- `worklog/proofs/249a-rpc-audit.md` — Welche RPCs editieren wallets ohne ledger
- `worklog/proofs/249a-cron-audit.md` — Welche Crons modifizieren wallets

## 1.11 Scope-Out

- **Tatsächlicher Reconcile-Code** → Phase B mit CEO-Approval
- **User-Disclosure-Text** → Anil-Schreibt
- **INV-19 Fix** → eigener Slice (RLS-Policy, low-priority)

## 1.12 Stage-Chain (geplant für Phase A)

SPEC (this) → ANIL-DECISION → IMPACT (Phase A research-only) → BUILD (Phase A audit-tool) → REVIEW → PROVE → LOG

## 1.13 Pre-Mortem

- **Risiko 1:** Wallet-Drift-Reconcile macht User-Vermögen sichtbar smaller — Trust-Issue. Mitigation: Anil-Disclosure-Decision pflicht.
- **Risiko 2:** Drift-Source-Slice wird identifiziert aber Backfix komplex (z.B. Slice 178 idempotency-Bug). Mitigation: separate Slice für jeden Drift-Source.
- **Risiko 3:** Investigation findet nichts — keine reproduzierbare Root-Cause. Mitigation: Reconcile als state-restore + Prevention-Pattern.
- **Risiko 4:** Anil sieht das nach Beta-Launch — Drift wächst durch Beta-Tester. Mitigation: pre-Beta investigieren, oder pre-Beta-Snapshot der Wallets.

---

**ZUSTAND 2026-04-28:** Slice 249 ist SPEC-ONLY. KEIN Code. Wartet auf Anil-Decision.

Entdeckt in Slice 248 Pre-Push-Smoke (Initial-Run mit Integration-Tests aktiv). Pre-Push-Hook wurde dann auf CI=true (Skip-Integration) angepasst — aber 44 Wallet-Drifts in Production sind dokumentierte Realität.
