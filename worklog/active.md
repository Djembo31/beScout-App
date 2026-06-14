# Active Slice

```
status: idle
slice: 323
stage: LOG complete ✅ DONE
spec: worklog/specs/323-ticket-ledger-reconcile.md
impact: inline (Spec §4: 1-User Data-Fix; source-CHECK admin_grant; kein append-only-Trigger; balance=Wahrheit investigiert)
proof: worklog/proofs/323-ticket-ledger-reconcile.txt
review: worklog/reviews/323-review.md (self-review PASS, money-adjacent Checkliste)
decision: P1-Demo Gamif #3. Idempotente Reconcile-Migration: +5 ticket_transactions-Zeile (source=admin_grant) für User 99b601d2 → SUM(amount)=balance=70 (balance war Wahrheit, daily_login-Race). Identity #3 (Beta-Tester Taki, incomplete Onboarding) → an Anil surface, kein auto-Backfill.
```

## Zuletzt

- **Slice 323** (2026-06-14, in Arbeit) — P1-Demo Gamif #3: Ticket-Ledger-Reconciliation (+5, idempotent).
- **Slice 322** (2026-06-14) — P1-Demo Gamif #1+#2: claim_score_road ok-Discriminator + Leaderboard Median-RPC (fix, PASS, live).
- **Slice 321** (2026-06-14) — P1-Demo Club #3: FanChallenges Removal (refactor, PASS, live `20752f55`).
- **Slice 320** (2026-06-14) — P1-Demo Club #4: cancel_club_subscription RPC (fix, self-PASS, live).
- **Slice 319** (2026-06-14) — P1-Demo: notifications i18n + push-unsub error (fix, self-PASS, live).

**🚨 API-Football-Key seit 06.05. suspendiert.** **TR-Review offen.**

P1-Demo nach 323 KOMPLETT bis auf Identity #3 (Anil-Entscheidung: Beta-Tester Taki profillos, incomplete Onboarding — backfillen mit gewähltem Handle ODER lassen bis Taki Onboarding abschließt).
