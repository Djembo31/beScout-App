# Active Slice

```
status: idle
slice: 324
stage: LOG complete ✅ DONE
spec: worklog/specs/324-favorite-club-uuid-migration.md
impact: inline (Spec §3/§4: ~15 Files inkl. scripts/seed-demo.sql; Landkarte Sektion C; 5 Reader + Writer + Type/SELECT + 4 Tests + Drop-Migration)
proof: worklog/proofs/324-favorite-club-uuid.txt
review: worklog/reviews/324-review.md (REWORK→RESOLVED→PASS; MAJOR scripts/seed-demo.sql gefixt)
decision: S7 Phase-3 START. favorite_club String→UUID als VORLAGE-Migration. Muster: backfill → Reader getClub(id)?.name → Writer id-only → Type/SELECT raus → DROP COLUMN (nach Push). Etabliert das wiederverwendbare Muster für clubs.league (M) + players.club (L).
```

## Zuletzt

- **Slice 324** (2026-06-14, in Arbeit) — S7 Phase-3 START: favorite_club String→UUID (Vorlage-Migration, D80).
- **Slice 323** (2026-06-14) — P1-Demo Gamif #3: Ticket-Ledger-Reconciliation (fix, self-PASS, live `d8c1818f`).
- **Slice 322** (2026-06-14) — P1-Demo Gamif #1+#2: claim_score_road + Leaderboard (fix, PASS, live).
- **Slice 321** (2026-06-14) — P1-Demo Club #3: FanChallenges Removal (refactor, PASS, live).
- **Slice 320** (2026-06-14) — P1-Demo Club #4: cancel_club_subscription RPC (fix, self-PASS, live).

**Strategie (D80):** Sommer = Tech-First Tiefen-Umbau (keine Tester, sicheres Fenster). Monetarisierung post-Legal-Go, Wachstum später. Landkarte: `worklog/audits/2026-06-14/string-to-uuid-map.md`.
**🚨 API-Football-Key gesperrt** → players.club_id-Reconcile (294 falsche Liga) teil-blockiert.

Nach 324: clubs.league (Paar B, M) → players.club (Paar A, L). Plus billige Leck-Stopfer (create_club RPC league_id, dead RPC drop).
