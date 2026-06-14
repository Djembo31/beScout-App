# Active Slice

```
status: idle
slice: 322
stage: LOG complete ✅ DONE
spec: worklog/specs/322-gamif-correctness.md
impact: inline (Spec §4: #1 service-only, RPC bereits ok-discriminated; #2 neuer read-only Median-RPC, latent bei 128<300 User)
proof: worklog/proofs/322-gamif-correctness.txt
review: worklog/reviews/322-review.md (PASS, 1 out-of-scope NITPICK)
decision: P1-Demo Gamif #1+#2. #1 claimScoreRoad nutzt ok-Discriminator (null→fail, Money-Mint-defensiv); #2 getScoutLeaderboard('overall') server-seitige Median-Sortierung via neuem RPC (Truncation-Bias future-proof).
```

## Zuletzt

- **Slice 322** (2026-06-14, in Arbeit) — P1-Demo Gamif #1+#2: claim_score_road ok-Discriminator + Leaderboard Median-RPC.
- **Slice 321** (2026-06-14) — P1-Demo Club #3: FanChallenges Removal (refactor, PASS, live `20752f55`).
- **Slice 320** (2026-06-14) — P1-Demo Club #4: cancel_club_subscription RPC (fix, self-PASS, live).
- **Slice 319** (2026-06-14) — P1-Demo: notifications i18n + push-unsub error (fix, self-PASS, live).
- **Slice 318** (2026-06-14) — S7 Phase-2 #4: /api/push Row-Derived (security, PASS, live).

**🚨 API-Football-Key seit 06.05. suspendiert.** **TR-Review offen.**

P1-Demo offen nach 322: Gamif #3 Ticket-Reconcile (+5 Ledger, balance=70 Wahrheit, Anil-OK), Identity #3 (1 profilloser Account). → dann P1-Demo komplett.
