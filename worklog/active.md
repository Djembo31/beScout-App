# Active Slice

```
status: idle
slice: 330
title: ✅ DONE — CSF-Engine ans Treasury (debit-Buchung + Cap + Multiplikatoren raus)
stage: LOG complete
size: L
type: Migration (Money, CEO)
spec: worklog/specs/330-csf-engine-treasury.md
review: worklog/reviews/330-review.md (PASS, 3 NITs)
proof: worklog/proofs/330-csf-engine-treasury.md
done_330: liquidate_player → CSF+PBT rein proportional (csf_multiplier+mastery raus) · CSF debitiert Club-Treasury (book_club_treasury 'debit'/'csf') · fail-safe Guard treasury_insufficient_for_csf (race-frei via clubs FOR UPDATE) · Pro-Card-Cap unverändert · UI-Badge "CSF Bonus" weg (FanRankBadge/Overview/ClubContent + i18n csfBonus) · activity.successFee-Mapping. PREREQ-FIX: transactions_type_check fehlten pbt_liquidation+success_fee (latent seit Slice 178 → JEDE Auszahlungs-Liquidation 23514) → Migration 130500. Prod-applied + verifiziert (Block + Erfolgs-Pfad force-rollback).
next: 330b Deposit-RPC (Escape-Ventil Guard, Money-Frage "aus welchem Wallet") + AdminTreasuryTab Ledger/CSF-Debit-Anzeige (329b-UI). Dann RAUS-Kanäle (Events/Polls/Bounties) + Fan-Reward-Engine. Alle Money/CEO.
```

## Zuletzt
- **Slice 330** (2026-06-17 DONE) — CSF-Engine ans Treasury. Reviewer PASS. Latenter Liquidations-Constraint-Bug mitgefixt (Knowledge-Flywheel: errors-db.md transactions.type-CHECK-Drift).
- **Slice 329** (2026-06-17 DONE) — Club-Treasury-Fundament: Ledger + book_club_treasury (SUM-gehärtet 329b) + Einnahmen-Verbuchung + Abo-Bug-Fix.
- **Strategie 2026-06-15/16** — CSF/Treasury-Zielbild (`worklog/concepts/csf-club-treasury-model.md`). 1 $SCOUT = 1 Cent.

**Strategie D80:** Sommer Tech-First. 🚨 API-Football-Key gesperrt → players.club blockiert.
</content>
