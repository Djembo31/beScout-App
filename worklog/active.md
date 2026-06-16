# Active Slice

```
status: idle
slice: 329 ✅ DONE — Club-Treasury-Fundament (append-only Ledger + Saldo + Einnahmen-Verbuchung + Abo-Bug-Fix)
stage: LOG complete
size: L
type: Migration (Money, CEO)
spec: worklog/specs/329-club-treasury-foundation.md
impact: worklog/impact/329-club-treasury-foundation.md
review: worklog/reviews/329-review.md (REWORK → 1 BLOCKER grant-revert + 1 MAJOR gefixt → resolved)
proof: worklog/proofs/329-treasury-ledger.txt
done_329: club_treasury_ledger (append-only D39) + book_club_treasury (SUM-based, race-frei) + trades-AFTER-INSERT-Trigger (fängt Trade/IPO/P2P ohne RPC-Edit) + 2 Sub-RPC-Credits (Abo-Bug weg) + get_club_balance Ledger-Read (5 Keys erhalten) + Eröffnungssaldo-Backfill (34 Clubs, 0 Divergenz). 0 src/-Änderungen. Prod-applied + verifiziert.
next: Treasury RAUS-Seite — Slice 330 CSF-Engine ans Treasury (debit-Buchung, Cap-Semantik, csf_multiplier raus). Dann RAUS-Kanäle (Events/Polls/Bounties) + Fan-Reward-Engine. Optional 329b-UI (AdminTreasuryTab Ledger-Anzeige). Alle Money/CEO.
```

## Zuletzt

- **Strategie-Session 2026-06-15/16** — Reward-/Ranking-Ökosystem kartiert + CSF/Club-Treasury-Zielbild formuliert. 2 Konzept-Docs (`worklog/concepts/`). Kern: 1 $SCOUT = 1 Cent (Wechselkurs aufgelöst), IPO-Preis = Verein+MV-Anker, CSF einmalig/proportional, Club-Treasury bidirektional. Commits `eddce179` + `7c3d8e53`.
- **Slice 327** (2026-06-15, DONE) — Flaggen-Normung Emoji→SVG (Windows-konsistent).
- **Slice 326** (2026-06-15, DONE) — clubs.league String→UUID Vollmigration + DROP.
- **Slice 325** (2026-06-15, DONE) — create_club setzt league_id (Drift-Stop).
- **Slice 324** (2026-06-15, DONE) — favorite_club String→UUID Vorlage.

**Strategie D80:** Sommer Tech-First Tiefen-Umbau. **🚨 API-Football-Key gesperrt** → players.club (Paar A) blockiert.
