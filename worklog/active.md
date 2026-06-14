# Active Slice

```
status: idle
slice: 319
stage: LOG complete ✅ DONE
spec: worklog/specs/319-notif-push-hygiene.md
impact: skipped (2 Files, kein Consumer-Contract-Change, kein Money/Daten/RLS)
proof: worklog/proofs/319-notif-push-hygiene.txt
review: worklog/reviews/319-review.md (self-review PASS)
decision: P1-Demo Batch-Start. Social #1 (getNotifications i18n_key-SELECT) + Identity #4 (unsubscribe delete-error erfassen). Übrige P1-Demo brauchen RPCs/Decisions → separate Slices.
```

## Zuletzt

- **Slice 319** (2026-06-14, in Arbeit) — P1-Demo Hygiene: Social #1 (notifications i18n_key-SELECT) + Identity #4 (push unsubscribe error-capture).
- **Slice 318** (2026-06-14) — S7 Phase-2 #4: /api/push Row-Derived (fix security, PASS, live `c56a8716`).
- **Slice 317** (2026-06-14) — S7 Phase-2 #3: profiles_update Spalten-Whitelist (fix security, PASS, live `6452afe8`).
- **Slice 316** (2026-06-14) — S7 Phase-2 #1+#2: Founding-Pass Money-Härtung (fix money, PASS, live `f1061653`).
- **Slice 315** (2026-06-14) — S7 Phase-1 Abschluss 9/9 (docs).

**🚨 API-Football-Key seit 06.05. suspendiert.** **TR-Review offen:** market.bulkSellResult, rankings.noMarketMovement, fantasy.matchLive.

P1-Demo Restplan (nach 319): Club #4 cancel-RPC (RLS hat keine UPDATE-Policy), Gamif #1 claim_score_road Discriminator (money), Gamif #2 leaderboard median-RPC, Club #3 Decision (Phantom-Tabellen gate/deploy/remove), Daten-Fixes Gamif #3 (Ticket-Drift) + Identity #3 (1 profilloser Account).
