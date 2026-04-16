# Ship Log

Chronologische Liste aller abgeschlossenen Slices. Neueste oben.

Jeder Eintrag beginnt mit `H2-Header` `NNN | YYYY-MM-DD | Titel`, gefolgt von:
- Stage-Chain (SPEC → IMPACT → BUILD → PROVE → LOG)
- Files (git diff --stat summary)
- Proof (Pfad zu worklog/proofs/NNN-xxx.png|txt)
- Commit (hash)
- Notes (optional, 1-2 Saetze)

---

## 002 | 2026-04-16 | Wallet Profile FK + Orphan Cleanup
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files: `supabase/migrations/20260416230000_wallets_profile_fk_cascade.sql` (new, 68 lines), `src/lib/__tests__/db-invariants.test.ts` (+44 lines, INV-17)
- Proofs:
  - `worklog/proofs/002-migration-before.txt` — 2 orphans, 0 FK
  - `worklog/proofs/002-migration-after.txt` — 0 orphans, CASCADE FK live
  - `worklog/proofs/002-inv17.txt` — INV-16 + INV-17 beide gruen
- Commit: (pending)
- Notes: CEO-approved Option B (modified). Orphan 1 (`9e0edfed` taki.okuyucu@gmx.de, abandoned signup, 1M balance, 0 activity) → DELETE. Orphan 2 (`862c96a1` testtrading@bescout.test, 2 tx, 0 trades/holdings) → Profile-Backfill mit is_demo=true. FK `wallets_user_id_profiles_fkey` auf profiles(id) ON DELETE CASCADE. Zukuenftige profile-deletes cascaden Wallet automatisch. INV-17 als permanenter Regression-Guard.

---

## 001 | 2026-04-16 | Wallet-Konsistenz-Check (Blocker A-04)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files: `src/lib/__tests__/db-invariants.test.ts` (+87 Zeilen, INV-16 hinzugefuegt)
- Proof: `worklog/proofs/001-wallet-invariant.txt` — 127 Wallets geprueft, 124 mit Transactions, 0 Violations
- Commit: (pending)
- Notes: Invariante `wallets.balance == latest transactions.balance_after` haelt live. Ledger-Drift-Risiko aus Blocker A-04 damit fuer Pilot-DB verifiziert, kein Folge-Fix noetig. Health-Check bleibt als Regression-Guard dauerhaft.
