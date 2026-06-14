# Active Slice

```
status: idle
slice: 325 ✅ DONE
stage: LOG complete
spec: worklog/specs/325-clubs-league-uuid-filters.md
impact: inline (reine RPC-Härtung, kein src-Diff)
proof: worklog/proofs/325-clubs-league-filters.txt
review: worklog/reviews/325-review.md (self-PASS, PATCH-AUDIT + AR-44 verifiziert)
decision: S7 Phase-3 Paar B = nur Drift-Stop (create_club setzt league_id). Volle clubs.league-Migration (Filter Name→ID, Cache-Decouple, DROP) ist L mit tiefen Tendrils (LeagueBar namens-Listbuilder, PlayerRankings prop-thread, Club-Cache liest Name) → eigene Slice 326, kohärente Einheit. Premature Foundation-Edits reverted (kein Orphan, D54).
next_preflight: worklog/notes/326-preflight-hermes-review.md lesen, dann erst Slice 326 SPEC/BUILD starten.
```

## Zuletzt

- **Slice 325** (2026-06-15, DONE) — S7 Phase-3 Paar B(1/2): create_club setzt `league_id` als Drift-Stop; volle `clubs.league` String→UUID-Migration bleibt Slice 326.
- **Slice 324** (2026-06-15) — S7 Phase-3 Paar C: favorite_club String→UUID Vorlage (refactor, REWORK→PASS, live `10a92273`).
- **Slice 323** (2026-06-14) — P1-Demo Gamif #3: Ticket-Reconcile (fix, live).
- **Slice 322** (2026-06-14) — P1-Demo Gamif #1+#2 (fix, live).
- **Slice 321** (2026-06-14) — P1-Demo Club #3 FanChallenges Removal (refactor, live).

**Strategie D80:** Sommer Tech-First Tiefen-Umbau. Landkarte: `worklog/audits/2026-06-14/string-to-uuid-map.md` (+ Vorlage-Lehren).
**🚨 API-Football-Key gesperrt** → players.club (Paar A) Reconcile teil-blockiert.

Nach 325: Slice 326 (clubs.league Cache-Decouple + DROP) → dann players.club (Paar A, L, braucht API-Key-Reconcile).
