# Active Slice

```
status: idle
slice: 320
stage: LOG complete ✅ DONE
spec: worklog/specs/320-cancel-subscription-rpc.md
impact: inline (Spec §4: RLS nur SELECT → Update stumm blockiert; 0 Production-Consumer; Spalten verifiziert)
proof: worklog/proofs/320-cancel-subscription-rpc.txt
review: worklog/reviews/320-review.md (self-review PASS; Operator-Slip restauriert)
decision: P1-Demo Club #4. cancelSubscription RLS-blockiert (keine UPDATE-Policy) → SEC-DEFINER-RPC cancel_club_subscription (auth.uid()), Service throw-on-error.
```

## Zuletzt

- **Slice 320** (2026-06-14, in Arbeit) — P1-Demo Club #4: cancel_club_subscription RPC (RLS-Gap-Fix).
- **Slice 319** (2026-06-14) — P1-Demo: notifications i18n-SELECT + push-unsubscribe error-capture (fix, self-PASS, live `f0957187`).
- **Slice 318** (2026-06-14) — S7 Phase-2 #4: /api/push Row-Derived (fix security, PASS, live `c56a8716`).
- **Slice 317** (2026-06-14) — S7 Phase-2 #3: profiles_update Spalten-Whitelist (fix security, PASS, live `6452afe8`).
- **Slice 316** (2026-06-14) — S7 Phase-2 #1+#2: Founding-Pass Money-Härtung (fix money, PASS, live `f1061653`).

**🚨 API-Football-Key seit 06.05. suspendiert.** **TR-Review offen:** market.bulkSellResult, rankings.noMarketMovement, fantasy.matchLive.

P1-Demo Restplan (nach 320): Gamif #1 claim_score_road Discriminator (money), Gamif #2 leaderboard median-RPC, Club #3 Decision (Phantom-Tabellen), Daten-Fixes Gamif #3 + Identity #3.
