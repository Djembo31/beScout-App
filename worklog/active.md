# Active Slice

```
status: idle
slice: 330b
title: ✅ DONE — Treasury-Saldo Debit-Reconcile + Kontoauszug/CSF-Anzeige
stage: LOG complete
size: M
type: Migration (Money, CEO)
spec: worklog/specs/330b-treasury-balance-debits.md
review: worklog/reviews/330b-review.md (PASS, 3 NITs)
proof: worklog/proofs/330b-treasury-balance-debits.md
done_330b: get_club_balance v2 (available = SUM(credit)−SUM(debit)−Withdrawals = identisch 330-Guard; +csf_paid +total_debited) schließt Withdrawal-Leck (CSF war doppelt abhebbar, da request_club_withdrawal denselben available liest) · neue get_club_treasury_ledger (Kontoauszug, JSONB-Return, admin-Guard) · AdminWithdrawalTab: csf_paid-Karte + Kontoauszug · i18n DE+TR (ledgerType 13). Prod-applied + behavioral force-rollback-verifiziert (avail-Delta == csf_debited). Deposit gestrichen (CEO).
next: RAUS-Kanäle (Events/Polls/Bounties ans Treasury) + Fan-Reward-Engine. Alle Money/CEO.
```

## Zuletzt
- **Slice 330** (2026-06-17 DONE) — CSF-Engine ans Treasury. Reviewer PASS. Latenter Liquidations-Constraint-Bug mitgefixt (Knowledge-Flywheel: errors-db.md transactions.type-CHECK-Drift).
- **Slice 329** (2026-06-17 DONE) — Club-Treasury-Fundament: Ledger + book_club_treasury (SUM-gehärtet 329b) + Einnahmen-Verbuchung + Abo-Bug-Fix.
- **Strategie 2026-06-15/16** — CSF/Treasury-Zielbild (`worklog/concepts/csf-club-treasury-model.md`). 1 $SCOUT = 1 Cent.

**Strategie D80:** Sommer Tech-First. 🚨 API-Football-Key gesperrt → players.club blockiert.
</content>
