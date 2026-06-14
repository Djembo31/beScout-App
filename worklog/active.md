# Active Slice

```
status: idle
slice: 321
stage: LOG complete ✅ DONE
spec: worklog/specs/321-fanchallenges-removal.md
impact: inline (Spec §4: 4-Achsen-Removal; DB keine Tabellen; i18n 15 exklusive Keys inkl. orphan challengeStatus; daily-challenge separat)
proof: worklog/proofs/321-fanchallenges-removal.txt
review: worklog/reviews/321-review.md (PASS, 1 doc-NIT)
decision: P1-Demo Club #3 (Anil: Feature entfernen). FanChallenges (club_challenges/achievement_perk_claims existieren nicht → 42P01-Crash) komplett raus: 4 Files DELETE + AdminContent/adminRoles/keys/QueryProvider/de/tr EDIT.
```

## Zuletzt

- **Slice 321** (2026-06-14, in Arbeit) — P1-Demo Club #3: FanChallenges Dead-Feature-Removal (4-Achsen, Slice-305-Muster).
- **Slice 320** (2026-06-14) — P1-Demo Club #4: cancel_club_subscription RPC (fix, self-PASS, live).
- **Slice 319** (2026-06-14) — P1-Demo: notifications i18n-SELECT + push-unsubscribe error-capture (fix, self-PASS, live).
- **Slice 318** (2026-06-14) — S7 Phase-2 #4: /api/push Row-Derived (fix security, PASS, live).
- **Slice 317** (2026-06-14) — S7 Phase-2 #3: profiles_update Spalten-Whitelist (fix security, PASS, live).

**🚨 API-Football-Key seit 06.05. suspendiert.** **TR-Review offen.**

P1-Demo offen nach 321: Gamif #1 claim_score_road Discriminator (money), Gamif #2 leaderboard median-RPC, Gamif #3 Ticket-Reconcile (+5 Ledger — balance=70 ist Wahrheit, Ledger short, investigiert), Identity #3 (1 profilloser Account).
